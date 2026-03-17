from __future__ import annotations

from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.code_session import CodeSession
from app.models.execution import Execution
from app.runners.python_runner import (
    RUN_OUTCOME_COMPLETED,
    RUN_OUTCOME_TIMEOUT,
    RUN_OUTCOME_USER_ERROR,
    PythonRunResult,
)
from app.services.execution_service import (
    ExecutionQueueEnqueueError,
    ExecutionRateLimitedError,
    create_execution_and_enqueue,
    process_execution,
)


class ExecutionServiceTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.testing_session_local = sessionmaker(
            bind=cls.engine,
            autocommit=False,
            autoflush=False,
            class_=Session,
            expire_on_commit=False,
        )

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.testing_session_local()

    def tearDown(self) -> None:
        self.db.close()

    def _create_code_session(self, *, source_code: str = "print('hello')") -> CodeSession:
        code_session = CodeSession(
            language="python",
            template_code="",
            current_source_code=source_code,
            status="ACTIVE",
            version=1,
        )
        self.db.add(code_session)
        self.db.commit()
        self.db.refresh(code_session)
        return code_session

    def _create_execution(
        self,
        *,
        session_id: int,
        status: str = "QUEUED",
        queued_at: datetime | None = None,
    ) -> Execution:
        execution = Execution(
            session_id=session_id,
            status=status,
            source_code_snapshot="print('snapshot')",
            queued_at=queued_at or datetime.now(timezone.utc),
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def test_create_execution_enqueues_and_persists_snapshot(self) -> None:
        code_session = self._create_code_session(source_code="print('queued')")

        with patch("app.queue.enqueue_execution_job", return_value=object()) as mock_enqueue:
            execution = create_execution_and_enqueue(self.db, session_id=code_session.id)

        self.assertEqual(execution.status, "QUEUED")
        self.assertEqual(execution.source_code_snapshot, "print('queued')")
        mock_enqueue.assert_called_once_with(execution.id)

    def test_create_execution_rate_limit_subsecond_boundary(self) -> None:
        code_session = self._create_code_session(source_code="print('rate-limit')")
        self._create_execution(
            session_id=code_session.id,
            status="COMPLETED",
            queued_at=datetime.now(timezone.utc) - timedelta(seconds=0.25),
        )

        with patch("app.queue.enqueue_execution_job") as mock_enqueue:
            with self.assertRaises(ExecutionRateLimitedError) as context:
                create_execution_and_enqueue(self.db, session_id=code_session.id)

        self.assertGreater(context.exception.retry_after_seconds, 0.7)
        self.assertEqual(context.exception.retry_after_header_seconds, 1)
        mock_enqueue.assert_not_called()

    def test_create_execution_enqueue_failure_marks_execution_failed(self) -> None:
        code_session = self._create_code_session(source_code="print('enqueue-fail')")

        with patch("app.queue.enqueue_execution_job", side_effect=RuntimeError("redis down")):
            with self.assertRaises(ExecutionQueueEnqueueError):
                create_execution_and_enqueue(self.db, session_id=code_session.id)

        failed_execution = self.db.execute(
            select(Execution)
            .where(Execution.session_id == code_session.id)
            .order_by(Execution.id.desc())
            .limit(1)
        ).scalar_one()

        self.assertEqual(failed_execution.status, "FAILED")
        self.assertIsNotNone(failed_execution.finished_at)
        self.assertIn("Queue enqueue failed", failed_execution.error_message or "")

    def test_process_execution_completed_and_idempotent(self) -> None:
        code_session = self._create_code_session(source_code="print('worker')")
        execution = self._create_execution(session_id=code_session.id, status="QUEUED")
        successful_result = PythonRunResult(
            outcome=RUN_OUTCOME_COMPLETED,
            stdout="worker ok\n",
            stderr="",
            execution_time_ms=5,
        )

        def _runner_side_effect(*_args, **_kwargs) -> PythonRunResult:
            running = self.db.get(Execution, execution.id)
            self.assertIsNotNone(running)
            self.assertEqual(running.status, "RUNNING")
            return successful_result

        with patch(
            "app.services.execution_service.run_python_code",
            side_effect=_runner_side_effect,
        ) as mock_runner:
            process_execution(execution_id=execution.id, db=self.db)
            process_execution(execution_id=execution.id, db=self.db)

        self.assertEqual(mock_runner.call_count, 1)
        refreshed = self.db.get(Execution, execution.id)
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed.status, "COMPLETED")
        self.assertEqual(refreshed.stdout, "worker ok\n")
        self.assertIsNotNone(refreshed.started_at)
        self.assertIsNotNone(refreshed.finished_at)

    def test_process_execution_user_error_sets_failed(self) -> None:
        code_session = self._create_code_session(source_code="raise ValueError('boom')")
        execution = self._create_execution(session_id=code_session.id, status="QUEUED")
        user_error_result = PythonRunResult(
            outcome=RUN_OUTCOME_USER_ERROR,
            stdout="",
            stderr="Traceback...",
            execution_time_ms=9,
            error_message="User code exited with status 1.",
        )

        with patch(
            "app.services.execution_service.run_python_code",
            return_value=user_error_result,
        ):
            process_execution(execution_id=execution.id, db=self.db)

        refreshed = self.db.get(Execution, execution.id)
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed.status, "FAILED")
        self.assertEqual(refreshed.stderr, "Traceback...")
        self.assertEqual(refreshed.error_message, "User code exited with status 1.")

    def test_process_execution_timeout_sets_timeout(self) -> None:
        code_session = self._create_code_session(source_code="while True: pass")
        execution = self._create_execution(session_id=code_session.id, status="QUEUED")
        timeout_result = PythonRunResult(
            outcome=RUN_OUTCOME_TIMEOUT,
            stdout="",
            stderr="",
            execution_time_ms=1000,
            error_message="Execution timed out after 1 seconds.",
        )

        with patch(
            "app.services.execution_service.run_python_code",
            return_value=timeout_result,
        ):
            process_execution(execution_id=execution.id, db=self.db)

        refreshed = self.db.get(Execution, execution.id)
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed.status, "TIMEOUT")
        self.assertEqual(refreshed.error_message, "Execution timed out after 1 seconds.")


if __name__ == "__main__":
    unittest.main()
