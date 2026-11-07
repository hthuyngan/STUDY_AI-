"""
Content Architecture Domain Schemas & Contracts (Phase 14 Foundation for Phase 17 & 18).
Defines contracts for Curriculum, Question Formats, Editorial Review Workflows,
and Batch Import Pipeline.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# =============================================================================
# 1. CONTENT WORKFLOW & LIFECYCLE
# =============================================================================

class ContentLifecycleStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    NEEDS_REVIEW = "needs_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class QuestionReviewDecision(str, Enum):
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"
    REJECTED = "rejected"


# =============================================================================
# 2. QUESTION BANK DOMAIN CONTRACTS
# =============================================================================

class QuestionFormatType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE_GROUP = "true_false_group"
    SHORT_ANSWER = "short_answer"


class CognitiveLevel(str, Enum):
    RECOGNITION = "recognition"       # Nhận biết
    COMPREHENSION = "comprehension"   # Thông hiểu
    APPLICATION = "application"       # Vận dụng
    ADVANCED_APPLICATION = "advanced_application" # Vận dụng cao


class MediaAssetSchema(BaseModel):
    id: str
    url: str
    caption: Optional[str] = None
    altText: Optional[str] = None
    mimeType: str = "image/svg+xml"
    width: Optional[int] = None
    height: Optional[int] = None


class OptionItemSchema(BaseModel):
    id: str
    key: str  # "A", "B", "C", "D"
    content: str
    isCorrect: bool = False


class TrueFalseSubQuestionSchema(BaseModel):
    id: str
    subIndex: str  # "a)", "b)", "c)", "d)"
    statement: str
    isCorrect: bool
    explanation: Optional[str] = None


class QuestionExplanationSchema(BaseModel):
    summary: str
    stepByStep: List[str] = Field(default_factory=list)
    commonMistakes: List[str] = Field(default_factory=list)
    keyFormulaUsed: List[str] = Field(default_factory=list)


class ContentSourceSchema(BaseModel):
    sourceType: Literal["textbook", "national_exam", "mock_exam", "teacher_curated"] = "textbook"
    name: str  # e.g., "Kết nối tri thức với cuộc sống - Toán 12"
    publisher: Optional[str] = None
    year: Optional[int] = None
    page: Optional[int] = None
    verifiedByTeacher: bool = True


# =============================================================================
# 3. REVISION & EDITORIAL REVIEW AUDIT
# =============================================================================

class ContentRevisionSchema(BaseModel):
    id: str
    entityType: Literal["lesson", "question", "assessment"]
    entityId: str
    revisionNumber: int
    authorId: str
    changesSummary: str
    contentSnapshot: Dict[str, Any]
    createdAt: datetime


class ContentReviewLogSchema(BaseModel):
    id: str
    revisionId: str
    reviewerId: str
    reviewerName: str
    decision: QuestionReviewDecision
    feedbackNotes: str
    reviewedAt: datetime


# =============================================================================
# 4. IMPORT PIPELINE CONTRACTS (Phase 17 Batch Ingestion)
# =============================================================================

class ImportJobStatus(str, Enum):
    PENDING = "pending"
    PARSING = "parsing"
    VALIDATING = "validating"
    DEDUPLICATING = "deduplicating"
    MAPPING = "mapping"
    READY_FOR_REVIEW = "ready_for_review"
    COMPLETED = "completed"
    FAILED = "failed"


class ImportItemStatus(str, Enum):
    VALID = "valid"
    WARNING = "warning"
    DUPLICATE = "duplicate"
    ERROR = "error"


class ImportItemResultSchema(BaseModel):
    itemIndex: int
    rawText: str
    status: ImportItemStatus
    parsedType: Optional[QuestionFormatType] = None
    stem: Optional[str] = None
    validationErrors: List[str] = Field(default_factory=list)
    deduplicationScore: float = 0.0
    matchedExistingQuestionId: Optional[str] = None
    suggestedSkillIds: List[str] = Field(default_factory=list)


class BatchImportJobSchema(BaseModel):
    id: str
    fileName: str
    fileFormat: Literal["docx", "latex", "json", "csv"]
    uploadedBy: str
    status: ImportJobStatus
    totalItemsCount: int = 0
    validItemsCount: int = 0
    warningItemsCount: int = 0
    duplicateItemsCount: int = 0
    errorItemsCount: int = 0
    items: List[ImportItemResultSchema] = Field(default_factory=list)
    createdAt: datetime
    completedAt: Optional[datetime] = None
