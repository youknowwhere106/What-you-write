from pydantic import BaseModel, Field
from typing import List, Optional


class AskAIRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatMessage(BaseModel):
    role: str
    content: str


class AskAIResponse(BaseModel):
    answer: str
    note_id: str


class ChatHistoryResponse(BaseModel):
    note_id: str
    messages: List[ChatMessage]


class AISummaryResponse(BaseModel):
    note_id: str
    summary: str
    ai_status: str
