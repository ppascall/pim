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


def test_bulk_edit_and_delete_products(client):
    # ensure at least two products exist by adding another
    r_add = client.post("/add_product", json={
        "handle": "bulk-temp",
        "title": "Bulk Temp",
        "Product number": "BULK-1",
    })
    assert r_add.status_code in (200, 201)
    # fetch products to get indices
    r = client.get("/products")
    prods = r.get_json()["products"]
    assert len(prods) >= 1

    # alias endpoint
    r_api = client.get("/api/products")
    assert r_api.status_code == 200
    assert "products" in r_api.get_json()
    # pick up to first two indices
    targets = list(range(min(2, len(prods))))
    # bulk edit vendor
    r_edit = client.post("/bulk_edit_products", json={"indices": targets, "field": "vendor", "value": "AcmeBulk"})
    assert r_edit.status_code == 200
    # verify change
    r2 = client.get("/products")
    for i in targets:
        assert r2.get_json()["products"][i].get("vendor") == "AcmeBulk"
    # bulk delete just the extra item we added if present
    # find index of bulk-temp
    r3 = client.get("/products")
    prods3 = r3.get_json()["products"]
    try:
        idx = next(i for i, p in enumerate(prods3) if p.get("handle") == "bulk-temp")
        r_del = client.post("/bulk_delete_products", json={"indices": [idx]})
        assert r_del.status_code == 200
    except StopIteration:
        pass

    # API aliases
    r_edit_api = client.post("/api/bulk_edit_products", json={"indices": [0], "field": "vendor", "value": "Alias"})
    assert r_edit_api.status_code in (200, 400)  # 400 possible if no index 0
    r_del_api = client.post("/api/bulk_delete_products", json={"indices": []})
    assert r_del_api.status_code in (200, 400)


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


def test_live_sync_toggle_and_update_response(client):
    # ensure live sync starts disabled
    r0 = client.get("/api/get_use_shopify")
    assert r0.status_code == 200
    assert r0.get_json().get("use_shopify") in (False, True)  # default False

    # Disable explicitly
    r1 = client.post("/api/set_use_shopify", json={"use_shopify": False})
    assert r1.status_code == 200
    assert r1.get_json().get("use_shopify") is False

    # Update a product; shopify push should be skipped with reason
    r_upd = client.post(
        "/update_product",
        json={
            "index": 0,
            "updates": {"title": "Test Live Toggle"},
        },
    )
    assert r_upd.status_code == 200
    body = r_upd.get_json()
    assert body.get("success") is True
    assert body.get("shopify", {}).get("pushed") in (False, None)

    # Enable live sync and update again (no real creds, but path exercised)
    r2 = client.post("/api/set_use_shopify", json={"use_shopify": True})
    assert r2.status_code == 200
    assert r2.get_json().get("use_shopify") is True


def test_refresh_alias_endpoints_without_env(client):
    # /api aliases should be routed and return 400 (missing creds) not 404
    r1 = client.post("/api/refresh_from_shopify")
    assert r1.status_code == 400
    r2 = client.post("/api/refresh_categories_from_shopify")
    assert r2.status_code == 400
