from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, Response, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    TokenRefreshResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import (
    login_user,
    logout_session,
    refresh_token_session,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "study_ai_refresh_token"


def _set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    max_age_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=settings.AUTH_COOKIE_PATH,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


def _format_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        displayName=user.display_name,
        grade=user.grade,
        role=user.role or "learner",
        createdAt=user.created_at,
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_register(
    data: UserRegisterRequest,
    response: Response,
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    db: Session = Depends(get_db),
):
    user, access_token, raw_refresh, expires_in = register_user(
        db, data, user_agent=user_agent
    )
    _set_refresh_cookie(response, raw_refresh)
    return AuthResponse(
        accessToken=access_token,
        tokenType="bearer",
        expiresIn=expires_in,
        user=_format_user_response(user),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
)
def post_login(
    data: UserLoginRequest,
    response: Response,
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    db: Session = Depends(get_db),
):
    user, access_token, raw_refresh, expires_in = login_user(
        db, data, user_agent=user_agent
    )
    _set_refresh_cookie(response, raw_refresh)
    return AuthResponse(
        accessToken=access_token,
        tokenType="bearer",
        expiresIn=expires_in,
        user=_format_user_response(user),
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    status_code=status.HTTP_200_OK,
)
def post_refresh(
    response: Response,
    study_ai_refresh_token: Optional[str] = Cookie(None),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    db: Session = Depends(get_db),
):
    user, access_token, new_raw_refresh, expires_in = refresh_token_session(
        db, study_ai_refresh_token, user_agent=user_agent
    )
    _set_refresh_cookie(response, new_raw_refresh)
    return TokenRefreshResponse(
        accessToken=access_token,
        tokenType="bearer",
        expiresIn=expires_in,
        user=_format_user_response(user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
def post_logout(
    response: Response,
    study_ai_refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    logout_session(db, study_ai_refresh_token)
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def get_me(current_user: User = Depends(get_current_user)):
    return _format_user_response(current_user)
