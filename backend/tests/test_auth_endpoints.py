def test_register_returns_token(client):
    email = "new-user@example.com"
    resp = client.post(
        "/register",
        data={"email": email, "password": "super-secret", "role": "admin"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get("access_token")
    assert data.get("role") == "admin"


def test_login_after_register(client):
    email = "login-user@example.com"
    password = "p@ssw0rd"
    # register first
    reg = client.post("/register", data={"email": email, "password": password})
    assert reg.status_code == 200

    resp = client.post(
        "/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload.get("access_token")
    assert payload.get("token_type") == "bearer"


def test_register_duplicate_email_fails(client):
    email = "duplicate@example.com"
    password = "secret"
    first = client.post("/register", data={"email": email, "password": password})
    assert first.status_code == 200

    second = client.post("/register", data={"email": email, "password": password})
    assert second.status_code == 400
    data = second.get_json()
    assert "detail" in data
