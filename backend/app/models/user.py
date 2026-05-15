from datetime import datetime, timezone


def create_user_document(email: str, hashed_password: str) -> dict:
    return {
        "email": email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
    }


def user_to_response(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "created_at": (
            user["created_at"].isoformat()
            if isinstance(user["created_at"], datetime)
            else str(user["created_at"])
        ),
    }
