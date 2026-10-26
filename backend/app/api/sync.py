from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.sync import BootstrapSyncRequest, BootstrapSyncResponse
from app.services.sync_service import bootstrap_sync

router = APIRouter(prefix="/users/{user_id}/sync", tags=["Sync"])


@router.post(
    "/bootstrap",
    response_model=BootstrapSyncResponse,
    status_code=status.HTTP_200_OK,
)
def post_bootstrap_sync(
    user_id: str, data: BootstrapSyncRequest, db: Session = Depends(get_db)
):
    return bootstrap_sync(db, user_id, data)
