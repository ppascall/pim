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
    if not base or not product_id:
        return None
    try:
        url = f"{base}/products/{product_id}.json"
        resp = requests.put(url, json=payload, auth=AUTH, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None

def attempt_update_shopify(product_row: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort push of updates to Shopify.

    Mappings:
      - title -> product.title
      - description -> product.body_html
      - tags -> product.tags (full overwrite of tag string)
      - sku/sku_primary -> variant.sku (first matched variant)
    """
    result: Dict[str, Any] = {"pushed": False, "reason": None}
    try:
        handle = (product_row.get("handle") or "").strip()
        product = None
        if handle:
            product = find_product_by_handle(handle)
        if product is None and product_row.get("title"):
            product = find_product_by_handle(product_row.get("title"))

        if not product:
            result["reason"] = "shopify product not found"
            return result

        prod_id = product.get("id")
        shopify_payload: Dict[str, Any] = {"product": {}}
        # product-level mappings
        if "title" in updates:
            shopify_payload["product"]["title"] = updates["title"]
        if "description" in updates:
            shopify_payload["product"]["body_html"] = updates["description"]
        if "tags" in updates:
            shopify_payload["product"]["tags"] = updates["tags"]

        # variant-level SKU update
        variant_updated = False
        if "sku_primary" in updates or "sku" in updates or "sku" in product_row:
            new_sku = updates.get("sku_primary") or updates.get("sku")
            if new_sku:
                try:
                    base = _base()
                    url = f"{base}/products/{prod_id}.json"
                    resp = requests.get(url, auth=AUTH, timeout=10)
                    resp.raise_for_status()
                    current = resp.json().get("product", {})
                    for v in (current.get("variants") or []):
                        if str(v.get("sku") or "").strip() and (str(v.get("sku") or "").strip() == (product_row.get("sku_primary") or product_row.get("sku") or "")):
                            payload = {"variant": {"id": v["id"], "sku": new_sku}}
                            vurl = f"{base}/variants/{v['id']}.json"
                            r2 = requests.put(vurl, json=payload, auth=AUTH, timeout=10)
                            if r2.ok:
                                variant_updated = True
                                break
                except Exception:
                    pass

        if shopify_payload["product"]:
            upd = update_product_by_id(prod_id, shopify_payload)
            if upd:
                result["pushed"] = True
                result["shopify_response"] = upd
            else:
                result["reason"] = "failed to update shopify product"
        elif variant_updated:
            result["pushed"] = True
            result["shopify_variant_updated"] = True
        else:
            result["reason"] = "nothing to update on shopify"
        return result
    except Exception as ex:
        return {"pushed": False, "reason": f"exception: {ex}"}