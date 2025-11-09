def test_get_fields(client):
    resp = client.get("/fields")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "fields" in data
    # we inserted two fields via categories.csv fixture
    assert data["count"] == len(data["fields"]) >= 2
    field_names = {f.get("field_name") for f in data["fields"]}
    assert {"Color", "Size"}.issubset(field_names)


def test_update_field_creates_new(client):
    payload = {
        "field_name": "Material",
        "description": "Product material",
        "required": "False",
        "options": "Steel|Plastic",
        "group": "General",
        "category_type": "custom_field",
    }
    resp = client.post("/update_field", json=payload)
    assert resp.status_code == 200
    resp2 = client.get("/fields")
    names = {f.get("field_name") for f in resp2.get_json()["fields"]}
    assert "Material" in names


def test_delete_field(client):
    # ensure Size exists first
    resp = client.get("/fields")
    fields = resp.get_json()["fields"]
    names = {f.get("field_name") for f in fields}
    assert "Size" in names
    # also try delete by index
    size_idx = next(i for i, f in enumerate(fields) if f.get("field_name") == "Size")
    del_resp = client.post("/delete_field", json={"index": size_idx})
    assert del_resp.status_code == 200
    after = client.get("/fields").get_json()
    names_after = {f.get("field_name") for f in after["fields"]}
    assert "Size" not in names_after
