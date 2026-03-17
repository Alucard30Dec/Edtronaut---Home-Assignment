from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core import settings
from app.db.session import SessionLocal
from app.models.code_session import CodeSession
from app.models.execution import Execution
from app.runners import run_python_code
from app.core.execution_policy import (
    build_transition_plan,
    calculate_retry_after_seconds,
    is_language_allowed,
    source_size_bytes,
)

logger = logging.getLogger(__name__)


class ExecutionSessionNotFoundError(LookupError):
    pass


class ExecutionNotFoundError(LookupError):
    pass


class UnsupportedExecutionLanguageError(ValueError):
    pass


class ExecutionSourceTooLargeError(ValueError):
    def __init__(self, *, source_size_bytes_value: int, max_size_bytes: int) -> None:
        super().__init__(
            f"Source exceeds limit ({source_size_bytes_value} bytes > {max_size_bytes} bytes)."
        )
        self.source_size_bytes_value = source_size_bytes_value
        self.max_size_bytes = max_size_bytes


class ExecutionRateLimitedError(ValueError):
    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(
            f"Run requested too frequently. Retry after {retry_after_seconds} seconds."
        )
        self.retry_after_seconds = retry_after_seconds


EXECUTION_STATES = {"QUEUED", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _log_lifecycle(event: str, *, level: int = logging.INFO, **fields: object) -> None:
    payload = " ".join(f"{key}={fields[key]}" for key in sorted(fields))
    logger.log(level, "execution.%s %s", event, payload)


def create_execution_and_enqueue(db: Session, session_id: int) -> Execution:
    from app.queue import enqueue_execution_job

    session = db.get(CodeSession, session_id)
    if session is None:
        _log_lifecycle("queue_rejected_missing_session", level=logging.WARNING, session_id=session_id)
        raise ExecutionSessionNotFoundError(f"Session {session_id} does not exist.")

    if not is_language_allowed(session.language, settings.execution_allowed_languages):
        _log_lifecycle(
            "queue_rejected_language",
            level=logging.WARNING,
            session_id=session.id,
            language=session.language,
        )
        raise UnsupportedExecutionLanguageError(
            f"Language '{session.language}' is not allowed for execution. "
            f"Allowed: {', '.join(settings.execution_allowed_languages)}."
        )

    snapshot = session.current_source_code or ""
    snapshot_size_bytes = source_size_bytes(snapshot)
    if snapshot_size_bytes > settings.execution_max_source_size_bytes:
        _log_lifecycle(
            "queue_rejected_source_too_large",
            level=logging.WARNING,
            session_id=session.id,
            source_size_bytes=snapshot_size_bytes,
            max_size_bytes=settings.execution_max_source_size_bytes,
        )
        raise ExecutionSourceTooLargeError(
            source_size_bytes_value=snapshot_size_bytes,
            max_size_bytes=settings.execution_max_source_size_bytes,
        )

    latest_execution = db.execute(
        select(Execution)
        .where(Execution.session_id == session.id)
        .order_by(Execution.queued_at.desc(), Execution.id.desc())
        .limit(1)
    ).scalar_one_or_none()

    now = _now_utc()
    retry_after_seconds = calculate_retry_after_seconds(
        last_queued_at=latest_execution.queued_at if latest_execution is not None else None,
        now=now,
        min_interval_seconds=settings.execution_min_interval_seconds,
    )
    if retry_after_seconds > 0:
        _log_lifecycle(
            "queue_rejected_rate_limited",
            level=logging.WARNING,
            session_id=session.id,
            retry_after_seconds=retry_after_seconds,
        )
        raise ExecutionRateLimitedError(retry_after_seconds=retry_after_seconds)

    execution = Execution(
        session_id=session.id,
        status="QUEUED",
        queued_at=now,
        # Snapshot is intentionally immutable to preserve run reproducibility.
        source_code_snapshot=snapshot,
    )

    db.add(execution)
    db.commit()
    db.refresh(execution)

    enqueue_execution_job(execution.id)

    _log_lifecycle(
        "queued",
        execution_id=execution.id,
        session_id=execution.session_id,
        source_size_bytes=snapshot_size_bytes,
        retry_count=execution.retry_count,
    )
    return execution


def get_execution_by_id(db: Session, execution_id: int) -> Execution:
    execution = db.get(Execution, execution_id)
    if execution is None:
        raise ExecutionNotFoundError(f"Execution {execution_id} does not exist.")
    return execution


def process_execution(execution_id: int, db: Session) -> None:
    """Process one execution record from queued state to a final state."""

    started_at = _now_utc()
    transitioned = db.execute(
        update(Execution)
        .where(Execution.id == execution_id, Execution.status == "QUEUED")
        .values(status="RUNNING", started_at=started_at)
    )
    db.commit()

    # Idempotency protection: duplicate jobs only process rows still in QUEUED state.
    if transitioned.rowcount == 0:
        existing = db.get(Execution, execution_id)
        _log_lifecycle(
            "skip_nonqueued",
            execution_id=execution_id,
            current_status=existing.status if existing is not None else "MISSING",
        )
        return

    execution = db.get(Execution, execution_id)
    if execution is None:  # pragma: no cover - defensive fallback
        _log_lifecycle(
            "missing_after_transition",
            level=logging.WARNING,
            execution_id=execution_id,
        )
        return

    _log_lifecycle(
        "running",
        execution_id=execution.id,
        session_id=execution.session_id,
        retry_count=execution.retry_count,
    )

    result = run_python_code(
        execution.source_code_snapshot,
        timeout_seconds=settings.execution_timeout_seconds,
        memory_limit_mb=settings.execution_memory_limit_mb,
        python_executable=settings.python_runner_executable,
    )

    plan = build_transition_plan(
        outcome=result.outcome,
        retry_count=execution.retry_count,
        max_infra_retries=settings.execution_infra_max_retries,
    )

    execution.stdout = result.stdout
    execution.stderr = result.stderr
    execution.error_message = result.error_message
    execution.execution_time_ms = result.execution_time_ms

    if plan.should_retry:
        from app.queue import enqueue_execution_job

        execution.retry_count += 1
        execution.status = "QUEUED"
        execution.started_at = None
        execution.finished_at = None
        db.add(execution)
        db.commit()

        try:
            enqueue_execution_job(execution.id)
            _log_lifecycle(
                "retry_queued",
                level=logging.WARNING,
                execution_id=execution.id,
                retry_count=execution.retry_count,
                max_retries=settings.execution_infra_max_retries,
            )
        except Exception as exc:  # pragma: no cover - depends on queue availability
            execution.status = "FAILED"
            execution.finished_at = _now_utc()
            execution.error_message = (
                f"Runner infrastructure error: retry enqueue failed: {type(exc).__name__}: {exc}"
            )
            db.add(execution)
            db.commit()
            _log_lifecycle(
                "retry_enqueue_failed",
                level=logging.ERROR,
                execution_id=execution.id,
                retry_count=execution.retry_count,
            )
        return

    execution.status = plan.next_status
    if plan.is_infrastructure_failure and not execution.error_message:
        execution.error_message = "Runner infrastructure error."

    execution.finished_at = _now_utc()
    db.add(execution)
    db.commit()

    _log_lifecycle(
        "finished",
        level=logging.INFO if execution.status == "COMPLETED" else logging.WARNING,
        execution_id=execution.id,
        status=execution.status,
        retry_count=execution.retry_count,
        execution_time_ms=execution.execution_time_ms,
    )


def process_execution_job(execution_id: int) -> None:
    """RQ worker entry: process one queued execution safely."""

    db = SessionLocal()
    try:
        process_execution(execution_id=execution_id, db=db)
    except Exception as exc:
        execution = db.get(Execution, execution_id)
        if execution is not None and execution.status in {"QUEUED", "RUNNING"}:
            execution.status = "FAILED"
            execution.error_message = f"Runner infrastructure error: {type(exc).__name__}: {exc}"
            execution.finished_at = _now_utc()
            db.add(execution)
            db.commit()

        _log_lifecycle(
            "job_exception",
            level=logging.ERROR,
            execution_id=execution_id,
            error_type=type(exc).__name__,
        )
        raise
    finally:
        db.close()
