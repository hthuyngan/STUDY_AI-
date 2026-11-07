import logging
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

logger = logging.getLogger("study_ai_backend.health")

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Application liveness check."""
    return {
        "status": "ok",
        "app": "STUDY_AI",
        "version": "1.0.0",
    }


@router.get("/health/db")
def database_health_check(db: Session = Depends(get_db)):
    """Database readiness probe: executes SELECT 1 and returns 503 if unreachable."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
        }
    except Exception as exc:
        logger.error("Database health check probe failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "detail": "Database service is unreachable or unready.",
            },
        )

