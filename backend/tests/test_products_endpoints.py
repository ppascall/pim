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
