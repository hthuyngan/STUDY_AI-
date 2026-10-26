from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LearningEventItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    attempt_id: Optional[str] = Field(None, alias="attemptId")
    lesson_id: str = Field(..., alias="lessonId")
    subject_id: str = Field(..., alias="subjectId")
    timestamp: datetime
    type: str
    payload: Optional[Dict[str, Any]] = None
    schema_version: int = Field(1, alias="schemaVersion")


class LearningEventBatchRequest(BaseModel):
    events: List[LearningEventItem]


class LearningEventBatchResponse(BaseModel):
    inserted: int
    duplicates: int
    failed: int = 0
