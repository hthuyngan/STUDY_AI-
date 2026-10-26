from datetime import datetime, timezone


def test_batch_events_insert_and_deduplication(client):
    user_id = "stu-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    events_payload = {
        "events": [
            {
                "id": "evt-001",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "timestamp": now_iso,
                "type": "lesson_opened",
                "schemaVersion": 1,
            },
            {
                "id": "evt-002",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "timestamp": now_iso,
                "type": "lesson_section_completed",
                "payload": {"sectionId": "sec-1"},
                "schemaVersion": 1,
            },
        ]
    }

    # 1. First batch insert
    res1 = client.post(
        f"/api/v1/users/{user_id}/learning-events/batch", json=events_payload
    )
    assert res1.status_code == 201
    assert res1.json()["inserted"] == 2
    assert res1.json()["duplicates"] == 0

    # 2. Second batch insert with overlapping event ID (evt-002) + new event (evt-003)
    events_payload_2 = {
        "events": [
            {
                "id": "evt-002",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "timestamp": now_iso,
                "type": "lesson_section_completed",
                "schemaVersion": 1,
            },
            {
                "id": "evt-003",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "timestamp": now_iso,
                "type": "assessment_completed",
                "schemaVersion": 1,
            },
        ]
    }

    res2 = client.post(
        f"/api/v1/users/{user_id}/learning-events/batch", json=events_payload_2
    )
    assert res2.status_code == 201
    assert res2.json()["inserted"] == 1
    assert res2.json()["duplicates"] == 1

    # 3. Query events
    get_res = client.get(
        f"/api/v1/users/{user_id}/learning-events?lessonId=lesson-math-08"
    )
    assert get_res.status_code == 200
    events = get_res.json()
    assert len(events) == 3
    event_ids = [e["id"] for e in events]
    assert set(event_ids) == {"evt-001", "evt-002", "evt-003"}
