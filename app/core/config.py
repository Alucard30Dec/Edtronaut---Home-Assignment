import os
from dataclasses import dataclass
from functools import lru_cache

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional local dependency fallback
    def load_dotenv() -> bool:
        return False

load_dotenv()


def _parse_csv_lower(raw_value: str) -> tuple[str, ...]:
    values = [item.strip().lower() for item in raw_value.split(",") if item.strip()]
    return tuple(values)


def _parse_csv(raw_value: str) -> tuple[str, ...]:
    values = [item.strip() for item in raw_value.split(",") if item.strip()]
    return tuple(values)


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    database_url: str
    redis_url: str
    rq_queue_name: str
    execution_timeout_seconds: int
    execution_memory_limit_mb: int
    python_runner_executable: str
    cors_allowed_origins: tuple[str, ...]
    execution_allowed_languages: tuple[str, ...]
    execution_max_source_size_bytes: int
    execution_min_interval_seconds: int
    execution_infra_max_retries: int


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
        execution_timeout_seconds=int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "5")),
        execution_memory_limit_mb=int(os.getenv("EXECUTION_MEMORY_LIMIT_MB", "128")),
        python_runner_executable=os.getenv("PYTHON_RUNNER_EXECUTABLE", "python3"),
        cors_allowed_origins=_parse_csv(
            os.getenv(
                "CORS_ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        ),
        execution_allowed_languages=_parse_csv_lower(
            os.getenv("EXECUTION_ALLOWED_LANGUAGES", "python")
        ),
        execution_max_source_size_bytes=int(
            os.getenv("EXECUTION_MAX_SOURCE_SIZE_BYTES", "50000")
        ),
        execution_min_interval_seconds=int(
            os.getenv("EXECUTION_MIN_INTERVAL_SECONDS", "1")
        ),
        execution_infra_max_retries=int(os.getenv("EXECUTION_INFRA_MAX_RETRIES", "1")),
    )


settings = get_settings()
