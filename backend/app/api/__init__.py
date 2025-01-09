from fastapi import APIRouter
from app.api.endpoints import upload, analysis, status

api_router = APIRouter()

api_router.include_router(upload.router, prefix="/uploads", tags=["upload"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(status.router, prefix="/status", tags=["status"])