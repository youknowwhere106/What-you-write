from fastapi import APIRouter, Depends, Query
from app.services.note_service import note_service
from app.middleware.auth import get_current_user
from app.schemas.notes import NoteListResponse
from typing import Dict, Any

router = APIRouter()


@router.get("/search", response_model=NoteListResponse)
async def search_notes(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user),
):
    notes, total = await note_service.search_notes(user["id"], q, page, page_size)
    return NoteListResponse(notes=notes, total=total, page=page, page_size=page_size)
