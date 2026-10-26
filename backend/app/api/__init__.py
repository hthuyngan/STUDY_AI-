from fastapi import APIRouter
from app.api.assessment_attempts import router as attempts_router
from app.api.health import router as health_router
from app.api.learning_events import router as events_router
from app.api.learning_progress import router as progress_router
from app.api.sync import router as sync_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(progress_router)
api_v1_router.include_router(attempts_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(sync_router)
