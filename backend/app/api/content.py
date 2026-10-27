from datetime import datetime, timezone
import json
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.api.deps import require_role
from app.database import get_db
from app.models.content import ContentChapter, ContentLesson, ContentSubject
from app.models.user import User
from app.services.audit import log_staff_action

router = APIRouter(prefix="/content", tags=["content"])


class CreateLessonRequest(BaseModel):
    chapterId: str
    title: str
    slug: str
    introduction: Optional[str] = None
    definitions: Optional[List[Any]] = None
    formulas: Optional[List[Any]] = None
    examples: Optional[List[Any]] = None
    importantNotes: Optional[List[Any]] = None
    summaryPoints: Optional[List[Any]] = None


class UpdateLessonRequest(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    introduction: Optional[str] = None
    definitions: Optional[List[Any]] = None
    formulas: Optional[List[Any]] = None
    examples: Optional[List[Any]] = None
    importantNotes: Optional[List[Any]] = None
    summaryPoints: Optional[List[Any]] = None


def _format_lesson(lesson: ContentLesson, author: Optional[User] = None) -> dict[str, Any]:
    def safe_json_load(val: Optional[str]) -> list:
        if not val:
            return []
        try:
            return json.loads(val)
        except Exception:
            return []

    return {
        "id": lesson.id,
        "chapterId": lesson.chapter_id,
        "title": lesson.title,
        "slug": lesson.slug,
        "orderIndex": lesson.order_index,
        "status": lesson.status,
        "authorId": lesson.author_id,
        "authorName": author.display_name if author else "",
        "reviewedBy": lesson.reviewed_by,
        "introduction": lesson.introduction or "",
        "definitions": safe_json_load(lesson.definitions),
        "formulas": safe_json_load(lesson.formulas),
        "examples": safe_json_load(lesson.examples),
        "importantNotes": safe_json_load(lesson.important_notes),
        "summaryPoints": safe_json_load(lesson.summary_points),
        "createdAt": lesson.created_at.isoformat(),
        "updatedAt": lesson.updated_at.isoformat(),
    }


@router.get("/subjects")
def list_content_subjects(
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    subjects = db.query(ContentSubject).order_by(ContentSubject.name).all()
    result = []
    for s in subjects:
        total_lessons = sum(len(c.lessons) for c in s.chapters)
        result.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "grade": s.grade,
            "description": s.description or "",
            "chapterCount": len(s.chapters),
            "lessonCount": total_lessons,
        })
    return {"items": result, "total": len(result)}


@router.get("/subjects/{subject_id}")
def get_content_subject_detail(
    subject_id: str,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    s = db.query(ContentSubject).filter(ContentSubject.id == subject_id).first()
    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học không tồn tại.",
        )

    chapters = []
    for ch in s.chapters:
        chapters.append({
            "id": ch.id,
            "title": ch.title,
            "orderIndex": ch.order_index,
            "lessons": [
                {
                    "id": les.id,
                    "title": les.title,
                    "slug": les.slug,
                    "status": les.status,
                    "orderIndex": les.order_index,
                }
                for les in ch.lessons
            ],
        })

    return {
        "id": s.id,
        "name": s.name,
        "code": s.code,
        "grade": s.grade,
        "description": s.description or "",
        "chapters": chapters,
    }


@router.get("/lessons")
def list_content_lessons(
    status_filter: Optional[str] = Query(None, alias="status"),
    subject_id: Optional[str] = Query(None, alias="subjectId"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(ContentLesson)

    if status_filter and status_filter != "all":
        query = query.filter(ContentLesson.status == status_filter)

    if subject_id and subject_id != "all":
        chapter_ids = [
            c.id for c in db.query(ContentChapter).filter(ContentChapter.subject_id == subject_id).all()
        ]
        query = query.filter(ContentLesson.chapter_id.in_(chapter_ids))

    total = query.count()
    lessons = (
        query.order_by(desc(ContentLesson.updated_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    result = []
    for les in lessons:
        author = db.query(User).filter(User.id == les.author_id).first()
        result.append(_format_lesson(les, author))

    return {
        "items": result,
        "page": page,
        "pageSize": pageSize,
        "total": total,
    }


@router.get("/lessons/{lesson_id}")
def get_content_lesson_detail(
    lesson_id: str,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    les = db.query(ContentLesson).filter(ContentLesson.id == lesson_id).first()
    if not les:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại.",
        )
    author = db.query(User).filter(User.id == les.author_id).first()
    return _format_lesson(les, author)


@router.post("/lessons")
def create_content_lesson(
    req: CreateLessonRequest,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    chapter = db.query(ContentChapter).filter(ContentChapter.id == req.chapterId).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chương học không tồn tại.",
        )

    lesson_id = f"les-{uuid.uuid4().hex[:12]}"
    new_lesson = ContentLesson(
        id=lesson_id,
        chapter_id=req.chapterId,
        title=req.title,
        slug=req.slug,
        status="draft",
        author_id=current_user.id,
        introduction=req.introduction,
        definitions=json.dumps(req.definitions, ensure_ascii=False) if req.definitions else None,
        formulas=json.dumps(req.formulas, ensure_ascii=False) if req.formulas else None,
        examples=json.dumps(req.examples, ensure_ascii=False) if req.examples else None,
        important_notes=json.dumps(req.importantNotes, ensure_ascii=False) if req.importantNotes else None,
        summary_points=json.dumps(req.summaryPoints, ensure_ascii=False) if req.summaryPoints else None,
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)

    return _format_lesson(new_lesson, current_user)


@router.patch("/lessons/{lesson_id}")
def update_content_lesson(
    lesson_id: str,
    req: UpdateLessonRequest,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    les = db.query(ContentLesson).filter(ContentLesson.id == lesson_id).first()
    if not les:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại.",
        )

    if req.title is not None:
        les.title = req.title
    if req.slug is not None:
        les.slug = req.slug
    if req.introduction is not None:
        les.introduction = req.introduction
    if req.definitions is not None:
        les.definitions = json.dumps(req.definitions, ensure_ascii=False)
    if req.formulas is not None:
        les.formulas = json.dumps(req.formulas, ensure_ascii=False)
    if req.examples is not None:
        les.examples = json.dumps(req.examples, ensure_ascii=False)
    if req.importantNotes is not None:
        les.important_notes = json.dumps(req.importantNotes, ensure_ascii=False)
    if req.summaryPoints is not None:
        les.summary_points = json.dumps(req.summaryPoints, ensure_ascii=False)

    db.commit()
    db.refresh(les)
    author = db.query(User).filter(User.id == les.author_id).first()
    return _format_lesson(les, author)


@router.post("/lessons/{lesson_id}/submit-review")
def submit_lesson_review(
    lesson_id: str,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    les = db.query(ContentLesson).filter(ContentLesson.id == lesson_id).first()
    if not les:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại.",
        )

    if les.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có bài học trạng thái 'draft' mới có thể gửi duyệt. Trạng thái hiện tại: {les.status}",
        )

    les.status = "in-review"
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="content_submitted",
        target_type="content_lesson",
        target_id=les.id,
        payload={"title": les.title},
    )
    db.commit()
    db.refresh(les)

    author = db.query(User).filter(User.id == les.author_id).first()
    return _format_lesson(les, author)


@router.post("/lessons/{lesson_id}/approve")
def approve_lesson(
    lesson_id: str,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    les = db.query(ContentLesson).filter(ContentLesson.id == lesson_id).first()
    if not les:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại.",
        )

    if les.status != "in-review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có bài học đang chờ duyệt ('in-review') mới có thể xuất bản. Trạng thái hiện tại: {les.status}",
        )

    les.status = "published"
    les.reviewed_by = current_user.id
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="content_approved",
        target_type="content_lesson",
        target_id=les.id,
        payload={"title": les.title},
    )
    db.commit()
    db.refresh(les)

    author = db.query(User).filter(User.id == les.author_id).first()
    return _format_lesson(les, author)


@router.post("/lessons/{lesson_id}/request-changes")
def request_changes_lesson(
    lesson_id: str,
    feedback: Optional[str] = None,
    current_user: User = Depends(require_role("content", "admin")),
    db: Session = Depends(get_db),
):
    les = db.query(ContentLesson).filter(ContentLesson.id == lesson_id).first()
    if not les:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại.",
        )

    if les.status != "in-review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có bài học đang chờ duyệt ('in-review') mới có thể yêu cầu chỉnh sửa. Trạng thái hiện tại: {les.status}",
        )

    les.status = "draft"
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="content_changes_requested",
        target_type="content_lesson",
        target_id=les.id,
        payload={"title": les.title, "feedback": feedback},
    )
    db.commit()
    db.refresh(les)

    author = db.query(User).filter(User.id == les.author_id).first()
    return _format_lesson(les, author)
