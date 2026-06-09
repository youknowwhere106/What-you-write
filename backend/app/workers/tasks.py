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
import traceback as tb_module
from bson import ObjectId
from pymongo import MongoClient
from app.workers.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)


_mongo_client: MongoClient = None


def _get_sync_db():
    """Return a shared PyMongo client (singleton per worker process) with connection pooling."""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(
            settings.MONGODB_URL,
            maxPoolSize=10,
            minPoolSize=2,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=5000,
            serverSelectionTimeoutMS=5000,
        )
    return _mongo_client[settings.DATABASE_NAME]


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
        summary_failed = False
        summary_error_info = {}

        if not settings.GEMINI_API_KEY:
            logger.warning(f"Note {note_id}: GEMINI_API_KEY not set — summary generation skipped")
        else:
            try:
                from app.services.gemini_service import generate_summary
                summary = generate_summary(clean_content)
            except Exception as e:
                summary_failed = True
                summary_error_info = {
                    "ai_error": str(e),
                    "ai_error_type": type(e).__name__,
                    "ai_error_traceback": tb_module.format_exc()[-3000:],
                }
                logger.exception(f"Summary generation failed for note {note_id}")

        # --- Step 3: Update note with results ---
        if summary_failed:
            db.notes.update_one(
                {"_id": ObjectId(note_id)},
                {"$set": {"summary": None, "ai_status": "failed", **summary_error_info}},
            )
            logger.error(
                f"Note {note_id}: summary error persisted to MongoDB — "
                f"{summary_error_info['ai_error_type']}: {summary_error_info['ai_error']}"
            )
            return {"status": "failed", "note_id": note_id, **summary_error_info}

        db.notes.update_one(
            {"_id": ObjectId(note_id)},
            {"$set": {"ai_status": "ready", "summary": summary}},
        )
        logger.info(f"Note {note_id}: AI processing complete, summary={'set' if summary else 'null'}")
        return {"status": "ready", "note_id": note_id, "word_count": word_count}

    except Exception as exc:
        logger.exception(f"AI processing failed for note {note_id}")
        db.notes.update_one(
            {"_id": ObjectId(note_id)}, {"$set": {"ai_status": "failed"}}
        )
        raise self.retry(exc=exc)
