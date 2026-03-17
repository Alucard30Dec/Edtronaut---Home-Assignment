from fastapi import APIRouter

from app.api.code_sessions import router as code_sessions_router

api_router = APIRouter()
api_router.include_router(code_sessions_router)
