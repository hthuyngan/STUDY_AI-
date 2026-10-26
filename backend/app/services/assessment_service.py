from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.assessment_attempt import AssessmentAttempt
from app.models.assessment_response import AssessmentResponse
from app.models.user import User
from app.schemas.assessment import (
    AssessmentAttemptCreate,
    AssessmentAttemptUpdate,
    AssessmentResponseItem,
)
from app.services.learning_progress_service import _ensure_user_exists


def get_user_attempts(
    db: Session, user_id: str, lesson_id: Optional[str] = None
) -> List[AssessmentAttempt]:
    stmt = select(AssessmentAttempt).where(AssessmentAttempt.user_id == user_id)
    if lesson_id:
        stmt = stmt.where(AssessmentAttempt.lesson_id == lesson_id)
    stmt = stmt.order_by(AssessmentAttempt.attempt_number.desc())
    return list(db.scalars(stmt).all())


def get_attempt_by_id(
    db: Session, user_id: str, attempt_id: str
) -> Optional[AssessmentAttempt]:
    stmt = select(AssessmentAttempt).where(
        AssessmentAttempt.user_id == user_id, AssessmentAttempt.id == attempt_id
    )
    return db.scalar(stmt)


def _sync_responses(
    db: Session, attempt: AssessmentAttempt, responses_dict: dict
) -> None:
    if not responses_dict:
        return

    # Map existing responses by question_id
    existing_resp_map = {r.question_id: r for r in attempt.responses}

    for q_id, resp_item in responses_dict.items():
        if isinstance(resp_item, dict):
            resp_data = resp_item
        else:
            resp_data = resp_item.model_dump(by_alias=False)

        question_id = resp_data.get("question_id") or q_id
        if question_id in existing_resp_map:
            target = existing_resp_map[question_id]
            target.selected_option_ids = resp_data.get("selected_option_ids", [])
            target.change_count = resp_data.get("change_count", 0)
            target.time_spent_ms = resp_data.get("time_spent_ms", 0)
            target.is_correct = resp_data.get("is_correct")
            if resp_data.get("first_answered_at"):
                target.first_answered_at = resp_data["first_answered_at"]
            if resp_data.get("last_answered_at"):
                target.last_answered_at = resp_data["last_answered_at"]
        else:
            new_resp = AssessmentResponse(
                attempt_id=attempt.id,
                question_id=question_id,
                selected_option_ids=resp_data.get("selected_option_ids", []),
                change_count=resp_data.get("change_count", 0),
                time_spent_ms=resp_data.get("time_spent_ms", 0),
                is_correct=resp_data.get("is_correct"),
                first_answered_at=resp_data.get("first_answered_at"),
                last_answered_at=resp_data.get("last_answered_at"),
            )
            db.add(new_resp)


def upsert_attempt(
    db: Session,
    user_id: str,
    data: AssessmentAttemptCreate | AssessmentAttemptUpdate,
    attempt_id: Optional[str] = None,
) -> AssessmentAttempt:
    _ensure_user_exists(db, user_id)
    target_id = attempt_id or getattr(data, "id", None)
    if not target_id:
        raise ValueError("Attempt ID is required for persistence")

    existing = get_attempt_by_id(db, user_id, target_id)
    incoming_last_activity = data.last_activity_at
    if incoming_last_activity.tzinfo is None:
        incoming_last_activity = incoming_last_activity.replace(tzinfo=timezone.utc)

    if existing:
        existing_last_activity = existing.last_activity_at
        if existing_last_activity.tzinfo is None:
            existing_last_activity = existing_last_activity.replace(tzinfo=timezone.utc)

        # Conflict resolution: if server attempt is newer, preserve server timestamps
        # But if incoming is newer or equal, update
        if incoming_last_activity >= existing_last_activity:
            existing.last_activity_at = incoming_last_activity

            # Do NOT downgrade a completed attempt to incomplete
            if (
                data.completion_status is not None
                and existing.completion_status != "completed"
            ):
                existing.completion_status = data.completion_status

            if data.completed_at is not None:
                existing.completed_at = data.completed_at
            if (
                data.completion_status == "completed"
                and existing.completed_at is None
            ):
                existing.completed_at = incoming_last_activity

            if data.success_status is not None:
                existing.success_status = data.success_status
            if data.progress_measure is not None:
                existing.progress_measure = max(
                    existing.progress_measure, data.progress_measure
                )
            if data.score_raw is not None:
                existing.score_raw = data.score_raw
            if data.score_scaled is not None:
                existing.score_scaled = data.score_scaled
            if data.session_time_ms is not None:
                existing.session_time_ms = max(
                    existing.session_time_ms, data.session_time_ms
                )
            if data.current_question_id is not None:
                existing.current_question_id = data.current_question_id
            if data.exit_reason is not None:
                existing.exit_reason = data.exit_reason
            if data.suspend_data is not None:
                existing.suspend_data = data.suspend_data

        if data.responses:
            _sync_responses(db, existing, data.responses)

        db.commit()
        db.refresh(existing)
        return existing

    # Create new attempt
    create_data = data if isinstance(data, AssessmentAttemptCreate) else None
    if not create_data:
        raise ValueError("Cannot create new attempt without AssessmentAttemptCreate")

    started_at = create_data.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    new_attempt = AssessmentAttempt(
        id=target_id,
        user_id=user_id,
        assessment_id=create_data.assessment_id,
        lesson_id=create_data.lesson_id,
        subject_id=create_data.subject_id,
        attempt_number=create_data.attempt_number,
        started_at=started_at,
        last_activity_at=incoming_last_activity,
        completed_at=create_data.completed_at,
        completion_status=create_data.completion_status,
        success_status=create_data.success_status,
        progress_measure=create_data.progress_measure,
        score_raw=create_data.score_raw,
        score_min=create_data.score_min,
        score_max=create_data.score_max,
        score_scaled=create_data.score_scaled,
        session_time_ms=create_data.session_time_ms,
        current_question_id=create_data.current_question_id,
        exit_reason=create_data.exit_reason,
        suspend_data=create_data.suspend_data,
        schema_version=create_data.schema_version,
    )
    db.add(new_attempt)
    db.flush()

    if create_data.responses:
        _sync_responses(db, new_attempt, create_data.responses)

    db.commit()
    db.refresh(new_attempt)
    return new_attempt
