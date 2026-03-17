import unittest

def _load_api_test_dependencies():
    try:
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session, sessionmaker
        from sqlalchemy.pool import StaticPool

        from app.db.base import Base
        from app.db.session import get_db
        from app.main import app

        return {
            "TestClient": TestClient,
            "create_engine": create_engine,
            "Session": Session,
            "sessionmaker": sessionmaker,
            "StaticPool": StaticPool,
            "Base": Base,
            "get_db": get_db,
            "app": app,
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
    Session = _API_DEPS["Session"]
    sessionmaker = _API_DEPS["sessionmaker"]
    StaticPool = _API_DEPS["StaticPool"]
    Base = _API_DEPS["Base"]
    get_db = _API_DEPS["get_db"]
    app = _API_DEPS["app"]


@unittest.skipUnless(
    DEPS_AVAILABLE,
    f"api test dependencies are unavailable: {_API_DEPS_ERROR}",
)
class CodeSessionsAPITestCase(unittest.TestCase):
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

    def test_create_and_autosave_code_session(self) -> None:
        create_response = self.client.post(
            "/code-sessions",
            json={
                "language": "python",
                "template_code": "print('hello')",
                "current_source_code": "print('hello')",
            },
        )
        self.assertEqual(create_response.status_code, 201)

        created = create_response.json()
        session_id = created["id"]
        version = created["version"]
        self.assertEqual(created["status"], "ACTIVE")

        autosave_response = self.client.patch(
            f"/code-sessions/{session_id}",
            json={"current_source_code": "print('autosaved')", "version": version},
        )
        self.assertEqual(autosave_response.status_code, 200)

        autosaved = autosave_response.json()
        self.assertEqual(autosaved["current_source_code"], "print('autosaved')")
        self.assertEqual(autosaved["version"], version + 1)


if __name__ == "__main__":
    unittest.main()
