import httpx
from typing import Optional, List
from app.db.redis import redis_cache
import logging

logger = logging.getLogger(__name__)

FREE_DICT_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en"
DATAMUSE_BASE = "https://api.datamuse.com/words"


class DictionaryService:
    """
    Abstracted dictionary service with provider fallback chain:
    1. Oxford Dictionary API (if configured — plug-in ready)
    2. Free Dictionary API (primary free provider)
    3. Datamuse API (synonym fallback)
    """

    @staticmethod
    async def lookup(word: str) -> dict:
        """Look up a word's definition and synonyms."""
        word = word.strip().lower()
        if not word or not word.isalpha():
            return {
                "word": word,
                "definition": "",
                "part_of_speech": "",
                "synonyms": [],
            }

        # Check cache first
        cache_key = f"dict:{word}"
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        result = await DictionaryService._fetch_free_dictionary(word)

        # If Free Dictionary returned no synonyms, supplement with Datamuse
        if not result["synonyms"]:
            datamuse_syns = await DictionaryService._fetch_datamuse_synonyms(word)
            result["synonyms"] = datamuse_syns

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
            "synonyms": [],
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

                # Collect synonyms from all meanings
                synonyms = set()
                for meaning in meanings:
                    for syn in meaning.get("synonyms", []):
                        synonyms.add(syn)
                    for defn in meaning.get("definitions", []):
                        for syn in defn.get("synonyms", []):
                            synonyms.add(syn)

                return {
                    "word": word,
                    "definition": definition_text,
                    "part_of_speech": first_meaning.get("partOfSpeech", ""),
                    "synonyms": list(synonyms)[:15],  # Cap at 15
                }
        except Exception as e:
            logger.warning(f"Free Dictionary API error for '{word}': {e}")
            return fallback

    @staticmethod
    async def _fetch_datamuse_synonyms(word: str) -> List[str]:
        """Fetch synonyms from Datamuse API (fallback)."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    DATAMUSE_BASE, params={"rel_syn": word, "max": 15}
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
                return [item["word"] for item in data if "word" in item][:15]
        except Exception as e:
            logger.warning(f"Datamuse API error for '{word}': {e}")
            return []

    # ─── Oxford API (plug-in ready) ───
    # To enable: set OXFORD_APP_ID and OXFORD_APP_KEY in config/env
    # Then uncomment and wire into lookup() as the first provider.
    #
    # @staticmethod
    # async def _fetch_oxford(word: str) -> dict:
    #     from app.core.config import settings
    #     headers = {
    #         "app_id": settings.OXFORD_APP_ID,
    #         "app_key": settings.OXFORD_APP_KEY,
    #     }
    #     url = f"https://od-api-sandbox.oxforddictionaries.com/api/v2/entries/en-gb/{word}"
    #     async with httpx.AsyncClient(timeout=5.0) as client:
    #         resp = await client.get(url, headers=headers)
    #         ...


dictionary_service = DictionaryService()
