import google.generativeai as genai
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_configured = False


def _ensure_configured():
    global _configured
    if not _configured:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


def generate_summary(content: str) -> str:
    """Generate a concise summary of note content."""
    _ensure_configured()
    model_name = "gemini-1.5-flash"
    model = genai.GenerativeModel(model_name)
    prompt = (
        "Summarize the following note in 1-2 concise sentences. "
        "Focus on the key points and action items.\n\n"
        f"Note content:\n{content}"
    )

    logger.info("Gemini summary: calling model=%s content_len=%d", model_name, len(content))

    try:
        response = model.generate_content(prompt)
    except Exception as e:
        logger.exception(
            "Gemini generate_content failed during summary. model=%s error_type=%s error=%s",
            model_name, type(e).__name__, e,
        )
        raise

    logger.info(
        "Gemini summary: response received type=%s repr=%s",
        type(response).__name__, repr(response),
    )

    if hasattr(response, "prompt_feedback"):
        logger.info("Gemini summary: prompt_feedback=%s", response.prompt_feedback)

    if hasattr(response, "candidates"):
        count = len(response.candidates) if response.candidates else 0
        logger.info("Gemini summary: candidates_count=%d", count)
        if count > 0:
            logger.info("Gemini summary: first_candidate=%s", repr(response.candidates[0]))

    try:
        text = response.text
        logger.info("Gemini summary: response.text extracted len=%d", len(text) if text else 0)
        return text.strip()
    except Exception as e:
        logger.exception(
            "Gemini summary: response.text access failed. error_type=%s error=%s repr=%s",
            type(e).__name__, e, repr(response),
        )
        raise


def ask_question(
    question: str,
    summary: str,
    relevant_chunks: list,
    chat_history: list,
) -> str:
    """Answer a question about a note using RAG context."""
    _ensure_configured()
    model_name = "gemini-2.0-flash"
    model = genai.GenerativeModel(model_name)

    chunks_text = "\n".join(
        [f"- {c['chunk_text']}" for c in relevant_chunks if c.get("chunk_text")]
    )

    history_text = ""
    if chat_history:
        history_lines = []
        for msg in chat_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role}: {msg['content']}")
        history_text = "\n".join(history_lines)

    prompt = f"""You are a helpful AI assistant answering questions about a user's note.

Note Summary:
{summary or 'No summary available.'}

Relevant Excerpts:
{chunks_text or 'No specific excerpts found.'}

{f'Previous Conversation:{chr(10)}{history_text}' if history_text else ''}

User Question: {question}

Answer the question based on the note content above. Be concise, helpful, and accurate.
If the information isn't in the note, say so honestly."""

    logger.info(
        "Gemini ask_question: calling model=%s question_len=%d chunks=%d",
        model_name, len(question), len(relevant_chunks),
    )

    try:
        response = model.generate_content(prompt)
    except Exception as e:
        logger.exception(
            "Gemini generate_content failed during ask_question. model=%s error_type=%s error=%s",
            model_name, type(e).__name__, e,
        )
        raise

    logger.info(
        "Gemini ask_question: response received type=%s repr=%s",
        type(response).__name__, repr(response),
    )

    if hasattr(response, "prompt_feedback"):
        logger.info("Gemini ask_question: prompt_feedback=%s", response.prompt_feedback)

    if hasattr(response, "candidates"):
        count = len(response.candidates) if response.candidates else 0
        logger.info("Gemini ask_question: candidates_count=%d", count)
        if count > 0:
            logger.info("Gemini ask_question: first_candidate=%s", repr(response.candidates[0]))

    try:
        text = response.text
        logger.info("Gemini ask_question: response.text extracted len=%d", len(text) if text else 0)
        return text.strip()
    except Exception as e:
        logger.exception(
            "Gemini ask_question: response.text access failed. error_type=%s error=%s repr=%s",
            type(e).__name__, e, repr(response),
        )
        raise
