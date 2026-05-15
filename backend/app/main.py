from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.db.redis import redis_cache
from app.routes import auth_router, notes_router, ai_router, search_router, dictionary_router
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await redis_cache.connect()
    logger.info("Application started.")
    yield
    await close_mongo_connection()
    await redis_cache.disconnect()
    logger.info("Application shutdown.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"],
)

app.include_router(auth_router, tags=["Authentication"])
app.include_router(notes_router, tags=["Notes"])
app.include_router(ai_router, tags=["AI"])
app.include_router(search_router, tags=["Search"])
app.include_router(dictionary_router, tags=["Dictionary"])


@app.get("/about")
async def about():
    return {
        "name": "Piyush Awasthi",
        "email": "piyushawasthi106@gmail.com",
        "my features": {
            "AI Ask (Mini-RAG)": (
                "A conversational Q&A feature built on a mini Retrieval-Augmented Generation pipeline. "
                "When a note is created or updated, Celery background workers chunk the content and store "
                "embeddings. The LangGraph RAG chain then retrieves relevant chunks, injects them as context, "
                "and uses Gemini to answer user questions grounded in the note's actual content. "
                "I chose this because plain LLM answers hallucinate — RAG keeps responses factual and scoped "
                "to what the user actually wrote."
            ),
            "AI Summaries": (
                "Automatic note summarisation triggered on create/update via Celery background tasks. "
                "Chose it to give users an instant overview of long notes without reading everything."
            ),
            "Note Sharing": (
                "Share notes with other registered users by email. "
                "Chose it to enable lightweight collaboration without complex permission models."
            ),
            "Full-Text Search": (
                "MongoDB text-index powered search across all user notes. "
                "Chose it for fast, relevance-ranked retrieval without an external search engine."
            ),
            "Dictionary Lookup": (
                "Inline word definition lookup for writers. "
                "Chose it so users never have to leave the app to check a word's meaning."
            ),
            "Color-Coded Notes": (
                "Six color options (yellow, pink, blue, green, purple, orange) for visual organisation. "
                "Chose it because color-coding is the simplest UX pattern for categorisation."
            ),
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
