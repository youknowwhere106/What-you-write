"""
Celery tasks for background AI processing.

Flow on note create/update:
  1. Mark note as "processing"
  2. Chunk the note text
  3. Generate embeddings for each chunk (skip if < RAG_MIN_WORDS)
  4. Generate AI summary via Gemini
  5. Store chunks + embeddings + summary
  6. Mark note as "ready"
"""

import re
import logging
from bson import ObjectId
from pymongo import MongoClient
from app.workers.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_sync_db():
    """Celery workers run synchronously - use pymongo directly."""
    client = MongoClient(settings.MONGODB_URL)
    return client[settings.DATABASE_NAME]


@celery_app.task(
    bind=True,
    name="app.workers.tasks.process_note_ai",
    max_retries=3,
    default_retry_delay=30,
)
def process_note_ai(self, note_id: str):
    """Full AI pipeline for a note: chunk → embed → summarize."""
    db = _get_sync_db()

    try:
        note = db.notes.find_one({"_id": ObjectId(note_id)})
        if not note:
            logger.warning(f"Note {note_id} not found, skipping AI processing")
            return {"status": "skipped", "reason": "note not found"}

        # Mark as processing
        db.notes.update_one(
            {"_id": ObjectId(note_id)}, {"$set": {"ai_status": "processing"}}
        )

        content = note.get("content", "")
        clean_content = re.sub(r"<[^>]+>", " ", content)
        clean_content = re.sub(r"\s+", " ", clean_content).strip()
        word_count = len(clean_content.split())

        # --- Step 1: Chunk + Embed (only if note is long enough) ---
        db.note_chunks.delete_many({"note_id": note_id})

        if word_count >= settings.RAG_MIN_WORDS:
            from app.rag.chunker import chunk_text
            from app.services.embedding_service import get_embedding_provider

            chunks = chunk_text(clean_content)
            provider = get_embedding_provider()
            embeddings = provider.embed(chunks)

            chunk_docs = [
                {
                    "note_id": note_id,
                    "chunk_text": chunk,
                    "embedding": embedding,
                }
                for chunk, embedding in zip(chunks, embeddings)
            ]
            if chunk_docs:
                db.note_chunks.insert_many(chunk_docs)

            logger.info(f"Note {note_id}: created {len(chunk_docs)} chunks with embeddings")
        else:
            logger.info(
                f"Note {note_id}: {word_count} words < {settings.RAG_MIN_WORDS}, "
                "skipping RAG chunking"
            )

        # --- Step 2: Generate summary via Gemini ---
        summary = None
        if settings.GEMINI_API_KEY:
            try:
                from app.services.gemini_service import generate_summary
                summary = generate_summary(clean_content)
            except Exception as e:
                logger.error(f"Summary generation failed for note {note_id}: {e}")
                summary = None

        # --- Step 3: Update note with results ---
        update = {"ai_status": "ready"}
        if summary:
            update["summary"] = summary

        db.notes.update_one({"_id": ObjectId(note_id)}, {"$set": update})

        logger.info(f"Note {note_id}: AI processing complete")
        return {"status": "ready", "note_id": note_id, "word_count": word_count}

    except Exception as exc:
        logger.error(f"AI processing failed for note {note_id}: {exc}")
        db.notes.update_one(
            {"_id": ObjectId(note_id)}, {"$set": {"ai_status": "failed"}}
        )
        raise self.retry(exc=exc)
