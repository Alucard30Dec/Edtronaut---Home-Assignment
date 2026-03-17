import unittest
from unittest.mock import patch


def _load_api_test_dependencies():
    try:
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine, select
        from sqlalchemy.orm import Session, sessionmaker
        from sqlalchemy.pool import StaticPool

        from app.db.base import Base
        from app.db.session import get_db
        from app.main import app
        from app.models.code_session import CodeSession
        from app.models.execution import Execution

        return {
            "TestClient": TestClient,
            "create_engine": create_engine,
            "select": select,
            "Session": Session,
            "sessionmaker": sessionmaker,
            "StaticPool": StaticPool,
            "Base": Base,
            "get_db": get_db,
            "app": app,
            "CodeSession": CodeSession,
            "Execution": Execution,
        }, None
    except Exception as exc:  # pragma: no cover - optional dependency fallback
        message = str(exc)
        missing_httpx = isinstance(exc, RuntimeError) and "requires the httpx package" in message
        missing_module = isinstance(exc, ModuleNotFoundError)
        if missing_module or missing_httpx:
            return None, message
        raise


_API_DEPS, _API_DEPS_ERROR = _load_api_test_dependencies()
DEPS_AVAILABLE = _API_DEPS is not None

if DEPS_AVAILABLE:
    TestClient = _API_DEPS["TestClient"]
    create_engine = _API_DEPS["create_engine"]
    select = _API_DEPS["select"]
    Session = _API_DEPS["Session"]
    sessionmaker = _API_DEPS["sessionmaker"]
    StaticPool = _API_DEPS["StaticPool"]
    Base = _API_DEPS["Base"]
    get_db = _API_DEPS["get_db"]
    app = _API_DEPS["app"]
    CodeSession = _API_DEPS["CodeSession"]
    Execution = _API_DEPS["Execution"]


@unittest.skipUnless(
    DEPS_AVAILABLE,
    f"api test dependencies are unavailable: {_API_DEPS_ERROR}",
)
class ExecutionsAPITestCase(unittest.TestCase):
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
        )
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.testing_session_local()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()

    def setUp(self) -> None:
        db = self.testing_session_local()
        try:
            db.query(Execution).delete()
            db.query(CodeSession).delete()
            db.commit()
        finally:
            db.close()

    def _create_session(self) -> int:
        response = self.client.post(
            "/code-sessions",
            json={
                "language": "python",
                "template_code": "print('hello')",
                "current_source_code": "print('hello world')",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["id"]

    def test_run_and_get_execution(self) -> None:
        session_id = self._create_session()

        with patch("app.queue.enqueue_execution_job", return_value=object()) as mock_enqueue:
            run_response = self.client.post(f"/code-sessions/{session_id}/run")

        self.assertEqual(run_response.status_code, 202)
        run_payload = run_response.json()
        self.assertEqual(run_payload["status"], "QUEUED")
        self.assertIn("execution_id", run_payload)
        mock_enqueue.assert_called_once_with(run_payload["execution_id"], stdin_data=None)

        get_response = self.client.get(f"/executions/{run_payload['execution_id']}")
        self.assertEqual(get_response.status_code, 200)
        execution_payload = get_response.json()
        self.assertEqual(execution_payload["id"], run_payload["execution_id"])
        self.assertEqual(execution_payload["session_id"], session_id)
        self.assertEqual(execution_payload["status"], "QUEUED")
        self.assertEqual(execution_payload["source_code_snapshot"], "print('hello world')")

    def test_run_with_stdin_payload_for_online_judge_mode(self) -> None:
        session_id = self._create_session()

        with patch("app.queue.enqueue_execution_job", return_value=object()) as mock_enqueue:
            run_response = self.client.post(
                f"/code-sessions/{session_id}/run",
                json={"stdin_data": "17\n"},
            )

        self.assertEqual(run_response.status_code, 202)
        run_payload = run_response.json()
        self.assertEqual(run_payload["status"], "QUEUED")
        mock_enqueue.assert_called_once_with(run_payload["execution_id"], stdin_data="17\n")

    def test_run_enqueue_failure_marks_failed_and_returns_503(self) -> None:
        session_id = self._create_session()

        with patch("app.queue.enqueue_execution_job", side_effect=RuntimeError("redis unavailable")):
            run_response = self.client.post(f"/code-sessions/{session_id}/run")

        self.assertEqual(run_response.status_code, 503)
        self.assertIn("marked as FAILED", run_response.json()["detail"])

        db = self.testing_session_local()
        try:
            failed_execution = db.execute(
                select(Execution)
                .where(Execution.session_id == session_id)
                .order_by(Execution.id.desc())
                .limit(1)
            ).scalar_one()
        finally:
            db.close()

        self.assertEqual(failed_execution.status, "FAILED")
        self.assertIn("Queue enqueue failed", failed_execution.error_message or "")


if __name__ == "__main__":
    unittest.main()
