from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum


class NoteColor(str, Enum):
    YELLOW = "yellow"
    PINK = "pink"
    BLUE = "blue"
    GREEN = "green"
    PURPLE = "purple"
    ORANGE = "orange"


class AIStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    color: NoteColor = NoteColor.YELLOW


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    color: Optional[NoteColor] = None


class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    owner_id: str
    summary: Optional[str] = None
    ai_status: str = "pending"
    color: str = "yellow"
    created_at: str
    updated_at: str
    is_shared: bool = False


class NoteListResponse(BaseModel):
    notes: List[NoteResponse]
    total: int
    page: int
    page_size: int


class ShareNoteRequest(BaseModel):
    share_with_email: EmailStr
