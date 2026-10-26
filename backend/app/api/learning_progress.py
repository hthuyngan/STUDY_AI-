from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
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


@router.get("", response_model=List[LessonProgressResponse])
def list_user_progress(user_id: str, db: Session = Depends(get_db)):
    items = get_user_progress_list(db, user_id)
    return [LessonProgressResponse.model_validate(p) for p in items]


@router.get("/{lesson_id}", response_model=LessonProgressResponse)
def get_single_progress(
    user_id: str, lesson_id: str, db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db),
):
    updated = upsert_lesson_progress(db, user_id, lesson_id, data)
    return LessonProgressResponse.model_validate(updated)
