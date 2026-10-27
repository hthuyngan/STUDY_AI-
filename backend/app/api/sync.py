from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.sync import BootstrapSyncRequest, BootstrapSyncResponse
from app.services.sync_service import bootstrap_sync

router = APIRouter(prefix="/users/{user_id}/sync", tags=["Sync"])


def _verify_user_access(user_id: str, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot perform sync on another learner's account.",
        )


@router.post(
    "/bootstrap",
    response_model=BootstrapSyncResponse,
    status_code=status.HTTP_200_OK,
)
def post_bootstrap_sync(
    user_id: str,
    data: BootstrapSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_user_access(user_id, current_user)
    return bootstrap_sync(db, user_id, data)
