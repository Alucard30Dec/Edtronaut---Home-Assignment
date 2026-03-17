import os
from dataclasses import dataclass
from functools import lru_cache

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional local dependency fallback
    def load_dotenv() -> bool:
        return False

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    database_url: str
    redis_url: str
    rq_queue_name: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "Live Code Execution & Management API"),
        environment=os.getenv("ENVIRONMENT", "development"),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@localhost:5432/live_exec",
        ),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        rq_queue_name=os.getenv("RQ_QUEUE_NAME", "code_execution"),
    )


settings = get_settings()
