from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.execution import ExecutionQueuedResponse, ExecutionResponse
from app.services.execution_service import (
    ExecutionNotFoundError,
    ExecutionQueueEnqueueError,
    ExecutionRateLimitedError,
    ExecutionSessionNotFoundError,
    ExecutionSourceTooLargeError,
    UnsupportedExecutionLanguageError,
    create_execution_and_enqueue,
    get_execution_by_id,
)

router = APIRouter(tags=["executions"])


@router.post(
    "/code-sessions/{session_id}/run",
    response_model=ExecutionQueuedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def run_code_session_endpoint(
    session_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
) -> ExecutionQueuedResponse:
    try:
        execution = create_execution_and_enqueue(db=db, session_id=session_id)
    except ExecutionSessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except UnsupportedExecutionLanguageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ExecutionSourceTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc
    except ExecutionRateLimitedError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after_header_seconds)},
        ) from exc
    except ExecutionQueueEnqueueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return ExecutionQueuedResponse(execution_id=execution.id, status=execution.status)


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
def get_execution_endpoint(
    execution_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
) -> ExecutionResponse:
    try:
        execution = get_execution_by_id(db=db, execution_id=execution_id)
    except ExecutionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ExecutionResponse.from_orm_model(execution)
