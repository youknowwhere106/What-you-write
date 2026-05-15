from typing import Optional, List, Tuple
from bson import ObjectId
from datetime import datetime, timezone
from app.db.mongodb import get_database
from app.db.redis import redis_cache
from app.models.note import create_note_document, note_to_response
import logging

logger = logging.getLogger(__name__)


class NoteService:
    @staticmethod
    async def create_note(
        title: str, content: str, owner_id: str, color: str = "yellow"
    ) -> dict:
        db = get_database()
        doc = create_note_document(title, content, owner_id, color)
        result = await db.notes.insert_one(doc)
        doc["_id"] = result.inserted_id
        await redis_cache.delete_pattern(f"notes:{owner_id}:*")
        return note_to_response(doc)

    @staticmethod
    async def get_notes(
        owner_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[dict], int]:
        db = get_database()
        cache_key = f"notes:{owner_id}:page:{page}:size:{page_size}"
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached["notes"], cached["total"]

        skip = (page - 1) * page_size
        query = {"owner_id": owner_id}
        total = await db.notes.count_documents(query)
        cursor = (
            db.notes.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        )
        notes = []
        async for note in cursor:
            notes.append(note_to_response(note))

        # Include shared notes
        shared_cursor = db.shared_notes.find({"shared_with_user_id": owner_id})
        shared_note_ids = []
        async for shared in shared_cursor:
            shared_note_ids.append(ObjectId(shared["note_id"]))

        if shared_note_ids:
            shared_notes_cursor = db.notes.find({"_id": {"$in": shared_note_ids}})
            async for note in shared_notes_cursor:
                notes.append(note_to_response(note, is_shared=True))
            total += len(shared_note_ids)

        await redis_cache.set(cache_key, {"notes": notes, "total": total}, ttl=60)
        return notes, total

    @staticmethod
    async def get_note_by_id(note_id: str, user_id: str) -> Optional[dict]:
        db = get_database()
        cache_key = f"note:{note_id}"
        cached = await redis_cache.get(cache_key)
        if cached and cached.get("owner_id") == user_id:
            return cached

        try:
            note = await db.notes.find_one({"_id": ObjectId(note_id)})
        except Exception:
            return None
        if not note:
            return None

        is_shared = False
        if note["owner_id"] != user_id:
            shared = await db.shared_notes.find_one(
                {"note_id": note_id, "shared_with_user_id": user_id}
            )
            if not shared:
                return None
            is_shared = True

        response = note_to_response(note, is_shared)
        await redis_cache.set(cache_key, response, ttl=120)
        return response

    @staticmethod
    async def update_note(note_id: str, owner_id: str, update_data: dict) -> Optional[dict]:
        db = get_database()
        try:
            note = await db.notes.find_one(
                {"_id": ObjectId(note_id), "owner_id": owner_id}
            )
        except Exception:
            return None
        if not note:
            return None

        update_data = {k: v for k, v in update_data.items() if v is not None}
        if not update_data:
            return note_to_response(note)

        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["ai_status"] = "pending"

        await db.notes.update_one({"_id": ObjectId(note_id)}, {"$set": update_data})
        updated = await db.notes.find_one({"_id": ObjectId(note_id)})
        await redis_cache.delete(f"note:{note_id}")
        await redis_cache.delete_pattern(f"notes:{owner_id}:*")
        return note_to_response(updated)

    @staticmethod
    async def delete_note(note_id: str, owner_id: str) -> bool:
        db = get_database()
        try:
            result = await db.notes.delete_one(
                {"_id": ObjectId(note_id), "owner_id": owner_id}
            )
        except Exception:
            return False
        if result.deleted_count == 0:
            return False
        await db.note_chunks.delete_many({"note_id": note_id})
        await db.shared_notes.delete_many({"note_id": note_id})
        await db.ai_chats.delete_many({"note_id": note_id})
        await redis_cache.delete(f"note:{note_id}")
        await redis_cache.delete_pattern(f"notes:{owner_id}:*")
        return True

    @staticmethod
    async def share_note(note_id: str, owner_id: str, share_with_email: str) -> dict:
        db = get_database()
        try:
            note = await db.notes.find_one(
                {"_id": ObjectId(note_id), "owner_id": owner_id}
            )
        except Exception:
            raise ValueError("Note not found or you don't own it")
        if not note:
            raise ValueError("Note not found or you don't own it")

        target_user = await db.users.find_one({"email": share_with_email})
        if not target_user:
            raise ValueError("User not found")

        target_id = str(target_user["_id"])
        if target_id == owner_id:
            raise ValueError("Cannot share with yourself")

        existing = await db.shared_notes.find_one(
            {"note_id": note_id, "shared_with_user_id": target_id}
        )
        if existing:
            raise ValueError("Note already shared with this user")

        await db.shared_notes.insert_one(
            {
                "note_id": note_id,
                "shared_with_user_id": target_id,
                "shared_by_user_id": owner_id,
                "created_at": datetime.now(timezone.utc),
            }
        )
        await redis_cache.delete_pattern(f"notes:{target_id}:*")
        return {"message": f"Note shared with {share_with_email}"}

    @staticmethod
    async def search_notes(
        owner_id: str, query: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[dict], int]:
        db = get_database()
        search_filter = {"owner_id": owner_id, "$text": {"$search": query}}
        total = await db.notes.count_documents(search_filter)
        skip = (page - 1) * page_size
        cursor = (
            db.notes.find(search_filter, {"score": {"$meta": "textScore"}})
            .sort([("score", {"$meta": "textScore"})])
            .skip(skip)
            .limit(page_size)
        )
        notes = []
        async for note in cursor:
            notes.append(note_to_response(note))
        return notes, total


note_service = NoteService()
