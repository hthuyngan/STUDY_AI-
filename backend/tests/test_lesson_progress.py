from datetime import datetime, timedelta, timezone


def test_create_and_get_lesson_progress(client):
    user_id = "stu-001"
    lesson_id = "lesson-math-08"
    now_iso = datetime.now(timezone.utc).isoformat()

    payload = {
        "lessonId": lesson_id,
        "subjectId": "math",
        "contentProgress": 60,
        "overallProgress": 60,
        "assessmentStatus": "not-attempted",
        "completedSectionIds": ["sec-1", "sec-2"],
        "updatedAt": now_iso,
    }

    # PUT upsert
    put_res = client.put(
        f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}", json=payload
    )
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["lessonId"] == lesson_id
    assert data["contentProgress"] == 60
    assert data["overallProgress"] == 60
    assert data["completedSectionIds"] == ["sec-1", "sec-2"]

    # GET single
    get_res = client.get(f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}")
    assert get_res.status_code == 200
    assert get_res.json()["overallProgress"] == 60

    # GET list
    list_res = client.get(f"/api/v1/users/{user_id}/lesson-progress")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["lessonId"] == lesson_id


def test_validation_error_on_out_of_range_progress(client):
    user_id = "stu-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    # contentProgress > 80
    bad_payload = {
        "lessonId": "lesson-math-01",
        "subjectId": "math",
        "contentProgress": 95,
        "overallProgress": 50,
        "updatedAt": now_iso,
    }
    res = client.put(
        f"/api/v1/users/{user_id}/lesson-progress/lesson-math-01", json=bad_payload
    )
    assert res.status_code == 422


def test_newer_updated_at_wins_conflict_resolution(client):
    user_id = "stu-001"
    lesson_id = "lesson-math-01"
    base_time = datetime.now(timezone.utc)
    t1 = base_time.isoformat()
    t2 = (base_time + timedelta(minutes=5)).isoformat()

    # First write at t2 (newer)
    client.put(
        f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}",
        json={
            "lessonId": lesson_id,
            "subjectId": "math",
            "contentProgress": 80,
            "overallProgress": 80,
            "updatedAt": t2,
        },
    )

    # Stale write at t1 (older) with 40% should NOT overwrite 80%
    client.put(
        f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}",
        json={
            "lessonId": lesson_id,
            "subjectId": "math",
            "contentProgress": 40,
            "overallProgress": 40,
            "updatedAt": t1,
        },
    )

    get_res = client.get(f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}")
    assert get_res.json()["overallProgress"] == 80


def test_completed_100_percent_cannot_be_downgraded(client):
    user_id = "stu-001"
    lesson_id = "lesson-math-01"
    now = datetime.now(timezone.utc)

    # Completed 100%
    client.put(
        f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}",
        json={
            "lessonId": lesson_id,
            "subjectId": "math",
            "contentProgress": 80,
            "overallProgress": 100,
            "assessmentStatus": "completed",
            "updatedAt": now.isoformat(),
        },
    )

    # Incoming request even with slightly newer timestamp but 60% overall
    future_time = (now + timedelta(seconds=10)).isoformat()
    client.put(
        f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}",
        json={
            "lessonId": lesson_id,
            "subjectId": "math",
            "contentProgress": 60,
            "overallProgress": 60,
            "assessmentStatus": "incomplete",
            "updatedAt": future_time,
        },
    )

    get_res = client.get(f"/api/v1/users/{user_id}/lesson-progress/{lesson_id}")
    # Still 100% and completed
    assert get_res.json()["overallProgress"] == 100
    assert get_res.json()["assessmentStatus"] == "completed"
