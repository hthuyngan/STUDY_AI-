from datetime import datetime, timezone
import pytest


def test_unauthenticated_me_endpoints_return_401(unauthenticated_client):
    endpoints = [
        ("GET", "/api/v1/me/lesson-progress"),
        ("GET", "/api/v1/me/lesson-progress/lesson-01"),
        ("GET", "/api/v1/me/assessment-attempts"),
        ("GET", "/api/v1/me/learning-events"),
        ("POST", "/api/v1/me/learning-events/batch"),
        ("POST", "/api/v1/me/sync/bootstrap"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = unauthenticated_client.get(path)
        else:
            res = unauthenticated_client.post(path, json={})
        assert (
            res.status_code == 401
        ), f"Expected 401 on unauthenticated {method} {path}, got {res.status_code}"


def test_user_a_and_user_b_strict_isolation(unauthenticated_client):
    # 1. Register User A
    res_a = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "usera@example.com",
            "password": "PasswordA123",
            "displayName": "User A",
        },
    )
    token_a = res_a.json()["accessToken"]
    user_a_id = res_a.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    res_b = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "userb@example.com",
            "password": "PasswordB123",
            "displayName": "User B",
        },
    )
    token_b = res_b.json()["accessToken"]
    user_b_id = res_b.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    now_iso = datetime.now(timezone.utc).isoformat()

    # 3. User A creates lesson progress via /me
    put_res_a = unauthenticated_client.put(
        "/api/v1/me/lesson-progress/lesson-math-01",
        headers=headers_a,
        json={
            "lessonId": "lesson-math-01",
            "subjectId": "math",
            "contentProgress": 80,
            "overallProgress": 100,
            "assessmentStatus": "completed",
            "updatedAt": now_iso,
        },
    )
    assert put_res_a.status_code == 200

    # 4. User A records an assessment attempt via /me
    attempt_res_a = unauthenticated_client.post(
        "/api/v1/me/assessment-attempts",
        headers=headers_a,
        json={
            "id": "attempt-user-a-1",
            "assessmentId": "asm-math-01",
            "lessonId": "lesson-math-01",
            "subjectId": "math",
            "attemptNumber": 1,
            "startedAt": now_iso,
            "lastActivityAt": now_iso,
            "completedAt": now_iso,
            "completionStatus": "completed",
            "successStatus": "passed",
            "progressMeasure": 1.0,
            "scoreRaw": 5.0,
            "scoreScaled": 1.0,
            "schemaVersion": 1,
            "responses": {},
        },
    )
    assert attempt_res_a.status_code == 201

    # 5. User A records learning event via /me
    event_res_a = unauthenticated_client.post(
        "/api/v1/me/learning-events/batch",
        headers=headers_a,
        json={
            "events": [
                {
                    "id": "evt-user-a-1",
                    "lessonId": "lesson-math-01",
                    "subjectId": "math",
                    "timestamp": now_iso,
                    "type": "lesson_completed",
                    "schemaVersion": 1,
                }
            ]
        },
    )
    assert event_res_a.status_code == 201

    # 6. User B reads /me endpoints: must NOT see User A's data!
    b_progress = unauthenticated_client.get(
        "/api/v1/me/lesson-progress", headers=headers_b
    )
    assert b_progress.status_code == 200
    assert len(b_progress.json()) == 0

    b_single_progress = unauthenticated_client.get(
        "/api/v1/me/lesson-progress/lesson-math-01", headers=headers_b
    )
    assert b_single_progress.status_code == 404

    b_attempts = unauthenticated_client.get(
        "/api/v1/me/assessment-attempts", headers=headers_b
    )
    assert b_attempts.status_code == 200
    assert len(b_attempts.json()) == 0

    b_events = unauthenticated_client.get(
        "/api/v1/me/learning-events", headers=headers_b
    )
    assert b_events.status_code == 200
    assert len(b_events.json()) == 0

    # 7. User B tries to directly query User A's path via /users/{user_a_id}/...: must return 403 Forbidden!
    forbidden_get = unauthenticated_client.get(
        f"/api/v1/users/{user_a_id}/lesson-progress", headers=headers_b
    )
    assert forbidden_get.status_code == 403

    forbidden_put = unauthenticated_client.put(
        f"/api/v1/users/{user_a_id}/lesson-progress/lesson-math-01",
        headers=headers_b,
        json={
            "lessonId": "lesson-math-01",
            "subjectId": "math",
            "contentProgress": 20,
            "overallProgress": 20,
            "updatedAt": now_iso,
        },
    )
    assert forbidden_put.status_code == 403


def test_user_bootstrap_sync_isolated(unauthenticated_client):
    # Register User A & B
    res_a = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": "boot_a@example.com", "password": "Password123", "displayName": "Boot A"},
    )
    token_a = res_a.json()["accessToken"]

    res_b = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": "boot_b@example.com", "password": "Password123", "displayName": "Boot B"},
    )
    token_b = res_b.json()["accessToken"]

    now_iso = datetime.now(timezone.utc).isoformat()
    boot_payload = {
        "lessonProgress": {
            "lesson-boot": {
                "lessonId": "lesson-boot",
                "subjectId": "physics",
                "contentProgress": 80,
                "overallProgress": 100,
                "assessmentStatus": "completed",
                "updatedAt": now_iso,
            }
        },
        "assessmentAttempts": [],
        "learningEvents": [],
    }

    # User A syncs bootstrap
    sync_res_a = unauthenticated_client.post(
        "/api/v1/me/sync/bootstrap",
        headers={"Authorization": f"Bearer {token_a}"},
        json=boot_payload,
    )
    assert sync_res_a.status_code == 200
    assert sync_res_a.json()["progressSynced"] == 1


    # User B checks their own progress: must be 0
    b_check = unauthenticated_client.get(
        "/api/v1/me/lesson-progress",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_check.status_code == 200
    assert len(b_check.json()) == 0
