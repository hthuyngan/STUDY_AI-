from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import create_access_token, hash_password
from app.models.content import ContentChapter, ContentLesson, ContentSubject
from app.models.staff_audit_log import StaffAuditLog
from app.models.support import SupportTicket
from app.models.teacher import ClassMembership, TeacherClass
from app.models.user import User


def _auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seed_test_users(db_session: Session):
    # Admin 1
    admin_1 = User(
        id="usr-t-admin-1",
        email="t_admin1@studyai.vn",
        display_name="Admin 1",
        role="admin",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Admin 2 (so we can test removing admin 2 without violating last admin rule)
    admin_2 = User(
        id="usr-t-admin-2",
        email="t_admin2@studyai.vn",
        display_name="Admin 2",
        role="admin",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Teacher 1
    teacher_1 = User(
        id="usr-t-teacher-1",
        email="t_teacher1@studyai.vn",
        display_name="Teacher 1",
        role="teacher",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Teacher 2
    teacher_2 = User(
        id="usr-t-teacher-2",
        email="t_teacher2@studyai.vn",
        display_name="Teacher 2",
        role="teacher",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Content Editor
    content_user = User(
        id="usr-t-content-1",
        email="t_content1@studyai.vn",
        display_name="Content 1",
        role="content",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Support Agent
    support_user = User(
        id="usr-t-support-1",
        email="t_support1@studyai.vn",
        display_name="Support 1",
        role="support",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Learner
    learner_1 = User(
        id="usr-t-learner-1",
        email="t_learner1@studyai.vn",
        display_name="Learner 1",
        role="learner",
        status="active",
        password_hash=hash_password("testpass"),
    )
    # Suspended User
    suspended_user = User(
        id="usr-t-suspended",
        email="t_suspended@studyai.vn",
        display_name="Suspended User",
        role="learner",
        status="suspended",
        password_hash=hash_password("testpass"),
    )

    db_session.add_all([
        admin_1,
        admin_2,
        teacher_1,
        teacher_2,
        content_user,
        support_user,
        learner_1,
        suspended_user,
    ])
    db_session.commit()
    return {
        "admin_1": admin_1,
        "admin_2": admin_2,
        "teacher_1": teacher_1,
        "teacher_2": teacher_2,
        "content": content_user,
        "support": support_user,
        "learner": learner_1,
        "suspended": suspended_user,
    }


def test_account_status_suspended_rejected(client, seed_test_users):
    """Suspended or disabled accounts must be rejected with 403 on protected operations."""
    headers = _auth_header("usr-t-suspended")
    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 403
    assert "tạm khóa" in resp.json().get("detail", "")


def test_admin_dashboard_and_users(client, seed_test_users):
    """Admin can view dashboard metrics and user list."""
    headers = _auth_header("usr-t-admin-1")

    dash_resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert "metrics" in data
    assert data["metrics"]["totalUsers"] >= 7

    users_resp = client.get("/api/v1/admin/users", headers=headers)
    assert users_resp.status_code == 200
    users_data = users_resp.json()
    assert users_data["total"] >= 7
    assert len(users_data["items"]) >= 7


def test_admin_role_change_and_last_admin_protection(client, seed_test_users, db_session):
    """Admin can change roles, but last active admin is protected."""
    headers = _auth_header("usr-t-admin-1")

    # Demote admin_2 to teacher -> should succeed since admin_1 is still active
    resp = client.patch(
        "/api/v1/admin/users/usr-t-admin-2/role",
        headers=headers,
        json={"role": "teacher"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "teacher"

    # Now admin_1 is the sole remaining active admin. Attempting to demote admin_1 must fail!
    fail_resp = client.patch(
        "/api/v1/admin/users/usr-t-admin-1/role",
        headers=headers,
        json={"role": "learner"},
    )
    assert fail_resp.status_code == 400
    assert "quản trị viên hoạt động duy nhất" in fail_resp.json()["detail"]

    # Also attempting to suspend admin_1 must fail!
    fail_status_resp = client.patch(
        "/api/v1/admin/users/usr-t-admin-1/status",
        headers=headers,
        json={"status": "suspended"},
    )
    assert fail_status_resp.status_code == 400
    assert "quản trị viên hoạt động duy nhất" in fail_status_resp.json()["detail"]

    # Verify audit log was created for role change
    audit = (
        db_session.query(StaffAuditLog)
        .filter(StaffAuditLog.action == "role_changed", StaffAuditLog.target_id == "usr-t-admin-2")
        .first()
    )
    assert audit is not None


def test_admin_system_health(client, seed_test_users):
    """Real system health check returns actual db probe latency."""
    headers = _auth_header("usr-t-admin-1")
    resp = client.get("/api/v1/admin/system/health", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["apiStatus"] == "operational"
    assert data["database"]["status"] == "connected"
    assert isinstance(data["database"]["latencyMs"], (int, float))


def test_teacher_class_isolation_and_assignments(client, seed_test_users, db_session):
    """Teacher only accesses assigned classes and cannot inspect arbitrary learners."""
    # Create class for teacher 1
    cls_1 = TeacherClass(
        id="cls-test-1",
        name="Lớp Toán 12T",
        code="12T-MATH",
        grade="12",
        subject="Toán học",
        teacher_id="usr-t-teacher-1",
        academic_year="2025-2026",
    )
    # Create class for teacher 2
    cls_2 = TeacherClass(
        id="cls-test-2",
        name="Lớp Toán 12B",
        code="12B-MATH",
        grade="12",
        subject="Toán học",
        teacher_id="usr-t-teacher-2",
        academic_year="2025-2026",
    )
    db_session.add_all([cls_1, cls_2])

    # Enroll learner 1 into class 1 only
    mem_1 = ClassMembership(
        id="mem-t-1",
        class_id="cls-test-1",
        student_id="usr-t-learner-1",
    )
    db_session.add(mem_1)
    db_session.commit()

    teacher_1_headers = _auth_header("usr-t-teacher-1")
    teacher_2_headers = _auth_header("usr-t-teacher-2")

    # Teacher 1 sees cls-test-1
    resp_1 = client.get("/api/v1/teacher/classes", headers=teacher_1_headers)
    assert resp_1.status_code == 200
    class_ids_1 = [c["id"] for c in resp_1.json()["items"]]
    assert "cls-test-1" in class_ids_1
    assert "cls-test-2" not in class_ids_1

    # Teacher 1 can inspect learner 1
    student_resp = client.get("/api/v1/teacher/students/usr-t-learner-1", headers=teacher_1_headers)
    assert student_resp.status_code == 200
    assert student_resp.json()["id"] == "usr-t-learner-1"

    # Teacher 2 CANNOT inspect learner 1 (not enrolled in teacher 2's class)
    unauth_student_resp = client.get("/api/v1/teacher/students/usr-t-learner-1", headers=teacher_2_headers)
    assert unauth_student_resp.status_code == 403

    # Teacher 1 creates assignment
    create_asg_resp = client.post(
        "/api/v1/teacher/assignments",
        headers=teacher_1_headers,
        json={
            "classId": "cls-test-1",
            "title": "Bài tập hàm số",
            "description": "Làm bài tập",
        },
    )
    assert create_asg_resp.status_code == 200
    asg_id = create_asg_resp.json()["id"]

    # Teacher 2 cannot view or edit teacher 1's assignment
    asg_forbidden = client.get(f"/api/v1/teacher/assignments/{asg_id}", headers=teacher_2_headers)
    assert asg_forbidden.status_code == 403


def test_content_lifecycle_workflow(client, seed_test_users, db_session):
    """Content creation -> submit review -> changes requested -> re-submit -> approve."""
    # Setup test subject and chapter
    subject = ContentSubject(
        id="subj-test-c",
        name="Vật lý 12",
        code="PHYS12",
        grade="12",
    )
    chapter = ContentChapter(
        id="chap-test-c",
        subject_id="subj-test-c",
        title="Chương 1 Dao động cơ",
    )
    db_session.add_all([subject, chapter])
    db_session.commit()

    content_headers = _auth_header("usr-t-content-1")

    # 1. Create draft lesson
    create_resp = client.post(
        "/api/v1/content/lessons",
        headers=content_headers,
        json={
            "chapterId": "chap-test-c",
            "title": "Con lắc lò xo",
            "slug": "con-lac-lo-xo",
            "introduction": "Khảo sát dao động điều hòa của con lắc lò xo.",
            "definitions": [{"term": "Tần số góc", "meaning": "omega = sqrt(k/m)"}],
        },
    )
    assert create_resp.status_code == 200
    lesson_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "draft"

    # Cannot approve a draft directly (invalid transition)
    direct_approve = client.post(f"/api/v1/content/lessons/{lesson_id}/approve", headers=content_headers)
    assert direct_approve.status_code == 400

    # 2. Submit for review (draft -> in-review)
    submit_resp = client.post(f"/api/v1/content/lessons/{lesson_id}/submit-review", headers=content_headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "in-review"

    # 3. Request changes (in-review -> draft)
    req_changes_resp = client.post(
        f"/api/v1/content/lessons/{lesson_id}/request-changes",
        headers=content_headers,
        params={"feedback": "Cần bổ sung thêm ví dụ tính chu kỳ."},
    )
    assert req_changes_resp.status_code == 200
    assert req_changes_resp.json()["status"] == "draft"

    # Re-submit for review
    client.post(f"/api/v1/content/lessons/{lesson_id}/submit-review", headers=content_headers)

    # 4. Approve (in-review -> published)
    approve_resp = client.post(f"/api/v1/content/lessons/{lesson_id}/approve", headers=content_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "published"


def test_support_ticket_flow_and_privacy(client, seed_test_users, db_session):
    """Support agents can list tickets, reply, update status, and search users without leaking secrets."""
    ticket = SupportTicket(
        id="tkt-test-1",
        user_id="usr-t-learner-1",
        subject="Không vào được bài học",
        status="open",
        priority="high",
        category="technical",
    )
    db_session.add(ticket)
    db_session.commit()

    support_headers = _auth_header("usr-t-support-1")

    # List tickets
    tickets_resp = client.get("/api/v1/support/tickets", headers=support_headers)
    assert tickets_resp.status_code == 200
    assert tickets_resp.json()["total"] >= 1

    # Reply to ticket
    msg_resp = client.post(
        "/api/v1/support/tickets/tkt-test-1/messages",
        headers=support_headers,
        json={"message": "Chào bạn, bạn thử tải lại trang hoặc kiểm tra kết nối nhé.", "isInternal": False},
    )
    assert msg_resp.status_code == 200
    assert msg_resp.json()["message"] == "Chào bạn, bạn thử tải lại trang hoặc kiểm tra kết nối nhé."

    # Update ticket status to resolved
    patch_resp = client.patch(
        "/api/v1/support/tickets/tkt-test-1",
        headers=support_headers,
        json={"status": "resolved"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "resolved"

    # User lookup for support: verify no password_hash or sensitive secrets leaked
    users_resp = client.get("/api/v1/support/users", headers=support_headers)
    assert users_resp.status_code == 200
    first_u = users_resp.json()["items"][0]
    assert "password_hash" not in first_u
    assert "password" not in first_u
    assert "refresh_token" not in first_u
