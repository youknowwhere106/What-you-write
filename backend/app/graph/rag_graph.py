"""
Lightweight LangGraph flow for the Ask-AI pipeline.

Flow:
  question → retrieve_chunks → fetch_history → build_prompt → gemini_response → save_response
"""

from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from app.rag.retriever import (
    retrieve_relevant_chunks,
    get_note_summary,
    get_chat_history,
    save_chat_message,
)
from app.services.gemini_service import ask_question
from app.core.config import settings
import re
import logging

logger = logging.getLogger(__name__)


class RAGState(TypedDict):
    note_id: str
    user_id: str
    question: str
    note_content: str
    summary: str
    relevant_chunks: List[Dict]
    chat_history: List[Dict]
    answer: str
    use_rag: bool


async def retrieve_chunks(state: RAGState) -> RAGState:
    """Retrieve relevant chunks only if note is long enough for RAG."""
    word_count = len(re.sub(r"<[^>]+>", " ", state["note_content"]).split())
    use_rag = word_count >= settings.RAG_MIN_WORDS

    if use_rag:
        chunks = await retrieve_relevant_chunks(state["note_id"], state["question"])
    else:
        # Short note: use the raw text as the single "chunk"
        chunks = [{"chunk_text": state["note_content"], "score": 1.0}]

    return {**state, "relevant_chunks": chunks, "use_rag": use_rag}


async def fetch_history(state: RAGState) -> RAGState:
    summary = await get_note_summary(state["note_id"])
    history = await get_chat_history(state["note_id"], state["user_id"])
    return {**state, "summary": summary, "chat_history": history}


async def generate_response(state: RAGState) -> RAGState:
    answer = ask_question(
        question=state["question"],
        summary=state["summary"],
        relevant_chunks=state["relevant_chunks"],
        chat_history=state["chat_history"],
    )
    return {**state, "answer": answer}


async def save_response(state: RAGState) -> RAGState:
    await save_chat_message(state["note_id"], state["user_id"], "user", state["question"])
    await save_chat_message(state["note_id"], state["user_id"], "assistant", state["answer"])
    return state


def build_rag_graph():
    graph = StateGraph(RAGState)

    graph.add_node("retrieve_chunks", retrieve_chunks)
    graph.add_node("fetch_history", fetch_history)
    graph.add_node("generate_response", generate_response)
    graph.add_node("save_response", save_response)

    graph.set_entry_point("retrieve_chunks")
    graph.add_edge("retrieve_chunks", "fetch_history")
    graph.add_edge("fetch_history", "generate_response")
    graph.add_edge("generate_response", "save_response")
    graph.add_edge("save_response", END)

    return graph.compile()


rag_chain = build_rag_graph()
