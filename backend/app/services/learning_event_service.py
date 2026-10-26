from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.learning_event import LearningEventModel
from app.schemas.learning_event import (
    LearningEventBatchResponse,
    LearningEventItem,
)
from app.services.learning_progress_service import _ensure_user_exists


def batch_insert_events(
    db: Session, user_id: str, events: List[LearningEventItem]
) -> LearningEventBatchResponse:
    if not events:
        return LearningEventBatchResponse(inserted=0, duplicates=0, failed=0)

    _ensure_user_exists(db, user_id)

    incoming_ids = [e.id for e in events]
    existing_ids_stmt = select(LearningEventModel.id).where(
        LearningEventModel.id.in_(incoming_ids)
    )
    existing_ids = set(db.scalars(existing_ids_stmt).all())

    inserted_count = 0
    duplicate_count = 0

    for ev in events:
        if ev.id in existing_ids:
            duplicate_count += 1
            continue

        ts = ev.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        model = LearningEventModel(
            id=ev.id,
            user_id=user_id,
            attempt_id=ev.attempt_id,
            lesson_id=ev.lesson_id,
            subject_id=ev.subject_id,
            timestamp=ts,
            type=ev.type,
            payload=ev.payload,
            schema_version=ev.schema_version,
        )
        db.add(model)
        existing_ids.add(ev.id)
        inserted_count += 1

    db.commit()
    return LearningEventBatchResponse(
        inserted=inserted_count, duplicates=duplicate_count, failed=0
    )


def get_user_events(
    db: Session,
    user_id: str,
    limit: int = 100,
    before: Optional[datetime] = None,
    lesson_id: Optional[str] = None,
    subject_id: Optional[str] = None,
) -> List[LearningEventModel]:
    stmt = select(LearningEventModel).where(LearningEventModel.user_id == user_id)
    if before:
        if before.tzinfo is None:
            before = before.replace(tzinfo=timezone.utc)
        stmt = stmt.where(LearningEventModel.timestamp < before)
    if lesson_id:
        stmt = stmt.where(LearningEventModel.lesson_id == lesson_id)
    if subject_id:
        stmt = stmt.where(LearningEventModel.subject_id == subject_id)

    stmt = stmt.order_by(LearningEventModel.timestamp.desc()).limit(limit)
    return list(db.scalars(stmt).all())
