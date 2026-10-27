from datetime import datetime, timezone
import time
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session
from app.api.deps import require_permission, require_role
from app.config import settings
from app.database import get_db
from app.models.refresh_session import RefreshSession
from app.models.staff_audit_log import StaffAuditLog
from app.models.user import User
from app.services.audit import log_staff_action

router = APIRouter(prefix="/admin", tags=["admin"])


class UpdateRoleRequest(BaseModel):
    role: str


class UpdateStatusRequest(BaseModel):
    status: str


def _format_user(u: User) -> dict[str, Any]:
    return {
        "id": u.id,
        "email": u.email or "",
        "displayName": u.display_name or "",
        "grade": u.grade or "",
        "role": u.role,
        "status": getattr(u, "status", "active"),
        "createdAt": u.created_at.isoformat() if u.created_at else "",
        "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
    }


@router.get("/dashboard")
def get_admin_dashboard(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.status == "active").scalar() or 0
    learners_count = db.query(func.count(User.id)).filter(User.role == "learner").scalar() or 0
    staff_count = db.query(func.count(User.id)).filter(User.role != "learner").scalar() or 0

    recent_logs = (
        db.query(StaffAuditLog)
        .order_by(desc(StaffAuditLog.created_at))
        .limit(10)
        .all()
    )

    activities = []
    for log in recent_logs:
        actor = db.query(User).filter(User.id == log.actor_user_id).first()
        activities.append({
            "id": log.id,
            "action": log.action,
            "actor": actor.display_name if actor else log.actor_user_id,
            "targetType": log.target_type,
            "targetId": log.target_id,
            "timestamp": log.created_at.isoformat(),
        })

    return {
        "metrics": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "learnersCount": learners_count,
            "staffCount": staff_count,
            "systemStatus": "healthy",
        },
        "recentActivities": activities,
    }


@router.get("/users")
def list_admin_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (func.lower(User.display_name).like(s))
            | (func.lower(User.email).like(s))
            | (func.lower(User.id).like(s))
        )

    if role and role != "all":
        query = query.filter(User.role == role)

    if status and status != "all":
        query = query.filter(User.status == status)

    total = query.count()
    users = (
        query.order_by(desc(User.created_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return {
        "items": [_format_user(u) for u in users],
        "page": page,
        "pageSize": pageSize,
        "total": total,
    }


@router.get("/users/{user_id}")
def get_admin_user_detail(
    user_id: str,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại.",
        )
    return _format_user(user)


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    req: UpdateRoleRequest,
    current_user: User = Depends(require_permission("manage_roles")),
    db: Session = Depends(get_db),
):
    allowed_roles = {"admin", "teacher", "content", "support", "learner"}
    if req.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò không hợp lệ. Cho phép: {', '.join(allowed_roles)}",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại.",
        )

    old_role = user.role
    if old_role == req.role:
        return _format_user(user)

    # Last active admin protection
    if old_role == "admin" and req.role != "admin":
        active_admins = (
            db.query(func.count(User.id))
            .filter(User.role == "admin", User.status == "active")
            .scalar()
            or 0
        )
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hủy quyền quản trị viên hoạt động duy nhất của hệ thống.",
            )

    user.role = req.role
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="role_changed",
        target_type="user",
        target_id=user.id,
        payload={"old_role": old_role, "new_role": req.role},
    )
    db.commit()
    db.refresh(user)

    return _format_user(user)


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UpdateStatusRequest,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    allowed_statuses = {"active", "suspended", "disabled"}
    if req.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Cho phép: {', '.join(allowed_statuses)}",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại.",
        )

    old_status = getattr(user, "status", "active")
    if old_status == req.status:
        return _format_user(user)

    # Last active admin protection
    if user.role == "admin" and req.status in ("suspended", "disabled"):
        active_admins = (
            db.query(func.count(User.id))
            .filter(User.role == "admin", User.status == "active")
            .scalar()
            or 0
        )
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất của hệ thống.",
            )

    user.status = req.status

    # If suspending or disabling, revoke all active sessions immediately
    if req.status in ("suspended", "disabled"):
        db.query(RefreshSession).filter(RefreshSession.user_id == user.id).delete()

    action_name = "user_suspended" if req.status in ("suspended", "disabled") else "user_activated"
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action=action_name,
        target_type="user",
        target_id=user.id,
        payload={"old_status": old_status, "new_status": req.status},
    )
    db.commit()
    db.refresh(user)

    return _format_user(user)


@router.post("/users/{user_id}/revoke-sessions")
def revoke_user_sessions(
    user_id: str,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại.",
        )

    deleted_count = (
        db.query(RefreshSession).filter(RefreshSession.user_id == user.id).delete()
    )
    log_staff_action(
        db=db,
        actor_user_id=current_user.id,
        action="sessions_revoked",
        target_type="user",
        target_id=user.id,
        payload={"revoked_count": deleted_count},
    )
    db.commit()

    return {
        "success": True,
        "userId": user_id,
        "revokedSessionsCount": deleted_count,
        "message": f"Đã thu hồi {deleted_count} phiên đăng nhập của người dùng.",
    }


@router.get("/system/health")
def get_system_health(
    current_user: User = Depends(require_permission("view_system_metrics")),
    db: Session = Depends(get_db),
):
    # Perform a real database probe
    start_time = time.time()
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
        latency_ms = round((time.time() - start_time) * 1000, 2)
    except Exception:
        latency_ms = -1

    return {
        "apiStatus": "operational",
        "database": {
            "status": "connected" if db_connected else "disconnected",
            "latencyMs": latency_ms,
        },
        "environment": getattr(settings, "APP_ENV", "development"),
        "backendVersion": "0.1.0",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }
