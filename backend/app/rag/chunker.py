from typing import List
import re


def chunk_text(text: str, chunk_size: int = 200, overlap: int = 30) -> List[str]:
    """Split text into overlapping chunks for embedding.

    Defaults tuned for sticky notes (short-form content).
    200 chars per chunk keeps granularity useful even for brief notes.
    """
    if not text or not text.strip():
        return []

    # Clean HTML tags
    clean_text = re.sub(r"<[^>]+>", " ", text)
    clean_text = re.sub(r"\s+", " ", clean_text).strip()

    if len(clean_text) <= chunk_size:
        return [clean_text]

    chunks = []
    sentences = re.split(r"(?<=[.!?])\s+", clean_text)

    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk = (
                f"{current_chunk} {sentence}".strip() if current_chunk else sentence
            )
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk)

    # Add overlap between chunks
    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_end = chunks[i - 1][-overlap:] if len(chunks[i - 1]) > overlap else chunks[i - 1]
            overlapped.append(f"{prev_end} {chunks[i]}")
        chunks = overlapped

    return chunks
