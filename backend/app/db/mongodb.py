from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


mongodb = MongoDB()


async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    try:
        mongodb.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=5000,
            # Reduced from 5000 ms so a missing/unreachable MongoDB does not
            # block the lifespan startup (and therefore the healthcheck) for 5s.
            serverSelectionTimeoutMS=2000,
        )
        mongodb.db = mongodb.client[settings.DATABASE_NAME]
        await create_indexes()
        logger.info("Connected to MongoDB.")
    except Exception as exc:
        logger.error("MongoDB connection failed at startup: %s", exc)
        # Server continues — routes that need DB will fail individually.


async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if mongodb.client:
        mongodb.client.close()
    logger.info("MongoDB connection closed.")


async def create_indexes():
    db = mongodb.db
    await db.users.create_index("email", unique=True)
    await db.notes.create_index("owner_id")
    await db.notes.create_index([("title", "text"), ("content", "text")])
    await db.notes.create_index("created_at")
    await db.note_chunks.create_index("note_id")
    await db.shared_notes.create_index("shared_with_user_id")
    await db.shared_notes.create_index("note_id")
    await db.shared_notes.create_index([("note_id", 1), ("shared_with_user_id", 1)], unique=True)
    await db.notes.create_index([("owner_id", 1), ("created_at", -1)])
    await db.ai_chats.create_index([("note_id", 1), ("user_id", 1)])


def get_database() -> AsyncIOMotorDatabase:
    return mongodb.db
