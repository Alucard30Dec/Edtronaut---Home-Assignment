from sqlalchemy.orm import Session

from app.models.code_session import CodeSession
from app.models.execution import Execution


class ExecutionSessionNotFoundError(LookupError):
    pass


class ExecutionNotFoundError(LookupError):
    pass


EXECUTION_STATES = {"QUEUED", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"}


def create_execution_and_enqueue(db: Session, session_id: int) -> Execution:
    from app.queue import enqueue_execution_job

    session = db.get(CodeSession, session_id)
    if session is None:
        raise ExecutionSessionNotFoundError(f"Session {session_id} does not exist.")

    execution = Execution(
        session_id=session.id,
        status="QUEUED",
        # Snapshot is intentionally immutable to preserve run reproducibility.
        source_code_snapshot=session.current_source_code,
    )

    db.add(execution)
    db.commit()
    db.refresh(execution)

    enqueue_execution_job(execution.id)
    return execution


def get_execution_by_id(db: Session, execution_id: int) -> Execution:
    execution = db.get(Execution, execution_id)
    if execution is None:
        raise ExecutionNotFoundError(f"Execution {execution_id} does not exist.")
    return execution
