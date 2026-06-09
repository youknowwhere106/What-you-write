from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List
from urllib.parse import urlparse, urlunparse


def _redis_db(url: str, db: int) -> str:
    parsed = urlparse(url)
    return urlunparse(parsed._replace(path=f"/{db}"))


class Settings(BaseSettings):
    APP_NAME: str = "What-you-write ?"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    MONGODB_URL: str = "mongodb://localhost:27017/whatyouwrite"
    DATABASE_NAME: str = "whatyouwrite"

    JWT_SECRET_KEY: str = "CHANGE_ME_in_Railway_env_vars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    GEMINI_API_KEY: str = ""

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @model_validator(mode="after")
    def derive_celery_urls(self):
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = _redis_db(self.REDIS_URL, 1)
        if not self.CELERY_RESULT_BACKEND:
            self.CELERY_RESULT_BACKEND = _redis_db(self.REDIS_URL, 2)
        return self

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://what-you-write.vercel.app"

    EMBEDDING_PROVIDER: str = "sentence-transformers"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Minimum word count for a note to go through full RAG pipeline
    # Below this, the raw note text is used directly as context (no chunking/embedding)
    RAG_MIN_WORDS: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        # On Railway all config comes from environment variables, not .env files.
        # The env_file is only used for local development.
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
