import os
import requests
from typing import Optional, Dict, Any

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE")  # e.g. your-store.myshopify.com
SHOPIFY_API_KEY = os.environ.get("SHOPIFY_API_KEY")
SHOPIFY_API_PASSWORD = os.environ.get("SHOPIFY_API_PASSWORD")
SHOPIFY_API_VERSION = os.environ.get("SHOPIFY_API_VERSION", "2023-10")

AUTH = (SHOPIFY_API_KEY, SHOPIFY_API_PASSWORD)

def _base() -> Optional[str]:
    if not SHOPIFY_STORE or not SHOPIFY_API_KEY or not SHOPIFY_API_PASSWORD:
        return None
    return f"https://{SHOPIFY_STORE}/admin/api/{SHOPIFY_API_VERSION}"

def find_product_by_handle(handle: str) -> Optional[Dict[str, Any]]:
    """Return first matching product object for handle (or None)."""
    base = _base()
    if not base or not handle:
        return None
    try:
        url = f"{base}/products.json"
        resp = requests.get(url, params={"handle": handle}, auth=AUTH, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        prods = data.get("products") or []
        return prods[0] if prods else None
    except Exception:
        return None

def update_product_by_id(product_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """PUT product update by id. payload must be { "product": {...} } shape."""
    base = _base()
            "name": name or key.replace("_", " ").title(),
            "namespace": "custom",
            "key": key,
            "type": type_,
            "owner_type": "PRODUCT"
        }
    }
    try:
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception:
        pass

def push_metafield(product_id, key, value):
    url = f"https://{SHOP}/admin/api/2024-01/products/{product_id}/metafields.json"
    headers = {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
    metafield = {
        "metafield": {
            "namespace": "custom",
            "key": key,
            "value": value,
            "type": "single_line_text_field"
        }
    }
    try:
        resp = requests.post(url, headers=headers, json=metafield, timeout=10)
        if resp.status_code == 429:
            time.sleep(1.5)
            requests.post(url, headers=headers, json=metafield, timeout=10)
    except Exception:
        pass