from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class LessonProgressBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    lesson_id: str = Field(..., alias="lessonId")
    subject_id: str = Field(..., alias="subjectId")
    content_progress: int = Field(0, ge=0, le=80, alias="contentProgress")
    overall_progress: int = Field(0, ge=0, le=100, alias="overallProgress")
    assessment_status: Literal["not-attempted", "incomplete", "completed"] = Field(
        "not-attempted", alias="assessmentStatus"
    )
    assessment_attempt_id: Optional[str] = Field(None, alias="assessmentAttemptId")
    assessment_score: Optional[float] = Field(None, alias="assessmentScore")
    completed_section_ids: List[str] = Field(
        default_factory=list, alias="completedSectionIds"
    )
    updated_at: datetime = Field(..., alias="updatedAt")


class LessonProgressCreate(LessonProgressBase):
    pass


class LessonProgressUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    subject_id: Optional[str] = Field(None, alias="subjectId")
    content_progress: Optional[int] = Field(None, ge=0, le=80, alias="contentProgress")
    overall_progress: Optional[int] = Field(None, ge=0, le=100, alias="overallProgress")
    assessment_status: Optional[
        Literal["not-attempted", "incomplete", "completed"]
    ] = Field(None, alias="assessmentStatus")
    assessment_attempt_id: Optional[str] = Field(None, alias="assessmentAttemptId")
    assessment_score: Optional[float] = Field(None, alias="assessmentScore")
    completed_section_ids: Optional[List[str]] = Field(
        None, alias="completedSectionIds"
    )
    updated_at: datetime = Field(..., alias="updatedAt")


class LessonProgressResponse(LessonProgressBase):
    user_id: str = Field(..., alias="userId")
