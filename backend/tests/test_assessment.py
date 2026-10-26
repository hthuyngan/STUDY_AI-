from datetime import datetime, timedelta, timezone


def test_create_and_update_attempt_with_responses(client):
    user_id = "stu-001"
    attempt_id = "atm_test_001"
    now = datetime.now(timezone.utc)

    payload = {
        "id": attempt_id,
        "assessmentId": "asm-math-08",
        "lessonId": "lesson-math-08",
        "subjectId": "math",
        "attemptNumber": 1,
        "startedAt": now.isoformat(),
        "lastActivityAt": now.isoformat(),
        "completionStatus": "incomplete",
        "successStatus": "unknown",
        "progressMeasure": 0.33,
        "sessionTimeMs": 35000,
        "currentQuestionId": "q-1",
        "schemaVersion": 1,
        "responses": {
            "q-1": {
                "questionId": "q-1",
                "selectedOptionIds": ["opt-b"],
                "changeCount": 1,
                "timeSpentMs": 15000,
                "isCorrect": True,
            }
        },
    }

    # 1. POST create
    res = client.post(f"/api/v1/users/{user_id}/assessment-attempts", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == attempt_id
    assert data["completionStatus"] == "incomplete"
    assert "q-1" in data["responses"]
    assert data["responses"]["q-1"]["selectedOptionIds"] == ["opt-b"]

    # 2. PUT update to complete
    t2 = (now + timedelta(seconds=60)).isoformat()
    update_payload = {
        "lastActivityAt": t2,
        "completedAt": t2,
        "completionStatus": "completed",
        "successStatus": "passed",
        "progressMeasure": 1.0,
        "scoreRaw": 3.0,
        "scoreScaled": 1.0,
        "sessionTimeMs": 75000,
        "responses": {
            "q-1": {
                "questionId": "q-1",
                "selectedOptionIds": ["opt-b"],
                "changeCount": 1,
                "timeSpentMs": 15000,
                "isCorrect": True,
            },
            "q-2": {
                "questionId": "q-2",
                "selectedOptionIds": ["opt-a"],
                "changeCount": 1,
                "timeSpentMs": 25000,
                "isCorrect": True,
            },
        },
    }

    put_res = client.put(
        f"/api/v1/users/{user_id}/assessment-attempts/{attempt_id}", json=update_payload
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["completionStatus"] == "completed"
    assert updated_data["successStatus"] == "passed"
    assert len(updated_data["responses"]) == 2


def test_completed_attempt_cannot_be_downgraded_to_incomplete(client):
    user_id = "stu-001"
    attempt_id = "atm_test_002"
    now = datetime.now(timezone.utc)

    # 1. Create completed attempt
    client.post(
        f"/api/v1/users/{user_id}/assessment-attempts",
        json={
            "id": attempt_id,
            "assessmentId": "asm-math-08",
            "lessonId": "lesson-math-08",
            "subjectId": "math",
            "attemptNumber": 1,
            "startedAt": now.isoformat(),
            "lastActivityAt": now.isoformat(),
            "completedAt": now.isoformat(),
            "completionStatus": "completed",
            "successStatus": "passed",
            "progressMeasure": 1.0,
            "scoreRaw": 3.0,
            "scoreScaled": 1.0,
            "schemaVersion": 1,
        },
    )

    # 2. Try to downgrade
    t2 = (now + timedelta(seconds=10)).isoformat()
    client.put(
        f"/api/v1/users/{user_id}/assessment-attempts/{attempt_id}",
        json={
            "lastActivityAt": t2,
            "completionStatus": "incomplete",
            "progressMeasure": 0.5,
        },
    )

    get_res = client.get(f"/api/v1/users/{user_id}/assessment-attempts/{attempt_id}")
    assert get_res.json()["completionStatus"] == "completed"


def test_multiple_attempts_are_preserved_independently(client):
    user_id = "stu-001"
    now = datetime.now(timezone.utc)

    for i in [1, 2]:
        client.post(
            f"/api/v1/users/{user_id}/assessment-attempts",
            json={
                "id": f"atm_multi_{i}",
                "assessmentId": "asm-math-08",
                "lessonId": "lesson-math-08",
                "subjectId": "math",
                "attemptNumber": i,
                "startedAt": (now + timedelta(minutes=i * 5)).isoformat(),
                "lastActivityAt": (now + timedelta(minutes=i * 5)).isoformat(),
                "completionStatus": "completed",
                "successStatus": "passed",
                "progressMeasure": 1.0,
                "scoreRaw": float(i),
                "scoreScaled": float(i) / 3.0,
                "schemaVersion": 1,
            },
        )

    list_res = client.get(
        f"/api/v1/users/{user_id}/assessment-attempts?lessonId=lesson-math-08"
    )
    attempts = list_res.json()
    assert len(attempts) == 2
    assert {a["id"] for a in attempts} == {"atm_multi_1", "atm_multi_2"}
