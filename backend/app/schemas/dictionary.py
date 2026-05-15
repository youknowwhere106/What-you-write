from pydantic import BaseModel


class DictionaryResponse(BaseModel):
    word: str
    definition: str
    part_of_speech: str
