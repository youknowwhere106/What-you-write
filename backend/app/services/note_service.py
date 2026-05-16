from typing import Optional, List, Tuple
from bson import ObjectId
from datetime import datetime, timezone
from pymongo import ReturnDocument, DeleteMany
from app.db.mongodb import get_database
from app.db.redis import redis_cache
from app.models.note import create_note_document, note_to_response
import logging

logger = logging.getLogger(__name__)


class NoteNotFoundError(ValueError):
    pass


class UserNotFoundError(ValueError):
    pass


class AlreadySharedError(ValueError):
    pass


class NoteService:
    NoteNotFoundError = NoteNotFoundError
    UserNotFoundError = UserNotFoundError
    AlreadySharedError = AlreadySharedError
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
        owner_id: str, page: int = 1, page_size: int = 10
    ) -> Tuple[List[dict], int]:
        db = get_database()
        cache_key = f"notes:{owner_id}:page:{page}:size:{page_size}"
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached["notes"], cached["total"]

        # Collect shared note IDs for this user (project only note_id to reduce data transfer)
        shared_docs = await db.shared_notes.find(
            {"shared_with_user_id": owner_id}, {"note_id": 1, "_id": 0}
        ).to_list(None)
        shared_note_ids = [ObjectId(s["note_id"]) for s in shared_docs]

        # Combined query: owned notes OR shared notes
        if shared_note_ids:
            combined_query = {
                "$or": [
                    {"owner_id": owner_id},
                    {"_id": {"$in": shared_note_ids}},
                ]
            }
        else:
            combined_query = {"owner_id": owner_id}

        total = await db.notes.count_documents(combined_query)
        skip = (page - 1) * page_size
        cursor = (
            db.notes.find(combined_query).sort("created_at", -1).skip(skip).limit(page_size)
        )
        notes = []
        async for note in cursor:
            is_shared = note["owner_id"] != owner_id
            notes.append(note_to_response(note, is_shared=is_shared))

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
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # If nothing to update, fetch and return current doc (ownership verified via query filter)
        if not update_data:
            try:
                note = await db.notes.find_one(
                    {"_id": ObjectId(note_id), "owner_id": owner_id}
                )
            except Exception:
                return None
            return note_to_response(note) if note else None

        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["ai_status"] = "pending"

        try:
            updated = await db.notes.find_one_and_update(
                {"_id": ObjectId(note_id), "owner_id": owner_id},
                {"$set": update_data},
                return_document=ReturnDocument.AFTER,
            )
        except Exception:
            return None
        if not updated:
            return None

        await redis_cache.delete(f"note:{note_id}")
        await redis_cache.delete_pattern(f"notes:{owner_id}:*")
        return note_to_response(updated)

    @staticmethod
    async def delete_note(note_id: str, user_id: str) -> bool:
        db = get_database()
        try:
            oid = ObjectId(note_id)
        except Exception:
            return False

        # Try owner deletion first
        result = await db.notes.delete_one({"_id": oid, "owner_id": user_id})
        if result.deleted_count > 0:
            # Owner deleted — clean up all related documents
            import asyncio
            await asyncio.gather(
                db.note_chunks.delete_many({"note_id": note_id}),
                db.shared_notes.delete_many({"note_id": note_id}),
                db.ai_chats.delete_many({"note_id": note_id}),
            )
            await redis_cache.delete(f"note:{note_id}")
            await redis_cache.delete_pattern(f"notes:{user_id}:*")
            return True

        # Not the owner — check if it's shared with this user and unlink
        shared = await db.shared_notes.find_one(
            {"note_id": note_id, "shared_with_user_id": user_id}
        )
        if not shared:
            return False

        await db.shared_notes.delete_one(
            {"note_id": note_id, "shared_with_user_id": user_id}
        )
        await redis_cache.delete_pattern(f"notes:{user_id}:*")
        return True

    @staticmethod
    async def share_note(note_id: str, owner_id: str, share_with_email: str) -> dict:
        db = get_database()
        try:
            note = await db.notes.find_one(
                {"_id": ObjectId(note_id), "owner_id": owner_id}
            )
        except Exception:
            raise NoteNotFoundError("Note not found or you don't own it")
        if not note:
            raise NoteNotFoundError("Note not found or you don't own it")

        target_user = await db.users.find_one({"email": share_with_email})
        if not target_user:
            raise UserNotFoundError("User not found")

        target_id = str(target_user["_id"])
        if target_id == owner_id:
            raise ValueError("Cannot share with yourself")

        existing = await db.shared_notes.find_one(
            {"note_id": note_id, "shared_with_user_id": target_id}
        )
        if existing:
            raise AlreadySharedError("Note already shared with this user")

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
        owner_id: str, query: str, page: int = 1, page_size: int = 10
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
