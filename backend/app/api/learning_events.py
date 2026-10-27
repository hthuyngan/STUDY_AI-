from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.learning_event import (
    LearningEventBatchRequest,
    LearningEventBatchResponse,
    LearningEventItem,
)
from app.services.learning_event_service import (
    batch_insert_events,
    get_user_events,
)

router = APIRouter(prefix="/users/{user_id}/learning-events", tags=["Learning Events"])


def _verify_user_access(user_id: str, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access learning events of another learner.",
        )


@router.post(
    "/batch",
    response_model=LearningEventBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_events_batch(
    user_id: str,
    data: LearningEventBatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    return batch_insert_events(db, user_id, data.events)


@router.get("", response_model=List[LearningEventItem])
def get_events(
    user_id: str,
    limit: int = Query(100, ge=1, le=500),
    before: Optional[datetime] = None,
    lesson_id: Optional[str] = Query(None, alias="lessonId"),
    subject_id: Optional[str] = Query(None, alias="subjectId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    models = get_user_events(
        db,
        user_id,
        limit=limit,
        before=before,
        lesson_id=lesson_id,
        subject_id=subject_id,
    )
    return [LearningEventItem.model_validate(m) for m in models]
