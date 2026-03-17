from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

PYDANTIC_V2 = hasattr(BaseModel, "model_validate")
ExecutionStatus = Literal["QUEUED", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"]


class ORMModel(BaseModel):
    if PYDANTIC_V2:
        model_config = {"from_attributes": True}
    else:  # pragma: no cover - pydantic v1 fallback
        class Config:
            orm_mode = True


class ExecutionQueuedResponse(BaseModel):
    execution_id: int
    status: ExecutionStatus


class ExecutionResponse(ORMModel):
    id: int
    session_id: int
    status: ExecutionStatus
    source_code_snapshot: str
    stdout: str | None
    stderr: str | None
    error_message: str | None
    execution_time_ms: int | None
    retry_count: int
    queued_at: datetime
    started_at: datetime | None
    finished_at: datetime | None

    @classmethod
    def from_orm_model(cls, obj: object) -> "ExecutionResponse":
        if PYDANTIC_V2:
            return cls.model_validate(obj)
        return cls.from_orm(obj)
