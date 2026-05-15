from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(notes_router, prefix="/api", tags=["Notes"])
app.include_router(ai_router, prefix="/api", tags=["AI"])
app.include_router(search_router, prefix="/api", tags=["Search"])
app.include_router(dictionary_router, prefix="/api", tags=["Dictionary"])


@app.get("/about")
async def about():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "A premium sticky-notes app with AI-powered summaries and chat.",
        "tech_stack": {
            "backend": "FastAPI + MongoDB + Redis + Celery",
            "ai": "Gemini + Mini-RAG + LangGraph",
            "frontend": "React + Vite + TailwindCSS",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
