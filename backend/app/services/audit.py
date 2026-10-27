import json
import uuid
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.staff_audit_log import StaffAuditLog


def log_staff_action(
    db: Session,
    actor_user_id: str,
    action: str,
    target_type: str,
    target_id: str,
    payload: Optional[dict[str, Any]] = None,
) -> StaffAuditLog:
    log_entry = StaffAuditLog(
        id=f"audit-{uuid.uuid4().hex[:16]}",
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=json.dumps(payload, ensure_ascii=False) if payload else None,
    )
    db.add(log_entry)
    db.flush()
    return log_entry
