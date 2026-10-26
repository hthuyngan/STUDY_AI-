import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_v1_router
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("study_ai_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("StudyAI backend starting up (env=%s)...", settings.APP_ENV)
    logger.info("Allowed CORS origins: %s", settings.cors_origins_list)
    yield
    logger.info("StudyAI backend shutting down.")


app = FastAPI(
    title="StudyAI Learning Data Persistence API",
    version="1.0.0",
    description="Backend persistence foundation and sync API for StudyAI learner progress, assessment attempts, and learning events.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)
