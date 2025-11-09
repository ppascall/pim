from backend.app.api.v1.utils.categories_merge import merge_categories


def test_merge_preserves_custom_and_unions_shopify():
    existing = [
        {"category_type": "custom_field", "value": "Material", "description": "", "required": "", "options": "", "group": "General"},
        {"category_type": "tag", "value": "Color_Black", "description": "d", "required": "", "options": "", "group": "Colors"},
    ]
    shopify_sets = {
        "product_type": {"Bottle"},
        "tag": {"Color_Black", "Color_White"},
        "vendor": {"Acme"},
    }
    merged = merge_categories(existing, shopify_sets)
    # custom_field preserved
    assert any(r["category_type"] == "custom_field" and r["value"] == "Material" for r in merged)
    # tag union includes both existing and new
    assert any(r["category_type"] == "tag" and r["value"] == "Color_Black" and r["group"] == "Colors" for r in merged)
    assert any(r["category_type"] == "tag" and r["value"] == "Color_White" and r["group"] == "Colors" for r in merged)
    # vendor and product_type appear
    assert any(r["category_type"] == "vendor" and r["value"] == "Acme" for r in merged)
    assert any(r["category_type"] == "product_type" and r["value"] == "Bottle" for r in merged)
