from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User

# HTTPBearer extracts Bearer token and integrates cleanly with Swagger UI
security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or not credentials.credentials:
        raise credentials_exception

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if user.status in ("suspended", "disabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa hoặc vô hiệu hóa.",
        )

    return user


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "learner": set(),
    "teacher": {
        "view_classes",
        "manage_assignments",
        "view_student_progress",
    },
    "content": {
        "manage_content",
        "review_content",
        "publish_content",
    },
    "support": {
        "manage_support_tickets",
        "view_user_support_profile",
    },
    "admin": {
        "manage_users",
        "manage_roles",
        "view_system_metrics",
        "view_classes",
        "manage_assignments",
        "view_student_progress",
        "manage_content",
        "review_content",
        "publish_content",
        "manage_support_tickets",
        "view_user_support_profile",
    },
}


def require_role(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền truy cập.",
            )
        return current_user

    return role_checker


def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền truy cập.",
            )
        return current_user

    return permission_checker
