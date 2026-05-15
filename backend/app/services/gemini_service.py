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
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = (
        "Summarize the following note in 1-2 concise sentences. "
        "Focus on the key points and action items.\n\n"
        f"Note content:\n{content}"
    )
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini summary generation failed: {e}")
        raise


def ask_question(
    question: str,
    summary: str,
    relevant_chunks: list,
    chat_history: list,
) -> str:
    """Answer a question about a note using RAG context."""
    _ensure_configured()
    model = genai.GenerativeModel("gemini-2.0-flash")

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

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini question answering failed: {e}")
        raise
