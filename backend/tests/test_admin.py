from fastapi.testclient import TestClient

from app.models.user import User


def test_admin_route_requires_admin_privileges(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test that a non-admin user receives 403 Forbidden when calling admin routes."""
    response = client.get("/api/admin/users", headers=normal_auth_headers)
    assert response.status_code == 403
    assert "privileges" in response.json()["detail"].lower()


def test_admin_list_users_with_pagination_and_search(
    client: TestClient,
    admin_auth_headers: dict[str, str],
    normal_user: User,
    admin_user: User,
) -> None:
    """Test admin can list users with pagination and keyword search."""
    # List all
    resp = client.get("/api/admin/users?page=1&page_size=10", headers=admin_auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) >= 2

    # Search by email
    search_resp = client.get(
        f"/api/admin/users?search={normal_user.email}",
        headers=admin_auth_headers,
    )
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["email"] == normal_user.email


def test_admin_cannot_deactivate_or_demote_self(
    client: TestClient, admin_user: User, admin_auth_headers: dict[str, str]
) -> None:
    """Test that an admin cannot deactivate or demote their own account."""
    # Attempt self-deactivation
    resp_deactivate = client.patch(
        f"/api/admin/users/{admin_user.id}",
        headers=admin_auth_headers,
        json={"is_active": False},
    )
    assert resp_deactivate.status_code == 400
    assert "cannot deactivate" in resp_deactivate.json()["detail"].lower()

    # Attempt self-demotion
    resp_demote = client.patch(
        f"/api/admin/users/{admin_user.id}",
        headers=admin_auth_headers,
        json={"role": "user"},
    )
    assert resp_demote.status_code == 400
    assert "cannot demote" in resp_demote.json()["detail"].lower()


def test_deactivated_users_token_stops_working(
    client: TestClient,
    normal_user: User,
    normal_auth_headers: dict[str, str],
    admin_user: User,
    admin_auth_headers: dict[str, str],
) -> None:
    """Test that after an admin deactivates a user, their existing token is rejected."""
    # Token works initially
    initial_check = client.get("/api/users/me", headers=normal_auth_headers)
    assert initial_check.status_code == 200

    # Admin deactivates the user
    deactivate_resp = client.patch(
        f"/api/admin/users/{normal_user.id}",
        headers=admin_auth_headers,
        json={"is_active": False},
    )
    assert deactivate_resp.status_code == 200
    assert deactivate_resp.json()["is_active"] is False

    # Existing token should now immediately be rejected
    rejected_check = client.get("/api/users/me", headers=normal_auth_headers)
    assert rejected_check.status_code == 401
    assert "deactivated" in rejected_check.json()["detail"].lower()


def test_admin_update_nonexistent_user_returns_404(
    client: TestClient, admin_auth_headers: dict[str, str]
) -> None:
    """Test updating a nonexistent user UUID returns 404 Not Found."""
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = client.patch(
        f"/api/admin/users/{fake_uuid}",
        headers=admin_auth_headers,
        json={"role": "admin"},
    )
    assert response.status_code == 404
