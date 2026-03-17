from fastapi import APIRouter

from app.api.code_sessions import router as code_sessions_router
from app.api.executions import router as executions_router

api_router = APIRouter()
api_router.include_router(code_sessions_router)
api_router.include_router(executions_router)
