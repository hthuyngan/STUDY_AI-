from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.assessment_attempts import _format_attempt_response
from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.assessment import (
    AssessmentAttemptCreate,
    AssessmentAttemptResponse,
    AssessmentAttemptUpdate,
)
from app.schemas.learning_event import (
    LearningEventBatchRequest,
    LearningEventBatchResponse,
    LearningEventItem,
)
from app.schemas.lesson_progress import (
    LessonProgressCreate,
    LessonProgressResponse,
    LessonProgressUpdate,
)
from app.schemas.sync import BootstrapSyncRequest, BootstrapSyncResponse
from app.services.assessment_service import (
    get_attempt_by_id,
    get_user_attempts,
    upsert_attempt,
)
from app.services.learning_event_service import (
    batch_insert_events,
    get_user_events,
)
from app.services.learning_progress_service import (
    get_lesson_progress,
    get_user_progress_list,
    upsert_lesson_progress,
)
from app.services.sync_service import bootstrap_sync

router = APIRouter(prefix="/me", tags=["Protected Learner APIs"])


# ── Lesson Progress ──────────────────────────────────────────────────────────


@router.get("/lesson-progress", response_model=List[LessonProgressResponse])
def get_my_lesson_progress_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = get_user_progress_list(db, current_user.id)
    return [LessonProgressResponse.model_validate(p) for p in items]


@router.get("/lesson-progress/{lesson_id}", response_model=LessonProgressResponse)
def get_my_single_lesson_progress(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = get_lesson_progress(db, current_user.id, lesson_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson progress for '{lesson_id}' not found",
        )
    return LessonProgressResponse.model_validate(progress)


@router.put("/lesson-progress/{lesson_id}", response_model=LessonProgressResponse)
def put_my_lesson_progress(
    lesson_id: str,
    data: LessonProgressCreate | LessonProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = upsert_lesson_progress(db, current_user.id, lesson_id, data)
    return LessonProgressResponse.model_validate(updated)


# ── Assessment Attempts ──────────────────────────────────────────────────────


@router.get("/assessment-attempts", response_model=List[AssessmentAttemptResponse])
def list_my_assessment_attempts(
    lesson_id: Optional[str] = Query(None, alias="lessonId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempts = get_user_attempts(db, current_user.id, lesson_id=lesson_id)
    return [_format_attempt_response(a) for a in attempts]


@router.get(
    "/assessment-attempts/{attempt_id}",
    response_model=AssessmentAttemptResponse,
)
def get_my_single_assessment_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempt = get_attempt_by_id(db, current_user.id, attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment attempt '{attempt_id}' not found",
        )
    return _format_attempt_response(attempt)


@router.post(
    "/assessment-attempts",
    response_model=AssessmentAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_assessment_attempt(
    data: AssessmentAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = upsert_attempt(db, current_user.id, data)
    return _format_attempt_response(saved)


@router.put(
    "/assessment-attempts/{attempt_id}",
    response_model=AssessmentAttemptResponse,
)
@router.patch(
    "/assessment-attempts/{attempt_id}",
    response_model=AssessmentAttemptResponse,
)
def update_my_assessment_attempt(
    attempt_id: str,
    data: AssessmentAttemptCreate | AssessmentAttemptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = upsert_attempt(db, current_user.id, data, attempt_id=attempt_id)
    return _format_attempt_response(saved)


# ── Learning Events ──────────────────────────────────────────────────────────


@router.post(
    "/learning-events/batch",
    response_model=LearningEventBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_my_events_batch(
    data: LearningEventBatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return batch_insert_events(db, current_user.id, data.events)


@router.get("/learning-events", response_model=List[LearningEventItem])
def get_my_learning_events(
    limit: int = Query(100, ge=1, le=500),
    before: Optional[datetime] = None,
    lesson_id: Optional[str] = Query(None, alias="lessonId"),
    subject_id: Optional[str] = Query(None, alias="subjectId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    models = get_user_events(
        db,
        current_user.id,
        limit=limit,
        before=before,
        lesson_id=lesson_id,
        subject_id=subject_id,
    )
    return [LearningEventItem.model_validate(m) for m in models]


# ── Sync Bootstrap ───────────────────────────────────────────────────────────


@router.post(
    "/sync/bootstrap",
    response_model=BootstrapSyncResponse,
    status_code=status.HTTP_200_OK,
)
def post_my_bootstrap_sync(
    data: BootstrapSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return bootstrap_sync(db, current_user.id, data)
