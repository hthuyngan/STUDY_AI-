from datetime import datetime, timezone
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from app.api.deps import require_role
from app.database import get_db
from app.models.lesson_progress import LessonProgress
from app.models.support import SupportTicket, SupportTicketMessage
from app.models.user import User
from app.services.audit import log_staff_action

router = APIRouter(prefix="/support", tags=["support"])


class CreateMessageRequest(BaseModel):
    message: str
    isInternal: bool = False


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None  # open, in_progress, resolved, closed
    priority: Optional[str] = None  # low, normal, high, urgent
    assignedTo: Optional[str] = None


@router.get("/tickets")
def list_support_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("support", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(SupportTicket)

    if status_filter and status_filter != "all":
        query = query.filter(SupportTicket.status == status_filter)

    if priority_filter and priority_filter != "all":
        query = query.filter(SupportTicket.priority == priority_filter)

    total = query.count()
    tickets = (
        query.order_by(desc(SupportTicket.updated_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    result = []
    for t in tickets:
        user = db.query(User).filter(User.id == t.user_id).first()
        assignee = db.query(User).filter(User.id == t.assigned_to).first() if t.assigned_to else None
        result.append({
            "id": t.id,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "userId": t.user_id,
            "userName": user.display_name if user else "Người dùng",
            "userEmail": user.email if user else "",
            "assignedTo": t.assigned_to,
            "assigneeName": assignee.display_name if assignee else None,
            "messageCount": len(t.messages),
            "createdAt": t.created_at.isoformat(),
            "updatedAt": t.updated_at.isoformat(),
        })

    return {
        "items": result,
        "page": page,
        "pageSize": pageSize,
        "total": total,
    }


@router.get("/tickets/{ticket_id}")
def get_support_ticket_detail(
    ticket_id: str,
    current_user: User = Depends(require_role("support", "admin")),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yêu cầu hỗ trợ không tồn tại.",
        )

    user = db.query(User).filter(User.id == t.user_id).first()
    assignee = db.query(User).filter(User.id == t.assigned_to).first() if t.assigned_to else None

    messages = []
    for msg in t.messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        messages.append({
            "id": msg.id,
            "senderId": msg.sender_id,
            "senderName": sender.display_name if sender else "Người gửi",
            "senderRole": sender.role if sender else "learner",
            "message": msg.message,
            "isInternal": msg.is_internal,
            "createdAt": msg.created_at.isoformat(),
        })

    return {
        "id": t.id,
        "subject": t.subject,
        "status": t.status,
        "priority": t.priority,
        "category": t.category,
        "userId": t.user_id,
        "userName": user.display_name if user else "Người dùng",
        "userEmail": user.email if user else "",
        "assignedTo": t.assigned_to,
        "assigneeName": assignee.display_name if assignee else None,
        "messages": messages,
        "createdAt": t.created_at.isoformat(),
        "updatedAt": t.updated_at.isoformat(),
    }


@router.post("/tickets/{ticket_id}/messages")
def add_ticket_message(
    ticket_id: str,
    req: CreateMessageRequest,
    current_user: User = Depends(require_role("support", "admin")),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yêu cầu hỗ trợ không tồn tại.",
        )

    msg_id = f"msg-{uuid.uuid4().hex[:12]}"
    new_message = SupportTicketMessage(
        id=msg_id,
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message=req.message,
        is_internal=req.isInternal,
    )
    db.add(new_message)

    # Touch ticket updated_at and move to in_progress if still open
    if t.status == "open":
        t.status = "in_progress"
    t.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(new_message)

    return {
        "id": new_message.id,
        "ticketId": ticket_id,
        "senderId": current_user.id,
        "senderName": current_user.display_name,
        "senderRole": current_user.role,
        "message": new_message.message,
        "isInternal": new_message.is_internal,
        "createdAt": new_message.created_at.isoformat(),
    }


@router.patch("/tickets/{ticket_id}")
def update_support_ticket(
    ticket_id: str,
    req: UpdateTicketRequest,
    current_user: User = Depends(require_role("support", "admin")),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yêu cầu hỗ trợ không tồn tại.",
        )

    if req.status is not None:
        allowed = {"open", "in_progress", "resolved", "closed"}
        if req.status in allowed:
            old_status = t.status
            t.status = req.status
            log_staff_action(
                db=db,
                actor_user_id=current_user.id,
                action="ticket_status_changed",
                target_type="support_ticket",
                target_id=t.id,
                payload={"old_status": old_status, "new_status": req.status},
            )

    if req.priority is not None:
        allowed_prio = {"low", "normal", "high", "urgent"}
        if req.priority in allowed_prio:
            t.priority = req.priority

    if req.assignedTo is not None:
        t.assigned_to = req.assignedTo
        log_staff_action(
            db=db,
            actor_user_id=current_user.id,
            action="ticket_assigned",
            target_type="support_ticket",
            target_id=t.id,
            payload={"assigned_to": req.assignedTo},
        )

    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(t)

    return {
        "id": t.id,
        "status": t.status,
        "priority": t.priority,
        "assignedTo": t.assigned_to,
        "updatedAt": t.updated_at.isoformat(),
    }


@router.get("/users")
def list_support_users(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("support", "admin")),
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

    total = query.count()
    users = (
        query.order_by(desc(User.created_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    # Strictly protect internal security fields (NO password_hash, tokens, answers)
    result = []
    for u in users:
        ticket_count = (
            db.query(func.count(SupportTicket.id))
            .filter(SupportTicket.user_id == u.id)
            .scalar()
            or 0
        )
        result.append({
            "id": u.id,
            "displayName": u.display_name or "Người dùng",
            "email": u.email or "",
            "grade": u.grade or "",
            "role": u.role,
            "status": getattr(u, "status", "active"),
            "ticketCount": ticket_count,
            "createdAt": u.created_at.isoformat(),
        })

    return {
        "items": result,
        "page": page,
        "pageSize": pageSize,
        "total": total,
    }


@router.get("/users/{user_id}")
def get_support_user_detail(
    user_id: str,
    current_user: User = Depends(require_role("support", "admin")),
    db: Session = Depends(get_db),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại.",
        )

    # Strictly protect internal security credentials
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == u.id)
        .order_by(desc(SupportTicket.created_at))
        .all()
    )

    completed_lessons = (
        db.query(func.count(LessonProgress.id))
        .filter(LessonProgress.user_id == u.id, LessonProgress.overall_progress >= 100)
        .scalar()
        or 0
    )

    return {
        "id": u.id,
        "displayName": u.display_name or "Người dùng",
        "email": u.email or "",
        "grade": u.grade or "",
        "role": u.role,
        "status": getattr(u, "status", "active"),
        "createdAt": u.created_at.isoformat(),
        "stats": {
            "ticketCount": len(tickets),
            "completedLessons": completed_lessons,
        },
        "recentTickets": [
            {
                "id": t.id,
                "subject": t.subject,
                "status": t.status,
                "priority": t.priority,
                "createdAt": t.created_at.isoformat(),
            }
            for t in tickets[:5]
        ],
    }
