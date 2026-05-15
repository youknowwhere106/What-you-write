from typing import List, Dict
from app.db.mongodb import get_database
from app.services.embedding_service import get_embedding_provider, cosine_similarity
import logging

logger = logging.getLogger(__name__)


async def retrieve_relevant_chunks(
    note_id: str, query: str, top_k: int = 3
) -> List[Dict]:
    """Retrieve the most relevant chunks for a query using cosine similarity."""
    db = get_database()

    chunks = await db.note_chunks.find({"note_id": note_id}).to_list(None)

    if not chunks:
        return []

    # Embed the query
    provider = get_embedding_provider()
    query_embedding = provider.embed([query])[0]

    # Score each chunk
    scored = []
    for chunk in chunks:
        if "embedding" not in chunk or not chunk["embedding"]:
            continue
        score = cosine_similarity(query_embedding, chunk["embedding"])
        scored.append({"chunk_text": chunk["chunk_text"], "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


async def get_note_summary(note_id: str) -> str:
    """Get the AI-generated summary for a note."""
    db = get_database()
    from bson import ObjectId
    note = await db.notes.find_one({"_id": ObjectId(note_id)})
    if note and note.get("summary"):
        return note["summary"]
    return ""


async def get_chat_history(note_id: str, user_id: str, limit: int = 10) -> List[Dict]:
    """Get recent chat history for a note."""
    db = get_database()
    chat = await db.ai_chats.find_one({"note_id": note_id, "user_id": user_id})
    if not chat or not chat.get("messages"):
        return []
    return chat["messages"][-limit:]


async def save_chat_message(
    note_id: str, user_id: str, role: str, content: str
):
    """Append a message to the chat history."""
    db = get_database()
    await db.ai_chats.update_one(
        {"note_id": note_id, "user_id": user_id},
        {"$push": {"messages": {"role": role, "content": content}}},
        upsert=True,
    )
