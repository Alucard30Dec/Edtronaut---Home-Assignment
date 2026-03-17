from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

PYDANTIC_V2 = hasattr(BaseModel, "model_validate")


class ORMModel(BaseModel):
    if PYDANTIC_V2:
        model_config = {"from_attributes": True}
    else:  # pragma: no cover - pydantic v1 fallback
        class Config:
            orm_mode = True


class CodeSessionCreateRequest(BaseModel):
    language: str = Field(default="python")
    template_code: str = Field(default="")
    current_source_code: str = Field(default="")


class CodeSessionAutosaveRequest(BaseModel):
    current_source_code: str
    version: int = Field(ge=1)


class CodeSessionResponse(ORMModel):
    id: int
    language: str
    template_code: str
    current_source_code: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_model(cls, obj: object) -> "CodeSessionResponse":
        if PYDANTIC_V2:
            return cls.model_validate(obj)
        return cls.from_orm(obj)
