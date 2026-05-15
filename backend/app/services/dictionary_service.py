import httpx
from app.db.redis import redis_cache
import logging

logger = logging.getLogger(__name__)

FREE_DICT_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en"


class DictionaryService:
    """
    Dictionary service using Free Dictionary API for word definitions.
    """

    @staticmethod
    async def lookup(word: str) -> dict:
        """Look up a word's definition."""
        word = word.strip().lower()
        if not word or not word.isalpha():
            return {
                "word": word,
                "definition": "",
                "part_of_speech": "",
            }

        # Check cache first
        cache_key = f"dict:{word}"
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        result = await DictionaryService._fetch_free_dictionary(word)

        # Cache for 24 hours — word definitions don't change often
        await redis_cache.set(cache_key, result, ttl=86400)
        return result

    @staticmethod
    async def _fetch_free_dictionary(word: str) -> dict:
        """Fetch from Free Dictionary API."""
        fallback = {
            "word": word,
            "definition": "",
            "part_of_speech": "",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{FREE_DICT_BASE}/{word}")
                if resp.status_code != 200:
                    return fallback

                data = resp.json()
                if not isinstance(data, list) or not data:
                    return fallback

                entry = data[0]
                meanings = entry.get("meanings", [])
                if not meanings:
                    return fallback

                first_meaning = meanings[0]
                definitions = first_meaning.get("definitions", [])
                definition_text = definitions[0].get("definition", "") if definitions else ""

                return {
                    "word": word,
                    "definition": definition_text,
                    "part_of_speech": first_meaning.get("partOfSpeech", ""),
                }
        except Exception as e:
            logger.warning(f"Free Dictionary API error for '{word}': {e}")
            return fallback


dictionary_service = DictionaryService()
