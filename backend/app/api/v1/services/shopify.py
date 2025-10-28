import os
import time
import requests

SHOP = os.environ.get("SHOPIFY_SHOP")
TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN")
USE_SHOPIFY = os.environ.get("USE_SHOPIFY", "false").lower() in ("1", "true", "yes")

def fetch_shopify_locations(headers):
    url = f"https://{SHOP}/admin/api/2024-01/locations.json"
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return []
    return resp.json().get("locations", [])

def fetch_inventory_levels_batch(headers, inventory_item_ids):
    url = f"https://{SHOP}/admin/api/2024-01/inventory_levels.json"
    levels = []
    for i in range(0, len(inventory_item_ids), 50):
        batch_ids = inventory_item_ids[i:i+50]
        params = {'inventory_item_ids': ','.join(str(iid) for iid in batch_ids)}
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code == 200:
            levels.extend(resp.json().get("inventory_levels", []))
    return levels

def ensure_metafield_definition(key, name=None, type_="single_line_text_field"):
    url = f"https://{SHOP}/admin/api/2024-01/metafield_definitions.json"
    headers = {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
    payload = {
        "metafield_definition": {
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