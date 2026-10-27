import uuid
from fastapi import APIRouter, Depends
import pytest
from app.api.deps import require_permission, require_role
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User

rbac_demo_router = APIRouter(prefix="/demo-rbac")


@rbac_demo_router.get("/admin-only")
def admin_only_endpoint(current_user: User = Depends(require_role("admin"))):
    return {"status": "ok", "role": current_user.role}


@rbac_demo_router.get("/teacher-or-admin")
def teacher_endpoint(
    current_user: User = Depends(require_role("teacher", "admin"))
):
    return {"status": "ok", "role": current_user.role}


@rbac_demo_router.get("/manage-content")
def content_endpoint(
    current_user: User = Depends(require_permission("manage_content"))
):
    return {"status": "ok", "role": current_user.role}


@rbac_demo_router.get("/manage-users")
def users_endpoint(
    current_user: User = Depends(require_permission("manage_users"))
):
    return {"status": "ok", "role": current_user.role}


# Include the demo router in the app
app.include_router(rbac_demo_router)


def test_public_registration_defaults_to_learner(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "learner_rbac@example.com",
            "password": "Password123!",
            "displayName": "Learner RBAC",
            "role": "admin",  # Client cannot spoof role
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "learner"


def test_auth_me_returns_user_role(client, db_session):
    user_id = str(uuid.uuid4())
    teacher = User(
        id=user_id,
        email="teacher@example.com",
        email_normalized="teacher@example.com",
        password_hash=hash_password("Pass123!"),
        display_name="Teacher 1",
        role="teacher",
    )
    db_session.add(teacher)
    db_session.commit()

    token, _ = create_access_token(user_id)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "teacher"


def test_require_role_and_permission_enforcement(client, db_session):
    # 1. Create learner, teacher, content, and admin users
    learner_id = str(uuid.uuid4())
    teacher_id = str(uuid.uuid4())
    content_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())

    db_session.add(
        User(
            id=learner_id,
            email="learner_test@example.com",
            email_normalized="learner_test@example.com",
            role="learner",
        )
    )
    db_session.add(
        User(
            id=teacher_id,
            email="teacher_test@example.com",
            email_normalized="teacher_test@example.com",
            role="teacher",
        )
    )
    db_session.add(
        User(
            id=content_id,
            email="content_test@example.com",
            email_normalized="content_test@example.com",
            role="content",
        )
    )
    db_session.add(
        User(
            id=admin_id,
            email="admin_test@example.com",
            email_normalized="admin_test@example.com",
            role="admin",
        )
    )
    db_session.commit()

    learner_token, _ = create_access_token(learner_id)
    teacher_token, _ = create_access_token(teacher_id)
    content_token, _ = create_access_token(content_id)
    admin_token, _ = create_access_token(admin_id)

    # 2. Test admin-only endpoint
    # Learner -> 403
    res = client.get(
        "/demo-rbac/admin-only",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Không có quyền truy cập."

    # Teacher -> 403
    res = client.get(
        "/demo-rbac/admin-only",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res.status_code == 403

    # Admin -> 200
    res = client.get(
        "/demo-rbac/admin-only",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "admin"

    # 3. Test teacher-or-admin
    # Learner -> 403
    res = client.get(
        "/demo-rbac/teacher-or-admin",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert res.status_code == 403

    # Teacher -> 200
    res = client.get(
        "/demo-rbac/teacher-or-admin",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res.status_code == 200

    # 4. Test permission manage_content
    # Learner -> 403
    res = client.get(
        "/demo-rbac/manage-content",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert res.status_code == 403

    # Content user -> 200
    res = client.get(
        "/demo-rbac/manage-content",
        headers={"Authorization": f"Bearer {content_token}"},
    )
    assert res.status_code == 200

    # 5. Test permission manage_users
    # Content user -> 403
    res = client.get(
        "/demo-rbac/manage-users",
        headers={"Authorization": f"Bearer {content_token}"},
    )
    assert res.status_code == 403

    # Admin user -> 200
    res = client.get(
        "/demo-rbac/manage-users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
