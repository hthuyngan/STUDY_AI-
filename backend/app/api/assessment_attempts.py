from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.assessment_attempt import AssessmentAttempt
from app.schemas.assessment import (
    AssessmentAttemptCreate,
    AssessmentAttemptResponse,
    AssessmentAttemptUpdate,
    AssessmentResponseItem,
)
from app.services.assessment_service import (
    get_attempt_by_id,
    get_user_attempts,
    upsert_attempt,
)

router = APIRouter(
    prefix="/users/{user_id}/assessment-attempts", tags=["Assessment Attempts"]
)


def _format_attempt_response(
    attempt: AssessmentAttempt,
) -> AssessmentAttemptResponse:
    resp_dict = {
        r.question_id: AssessmentResponseItem(
            questionId=r.question_id,
            selectedOptionIds=r.selected_option_ids or [],
            firstAnsweredAt=r.first_answered_at,
            lastAnsweredAt=r.last_answered_at,
            changeCount=r.change_count,
            timeSpentMs=r.time_spent_ms,
            isCorrect=r.is_correct,
        )
        for r in (attempt.responses or [])
    }
    return AssessmentAttemptResponse(
        id=attempt.id,
        userId=attempt.user_id,
        assessmentId=attempt.assessment_id,
        lessonId=attempt.lesson_id,
        subjectId=attempt.subject_id,
        attemptNumber=attempt.attempt_number,
        startedAt=attempt.started_at,
        lastActivityAt=attempt.last_activity_at,
        completedAt=attempt.completed_at,
        completionStatus=attempt.completion_status,
        successStatus=attempt.success_status,
        progressMeasure=attempt.progress_measure,
        scoreRaw=attempt.score_raw,
        scoreMin=attempt.score_min,
        scoreMax=attempt.score_max,
        scoreScaled=attempt.score_scaled,
        sessionTimeMs=attempt.session_time_ms,
        currentQuestionId=attempt.current_question_id,
        exitReason=attempt.exit_reason,
        suspendData=attempt.suspend_data,
        schemaVersion=attempt.schema_version,
        responses=resp_dict,
    )



@router.get("", response_model=List[AssessmentAttemptResponse])
def list_attempts(
    user_id: str,
    lesson_id: Optional[str] = Query(None, alias="lessonId"),
    db: Session = Depends(get_db),
):
    attempts = get_user_attempts(db, user_id, lesson_id=lesson_id)
    return [_format_attempt_response(a) for a in attempts]


@router.get("/{attempt_id}", response_model=AssessmentAttemptResponse)
def get_single_attempt(
    user_id: str, attempt_id: str, db: Session = Depends(get_db)
):
    attempt = get_attempt_by_id(db, user_id, attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment attempt '{attempt_id}' not found",
        )
    return _format_attempt_response(attempt)


@router.post(
    "",
    response_model=AssessmentAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_attempt(
    user_id: str, data: AssessmentAttemptCreate, db: Session = Depends(get_db)
):
    saved = upsert_attempt(db, user_id, data)
    return _format_attempt_response(saved)


@router.put("/{attempt_id}", response_model=AssessmentAttemptResponse)
@router.patch("/{attempt_id}", response_model=AssessmentAttemptResponse)
def update_or_upsert_attempt(
    user_id: str,
    attempt_id: str,
    data: AssessmentAttemptCreate | AssessmentAttemptUpdate,
    db: Session = Depends(get_db),
):
    saved = upsert_attempt(db, user_id, data, attempt_id=attempt_id)
    return _format_attempt_response(saved)
