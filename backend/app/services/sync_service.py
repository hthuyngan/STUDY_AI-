from sqlalchemy.orm import Session
from app.schemas.sync import BootstrapSyncRequest, BootstrapSyncResponse
from app.services.assessment_service import upsert_attempt
from app.services.learning_event_service import batch_insert_events
from app.services.learning_progress_service import upsert_lesson_progress


def bootstrap_sync(
    db: Session, user_id: str, data: BootstrapSyncRequest
) -> BootstrapSyncResponse:
    progress_count = 0
    attempts_count = 0

    # 1. Sync lesson progress records
    for lesson_id, prog_data in data.lesson_progress.items():
        upsert_lesson_progress(db, user_id, lesson_id, prog_data)
        progress_count += 1

    # 2. Sync assessment attempts
    for attempt_data in data.assessment_attempts:
        upsert_attempt(db, user_id, attempt_data)
        attempts_count += 1

    # 3. Batch insert learning events
    event_result = batch_insert_events(db, user_id, data.learning_events)

    return BootstrapSyncResponse(
        status="ok",
        progress_synced=progress_count,
        attempts_synced=attempts_count,
        events_synced=event_result.inserted,
    )
