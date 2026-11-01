from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app

client = TestClient(app)


def test_health_endpoint_success() -> None:
    """Test that /api/health returns 200 and connected status when database is reachable."""
    mock_db = MagicMock()
    mock_db.execute.return_value = None

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "database": "connected",
        }
        mock_db.execute.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_health_endpoint_db_failure() -> None:
    """Test that /api/health returns 503 when the database throws an exception."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("Connection refused")

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/api/health")
        assert response.status_code == 503
        assert "Database unreachable" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
