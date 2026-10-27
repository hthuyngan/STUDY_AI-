from fastapi import APIRouter
from app.api.admin import router as admin_router
from app.api.assessment_attempts import router as attempts_router
from app.api.auth import router as auth_router
from app.api.content import router as content_router
from app.api.health import router as health_router
from app.api.learning_events import router as events_router
from app.api.learning_progress import router as progress_router
from app.api.me import router as me_router
from app.api.support import router as support_router
from app.api.sync import router as sync_router
from app.api.teacher import router as teacher_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(me_router)
api_v1_router.include_router(progress_router)
api_v1_router.include_router(attempts_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(sync_router)

# Staff operations routers
api_v1_router.include_router(admin_router)
api_v1_router.include_router(teacher_router)
api_v1_router.include_router(content_router)
api_v1_router.include_router(support_router)
