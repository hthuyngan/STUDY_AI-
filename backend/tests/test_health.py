from unittest.mock import MagicMock
from app.database import get_db
from app.main import app


def test_health_check_liveness(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "STUDY_AI"


def test_health_check_api_v1(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_database_health_check_success(client):
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_database_health_check_failure_returns_503(client):
    def mock_get_db_failure():
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("Simulated connection timeout")
        try:
            yield mock_db
        finally:
            pass

    app.dependency_overrides[get_db] = mock_get_db_failure
    try:
        response = client.get("/health/db")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
    finally:
        app.dependency_overrides.pop(get_db, None)

