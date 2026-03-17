from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core import settings
from app.db.session import SessionLocal
from app.models.code_session import CodeSession
from app.models.execution import Execution
from app.runners import (
    RUN_OUTCOME_COMPLETED,
    RUN_OUTCOME_RUNNER_ERROR,
    RUN_OUTCOME_TIMEOUT,
    RUN_OUTCOME_USER_ERROR,
    run_python_code,
)


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


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def process_execution(execution_id: int, db: Session) -> None:
    """Process one execution record from queued state to a final state."""

    started_at = _now_utc()
    transitioned = db.execute(
        update(Execution)
        .where(Execution.id == execution_id, Execution.status == "QUEUED")
        .values(status="RUNNING", started_at=started_at)
    )
    db.commit()

    # Another worker may have already taken/finished this execution.
    if transitioned.rowcount == 0:
        return

    execution = db.get(Execution, execution_id)
    if execution is None:  # pragma: no cover - defensive fallback
        return

    result = run_python_code(
        execution.source_code_snapshot,
        timeout_seconds=settings.execution_timeout_seconds,
        memory_limit_mb=settings.execution_memory_limit_mb,
        python_executable=settings.python_runner_executable,
    )

    if result.outcome == RUN_OUTCOME_COMPLETED:
        execution.status = "COMPLETED"
    elif result.outcome == RUN_OUTCOME_TIMEOUT:
        execution.status = "TIMEOUT"
    elif result.outcome == RUN_OUTCOME_USER_ERROR:
        execution.status = "FAILED"
    elif result.outcome == RUN_OUTCOME_RUNNER_ERROR:
        execution.status = "FAILED"
    else:  # pragma: no cover - defensive fallback
        execution.status = "FAILED"
        result.error_message = result.error_message or "Runner infrastructure error: unknown outcome."

    execution.stdout = result.stdout
    execution.stderr = result.stderr
    execution.error_message = result.error_message
    execution.execution_time_ms = result.execution_time_ms
    execution.finished_at = _now_utc()

    db.add(execution)
    db.commit()


def process_execution_job(execution_id: int) -> None:
    """RQ worker entry: process one queued execution safely."""

    db = SessionLocal()
    try:
        process_execution(execution_id=execution_id, db=db)
    except Exception as exc:
        # Infrastructure-level failure in processing path.
        execution = db.get(Execution, execution_id)
        if execution is not None and execution.status in {"QUEUED", "RUNNING"}:
            execution.status = "FAILED"
            execution.error_message = f"Runner infrastructure error: {type(exc).__name__}: {exc}"
            execution.finished_at = _now_utc()
            db.add(execution)
            db.commit()
        raise
    finally:
        db.close()
