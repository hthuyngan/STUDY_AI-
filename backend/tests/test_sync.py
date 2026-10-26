from datetime import datetime, timezone


def test_bootstrap_sync_idempotent(client):
    user_id = "stu-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    bootstrap_payload = {
        "lessonProgress": {
            "lesson-math-08": {
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "contentProgress": 80,
                "overallProgress": 100,
                "assessmentStatus": "completed",
                "completedSectionIds": ["sec-1", "sec-2"],
                "updatedAt": now_iso,
            }
        },
        "assessmentAttempts": [
            {
                "id": "atm-boot-1",
                "assessmentId": "asm-math-08",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "attemptNumber": 1,
                "startedAt": now_iso,
                "lastActivityAt": now_iso,
                "completedAt": now_iso,
                "completionStatus": "completed",
                "successStatus": "passed",
                "progressMeasure": 1.0,
                "scoreRaw": 3.0,
                "scoreScaled": 1.0,
                "schemaVersion": 1,
                "responses": {
                    "q-1": {
                        "questionId": "q-1",
                        "selectedOptionIds": ["opt-a"],
                        "changeCount": 0,
                        "timeSpentMs": 10000,
                        "isCorrect": True,
                    }
                },
            }
        ],
        "learningEvents": [
            {
                "id": "evt-boot-1",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "timestamp": now_iso,
                "type": "assessment_completed",
                "schemaVersion": 1,
            }
        ],
    }

    # 1. First bootstrap run
    res1 = client.post(
        f"/api/v1/users/{user_id}/sync/bootstrap", json=bootstrap_payload
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "ok"
    assert data1["progressSynced"] == 1
    assert data1["attemptsSynced"] == 1
    assert data1["eventsSynced"] == 1

    # 2. Second bootstrap run with identical payload (idempotent)
    res2 = client.post(
        f"/api/v1/users/{user_id}/sync/bootstrap", json=bootstrap_payload
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "ok"
    # Event already exists so eventsSynced should be 0 new inserts
    assert data2["eventsSynced"] == 0

    # 3. Verify state in DB
    prog_res = client.get(
        f"/api/v1/users/{user_id}/lesson-progress/lesson-math-08"
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["overallProgress"] == 100

    attempt_res = client.get(
        f"/api/v1/users/{user_id}/assessment-attempts/atm-boot-1"
    )
    assert attempt_res.status_code == 200
    assert attempt_res.json()["scoreRaw"] == 3.0
    assert "q-1" in attempt_res.json()["responses"]
