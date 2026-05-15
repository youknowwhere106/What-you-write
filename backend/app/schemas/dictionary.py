from pydantic import BaseModel
from typing import List


class DictionaryResponse(BaseModel):
    word: str
    definition: str
    part_of_speech: str
    synonyms: List[str]
