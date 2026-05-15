import json
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from app.services.note_service import note_service
from app.middleware.auth import get_current_user
from app.schemas.notes import NoteResponse
from typing import Dict, Any, List

router = APIRouter()


@router.get("/search", response_model=List[NoteResponse])
async def search_notes(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user),
):
    notes, total = await note_service.search_notes(user["id"], q, page, page_size)
    headers = {
        "X-Total-Count": str(total),
        "X-Page": str(page),
        "X-Page-Size": str(page_size),
    }
    return Response(
        content=json.dumps(notes),
        media_type="application/json",
        headers=headers,
    )
