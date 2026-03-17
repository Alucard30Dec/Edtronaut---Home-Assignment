from functools import lru_cache

from redis import Redis
from rq import Queue

from app.core import settings


@lru_cache
def get_redis_connection() -> Redis:
    return Redis.from_url(settings.redis_url)


@lru_cache
def get_execution_queue() -> Queue:
    return Queue(name=settings.rq_queue_name, connection=get_redis_connection())


def enqueue_execution_job(execution_id: int, stdin_data: str | None = None):
    return get_execution_queue().enqueue(
        "app.workers.execution_worker.process_execution_job",
        execution_id,
        stdin_data=stdin_data,
    )
