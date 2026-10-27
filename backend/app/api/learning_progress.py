from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.lesson_progress import (
    LessonProgressCreate,
    LessonProgressResponse,
    LessonProgressUpdate,
)
from app.services.learning_progress_service import (
    get_lesson_progress,
    get_user_progress_list,
    upsert_lesson_progress,
)

router = APIRouter(prefix="/users/{user_id}/lesson-progress", tags=["Lesson Progress"])


def _verify_user_access(user_id: str, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access learning progress of another learner.",
        )


@router.get("", response_model=List[LessonProgressResponse])
def list_user_progress(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    items = get_user_progress_list(db, user_id)
    return [LessonProgressResponse.model_validate(p) for p in items]


@router.get("/{lesson_id}", response_model=LessonProgressResponse)
def get_single_progress(
    user_id: str,
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    progress = get_lesson_progress(db, user_id, lesson_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson progress for '{lesson_id}' not found",
        )
    return LessonProgressResponse.model_validate(progress)


@router.put("/{lesson_id}", response_model=LessonProgressResponse)
def put_lesson_progress(
    user_id: str,
    lesson_id: str,
    data: LessonProgressCreate | LessonProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    updated = upsert_lesson_progress(db, user_id, lesson_id, data)
    return LessonProgressResponse.model_validate(updated)
