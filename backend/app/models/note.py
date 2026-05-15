from datetime import datetime, timezone


def create_note_document(
    title: str, content: str, owner_id: str, color: str = "yellow"
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "title": title,
        "content": content,
        "owner_id": owner_id,
        "summary": None,
        "ai_status": "pending",
        "color": color,
        "created_at": now,
        "updated_at": now,
    }


def note_to_response(note: dict, is_shared: bool = False) -> dict:
    return {
        "id": str(note["_id"]),
        "title": note["title"],
        "content": note["content"],
        "owner_id": note["owner_id"],
        "summary": note.get("summary"),
        "ai_status": note.get("ai_status", "pending"),
        "color": note.get("color", "yellow"),
        "created_at": (
            note["created_at"].isoformat()
            if isinstance(note["created_at"], datetime)
            else str(note["created_at"])
        ),
        "updated_at": (
            note["updated_at"].isoformat()
            if isinstance(note["updated_at"], datetime)
            else str(note["updated_at"])
        ),
        "is_shared": is_shared,
    }
