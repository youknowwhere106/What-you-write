from app.routes.auth import router as auth_router
from app.routes.notes import router as notes_router
from app.routes.ai import router as ai_router
from app.routes.search import router as search_router
from app.routes.dictionary import router as dictionary_router

__all__ = ["auth_router", "notes_router", "ai_router", "search_router", "dictionary_router"]
