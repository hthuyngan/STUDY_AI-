"""Development seed script for staff operations.

Seeds fictional staff users, learners, classes, assignments, content subjects,
chapters, draft lessons, and support tickets.
Uses DEV_SEED_PASSWORD from environment (defaulting to a dev placeholder if unset).
DO NOT COMMIT ACTUAL PASSWORDS.
"""

from datetime import datetime, timezone, timedelta
import json
import os
import sys
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.content import (
    ContentAssessment,
    ContentChapter,
    ContentLesson,
    ContentQuestion,
    ContentSubject,
)
from app.models.staff_audit_log import StaffAuditLog
from app.models.support import SupportTicket, SupportTicketMessage
from app.models.teacher import Assignment, AssignmentItem, ClassMembership, TeacherClass
from app.models.user import User


def seed():
    seed_password = os.environ.get("DEV_SEED_PASSWORD", "StudyAI@Dev2026!")
    hashed_pwd = hash_password(seed_password)

    db = SessionLocal()
    try:
        print("🌱 Seeding staff operations and initial data...")

        # 1. Staff Users
        staff_defs = [
            {
                "id": "usr-admin-system",
                "email": "admin@studyai.vn",
                "displayName": "Quản trị viên Hệ thống",
                "role": "admin",
                "grade": "12",
                "status": "active",
            },
            {
                "id": "usr-teacher-math",
                "email": "teacher.math@studyai.vn",
                "displayName": "Thầy Nguyễn Văn Nam",
                "role": "teacher",
                "grade": "12",
                "status": "active",
            },
            {
                "id": "usr-content-editor",
                "email": "content.editor@studyai.vn",
                "displayName": "Biên tập viên Toán 12",
                "role": "content",
                "grade": "12",
                "status": "active",
            },
            {
                "id": "usr-support-agent",
                "email": "support.agent@studyai.vn",
                "displayName": "Chuyên viên Hỗ trợ",
                "role": "support",
                "grade": "12",
                "status": "active",
            },
            # Fictional learners
            {
                "id": "usr-student-01",
                "email": "learner.ha@studyai.vn",
                "displayName": "Lê Thu Hà",
                "role": "learner",
                "grade": "12",
                "status": "active",
            },
            {
                "id": "usr-student-02",
                "email": "learner.minh@studyai.vn",
                "displayName": "Trần Tuấn Minh",
                "role": "learner",
                "grade": "12",
                "status": "active",
            },
            {
                "id": "usr-student-03",
                "email": "learner.quang@studyai.vn",
                "displayName": "Phạm Đăng Quang",
                "role": "learner",
                "grade": "12",
                "status": "active",
            },
        ]

        for s in staff_defs:
            existing = db.query(User).filter(User.id == s["id"]).first()
            if not existing:
                u = User(
                    id=s["id"],
                    email=s["email"],
                    email_normalized=s["email"].lower(),
                    password_hash=hashed_pwd,
                    display_name=s["displayName"],
                    grade=s["grade"],
                    role=s["role"],
                    status=s["status"],
                )
                db.add(u)
                print(f"  + User: {s['displayName']} ({s['role']})")
        db.commit()

        # 2. Teacher Classes & Memberships
        class_1 = db.query(TeacherClass).filter(TeacherClass.id == "cls-12a1").first()
        if not class_1:
            class_1 = TeacherClass(
                id="cls-12a1",
                name="12A1 Chuyên Toán",
                code="12A1-MATH",
                grade="12",
                subject="Toán học",
                teacher_id="usr-teacher-math",
                academic_year="2025-2026",
                description="Lớp Toán học nâng cao ôn thi THPT Quốc Gia",
            )
            db.add(class_1)
            print("  + Teacher Class: 12A1 Chuyên Toán")

            # Enroll students
            for student_id in ["usr-student-01", "usr-student-02", "usr-student-03"]:
                m = ClassMembership(
                    id=f"mem-{class_1.id}-{student_id}",
                    class_id=class_1.id,
                    student_id=student_id,
                    status="active",
                )
                db.add(m)

            # Create an assignment
            asg_1 = Assignment(
                id="asg-math-01",
                class_id=class_1.id,
                teacher_id="usr-teacher-math",
                title="Khảo sát biến thiên và cực trị hàm phân thức",
                description="Làm các bài tập ứng dụng đạo hàm và nộp trước thứ Bảy.",
                due_date=datetime.now(timezone.utc) + timedelta(days=5),
                status="published",
            )
            db.add(asg_1)

            db.add(
                AssignmentItem(
                    id="asg-item-01",
                    assignment_id=asg_1.id,
                    lesson_id="lesson-math-01",
                    title="Tìm khoảng đồng biến, nghịch biến",
                    max_score=10,
                )
            )
            print("  + Assignment: Khảo sát biến thiên")
        db.commit()

        # 3. Content Subject & Draft Lessons
        math_subj = db.query(ContentSubject).filter(ContentSubject.id == "subj-math-12").first()
        if not math_subj:
            math_subj = ContentSubject(
                id="subj-math-12",
                name="Toán học 12",
                code="MATH12",
                grade="12",
                description="Chương trình SGK Toán 12 Chuẩn & Nâng cao",
                is_active=True,
            )
            db.add(math_subj)

            chapter_1 = ContentChapter(
                id="chap-math-01",
                subject_id=math_subj.id,
                title="Chương I: Ứng dụng đạo hàm để khảo sát hàm số",
                order_index=1,
            )
            db.add(chapter_1)

            # Draft lesson for review
            draft_lesson = ContentLesson(
                id="les-draft-01",
                chapter_id=chapter_1.id,
                title="Đường tiệm cận của đồ thị hàm số",
                slug="duong-tiem-can",
                order_index=1,
                status="draft",
                author_id="usr-content-editor",
                introduction="Bài học khảo sát phương pháp tìm tiệm cận đứng, ngang và xiên.",
                definitions=json.dumps([
                    {"term": "Tiệm cận đứng", "meaning": "Đường thẳng x = x0 nếu lim f(x) khi x -> x0 là vô cực"}
                ], ensure_ascii=False),
                formulas=json.dumps(["lim_{x \\to x_0} f(x) = \\pm \\infty"], ensure_ascii=False),
                examples=json.dumps([
                    {"title": "Ví dụ 1", "problem": "Tìm tiệm cận đứng của y = (2x+1)/(x-1)", "solution": "x = 1"}
                ], ensure_ascii=False),
                important_notes=json.dumps(["Chú ý tập xác định trước khi tính giới hạn."], ensure_ascii=False),
                summary_points=json.dumps(["Quy tắc tìm tiệm cận đứng và tiệm cận ngang."], ensure_ascii=False),
            )
            db.add(draft_lesson)
            print("  + Content: Toán học 12 & Draft Lesson")
        db.commit()

        # 4. Support Tickets
        ticket_1 = db.query(SupportTicket).filter(SupportTicket.id == "tkt-001").first()
        if not ticket_1:
            ticket_1 = SupportTicket(
                id="tkt-001",
                user_id="usr-student-01",
                assigned_to="usr-support-agent",
                subject="Lỗi không tải được bài tập Harvest Assessment",
                status="open",
                priority="high",
                category="academic",
            )
            db.add(ticket_1)

            msg_1 = SupportTicketMessage(
                id="msg-tkt-01",
                ticket_id=ticket_1.id,
                sender_id="usr-student-01",
                message="Em bấm nộp bài trắc nghiệm đạo hàm mà hệ thống báo lỗi mạng cục bộ ạ.",
                is_internal=False,
            )
            db.add(msg_1)
            print("  + Support Ticket: tkt-001")
        db.commit()

        # 5. Audit Log
        db.add(
            StaffAuditLog(
                id="audit-seed-init",
                actor_user_id="usr-admin-system",
                action="system_initialized",
                target_type="system",
                target_id="studyai-core",
                payload=json.dumps({"seeded_at": datetime.now(timezone.utc).isoformat()}),
            )
        )
        db.commit()

        print("✅ Staff operations seed completed successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
