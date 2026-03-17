from app.services.execution_service import process_execution_job as _process_execution_job


def process_execution_job(execution_id: int, stdin_data: str | None = None) -> None:
    _process_execution_job(execution_id, stdin_data=stdin_data)
