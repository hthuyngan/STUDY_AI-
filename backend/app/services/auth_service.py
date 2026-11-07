from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.core.rate_limiter import auth_rate_limiter
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_session import RefreshSession
from app.models.user import User
from app.schemas.auth import UserLoginRequest, UserRegisterRequest


def register_user(
    db: Session, data: UserRegisterRequest, user_agent: Optional[str] = None
) -> Tuple[User, str, str, int]:
    email_clean = data.email.strip().lower()
    existing = (
        db.query(User).filter(User.email_normalized == email_clean).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    user = User(
        id=user_id,
        email=email_clean,
        email_normalized=email_clean,
        password_hash=hash_password(data.password),
        display_name=data.displayName.strip(),
        grade=data.grade.strip() if data.grade else None,
        role="learner",
        status="active",
        last_login_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(user)

    # Create initial refresh session
    raw_refresh = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh)
    session = RefreshSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
    )
    db.add(session)
    db.commit()
    db.refresh(user)

    access_token, expires_in = create_access_token(user_id)
    return user, access_token, raw_refresh, expires_in


def login_user(
    db: Session,
    data: UserLoginRequest,
    user_agent: Optional[str] = None,
    client_ip: str = "127.0.0.1",
) -> Tuple[User, str, str, int]:
    email_clean = data.email.strip().lower()

    # 1. Enforce rate limiting against brute-force password guessing
    auth_rate_limiter.check_rate_limit(client_ip, email_clean)

    user = (
        db.query(User).filter(User.email_normalized == email_clean).first()
    )

    # 2. Timing attack mitigation: verify dummy hash if user does not exist
    if not user or not user.password_hash:
        verify_password(data.password, DUMMY_PASSWORD_HASH)
        auth_rate_limiter.record_failure(client_ip, email_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    if not verify_password(data.password, user.password_hash):
        auth_rate_limiter.record_failure(client_ip, email_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    # 3. Check account status (suspended / disabled)
    if user.status in ("suspended", "disabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa hoặc vô hiệu hóa.",
        )

    # Authentication succeeded: reset failure counter
    auth_rate_limiter.record_success(client_ip, email_clean)

    now = datetime.now(timezone.utc)
    user.last_login_at = now

    raw_refresh = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh)
    session = RefreshSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
    )
    db.add(session)
    db.commit()
    db.refresh(user)

    access_token, expires_in = create_access_token(user.id)
    return user, access_token, raw_refresh, expires_in


def refresh_token_session(
    db: Session, raw_refresh_token: Optional[str], user_agent: Optional[str] = None
) -> Tuple[User, str, str, int]:
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu refresh token.",
        )

    token_hash = hash_refresh_token(raw_refresh_token)
    session = (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .first()
    )

    now = datetime.now(timezone.utc)

    # Invariant: Refresh Token Reuse Detection (RFC 6819 Section 5.2.2.3)
    # If session exists but was already revoked, a replay / token theft has occurred!
    if session and session.revoked_at is not None:
        # Revoke ALL active sessions for this user immediately as security measure
        db.query(RefreshSession).filter(
            RefreshSession.user_id == session.user_id,
            RefreshSession.revoked_at.is_(None),
        ).update({"revoked_at": now})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phát hiện tái sử dụng phiên đăng nhập đã xoay vòng. Tất cả các phiên đã bị thu hồi.",
        )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi.",
        )

    # Check expiration (safely handle SQLite offset-naive datetimes)
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        session.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn.",
        )

    # Check account status
    user = session.user
    if not user or user.status in ("suspended", "disabled"):
        session.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa hoặc vô hiệu hóa.",
        )

    # 1. Revoke the used refresh session immediately (Token Rotation)
    session.revoked_at = now
    session.last_used_at = now

    # 2. Issue rotated refresh session
    new_raw_refresh = generate_refresh_token()
    new_token_hash = hash_refresh_token(new_raw_refresh)
    new_session = RefreshSession(
        id=str(uuid.uuid4()),
        user_id=session.user_id,
        token_hash=new_token_hash,
        created_at=now,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
    )
    db.add(new_session)

    # 3. Generate new short-lived access token
    access_token, expires_in = create_access_token(session.user_id)

    db.commit()
    db.refresh(user)

    return user, access_token, new_raw_refresh, expires_in


def logout_session(db: Session, raw_refresh_token: Optional[str]) -> None:
    if not raw_refresh_token:
        return

    token_hash = hash_refresh_token(raw_refresh_token)
    session = (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .first()
    )
    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()

