from pydantic_settings import BaseSettings
from typing import List


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
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

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
