from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.ai import AskAIRequest, AskAIResponse, ChatHistoryResponse
from app.middleware.auth import get_current_user
from app.db.mongodb import get_database
from app.rag.retriever import get_chat_history
from bson import ObjectId
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/notes/{note_id}/ask", response_model=AskAIResponse)
async def ask_ai(
    note_id: str,
    data: AskAIRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()

    # Verify note access
    note = await db.notes.find_one({"_id": ObjectId(note_id)})
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )

    is_owner = note["owner_id"] == user["id"]
    if not is_owner:
        shared = await db.shared_notes.find_one(
            {"note_id": note_id, "shared_with_user_id": user["id"]}
        )
        if not shared:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this note",
            )

    # Run the LangGraph RAG chain
    try:
        from app.graph.rag_graph import rag_chain

        result = await rag_chain.ainvoke(
            {
                "note_id": note_id,
                "user_id": user["id"],
                "question": data.question,
                "note_content": note.get("content", ""),
                "summary": note.get("summary", ""),
                "relevant_chunks": [],
                "chat_history": [],
                "answer": "",
                "use_rag": False,
            }
        )
        return AskAIResponse(answer=result["answer"], note_id=note_id)
    except Exception as e:
        logger.error(f"AI ask failed for note {note_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI processing failed. Please try again.",
        )


@router.get("/notes/{note_id}/chat-history", response_model=ChatHistoryResponse)
async def get_note_chat_history(
    note_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    note = await db.notes.find_one({"_id": ObjectId(note_id)})
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )

    messages = await get_chat_history(note_id, user["id"])
    return ChatHistoryResponse(
        note_id=note_id,
        messages=[{"role": m["role"], "content": m["content"]} for m in messages],
    )


@router.delete("/notes/{note_id}/chat-history")
async def clear_chat_history(
    note_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    await db.ai_chats.delete_one({"note_id": note_id, "user_id": user["id"]})
    return {"message": "Chat history cleared"}


@router.get("/notes/{note_id}/summary")
async def get_note_summary(
    note_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    note = await db.notes.find_one({"_id": ObjectId(note_id)})
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return {
        "note_id": note_id,
        "summary": note.get("summary", ""),
        "ai_status": note.get("ai_status", "pending"),
    }
