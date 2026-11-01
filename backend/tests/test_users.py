from fastapi.testclient import TestClient

from app.models.user import User


def test_get_me_unauthenticated_returns_401(client: TestClient) -> None:
    """Test accessing /api/users/me without Bearer token returns 401."""
    response = client.get("/api/users/me")
    assert response.status_code == 401


def test_get_me_authenticated_returns_200(
    client: TestClient, normal_user: User, normal_auth_headers: dict[str, str]
) -> None:
    """Test accessing /api/users/me with valid Bearer token returns profile."""
    response = client.get("/api/users/me", headers=normal_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(normal_user.id)
    assert data["email"] == normal_user.email
    assert data["full_name"] == normal_user.full_name
    assert "password" not in data
    assert "password_hash" not in data


def test_update_user_full_name(
    client: TestClient, normal_user: User, normal_auth_headers: dict[str, str]
) -> None:
    """Test PATCH /api/users/me updates full_name."""
    new_name = "Jane Doe Updated"
    response = client.patch(
        "/api/users/me",
        headers=normal_auth_headers,
        json={"full_name": f"  {new_name}  "},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == new_name


def test_change_password_flow_and_new_login(
    client: TestClient, normal_user: User, normal_auth_headers: dict[str, str]
) -> None:
    """Test password change success, wrong current password failure, and login with new password."""
    # 1. Failure: Wrong current password
    fail_resp = client.post(
        "/api/users/me/change-password",
        headers=normal_auth_headers,
        json={
            "current_password": "WrongCurrentPassword123",
            "new_password": "BrandNewPassword456",
        },
    )
    assert fail_resp.status_code == 400
    assert "incorrect current password" in fail_resp.json()["detail"].lower()

    # 2. Success: Correct current password
    success_resp = client.post(
        "/api/users/me/change-password",
        headers=normal_auth_headers,
        json={
            "current_password": "ValidPassword123",
            "new_password": "BrandNewPassword456",
        },
    )
    assert success_resp.status_code == 204

    # 3. Old password should now fail login
    old_login = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": "ValidPassword123"},
    )
    assert old_login.status_code == 401

    # 4. New password succeeds
    new_login = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": "BrandNewPassword456"},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()
