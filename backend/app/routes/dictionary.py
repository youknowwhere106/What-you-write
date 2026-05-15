from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.dictionary import DictionaryResponse
from app.services.dictionary_service import dictionary_service
from app.middleware.auth import get_current_user
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dictionary/{word}", response_model=DictionaryResponse)
async def lookup_word(
    word: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Look up the definition of a word."""
    word = word.strip().lower()
    if not word or len(word) > 50 or not word.isalpha():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid single word (letters only).",
        )

    result = await dictionary_service.lookup(word)

    if not result["definition"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No definition found for '{word}'.",
        )

    return result
