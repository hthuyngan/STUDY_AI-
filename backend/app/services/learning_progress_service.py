from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.lesson_progress import LessonProgress
from app.models.user import User
from app.schemas.lesson_progress import LessonProgressCreate, LessonProgressUpdate


def _ensure_user_exists(db: Session, user_id: str) -> None:
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        new_user = User(
            id=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_user)
        db.flush()


def get_user_progress_list(db: Session, user_id: str) -> List[LessonProgress]:
    stmt = (
        select(LessonProgress)
        .where(LessonProgress.user_id == user_id)
        .order_by(LessonProgress.updated_at.desc())
    )
    return list(db.scalars(stmt).all())


def get_lesson_progress(
    db: Session, user_id: str, lesson_id: str
) -> Optional[LessonProgress]:
    stmt = select(LessonProgress).where(
        LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson_id
    )
    return db.scalar(stmt)


def upsert_lesson_progress(
    db: Session,
    user_id: str,
    lesson_id: str,
    data: LessonProgressCreate | LessonProgressUpdate,
) -> LessonProgress:
    _ensure_user_exists(db, user_id)

    existing = get_lesson_progress(db, user_id, lesson_id)
    incoming_updated_at = data.updated_at
    if incoming_updated_at.tzinfo is None:
        incoming_updated_at = incoming_updated_at.replace(tzinfo=timezone.utc)

    if existing:
        existing_updated_at = existing.updated_at
        if existing_updated_at.tzinfo is None:
            existing_updated_at = existing_updated_at.replace(tzinfo=timezone.utc)

        # Conflict resolution: if server progress is newer than incoming browser progress, skip overwrite
        if existing_updated_at > incoming_updated_at:
            return existing

        # Protection: 100% completed lesson must never be downgraded by an incomplete incoming payload
        new_overall = (
            data.overall_progress
            if data.overall_progress is not None
            else existing.overall_progress
        )
        if existing.overall_progress == 100 and new_overall < 100:
            new_overall = 100

        new_status = (
            data.assessment_status
            if data.assessment_status is not None
            else existing.assessment_status
        )
        if existing.overall_progress == 100 and new_status != "completed":
            new_status = "completed"

        if data.subject_id:
            existing.subject_id = data.subject_id
        if data.content_progress is not None:
            existing.content_progress = data.content_progress
        existing.overall_progress = new_overall
        existing.assessment_status = new_status

        if data.assessment_attempt_id is not None:
            existing.assessment_attempt_id = data.assessment_attempt_id
        if data.assessment_score is not None:
            existing.assessment_score = data.assessment_score
        if data.completed_section_ids is not None:
            # Merge sections without duplicates
            merged_sections = list(
                dict.fromkeys(
                    existing.completed_section_ids + data.completed_section_ids
                )
            )
            existing.completed_section_ids = merged_sections

        existing.updated_at = incoming_updated_at
        db.commit()
        db.refresh(existing)
        return existing

    # Create brand new record
    new_progress = LessonProgress(
        user_id=user_id,
        lesson_id=lesson_id,
        subject_id=data.subject_id or "general",
        content_progress=data.content_progress or 0,
        overall_progress=data.overall_progress or 0,
        assessment_status=data.assessment_status or "not-attempted",
        assessment_attempt_id=data.assessment_attempt_id,
        assessment_score=data.assessment_score,
        completed_section_ids=data.completed_section_ids or [],
        updated_at=incoming_updated_at,
    )
    db.add(new_progress)
    db.commit()
    db.refresh(new_progress)
    return new_progress
