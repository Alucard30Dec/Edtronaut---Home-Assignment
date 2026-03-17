from __future__ import annotations

import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.schemas.code_session import CodeSessionAutosaveRequest, CodeSessionCreateRequest
from app.services.code_session_service import (
    CodeSessionNotFoundError,
    StaleAutosaveError,
    autosave_code_session,
    create_code_session,
    get_code_session,
)


class CodeSessionServiceTestCase(unittest.TestCase):
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

    def test_create_autosave_and_get(self) -> None:
        created = create_code_session(
            self.db,
            CodeSessionCreateRequest(
                language="python",
                template_code="print('template')",
                current_source_code="print('initial')",
            ),
        )
        self.assertEqual(created.status, "ACTIVE")
        self.assertEqual(created.version, 1)

        autosaved = autosave_code_session(
            self.db,
            session_id=created.id,
            payload=CodeSessionAutosaveRequest(
                current_source_code="print('updated')",
                version=1,
            ),
        )
        self.assertEqual(autosaved.current_source_code, "print('updated')")
        self.assertEqual(autosaved.version, 2)

        fetched = get_code_session(self.db, session_id=created.id)
        self.assertEqual(fetched.id, created.id)
        self.assertEqual(fetched.current_source_code, "print('updated')")

    def test_get_missing_session_raises(self) -> None:
        with self.assertRaises(CodeSessionNotFoundError):
            get_code_session(self.db, session_id=999)

    def test_autosave_stale_version_raises(self) -> None:
        created = create_code_session(
            self.db,
            CodeSessionCreateRequest(
                language="python",
                template_code="print('template')",
                current_source_code="print('initial')",
            ),
        )

        with self.assertRaises(StaleAutosaveError):
            autosave_code_session(
                self.db,
                session_id=created.id,
                payload=CodeSessionAutosaveRequest(
                    current_source_code="print('stale')",
                    version=99,
                ),
            )


if __name__ == "__main__":
    unittest.main()
