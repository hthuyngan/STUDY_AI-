from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class AssessmentResponseItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    question_id: str = Field(..., alias="questionId")
    selected_option_ids: List[str] = Field(
        default_factory=list, alias="selectedOptionIds"
    )
    first_answered_at: Optional[datetime] = Field(None, alias="firstAnsweredAt")
    last_answered_at: Optional[datetime] = Field(None, alias="lastAnsweredAt")
    change_count: int = Field(0, ge=0, alias="changeCount")
    time_spent_ms: int = Field(0, ge=0, alias="timeSpentMs")
    is_correct: Optional[bool] = Field(None, alias="isCorrect")


class AssessmentAttemptCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    assessment_id: str = Field(..., alias="assessmentId")
    lesson_id: str = Field(..., alias="lessonId")
    subject_id: str = Field(..., alias="subjectId")
    attempt_number: int = Field(1, ge=1, alias="attemptNumber")
    started_at: datetime = Field(..., alias="startedAt")
    last_activity_at: datetime = Field(..., alias="lastActivityAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    completion_status: Literal["not-attempted", "incomplete", "completed"] = Field(
        "incomplete", alias="completionStatus"
    )
    success_status: Literal["unknown", "passed", "failed"] = Field(
        "unknown", alias="successStatus"
    )
    progress_measure: float = Field(0.0, ge=0.0, le=1.0, alias="progressMeasure")
    score_raw: Optional[float] = Field(None, alias="scoreRaw")
    score_min: float = Field(0.0, alias="scoreMin")
    score_max: float = Field(1.0, alias="scoreMax")
    score_scaled: Optional[float] = Field(
        None, ge=0.0, le=1.0, alias="scoreScaled"
    )
    session_time_ms: int = Field(0, ge=0, alias="sessionTimeMs")
    current_question_id: Optional[str] = Field(None, alias="currentQuestionId")
    exit_reason: Optional[str] = Field(None, alias="exitReason")
    suspend_data: Optional[Dict[str, Any]] = Field(None, alias="suspendData")
    schema_version: int = Field(1, alias="schemaVersion")
    responses: Optional[Dict[str, AssessmentResponseItem]] = None


class AssessmentAttemptUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    last_activity_at: datetime = Field(..., alias="lastActivityAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    completion_status: Optional[
        Literal["not-attempted", "incomplete", "completed"]
    ] = Field(None, alias="completionStatus")
    success_status: Optional[Literal["unknown", "passed", "failed"]] = Field(
        None, alias="successStatus"
    )
    progress_measure: Optional[float] = Field(
        None, ge=0.0, le=1.0, alias="progressMeasure"
    )
    score_raw: Optional[float] = Field(None, alias="scoreRaw")
    score_min: Optional[float] = Field(None, alias="scoreMin")
    score_max: Optional[float] = Field(None, alias="scoreMax")
    score_scaled: Optional[float] = Field(
        None, ge=0.0, le=1.0, alias="scoreScaled"
    )
    session_time_ms: Optional[int] = Field(None, ge=0, alias="sessionTimeMs")
    current_question_id: Optional[str] = Field(None, alias="currentQuestionId")
    exit_reason: Optional[str] = Field(None, alias="exitReason")
    suspend_data: Optional[Dict[str, Any]] = Field(None, alias="suspendData")
    responses: Optional[Dict[str, AssessmentResponseItem]] = None


class AssessmentAttemptResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    user_id: str = Field(..., alias="userId")
    assessment_id: str = Field(..., alias="assessmentId")
    lesson_id: str = Field(..., alias="lessonId")
    subject_id: str = Field(..., alias="subjectId")
    attempt_number: int = Field(..., alias="attemptNumber")
    started_at: datetime = Field(..., alias="startedAt")
    last_activity_at: datetime = Field(..., alias="lastActivityAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    completion_status: Literal["not-attempted", "incomplete", "completed"] = Field(
        ..., alias="completionStatus"
    )
    success_status: Literal["unknown", "passed", "failed"] = Field(
        ..., alias="successStatus"
    )
    progress_measure: float = Field(..., alias="progressMeasure")
    score_raw: Optional[float] = Field(None, alias="scoreRaw")
    score_min: float = Field(..., alias="scoreMin")
    score_max: float = Field(..., alias="scoreMax")
    score_scaled: Optional[float] = Field(None, alias="scoreScaled")
    session_time_ms: int = Field(..., alias="sessionTimeMs")
    current_question_id: Optional[str] = Field(None, alias="currentQuestionId")
    exit_reason: Optional[str] = Field(None, alias="exitReason")
    suspend_data: Optional[Dict[str, Any]] = Field(None, alias="suspendData")
    schema_version: int = Field(..., alias="schemaVersion")
    responses: Dict[str, AssessmentResponseItem] = Field(default_factory=dict)
