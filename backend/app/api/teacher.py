from datetime import datetime, timezone, timedelta
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from app.api.deps import require_role
from app.database import get_db
from app.models.assessment_attempt import AssessmentAttempt
from app.models.learning_event import LearningEventModel
from app.models.lesson_progress import LessonProgress
from app.models.teacher import Assignment, AssignmentItem, ClassMembership, TeacherClass
from app.models.user import User
from app.services.audit import log_staff_action

router = APIRouter(prefix="/teacher", tags=["teacher"])


class CreateAssignmentRequest(BaseModel):
    classId: str
    title: str
    description: Optional[str] = None
    dueDate: Optional[str] = None  # ISO format string
    items: Optional[List[dict[str, Any]]] = None


class UpdateAssignmentRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    dueDate: Optional[str] = None
    status: Optional[str] = None  # draft, published, closed


def _is_student_at_risk(
    student_id: str,
    db: Session,
) -> tuple[bool, Optional[str]]:
    now = datetime.now(timezone.utc)

    # 1. Assessment score rule: latest assessment scaled score < 0.60
    latest_attempt = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.user_id == student_id,
            AssessmentAttempt.completion_status == "completed",
        )
        .order_by(desc(AssessmentAttempt.completed_at))
        .first()
    )
    if latest_attempt and latest_attempt.score_scaled is not None and latest_attempt.score_scaled < 0.60:
        return True, f"Điểm bài kiểm tra gần nhất thấp ({int(latest_attempt.score_scaled * 100)}%)"

    # 2. Inactivity rule: no activity in last 3 days
    latest_event = (
        db.query(LearningEventModel)
        .filter(LearningEventModel.user_id == student_id)
        .order_by(desc(LearningEventModel.timestamp))
        .first()
    )
    if latest_event:
        event_time = latest_event.timestamp
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        if (now - event_time) > timedelta(days=3):
            return True, "Không có hoạt động học tập trong 3 ngày qua"
    else:
        # Check lesson progress
        latest_prog = (
            db.query(LessonProgress)
            .filter(LessonProgress.user_id == student_id)
            .order_by(desc(LessonProgress.updated_at))
            .first()
        )
        if latest_prog:
            prog_time = latest_prog.updated_at
            if prog_time.tzinfo is None:
                prog_time = prog_time.replace(tzinfo=timezone.utc)
            if (now - prog_time) > timedelta(days=3):
                return True, "Không có hoạt động học tập trong 3 ngày qua"

    return False, None


@router.get("/dashboard")
def get_teacher_dashboard(
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    teacher_id = current_user.id
    classes = db.query(TeacherClass).filter(TeacherClass.teacher_id == teacher_id).all()
    class_ids = [c.id for c in classes]

    total_classes = len(classes)
    total_students = 0
    at_risk_count = 0

    if class_ids:
        # Count unique students enrolled
        memberships = (
            db.query(ClassMembership)
            .filter(ClassMembership.class_id.in_(class_ids))
            .all()
        )
        unique_student_ids = {m.student_id for m in memberships}
        total_students = len(unique_student_ids)

        for s_id in unique_student_ids:
            at_risk, _ = _is_student_at_risk(s_id, db)
            if at_risk:
                at_risk_count += 1

    total_assignments = (
        db.query(func.count(Assignment.id))
        .filter(Assignment.teacher_id == teacher_id, Assignment.status == "published")
        .scalar()
        or 0
    )

    return {
        "metrics": {
            "totalClasses": total_classes,
            "totalStudents": total_students,
            "activeAssignments": total_assignments,
            "atRiskStudents": at_risk_count,
        },
        "recentClasses": [
            {
                "id": c.id,
                "name": c.name,
                "code": c.code,
                "grade": c.grade,
                "subject": c.subject,
                "academicYear": c.academic_year,
                "studentCount": len(c.memberships),
            }
            for c in classes[:5]
        ],
    }


@router.get("/classes")
def list_teacher_classes(
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    classes = (
        db.query(TeacherClass)
        .filter(TeacherClass.teacher_id == current_user.id)
        .order_by(desc(TeacherClass.created_at))
        .all()
    )

    result = []
    for c in classes:
        active_assignments = (
            db.query(func.count(Assignment.id))
            .filter(Assignment.class_id == c.id, Assignment.status == "published")
            .scalar()
            or 0
        )
        result.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "grade": c.grade,
            "subject": c.subject,
            "academicYear": c.academic_year,
            "description": c.description or "",
            "studentCount": len(c.memberships),
            "activeAssignments": active_assignments,
            "createdAt": c.created_at.isoformat(),
        })

    return {"items": result, "total": len(result)}


@router.get("/classes/{class_id}")
def get_teacher_class_detail(
    class_id: str,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    c = db.query(TeacherClass).filter(TeacherClass.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lớp học không tồn tại.",
        )

    # Ownership check
    if c.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập lớp học này.",
        )

    active_assignments = (
        db.query(func.count(Assignment.id))
        .filter(Assignment.class_id == c.id, Assignment.status == "published")
        .scalar()
        or 0
    )

    return {
        "id": c.id,
        "name": c.name,
        "code": c.code,
        "grade": c.grade,
        "subject": c.subject,
        "academicYear": c.academic_year,
        "description": c.description or "",
        "studentCount": len(c.memberships),
        "activeAssignments": active_assignments,
        "createdAt": c.created_at.isoformat(),
    }


@router.get("/classes/{class_id}/students")
def get_class_students(
    class_id: str,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    c = db.query(TeacherClass).filter(TeacherClass.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lớp học không tồn tại.",
        )

    if c.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập lớp học này.",
        )

    memberships = (
        db.query(ClassMembership)
        .filter(ClassMembership.class_id == class_id)
        .all()
    )

    students = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.student_id).first()
        if not u:
            continue

        at_risk, risk_reason = _is_student_at_risk(u.id, db)

        # Calculate average score from assessment attempts
        avg_score_val = (
            db.query(func.avg(AssessmentAttempt.score_scaled))
            .filter(AssessmentAttempt.user_id == u.id, AssessmentAttempt.completion_status == "completed")
            .scalar()
        )
        avg_score = round(avg_score_val * 100, 1) if avg_score_val is not None else 0

        # Calculate completed lessons count
        completed_lessons = (
            db.query(func.count(LessonProgress.id))
            .filter(LessonProgress.user_id == u.id, LessonProgress.overall_progress >= 100)
            .scalar()
            or 0
        )

        students.append({
            "id": u.id,
            "displayName": u.display_name or "Học viên",
            "email": u.email or "",
            "grade": u.grade or c.grade,
            "status": m.status,
            "joinedAt": m.joined_at.isoformat(),
            "averageScore": avg_score,
            "completedLessons": completed_lessons,
            "isAtRisk": at_risk,
            "riskReason": risk_reason,
        })

    return {"items": students, "total": len(students)}


@router.get("/students/{student_id}")
def get_student_academic_profile(
    student_id: str,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    # Verify student is in at least one class taught by current_user
    if current_user.role != "admin":
        teacher_class_ids = [
            c.id for c in db.query(TeacherClass).filter(TeacherClass.teacher_id == current_user.id).all()
        ]
        is_enrolled = (
            db.query(ClassMembership)
            .filter(
                ClassMembership.class_id.in_(teacher_class_ids),
                ClassMembership.student_id == student_id,
            )
            .first()
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Giáo viên chỉ có thể xem hồ sơ học viên thuộc các lớp do mình phụ trách.",
            )

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Học viên không tồn tại.",
        )

    at_risk, risk_reason = _is_student_at_risk(student.id, db)

    # Progress stats
    progress_records = db.query(LessonProgress).filter(LessonProgress.user_id == student.id).all()
    completed_lessons = sum(1 for p in progress_records if p.overall_progress >= 100)
    in_progress_lessons = sum(1 for p in progress_records if 0 < p.overall_progress < 100)

    # Assessment stats
    attempts = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.user_id == student.id, AssessmentAttempt.completion_status == "completed")
        .order_by(desc(AssessmentAttempt.completed_at))
        .all()
    )
    avg_score = (
        round(sum(a.score_scaled for a in attempts if a.score_scaled is not None) / len(attempts) * 100, 1)
        if attempts
        else 0
    )
    latest_score = (
        round(attempts[0].score_scaled * 100, 1)
        if attempts and attempts[0].score_scaled is not None
        else None
    )

    return {
        "id": student.id,
        "displayName": student.display_name or "Học viên",
        "email": student.email or "",
        "grade": student.grade or "",
        "stats": {
            "completedLessons": completed_lessons,
            "inProgressLessons": in_progress_lessons,
            "averageScore": avg_score,
            "latestScore": latest_score,
            "totalAssessments": len(attempts),
        },
        "riskAssessment": {
            "isAtRisk": at_risk,
            "reason": risk_reason,
            "evaluationType": "rule-based",  # Explicitly explainable rule, not pseudo AI
        },
    }


@router.get("/assignments")
def list_teacher_assignments(
    classId: Optional[str] = Query(None),
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(Assignment).filter(Assignment.teacher_id == current_user.id)
    if classId:
        query = query.filter(Assignment.class_id == classId)

    assignments = query.order_by(desc(Assignment.created_at)).all()

    result = []
    for a in assignments:
        c = a.teacher_class
        result.append({
            "id": a.id,
            "classId": a.class_id,
            "className": c.name if c else "",
            "title": a.title,
            "description": a.description or "",
            "dueDate": a.due_date.isoformat() if a.due_date else None,
            "status": a.status,
            "itemCount": len(a.items),
            "createdAt": a.created_at.isoformat(),
        })

    return {"items": result, "total": len(result)}


@router.post("/assignments")
def create_teacher_assignment(
    req: CreateAssignmentRequest,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    c = db.query(TeacherClass).filter(TeacherClass.id == req.classId).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lớp học không tồn tại.",
        )

    if c.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền giao bài tập cho lớp học này.",
        )

    parsed_due_date = None
    if req.dueDate:
        try:
            parsed_due_date = datetime.fromisoformat(req.dueDate.replace("Z", "+00:00"))
        except Exception:
            pass

    assignment_id = f"asg-{uuid.uuid4().hex[:12]}"
    assignment = Assignment(
        id=assignment_id,
        class_id=req.classId,
        teacher_id=current_user.id,
        title=req.title,
        description=req.description,
        due_date=parsed_due_date,
        status="published",
    )
    db.add(assignment)

    if req.items:
        for idx, item in enumerate(req.items):
            db.add(
                AssignmentItem(
                    id=f"item-{uuid.uuid4().hex[:12]}",
                    assignment_id=assignment_id,
                    lesson_id=item.get("lessonId"),
                    question_id=item.get("questionId"),
                    title=item.get("title", f"Bài tập {idx + 1}"),
                    max_score=item.get("maxScore", 10),
                )
            )

    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="assignment_created",
        target_type="assignment",
        target_id=assignment_id,
        payload={"title": req.title, "classId": req.classId},
    )
    db.commit()
    db.refresh(assignment)

    return {
        "id": assignment.id,
        "classId": assignment.class_id,
        "title": assignment.title,
        "description": assignment.description,
        "dueDate": assignment.due_date.isoformat() if assignment.due_date else None,
        "status": assignment.status,
        "createdAt": assignment.created_at.isoformat(),
    }


@router.get("/assignments/{assignment_id}")
def get_teacher_assignment_detail(
    assignment_id: str,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài tập không tồn tại.",
        )

    if a.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem bài tập này.",
        )

    return {
        "id": a.id,
        "classId": a.class_id,
        "className": a.teacher_class.name if a.teacher_class else "",
        "title": a.title,
        "description": a.description or "",
        "dueDate": a.due_date.isoformat() if a.due_date else None,
        "status": a.status,
        "items": [
            {
                "id": it.id,
                "title": it.title,
                "lessonId": it.lesson_id,
                "questionId": it.question_id,
                "maxScore": it.max_score,
            }
            for it in a.items
        ],
        "createdAt": a.created_at.isoformat(),
    }


@router.patch("/assignments/{assignment_id}")
def update_teacher_assignment(
    assignment_id: str,
    req: UpdateAssignmentRequest,
    current_user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài tập không tồn tại.",
        )

    if a.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa bài tập này.",
        )

    if req.title is not None:
        a.title = req.title
    if req.description is not None:
        a.description = req.description
    if req.dueDate is not None:
        try:
            a.due_date = datetime.fromisoformat(req.dueDate.replace("Z", "+00:00"))
        except Exception:
            pass
    if req.status is not None:
        if req.status in ("draft", "published", "closed"):
            a.status = req.status

    db.commit()
    db.refresh(a)

    return {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "dueDate": a.due_date.isoformat() if a.due_date else None,
        "status": a.status,
    }
