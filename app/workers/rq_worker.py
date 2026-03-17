import logging

from rq import Worker

from app.core import settings
from app.queue import get_redis_connection


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    connection = get_redis_connection()
    worker = Worker([settings.rq_queue_name], connection=connection)
    worker.work()


if __name__ == "__main__":
    main()
