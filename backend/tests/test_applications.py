import datetime
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient




def test_create_application_success_and_minimal(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test creating an application with all fields and with minimal body."""
    # 1. Full creation
    full_payload = {
        "company": "  Google  ",
        "role_title": "  Staff Software Engineer  ",
        "job_url": "https://careers.google.com/jobs/123",
        "location": "Mountain View, CA",
        "salary": "180000.50",
        "currency": "usd",
        "status": "interview",
        "notes": "Spoke with recruiter on LinkedIn",
        "job_description": "Build high-throughput distributed systems.",
        "deadline": str(datetime.date.today() + datetime.timedelta(days=14)),
        "applied_at": str(datetime.date.today() - datetime.timedelta(days=2)),
    }
    resp1 = client.post("/api/applications", headers=normal_auth_headers, json=full_payload)
    assert resp1.status_code == 201
    d1 = resp1.json()
    assert d1["company"] == "Google"
    assert d1["role_title"] == "Staff Software Engineer"
    assert d1["currency"] == "USD"
    assert d1["status"] == "interview"
    assert d1["position"] == 0
    assert d1["salary"] == "180000.50"
    assert "id" in d1

    # 2. Minimal creation
    minimal_payload = {
        "company": "Amazon",
        "role_title": "Backend SDE II",
    }
    resp2 = client.post("/api/applications", headers=normal_auth_headers, json=minimal_payload)
    assert resp2.status_code == 201
    d2 = resp2.json()
    assert d2["company"] == "Amazon"
    assert d2["role_title"] == "Backend SDE II"
    assert d2["status"] == "wishlist"
    assert d2["position"] == 0


def test_create_application_validations(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test validation errors on create: invalid URL, negative salary, empty company, future applied_at, missing auth."""
    # Invalid URL
    res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Acme", "role_title": "Dev", "job_url": "ftp://bad-url.com"},
    )
    assert res.status_code == 422

    # Negative salary
    res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Acme", "role_title": "Dev", "salary": -500},
    )
    assert res.status_code == 422

    # Empty company
    res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "   ", "role_title": "Dev"},
    )
    assert res.status_code == 422

    # Future applied_at
    future_date = str(datetime.date.today() + datetime.timedelta(days=5))
    res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Acme", "role_title": "Dev", "applied_at": future_date},
    )
    assert res.status_code == 422
    assert "future" in res.json()["detail"][0]["msg"].lower()

    # Unauthenticated -> 401
    res = client.post("/api/applications", json={"company": "Acme", "role_title": "Dev"})
    assert res.status_code == 401


def test_create_positions_append_to_column(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test new cards in the same column get contiguous positions 0, 1, 2."""
    for i in range(3):
        res = client.post(
            "/api/applications",
            headers=normal_auth_headers,
            json={"company": f"Company {i}", "role_title": "Engineer", "status": "wishlist"},
        )
        assert res.status_code == 201
        assert res.json()["position"] == i


def test_get_application_by_id_and_cross_user_isolation(
    client: TestClient,
    normal_auth_headers: dict[str, str],
    other_auth_headers: dict[str, str],
) -> None:
    """Test getting own application (200), other user's application (404), and random uuid (404)."""
    create_res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Stripe", "role_title": "Infrastructure Engineer"},
    )
    app_id = create_res.json()["id"]

    # Own item -> 200
    own_res = client.get(f"/api/applications/{app_id}", headers=normal_auth_headers)
    assert own_res.status_code == 200
    assert own_res.json()["company"] == "Stripe"

    # Other user -> 404 (never reveals exists)
    other_res = client.get(f"/api/applications/{app_id}", headers=other_auth_headers)
    assert other_res.status_code == 404

    # Nonexistent UUID -> 404
    fake_id = str(uuid.uuid4())
    fake_res = client.get(f"/api/applications/{fake_id}", headers=normal_auth_headers)
    assert fake_res.status_code == 404


def test_list_applications_filtering_and_pagination(
    client: TestClient,
    normal_auth_headers: dict[str, str],
    other_auth_headers: dict[str, str],
) -> None:
    """Test listing with pagination, search escaping, multi-status, deadlines, sorting, and isolation."""
    # Create items for normal_user
    today = datetime.date.today()
    client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={
            "company": "Alpha Corp 100% Match",
            "role_title": "Frontend Lead",
            "status": "applied",
            "deadline": str(today + datetime.timedelta(days=10)),
            "salary": 120000,
        },
    )
    client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={
            "company": "Beta LLC",
            "role_title": "Backend Lead",
            "status": "interview",
            "deadline": str(today + datetime.timedelta(days=5)),
            "salary": 140000,
        },
    )
    client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={
            "company": "Gamma Inc",
            "role_title": "Fullstack Lead",
            "status": "wishlist",
            "salary": None,  # null salary for nulls-last testing
        },
    )

    # Create item for other_user
    client.post(
        "/api/applications",
        headers=other_auth_headers,
        json={"company": "Secret Other Corp", "role_title": "CEO"},
    )

    # 1. Base list & pagination
    res = client.get("/api/applications?page=1&page_size=2", headers=normal_auth_headers)
    assert res.status_code == 200
    d = res.json()
    assert d["total"] == 3
    assert d["page"] == 1
    assert d["page_size"] == 2
    assert d["total_pages"] == 2
    assert len(d["items"]) == 2

    # 2. Search escaping: '%' should NOT match everything like a SQL wildcard
    res_search = client.get("/api/applications?search=100%", headers=normal_auth_headers)
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert res_search.json()["items"][0]["company"] == "Alpha Corp 100% Match"

    # 3. Multi-status filter (?status=applied&status=interview)
    res_status = client.get(
        "/api/applications?status=applied&status=interview",
        headers=normal_auth_headers,
    )
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 2
    statuses = {x["status"] for x in res_status.json()["items"]}
    assert statuses == {"applied", "interview"}

    # 4. Deadline filters
    res_dl = client.get(
        f"/api/applications?deadline_before={str(today + datetime.timedelta(days=7))}",
        headers=normal_auth_headers,
    )
    assert res_dl.status_code == 200
    assert res_dl.json()["total"] == 1
    assert res_dl.json()["items"][0]["company"] == "Beta LLC"

    res_has_dl = client.get("/api/applications?has_deadline=false", headers=normal_auth_headers)
    assert res_has_dl.status_code == 200
    assert res_has_dl.json()["total"] == 1
    assert res_has_dl.json()["items"][0]["company"] == "Gamma Inc"

    # 5. Sorting whitelist checks
    for field in ["created_at", "updated_at", "company", "role_title", "deadline", "salary"]:
        for order in ["asc", "desc"]:
            sort_res = client.get(
                f"/api/applications?sort_by={field}&order={order}",
                headers=normal_auth_headers,
            )
            assert sort_res.status_code == 200

    # Invalid sort_by returns 422
    bad_sort = client.get("/api/applications?sort_by=hacked_column", headers=normal_auth_headers)
    assert bad_sort.status_code == 422

    # 6. Nulls-last sorting check on salary asc
    res_salary_asc = client.get(
        "/api/applications?sort_by=salary&order=asc",
        headers=normal_auth_headers,
    )
    assert res_salary_asc.status_code == 200
    items_sal = res_salary_asc.json()["items"]
    # Non-null salaries first in ascending order, null salary item at the end
    assert items_sal[-1]["salary"] is None
    assert Decimal(items_sal[0]["salary"]) <= Decimal(items_sal[1]["salary"])

    # 7. User isolation: other_user sees only their 1 item
    other_list = client.get("/api/applications", headers=other_auth_headers)
    assert other_list.status_code == 200
    assert other_list.json()["total"] == 1
    assert other_list.json()["items"][0]["company"] == "Secret Other Corp"


def test_update_application(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test partial update, null rejection on company, and auto applied_at on status move."""
    create_res = client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Netflix", "role_title": "UI Engineer", "status": "wishlist"},
    )
    app_id = create_res.json()["id"]

    # 1. Partial update only touches sent fields
    up1 = client.patch(
        f"/api/applications/{app_id}",
        headers=normal_auth_headers,
        json={"notes": "Added referral notes"},
    )
    assert up1.status_code == 200
    assert up1.json()["notes"] == "Added referral notes"
    assert up1.json()["company"] == "Netflix"

    # 2. Null company rejected with 422
    null_comp = client.patch(
        f"/api/applications/{app_id}",
        headers=normal_auth_headers,
        json={"company": None},
    )
    assert null_comp.status_code == 422

    # 3. Status move to 'applied' sets applied_at to today if empty
    up2 = client.patch(
        f"/api/applications/{app_id}",
        headers=normal_auth_headers,
        json={"status": "applied"},
    )
    assert up2.status_code == 200
    assert up2.json()["status"] == "applied"
    assert up2.json()["applied_at"] == str(datetime.date.today())


def test_delete_application_and_contiguous_positions(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test deleting card shifts remaining cards to maintain contiguous 0..n-1 positions."""
    ids = []
    for i in range(3):
        r = client.post(
            "/api/applications",
            headers=normal_auth_headers,
            json={"company": f"Comp {i}", "role_title": "Role", "status": "wishlist"},
        )
        ids.append(r.json()["id"])

    # Delete middle card (pos 1)
    del_res = client.delete(f"/api/applications/{ids[1]}", headers=normal_auth_headers)
    assert del_res.status_code == 204

    # Subsequent GET returns 404
    assert client.get(f"/api/applications/{ids[1]}", headers=normal_auth_headers).status_code == 404

    # Verify remaining cards now occupy positions 0 and 1
    card0 = client.get(f"/api/applications/{ids[0]}", headers=normal_auth_headers).json()
    card2 = client.get(f"/api/applications/{ids[2]}", headers=normal_auth_headers).json()
    assert card0["position"] == 0
    assert card2["position"] == 1


def test_move_application_within_column_and_across_columns(
    client: TestClient,
    normal_auth_headers: dict[str, str],
    other_auth_headers: dict[str, str],
) -> None:
    """Test moving across columns, within column (up/down), clamping, and contiguous integrity."""
    # Create 3 cards in 'wishlist'
    w_ids = []
    for i in range(3):
        r = client.post(
            "/api/applications",
            headers=normal_auth_headers,
            json={"company": f"Wish {i}", "role_title": "Role", "status": "wishlist"},
        )
        w_ids.append(r.json()["id"])

    # Create 2 cards in 'applied'
    a_ids = []
    for i in range(2):
        r = client.post(
            "/api/applications",
            headers=normal_auth_headers,
            json={"company": f"Appl {i}", "role_title": "Role", "status": "applied"},
        )
        a_ids.append(r.json()["id"])

    # 1. Move within same column: Move Wish 2 (pos 2) up to pos 0
    move_up = client.patch(
        f"/api/applications/{w_ids[2]}/move",
        headers=normal_auth_headers,
        json={"status": "wishlist", "position": 0},
    )
    assert move_up.status_code == 200
    assert move_up.json()["position"] == 0

    # Wishlist positions should be [w_ids[2]: 0, w_ids[0]: 1, w_ids[1]: 2]
    c0 = client.get(f"/api/applications/{w_ids[0]}", headers=normal_auth_headers).json()
    c1 = client.get(f"/api/applications/{w_ids[1]}", headers=normal_auth_headers).json()
    c2 = client.get(f"/api/applications/{w_ids[2]}", headers=normal_auth_headers).json()
    assert c2["position"] == 0
    assert c0["position"] == 1
    assert c1["position"] == 2

    # 2. Move across columns: Move w_ids[0] (currently pos 1) into 'applied' at pos 1
    move_across = client.patch(
        f"/api/applications/{w_ids[0]}/move",
        headers=normal_auth_headers,
        json={"status": "applied", "position": 1},
    )
    assert move_across.status_code == 200
    assert move_across.json()["status"] == "applied"
    assert move_across.json()["position"] == 1

    # Check wishlist closed gap -> remaining cards should have positions 0 and 1
    w_remain = client.get("/api/applications?status=wishlist", headers=normal_auth_headers).json()["items"]
    assert len(w_remain) == 2
    assert sorted([x["position"] for x in w_remain]) == [0, 1]

    # Check applied opened gap -> 3 cards total with positions 0, 1, 2
    a_items = client.get("/api/applications?status=applied", headers=normal_auth_headers).json()["items"]
    assert len(a_items) == 3
    assert sorted([x["position"] for x in a_items]) == [0, 1, 2]

    # 3. Position clamping with huge number (e.g. 999)
    clamp_move = client.patch(
        f"/api/applications/{w_ids[1]}/move",
        headers=normal_auth_headers,
        json={"status": "wishlist", "position": 999},
    )
    assert clamp_move.status_code == 200
    # In wishlist of 2 items, clamped max index is 1
    assert clamp_move.json()["position"] == 1

    # 4. Other user's card cannot be moved -> 404
    other_move = client.patch(
        f"/api/applications/{w_ids[1]}/move",
        headers=other_auth_headers,
        json={"status": "wishlist", "position": 0},
    )
    assert other_move.status_code == 404


def test_board_endpoint_grouping(
    client: TestClient, normal_auth_headers: dict[str, str]
) -> None:
    """Test /api/applications/board returns all 5 columns sorted by position with empty columns as []."""
    client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Offer Corp", "role_title": "Lead", "status": "offer"},
    )
    client.post(
        "/api/applications",
        headers=normal_auth_headers,
        json={"company": "Interview Corp", "role_title": "Senior", "status": "interview"},
    )

    board_resp = client.get("/api/applications/board", headers=normal_auth_headers)
    assert board_resp.status_code == 200
    board = board_resp.json()

    assert "wishlist" in board
    assert "applied" in board
    assert "interview" in board
    assert "offer" in board
    assert "rejected" in board

    assert len(board["offer"]) == 1
    assert board["offer"][0]["company"] == "Offer Corp"
    assert len(board["interview"]) == 1
    assert board["interview"][0]["company"] == "Interview Corp"
    assert board["rejected"] == []
    assert board["wishlist"] == []
    assert board["applied"] == []
