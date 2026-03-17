from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.code_session import (
    CodeSessionAutosaveRequest,
    CodeSessionCreateRequest,
    CodeSessionResponse,
)
from app.services.code_session_service import (
    CodeSessionNotFoundError,
    StaleAutosaveError,
    UnsupportedLanguageError,
    autosave_code_session,
    create_code_session,
    get_code_session,
)

router = APIRouter(prefix="/code-sessions", tags=["code-sessions"])


@router.post("", response_model=CodeSessionResponse, status_code=status.HTTP_201_CREATED)
def create_code_session_endpoint(
    payload: CodeSessionCreateRequest,
    db: Session = Depends(get_db),
) -> CodeSessionResponse:
    try:
        session = create_code_session(db, payload)
    except UnsupportedLanguageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return CodeSessionResponse.from_orm_model(session)


@router.patch("/{session_id}", response_model=CodeSessionResponse)
def autosave_code_session_endpoint(
    payload: CodeSessionAutosaveRequest,
    session_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
) -> CodeSessionResponse:
    try:
        session = autosave_code_session(db, session_id=session_id, payload=payload)
    except CodeSessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except StaleAutosaveError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return CodeSessionResponse.from_orm_model(session)


@router.get("/{session_id}", response_model=CodeSessionResponse)
def get_code_session_endpoint(
    session_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
) -> CodeSessionResponse:
    try:
        session = get_code_session(db, session_id=session_id)
    except CodeSessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return CodeSessionResponse.from_orm_model(session)
