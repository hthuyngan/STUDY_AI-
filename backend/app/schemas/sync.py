from typing import Dict, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.assessment import AssessmentAttemptCreate
from app.schemas.learning_event import LearningEventItem
from app.schemas.lesson_progress import LessonProgressBase


class BootstrapSyncRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    lesson_progress: Dict[str, LessonProgressBase] = Field(
        default_factory=dict, alias="lessonProgress"
    )
    assessment_attempts: List[AssessmentAttemptCreate] = Field(
        default_factory=list, alias="assessmentAttempts"
    )
    learning_events: List[LearningEventItem] = Field(
        default_factory=list, alias="learningEvents"
    )


class BootstrapSyncResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    status: str = "ok"
    progress_synced: int = Field(0, alias="progressSynced")
    attempts_synced: int = Field(0, alias="attemptsSynced")
    events_synced: int = Field(0, alias="eventsSynced")

