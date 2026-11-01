from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import create_access_token
from app.models.user import User


def test_signup_success(client: TestClient) -> None:
    """Test successful user registration returns 201 and UserOut schema."""
    payload = {
        "email": "newuser@example.com",
        "password": "ValidPassword123",
        "full_name": "New User",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "user"
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_signup_duplicate_email_conflict(client: TestClient, normal_user: User) -> None:
    """Test signup with an existing email returns 409 Conflict."""
    payload = {
        "email": normal_user.email,
        "password": "DifferentPassword123",
        "full_name": "Another User",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


def test_signup_weak_password_validation(client: TestClient) -> None:
    """Test signup password rules: min 8 chars, digits, letters, max 72 bytes."""
    # Too short (< 8 chars)
    resp1 = client.post(
        "/api/auth/signup",
        json={"email": "u1@example.com", "password": "Pass1", "full_name": "User One"},
    )
    assert resp1.status_code == 422

    # No digits
    resp2 = client.post(
        "/api/auth/signup",
        json={"email": "u2@example.com", "password": "PasswordOnly", "full_name": "User Two"},
    )
    assert resp2.status_code == 422

    # No letters
    resp3 = client.post(
        "/api/auth/signup",
        json={"email": "u3@example.com", "password": "1234567890", "full_name": "User Three"},
    )
    assert resp3.status_code == 422

    # Exceeds 72 bytes
    long_pass = "A" * 70 + "1" + "B" * 10
    resp4 = client.post(
        "/api/auth/signup",
        json={"email": "u4@example.com", "password": long_pass, "full_name": "User Four"},
    )
    assert resp4.status_code == 422


def test_signup_invalid_email_validation(client: TestClient) -> None:
    """Test invalid email format returns 422 Unprocessable Entity."""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "not-an-email",
            "password": "ValidPassword123",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 422


def test_signup_role_cannot_be_escalated(client: TestClient) -> None:
    """Test that client-supplied role is ignored and always defaults to 'user'."""
    payload = {
        "email": "hacker@example.com",
        "password": "SecurePassword123",
        "full_name": "Hacker Attempt",
        "role": "admin",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "user"


def test_login_success(client: TestClient, normal_user: User) -> None:
    """Test login with valid credentials returns access and refresh tokens."""
    form_data = {
        "username": normal_user.email,
        "password": "ValidPassword123",
    }
    response = client.post("/api/auth/login", data=form_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_and_unknown_email(client: TestClient, normal_user: User) -> None:
    """Test wrong password and unknown email return the same generic 401 error."""
    # Wrong password
    resp1 = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": "WrongPassword999"},
    )
    assert resp1.status_code == 401
    assert resp1.json()["detail"] == "Incorrect email or password"

    # Unknown email
    resp2 = client.post(
        "/api/auth/login",
        data={"username": "nonexistent@example.com", "password": "SomePassword123"},
    )
    assert resp2.status_code == 401
    assert resp2.json()["detail"] == "Incorrect email or password"


def test_login_inactive_user_returns_403(
    client: TestClient, normal_user: User, db_session: Session
) -> None:
    """Test deactivated user cannot log in and receives 403 Forbidden."""
    normal_user.is_active = False
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": "ValidPassword123"},
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


def test_refresh_token_success(client: TestClient, normal_user: User) -> None:
    """Test exchanging a valid refresh token for a new token pair."""
    login_resp = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": "ValidPassword123"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_token_rejects_access_token(client: TestClient, normal_user: User) -> None:
    """Test that access tokens cannot be used at the refresh endpoint."""
    access_token = create_access_token(subject=str(normal_user.id), role="user")

    response = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_refresh_token_rejects_garbage_token(client: TestClient) -> None:
    """Test invalid or corrupted refresh tokens return 401."""
    response = client.post("/api/auth/refresh", json={"refresh_token": "garbage.token.data"})
    assert response.status_code == 401


def test_login_rate_limiting_exceeded(client: TestClient, normal_user: User) -> None:
    """Test that the 6th rapid login attempt within 1 minute returns 429 Too Many Requests."""
    limiter.enabled = True
    limiter.reset()

    try:
        form_data = {
            "username": normal_user.email,
            "password": "ValidPassword123",
        }
        # First 5 calls should succeed
        for _ in range(5):
            res = client.post("/api/auth/login", data=form_data)
            assert res.status_code == 200

        # 6th rapid call exceeds the 5/minute limit
        res_6 = client.post("/api/auth/login", data=form_data)
        assert res_6.status_code == 429
        assert "rate limit exceeded" in res_6.json()["detail"].lower()
    finally:
        limiter.enabled = False
