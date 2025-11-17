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


def test_add_field_defaults_to_tag(client):
    # Add a minimal field payload; should default to Shopify tag (category_type='tag')
    resp = client.post("/add_field", json={"field_name": "NewMarketingTag"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body.get("success") is True
    assert body.get("category_type") == "tag"

    # Verify it persisted in fields list
    fields = client.get("/fields").get_json()["fields"]
    match = next((f for f in fields if f.get("field_name") == "NewMarketingTag"), None)
    assert match is not None
    assert match.get("category_type") == "tag"
    # Group defaults to 'Tags' for tag fields
    assert (match.get("group") or "") == "Tags"


def test_update_field_rename_by_index(client):
    # Add a field to rename
    resp_add = client.post("/add_field", json={"field_name": "TempName"})
    assert resp_add.status_code == 200
    # Fetch fields to locate index
    fields = client.get("/fields").get_json()["fields"]
    idx = next(i for i, f in enumerate(fields) if f.get("field_name") == "TempName")
    # Rename via index payload (change field_name)
    resp_upd = client.post("/update_field", json={"index": idx, "field_name": "RenamedField", "description": "Renamed"})
    assert resp_upd.status_code == 200
    body = resp_upd.get_json()
    assert body.get("success") is True
    assert body.get("field_name") == "RenamedField"
    # Verify exactly one renamed record present
    fields_after = client.get("/fields").get_json()["fields"]
    names_after = [f.get("field_name") for f in fields_after]
    assert "RenamedField" in names_after
    assert "TempName" not in names_after


def test_fields_alias_route(client):
    r = client.get("/api/fields")
    assert r.status_code == 200
    data = r.get_json()
    assert isinstance(data.get("fields"), list)
    assert data.get("count") == len(data.get("fields"))


def test_update_field_group_persist(client):
    # add a field then change its group
    r_add = client.post("/add_field", json={"field_name": "GroupField"})
    assert r_add.status_code == 200
    fields = client.get("/fields").get_json()["fields"]
    idx = next(i for i, f in enumerate(fields) if f.get("field_name") == "GroupField")
    r_upd = client.post("/update_field", json={"index": idx, "field_name": "GroupField", "group": "Appearance"})
    assert r_upd.status_code == 200
    # verify persisted
    fields2 = client.get("/fields").get_json()["fields"]
    gf = next(f for f in fields2 if f.get("field_name") == "GroupField")
    assert gf.get("group") == "Appearance"


def test_delete_field_by_name(client):
    # add then delete by name
    client.post("/add_field", json={"field_name": "ToDeleteField"})
    fields = client.get("/fields").get_json()["fields"]
    assert any(f.get("field_name") == "ToDeleteField" for f in fields)
    r_del = client.post("/delete_field", json={"field_name": "ToDeleteField"})
    assert r_del.status_code == 200
    fields_after = client.get("/fields").get_json()["fields"]
    assert not any(f.get("field_name") == "ToDeleteField" for f in fields_after)


def test_rename_does_not_duplicate(client):
    # add then rename and ensure count stable
    client.post("/add_field", json={"field_name": "DupTemp"})
    before = client.get("/fields").get_json()["fields"]
    idx = next(i for i, f in enumerate(before) if f.get("field_name") == "DupTemp")
    r_upd = client.post("/update_field", json={"index": idx, "field_name": "DupRenamed"})
    assert r_upd.status_code == 200
    after = client.get("/fields").get_json()["fields"]
    assert len(after) == len(before)
    names = [f.get("field_name") for f in after]
    assert "DupRenamed" in names and "DupTemp" not in names
