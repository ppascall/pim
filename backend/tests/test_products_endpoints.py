def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json().get("status") == "ok"


def test_get_products(client):
    r = client.get("/products")
    assert r.status_code == 200
    data = r.get_json()
    assert "products" in data
    assert len(data["products"]) >= 1


def test_search_products(client):
    r = client.post("/search_products", json={"query": "bottle"})
    assert r.status_code == 200
    items = r.get_json()["products"]
    assert any("bottle" in (i.get("title", "") + i.get("handle", "")).lower() for i in items)


def test_add_update_delete_product(client):
    # add
    new_prod = {
        "handle": "new-mug",
        "title": "New Mug",
        "Product number": "MUG-123",
        "vendor": "Acme",
        "product_type": "Mug",
    }
    r_add = client.post("/add_product", json=new_prod)
    assert r_add.status_code in (200, 201)
    body = r_add.get_json()
    assert body.get("success") is True

    # update
    r_upd = client.post(
        "/update_product",
        json={
            "identifier_field": "Product number",
            "id": "MUG-123",
            "updates": {"title": "Updated Mug"},
        },
    )
    assert r_upd.status_code == 200
    assert r_upd.get_json().get("success") is True

    # delete
    r_del = client.post("/delete_product", json={"identifier_field": "handle", "id": "new-mug"})
    assert r_del.status_code == 200
    assert r_del.get_json().get("success") is True


def test_debug_endpoint(client):
    r = client.get("/debug")
    assert r.status_code == 200
    data = r.get_json()
    assert "products_count" in data and "fields_count" in data


def test_refresh_products_dry_run(client):
    r = client.post("/refresh_products?start=0&count=1&push=false")
    assert r.status_code == 200
    data = r.get_json()
    assert data.get("success") is True
    assert data.get("count") in (0, 1)


def test_shopify_status_without_env(client):
    r = client.get("/shopify/status")
    assert r.status_code == 200
    data = r.get_json()
    assert data.get("shopify_enabled") is False


def test_refresh_categories_from_shopify_without_env(client):
    r = client.post("/refresh_categories_from_shopify")
    # Missing credentials -> 400
    assert r.status_code == 400
    assert r.get_json().get("success") is False
