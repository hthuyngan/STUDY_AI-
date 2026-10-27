from datetime import datetime, timedelta, timezone
import jwt
from app.config import settings
from app.models.refresh_session import RefreshSession
from app.models.user import User


def test_register_success_and_password_hashed(unauthenticated_client, db_session):
    res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "learner1@example.com",
            "password": "SecurePassword123!",
            "displayName": "Learner One",
            "grade": "Lớp 12",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "accessToken" in data
    assert data["tokenType"] == "bearer"
    assert data["expiresIn"] > 0
    assert data["user"]["email"] == "learner1@example.com"
    assert data["user"]["displayName"] == "Learner One"
    assert "password" not in data
    assert "passwordHash" not in data["user"]

    # Refresh cookie present
    assert "study_ai_refresh_token" in res.cookies

    # Verify DB state: password must NOT be plain text, must be argon2 hash
    user_in_db = (
        db_session.query(User)
        .filter(User.email_normalized == "learner1@example.com")
        .first()
    )
    assert user_in_db is not None
    assert user_in_db.password_hash.startswith("$argon2id$")
    assert "SecurePassword123!" not in user_in_db.password_hash

    # Verify refresh session exists and raw token is NOT in DB
    sessions = (
        db_session.query(RefreshSession)
        .filter(RefreshSession.user_id == user_in_db.id)
        .all()
    )
    assert len(sessions) == 1
    raw_cookie_val = res.cookies["study_ai_refresh_token"]
    assert sessions[0].token_hash != raw_cookie_val
    assert len(sessions[0].token_hash) == 64  # SHA-256 hex string


def test_register_duplicate_email_returns_409(unauthenticated_client):
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123",
        "displayName": "User D",
    }
    res1 = unauthenticated_client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Same email with mixed case/spaces
    res2 = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "  DUPLICATE@EXAMPLE.COM  ",
            "password": "Password123",
            "displayName": "User D2",
        },
    )
    assert res2.status_code == 409
    assert "Email đã được sử dụng." in res2.json()["detail"]


def test_login_success_and_wrong_password_rejected(unauthenticated_client):
    # Register first
    unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "loginuser@example.com",
            "password": "CorrectPassword123",
            "displayName": "Login User",
        },
    )

    # Wrong password
    bad_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={
            "email": "loginuser@example.com",
            "password": "WrongPassword456",
        },
    )
    assert bad_res.status_code == 401
    assert bad_res.json()["detail"] == "Email hoặc mật khẩu không chính xác."

    # Non-existent email gives same generic message
    bad_email_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword456",
        },
    )
    assert bad_email_res.status_code == 401
    assert bad_email_res.json()["detail"] == "Email hoặc mật khẩu không chính xác."

    # Successful login
    ok_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={
            "email": "loginuser@example.com",
            "password": "CorrectPassword123",
        },
    )
    assert ok_res.status_code == 200
    login_data = ok_res.json()
    assert "accessToken" in login_data
    assert login_data["user"]["displayName"] == "Login User"
    assert "study_ai_refresh_token" in ok_res.cookies


def test_get_me_with_access_token_and_reject_invalid(unauthenticated_client):
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "me_test@example.com",
            "password": "ValidPassword999",
            "displayName": "Me Test User",
            "grade": "Lớp 11",
        },
    )
    token = reg_res.json()["accessToken"]

    # 1. Valid token
    me_res = unauthenticated_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "me_test@example.com"
    assert me_data["displayName"] == "Me Test User"
    assert me_data["grade"] == "Lớp 11"
    assert "password" not in me_data
    assert "passwordHash" not in me_data

    # 2. No token
    no_token_res = unauthenticated_client.get("/api/v1/auth/me")
    assert no_token_res.status_code == 401

    # 3. Invalid token signature
    tampered = token[:-4] + "fake"
    tampered_res = unauthenticated_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert tampered_res.status_code == 401

    # 4. Expired token
    expired_payload = {
        "sub": me_data["id"],
        "iat": int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp()),
        "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
        "type": "access",
    }
    expired_token = jwt.encode(
        expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    expired_res = unauthenticated_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_res.status_code == 401


def test_refresh_token_rotation_and_prevent_reuse(unauthenticated_client):
    # Register to obtain refresh cookie
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "rotator@example.com",
            "password": "PasswordRotation123",
            "displayName": "Rotator",
        },
    )
    assert reg_res.status_code == 201
    old_refresh_cookie = reg_res.cookies["study_ai_refresh_token"]

    # First refresh: succeeds and rotates token
    unauthenticated_client.cookies.set("study_ai_refresh_token", old_refresh_cookie)
    ref_res1 = unauthenticated_client.post("/api/v1/auth/refresh")
    assert ref_res1.status_code == 200
    data1 = ref_res1.json()
    assert "accessToken" in data1
    new_refresh_cookie = ref_res1.cookies["study_ai_refresh_token"]
    assert new_refresh_cookie != old_refresh_cookie

    # Attempt to REUSE old refresh token: must fail with 401!
    unauthenticated_client.cookies.set("study_ai_refresh_token", old_refresh_cookie)
    reuse_res = unauthenticated_client.post("/api/v1/auth/refresh")
    assert reuse_res.status_code == 401

    # Refresh with new token succeeds
    unauthenticated_client.cookies.set("study_ai_refresh_token", new_refresh_cookie)
    ref_res2 = unauthenticated_client.post("/api/v1/auth/refresh")
    assert ref_res2.status_code == 200


def test_logout_revokes_session_and_clears_cookie(unauthenticated_client):
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout_test@example.com",
            "password": "PasswordLogout123",
            "displayName": "Logout Tester",
        },
    )
    refresh_cookie = reg_res.cookies["study_ai_refresh_token"]

    unauthenticated_client.cookies.set("study_ai_refresh_token", refresh_cookie)
    logout_res = unauthenticated_client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Cookie cleared in response
    # Now attempt to refresh with logged-out session -> 401
    unauthenticated_client.cookies.set("study_ai_refresh_token", refresh_cookie)
    ref_res = unauthenticated_client.post("/api/v1/auth/refresh")
    assert ref_res.status_code == 401
