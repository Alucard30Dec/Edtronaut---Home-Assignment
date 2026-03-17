from sqlalchemy.orm import Session

from app.models.code_session import CodeSession
from app.schemas.code_session import CodeSessionAutosaveRequest, CodeSessionCreateRequest


class UnsupportedLanguageError(ValueError):
    pass


class CodeSessionNotFoundError(LookupError):
    pass


class StaleAutosaveError(ValueError):
    def __init__(self, current_version: int) -> None:
        super().__init__(f"Stale autosave payload. Latest version is {current_version}.")
        self.current_version = current_version


def create_code_session(db: Session, payload: CodeSessionCreateRequest) -> CodeSession:
    language = payload.language.strip().lower()
    if language != "python":
        raise UnsupportedLanguageError("Only 'python' is supported in MVP.")

    session = CodeSession(
        language=language,
        template_code=payload.template_code,
        current_source_code=payload.current_source_code or payload.template_code,
        status="ACTIVE",
        version=1,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def autosave_code_session(
    db: Session,
    session_id: int,
    payload: CodeSessionAutosaveRequest,
) -> CodeSession:
    session = db.get(CodeSession, session_id)
    if session is None:
        raise CodeSessionNotFoundError(f"Session {session_id} does not exist.")

    if payload.version != session.version:
        raise StaleAutosaveError(current_version=session.version)

    session.current_source_code = payload.current_source_code
    session.version += 1

    db.add(session)
    db.commit()
    db.refresh(session)
    return session
