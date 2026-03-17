from app.services.execution_service import process_execution_job as _process_execution_job


def process_execution_job(execution_id: int) -> None:
    _process_execution_job(execution_id)
