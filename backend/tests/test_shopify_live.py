import os
import pytest


def _has_shopify_creds() -> bool:
    # Supported combos
    if os.environ.get("SHOP") and (os.environ.get("TOKEN") or os.environ.get("SHOPIFY_ACCESS_TOKEN")):
        return True
    if os.environ.get("SHOPIFY_STORE") and os.environ.get("SHOPIFY_API_KEY") and os.environ.get("SHOPIFY_API_PASSWORD"):
        return True
    return False


pytestmark = [
    pytest.mark.shopify,
    pytest.mark.skipif(not _has_shopify_creds(), reason="Shopify credentials not configured in env"),
]


def test_shopify_status_enabled(client):
    r = client.get("/shopify/status")
    assert r.status_code == 200
    data = r.get_json()
    assert data.get("shopify_enabled") is True
    assert data.get("probe") is not None or data.get("error") is None


def test_refresh_categories_from_shopify_ok(client):
    r = client.post("/refresh_categories_from_shopify")
    assert r.status_code == 200
    body = r.get_json()
    assert body.get("success") is True
    assert isinstance(body.get("product_types"), list)