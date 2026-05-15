from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.notes import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteListResponse,
    ShareNoteRequest,
)
from app.services.note_service import note_service
from app.middleware.auth import get_current_user
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/notes", response_model=NoteListResponse)
async def get_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user),
):
    notes, total = await note_service.get_notes(user["id"], page, page_size)
    return NoteListResponse(notes=notes, total=total, page=page, page_size=page_size)


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    note = await note_service.get_note_by_id(note_id, user["id"])
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return note


@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate, user: Dict[str, Any] = Depends(get_current_user)
):
    note = await note_service.create_note(
        title=data.title,
        content=data.content,
        owner_id=user["id"],
        color=data.color.value,
    )
    # Trigger AI processing in background
    try:
        from app.workers.tasks import process_note_ai
        process_note_ai.delay(note["id"])
    except Exception as e:
        logger.warning(f"Failed to queue AI task: {e}")
    return note


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    data: NoteUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    if "color" in update_data and update_data["color"]:
        update_data["color"] = (
            update_data["color"].value
            if hasattr(update_data["color"], "value")
            else update_data["color"]
        )
    note = await note_service.update_note(note_id, user["id"], update_data)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    # Re-trigger AI processing
    try:
        from app.workers.tasks import process_note_ai
        process_note_ai.delay(note["id"])
    except Exception as e:
        logger.warning(f"Failed to queue AI task: {e}")
    return note


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: str, user: Dict[str, Any] = Depends(get_current_user)
):
    success = await note_service.delete_note(note_id, user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return {"message": "Note deleted successfully"}


@router.post("/notes/{note_id}/share")
async def share_note(
    note_id: str,
    data: ShareNoteRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        result = await note_service.share_note(note_id, user["id"], data.email)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
