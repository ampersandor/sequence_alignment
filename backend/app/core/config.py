from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sequence Alignment API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: str = os.getenv("REDIS_PORT", "6379")
    
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    RESULT_DIR: str = os.path.join(DATA_DIR, "results")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.RESULT_DIR, exist_ok=True)
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
    
    class Config:
        case_sensitive = True

settings = Settings()