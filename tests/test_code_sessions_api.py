from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_create_and_autosave_code_session() -> None:
    create_response = client.post(
        "/code-sessions",
        json={
            "language": "python",
            "template_code": "print('hello')",
            "current_source_code": "print('hello')",
        },
    )
    assert create_response.status_code == 201

    created = create_response.json()
    session_id = created["id"]
    version = created["version"]

    autosave_response = client.patch(
        f"/code-sessions/{session_id}",
        json={"current_source_code": "print('autosaved')", "version": version},
    )
    assert autosave_response.status_code == 200
    autosaved = autosave_response.json()

    assert autosaved["current_source_code"] == "print('autosaved')"
    assert autosaved["version"] == version + 1
