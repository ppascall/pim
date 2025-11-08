from flask import Blueprint, request, jsonify, current_app
import logging
import os
import requests
from dotenv import load_dotenv
from ..utils.csv_utils import load_products, save_products, read_products_from_csv, write_products_to_csv, load_fields
from ..services import shopify as shopify_svc
import csv

products_bp = Blueprint('products_bp', __name__)

STANDARD_SHOPIFY_PRODUCT_KEYS = {
    "title", "body_html", "vendor", "product_type", "handle", "tags", "status",
    "variants_count", "options", "image_src", "sku_primary", "Product number", "Product Name",
    "product_type", "description", "category"
}

# load .env early for this module as well (safe; load_dotenv is idempotent)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.abspath(os.path.join(BASE_DIR, '..', '..', '..', '..', '.env'))
load_dotenv(_env_path)

def _resolve_shop_and_token():
    """Resolve shop and token from multiple possible env names."""
    shop = (
        os.environ.get("SHOP")
        or os.environ.get("SHOPIFY_STORE")
        or os.environ.get("SHOPIFY_SHOP")
        or os.environ.get("SHOP_DOMAIN")
        or os.environ.get("SHOP_URL")
    )
    token = (
        os.environ.get("TOKEN")
        or os.environ.get("SHOPIFY_ACCESS_TOKEN")
        or os.environ.get("SHOPIFY_TOKEN")
        or os.environ.get("ACCESS_TOKEN")
        or os.environ.get("SHOPIFY_API_KEY")
        or os.environ.get("SHOPIFY_ADMIN_TOKEN")  # <-- add this line
    )
    return shop, token

def _shopify_request(method, path, shop=None, token=None, params=None, json=None):
    shop = shop or None
    token = token or None
    if not shop or not token:
        env_shop, env_token = _resolve_shop_and_token()
        shop = shop or env_shop
        token = token or env_token
    if not shop or not token:
        # include which env keys are present (without leaking token)
        present = { 'SHOP': bool(os.environ.get('SHOP')), 'SHOPIFY_STORE': bool(os.environ.get('SHOPIFY_STORE')),
                    'TOKEN': bool(os.environ.get('TOKEN')), 'SHOPIFY_ACCESS_TOKEN': bool(os.environ.get('SHOPIFY_ACCESS_TOKEN')) }
        raise RuntimeError(f"Shopify SHOP/TOKEN not configured in env (present: {present})")
    # normalize shop (allow full domain or just store name)
    shop = shop.replace("https://", "").replace("http://", "").strip().rstrip("/")
    base = f"https://{shop}/admin/api/2023-10"
    url = base + path
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    resp = requests.request(method, url, headers=headers, params=params, json=json, timeout=30)
    resp.raise_for_status()
    return resp.json()

def _find_shopify_product_id_by_handle(handle):
    """Try to find product id by handle via REST search."""
    try:
        res = _shopify_request("GET", f"/products.json", params={"handle": handle})
        prods = res.get("products") or []
        if prods:
            return prods[0].get("id")
    except Exception:
        logging.exception("shopify lookup by handle failed")
    # fallback: fetch all (very expensive) and match - last resort
    try:
        res = _shopify_request("GET", "/products.json", params={"limit": 250})
        for p in (res.get("products") or []):
            if str(p.get("handle") or "") == str(handle):
                return p.get("id")
    except Exception:
        logging.exception("shopify fallback lookup failed")
    return None

def _create_or_update_metafield_for_product(product_id, namespace, key, value):
    """Create or update a single metafield for a product. Returns dict result."""
    try:
        # normalize key to allowed Shopify key chars
        safe_key = "".join(c if c.isalnum() or c in "_-" else "_" for c in key).lower()
        # check existing metafields
        try:
            existing = _shopify_request("GET", f"/products/{product_id}/metafields.json", params={"namespace": namespace, "key": safe_key})
            items = existing.get("metafields") or []
        except requests.HTTPError:
            items = []
        if items:
            mf = items[0]
            mf_id = mf.get("id")
            # update
            payload = {"metafield": {"id": mf_id, "value": str(value), "type": "single_line_text_field"}}
            try:
                updated = _shopify_request("PUT", f"/metafields/{mf_id}.json", json=payload)
                return {"action": "updated", "metafield": updated}
            except Exception:
                logging.exception("failed to update metafield")
                return {"action": "update_failed", "key": safe_key}
        else:
            # create new metafield under namespace
            payload = {"metafield": {"namespace": namespace, "key": safe_key, "value": str(value), "type": "single_line_text_field"}}
            try:
                created = _shopify_request("POST", f"/products/{product_id}/metafields.json", json=payload)
                return {"action": "created", "metafield": created}
            except Exception:
                logging.exception("failed to create metafield")
                return {"action": "create_failed", "key": safe_key}
    except Exception as ex:
        logging.exception("metafield sync exception")
        return {"action": "exception", "error": str(ex), "key": key}

def sync_metafields_for_row(row, shopify_result=None):
    """
    Best-effort: for every non-empty key in `row` that's not a STANDARD_SHOPIFY_PRODUCT_KEYS entry,
    create/update a metafield on the Shopify product under namespace 'pim'.
    Returns a list of per-key results.
    """
    results = []
    shop = os.environ.get("SHOP")
    token = os.environ.get("TOKEN")
    if not shop or not token:
        logging.info("Shopify creds not set; skipping metafield sync")
        return {"skipped": True, "reason": "no creds"}

    # product id: prefer explicit id from shopify_result
    product_id = None
    try:
        if isinstance(shopify_result, dict):
            # try common fields
            product_id = shopify_result.get("product_id") or shopify_result.get("id") or shopify_result.get("product", {}).get("id")
    except Exception:
        product_id = None

    # try find by handle if id missing
    if not product_id:
        handle = (row.get("handle") or row.get("title") or "").strip()
        if handle:
            product_id = _find_shopify_product_id_by_handle(handle)

    if not product_id:
        logging.info("Could not determine Shopify product id for row; skipping metafield sync")
        return {"skipped": True, "reason": "no product id", "handle": row.get("handle")}

    namespace = "pim"
    for k, v in (row.items()):
        if v is None:
            continue
        if str(v).strip() == "":
            continue
        if k in STANDARD_SHOPIFY_PRODUCT_KEYS:
            continue
        try:
            res = _create_or_update_metafield_for_product(product_id, namespace, k, v)
            results.append({"key": k, "result": res})
        except Exception:
            logging.exception("metafield sync for key failed")
            results.append({"key": k, "result": "error"})
    return {"product_id": product_id, "results": results}

@products_bp.route('/products', methods=['GET'])
def get_products():
    products = load_products()
    return jsonify({'products': products})

@products_bp.route('/search_products', methods=['POST'])
def search_products():
    try:
        payload = request.get_json(silent=True) or request.form or {}
        q = (payload.get('query') or payload.get('q') or '').strip().lower()
        products = read_products_from_csv()
        if not q:
            return jsonify({'products': products})
        def matches(p):
            for key in ('Product Name', 'Product name', 'title', 'handle', 'Product number', 'sku_primary'):
                if p.get(key) and q in str(p.get(key)).lower():
                    return True
            if p.get('category') and q in str(p.get('category')).lower():
                return True
            return False
        results = [p for p in products if matches(p)]
        return jsonify({'products': results})
    except Exception as e:
        return jsonify({'error': 'search failed', 'details': str(e)}), 500

@products_bp.route('/update_product', methods=['POST'])
def update_product():
    try:
        payload = request.get_json(silent=True) or request.form or {}
        identifier_field = payload.get('identifier_field') or payload.get('id_field') or 'Product number'
        identifier_value = payload.get('id') or payload.get('identifier') or payload.get('value')
        updates = payload.get('updates') or payload.get('data') or {}
        if not identifier_value:
            return jsonify({'success': False, 'message': 'identifier value required'}), 400

        products = read_products_from_csv()
        updated_row = None
        for p in products:
            val = p.get(identifier_field) or p.get('Product number') or p.get('handle')
            if val and str(val).strip() == str(identifier_value).strip():
                if isinstance(updates, dict):
                    for k, v in updates.items():
                        p[k] = '' if v is None else v
                updated_row = p
                break

        if not updated_row:
            return jsonify({'success': False, 'message': 'product not found'}), 404

        write_products_to_csv(products)

        # Best-effort: attempt to push changes to Shopify if service supports it
        shopify_result = None
        try:
            if hasattr(shopify_svc, 'attempt_update_shopify'):
                shopify_result = shopify_svc.attempt_update_shopify(updated_row, updates or {})
        except Exception:
            logging.exception("shopify push failed")
            shopify_result = {'error': 'shopify push exception'}

        # new: attempt to sync CSV-only custom fields as Shopify metafields
        metafields_sync = None
        try:
            metafields_sync = sync_metafields_for_row(updated_row, shopify_result)
        except Exception:
            logging.exception("metafields sync failed")

        return jsonify({'success': True, 'shopify': shopify_result, 'metafields_sync': metafields_sync})
    except Exception as e:
        return jsonify({'success': False, 'message': 'update failed', 'details': str(e)}), 500

# refresh_products kept here but can be delegated to shopify service
@products_bp.route('/refresh_products', methods=['POST'])
def refresh_products():
    """
    Refresh a batch of products and attempt to push them to Shopify.
    Query params:
      - start: index to start from (default 0)
      - count: number of products to process (default 50)
      - push: 'true'/'false' (default 'true') — when false, only returns the batch without pushing
    """
    try:
        start = int(request.args.get('start', 0))
        count = int(request.args.get('count', 50))
        push = str(request.args.get('push', 'true')).lower() == 'true'

        # load products
        if load_products:
            try:
                products = load_products()
            except Exception:
                logging.exception("load_products() failed, falling back")
                products = _fallback_load_products()
        else:
            products = _fallback_load_products()

        batch = products[start:start + count]
        results = []
        if push:
            for p in batch:
                try:
                    # attempt_update_shopify expects product_row and updates dict (we pass empty updates to sync full row)
                    if hasattr(shopify_svc, 'attempt_update_shopify'):
                        resp = shopify_svc.attempt_update_shopify(p, {})
                        mf = None
                        try:
                            mf = sync_metafields_for_row(p, resp)
                        except Exception:
                            logging.exception("metafields sync failed for refresh item")
                        results.append({'id': p.get('handle') or p.get('id') or p.get('Product number'), 'ok': True, 'resp': resp, 'metafields': mf})
                    else:
                        results.append({'id': p.get('handle') or p.get('id'), 'ok': False, 'error': 'shopify service missing attempt_update_shopify'})
                except Exception as e:
                    logging.exception("shopify push failed for product")
                    results.append({'id': p.get('handle') or p.get('id') or p.get('Product number'), 'ok': False, 'error': str(e)})
        else:
            # dry run: just report batch ids
            for p in batch:
                results.append({'id': p.get('handle') or p.get('id') or p.get('Product number'), 'ok': None})

        return jsonify({'success': True, 'start': start, 'count': len(batch), 'shopify_enabled': bool(getattr(shopify_svc, '_base', lambda: None)()), 'results': results}), 200

    except Exception as e:
        logging.exception("refresh_products failed")
        return jsonify({'success': False, 'message': str(e)}), 500

@products_bp.route('/debug', methods=['GET'])
def debug_products():
    """
    Returns counts and a sample product so frontend/backend shape can be verified quickly.
    Access: /debug  or /api/debug depending on blueprint prefix.
    """
    try:
        all_products = load_products()
        fields = load_fields()
        sample = all_products[0] if all_products else None
        return jsonify({
            'products_count': len(all_products),
            'fields_count': len(fields),
            'sample_product': sample
        })
    except Exception as e:
        return jsonify({'error': 'debug failed', 'details': str(e)}), 500

@products_bp.route('/add_product', methods=['POST'])
@products_bp.route('/api/add_product', methods=['POST'])  # optional alias if frontend uses /api/add_product
def add_product():
    """
    Accepts JSON or form data to create a new product row.
    Returns 201 with product or 400/500 with error details.
    """
    try:
        payload = request.get_json(silent=True) or request.form or {}
        if not isinstance(payload, dict) or not payload:
            return jsonify({'success': False, 'message': 'invalid or empty payload'}), 400

        new_row = {str(k): ('' if v is None else v) for k, v in payload.items()}

        if not new_row.get('Product Name') and not new_row.get('Product number') and not new_row.get('handle'):
            return jsonify({'success': False, 'message': 'Product Name or Product number required'}), 400

        products = read_products_from_csv()
        # Prevent duplicate Product number or handle
        pn = new_row.get('Product number')
        h = new_row.get('handle')
        for p in products:
            if pn and p.get('Product number') == pn:
                return jsonify({'success': False, 'message': 'duplicate Product number'}), 409
            if h and p.get('handle') == h:
                return jsonify({'success': False, 'message': 'duplicate handle'}), 409

        products.append(new_row)
        write_products_to_csv(products)
        return jsonify({'success': True, 'product': new_row}), 201
    except Exception as e:
        logging.exception("add_product failed")
        return jsonify({'success': False, 'message': 'internal error', 'details': str(e)}), 500

@products_bp.route('/refresh_from_shopify', methods=['POST'])
def refresh_from_shopify():
    """
    Fetches all products from Shopify and overwrites products.csv with the latest data.
    POST with no body.
    """
    try:
        shop, token = _resolve_shop_and_token()
        if not shop or not token:
            return jsonify({'success': False, 'message': 'Shopify credentials missing'}), 400

        # Fetch all products (paginated)
        all_products = []
        last_id = 0
        limit = 250
        while True:
            params = {'limit': limit}
            if last_id:
                params['since_id'] = last_id
            resp = _shopify_request("GET", "/products.json", shop=shop, token=token, params=params)
            items = resp.get('products') or []
            if not items:
                break
            all_products.extend(items)
            last_id = items[-1].get('id') or 0
            if len(items) < limit:
                break

        # Prepare CSV rows
        rows = []
        for p in all_products:
            row = {
                "handle": p.get("handle"),
                "title": p.get("title"),
                "vendor": p.get("vendor"),
                "product_type": p.get("product_type"),
                "tags": p.get("tags"),
                "status": p.get("status"),
                "id": p.get("id"),
            }
            # Add first variant SKU if present
            if p.get("variants") and isinstance(p["variants"], list) and p["variants"]:
                row["sku_primary"] = p["variants"][0].get("sku")
            rows.append(row)

        # Overwrite products.csv
        csv_path = os.path.abspath(os.path.join(current_app.root_path, "products.csv"))
        keys = ["handle", "title", "vendor", "product_type", "tags", "status", "id", "sku_primary"]
        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=keys)
            writer.writeheader()
            for r in rows:
                writer.writerow({k: r.get(k, "") for k in keys})

        return jsonify({'success': True, 'count': len(rows), 'csv_path': csv_path}), 200

    except Exception as e:
        logging.exception("refresh_from_shopify failed")
        return jsonify({'success': False, 'message': str(e)}), 500

@products_bp.route('/shopify/fetch_product', methods=['GET', 'POST'])
def fetch_shopify_product():
    """
    Test endpoint: fetch a Shopify product by handle or id.
    GET:  /shopify/fetch_product?handle=paris-skyline-thermal-bottle
    POST: { "handle": "...", "id": "..." }
    Returns shopify service response or an explanatory error.
    """
    try:
        payload = request.get_json(silent=True) or {}
        handle = (request.args.get('handle') or payload.get('handle') or payload.get('handle_value') or '').strip()
        prod_id = (request.args.get('id') or payload.get('id') or '').strip()
        if not handle and not prod_id:
            return jsonify({'success': False, 'message': 'handle or id is required (query or JSON body)'}), 400

        # try common service function names that might exist
        finder_candidates = [
            'find_product_by_handle',
            'get_product_by_handle',
            'find_product',
            'get_product',
            'fetch_product_by_handle'
        ]
        result = None
        for fn in finder_candidates:
            if hasattr(shopify_svc, fn):
                try:
                    if prod_id:
                        result = getattr(shopify_svc, fn)(prod_id)
                    else:
                        result = getattr(shopify_svc, fn)(handle)
                    break
                except Exception as ex:
                    logging.exception("shopify finder %s raised", fn)
                    # continue trying other candidates

        # If no finder was present / returned, try a generic attempt_update_shopify-based inspect (non-destructive)
        if result is None and hasattr(shopify_svc, 'attempt_update_shopify'):
            try:
                # attempt_update_shopify may expect a row; provide minimal row to let service locate product
                probe_row = {'handle': handle} if handle else {'id': prod_id}
                result = shopify_svc.attempt_update_shopify(probe_row, {})
            except Exception:
                logging.exception("attempt_update_shopify probe failed")

        if result is None:
            return jsonify({'success': False, 'message': 'no compatible finder in shopify service or lookup returned nothing', 'shopify_enabled': bool(getattr(shopify_svc, '_base', lambda: None)())}), 500

        return jsonify({'success': True, 'shopify_enabled': bool(getattr(shopify_svc, '_base', lambda: None)()), 'result': result}), 200

    except Exception as e:
        logging.exception("fetch_shopify_product failed")
        return jsonify({'success': False, 'message': str(e)}), 500

@products_bp.route('/shopify/status', methods=['GET'])
def shopify_status():
    """
    Returns whether SHOP/TOKEN are present and performs a small probe call to Shopify (/shop.json).
    Use to verify credentials and connectivity.
    """
    shop, token = _resolve_shop_and_token()
    enabled = bool(shop and token)
    probe = None
    error = None
    if enabled:
        try:
            probe = _shopify_request("GET", "/shop.json", shop=shop, token=token)
        except Exception as ex:
            logging.exception("shopify probe failed")
            error = str(ex)
    return jsonify({
        'shopify_enabled': enabled,
        'shop_env': shop,
        'token_present': bool(token),
        'probe': probe,
        'error': error
    }), 200

def _fallback_load_products():
    """Fallback loader: reads top-level products.csv if csv_utils not available."""
    csv_path = os.path.abspath(os.path.join(current_app.root_path, "products.csv"))
    rows = []
    if not os.path.exists(csv_path):
        return rows
    try:
        import csv as _csv
        with open(csv_path, newline='', encoding='utf-8') as fh:
            rdr = _csv.DictReader(fh)
            for r in rdr:
                rows.append(dict(r))
    except Exception:
        logging.exception("fallback load_products failed")
    return rows

def _fallback_save_products(rows):
    """Best-effort CSV save if csv_utils not available. Overwrites header ordering."""
    csv_path = os.path.abspath(os.path.join(current_app.root_path, "products.csv"))
    try:
        import csv as _csv
        if not rows:
            # if no rows, write empty file with no header
            with open(csv_path, 'w', newline='', encoding='utf-8') as fh:
                fh.write('')
            return True
        # union of keys in rows for header
        keys = []
        for r in rows:
            for k in r.keys():
                if k not in keys:
                    keys.append(k)
        with open(csv_path, 'w', newline='', encoding='utf-8') as fh:
            writer = _csv.DictWriter(fh, fieldnames=keys)
            writer.writeheader()
            for r in rows:
                writer.writerow({k: (v if v is not None else '') for k, v in r.items()})
        return True
    except Exception:
        logging.exception("fallback save_products failed")
        return False

def _detect_csv_type(csv_path):
    """Returns 'products', 'categories', or None based on filename and columns."""
    fname = os.path.basename(csv_path).lower()
    if "category" in fname:
        return "categories"
    if "product" in fname:
        return "products"
    # fallback: check columns
    try:
        with open(csv_path, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            cols = reader.fieldnames or []
            if "handle" in cols or "Product Name" in cols or "title" in cols:
                return "products"
            if "category" in cols or "Category Name" in cols:
                return "categories"
    except Exception:
        pass
    return None

@products_bp.route('/delete_product', methods=['POST'])
def delete_product():
    payload = request.get_json(silent=True) or request.form or {}
    identifier_field = payload.get("identifier_field") or "handle"
    identifier = payload.get("id")
    if not identifier:
        return jsonify({"success": False, "message": "missing id"}), 400

    products = read_products_from_csv()
    before_count = len(products)
    products_to_delete = [p for p in products if str(p.get(identifier_field) or "").strip() == str(identifier).strip()]
    products = [p for p in products if str(p.get(identifier_field) or "").strip() != str(identifier).strip()]
    after_count = len(products)

    if after_count == before_count:
        return jsonify({"success": False, "message": "no matching product found"}), 404

    try:
        write_products_to_csv(products)
    except Exception as e:
        return jsonify({"success": False, "message": "failed to save CSV", "details": str(e)}), 500

    # Delete from Shopify
    shopify_delete_result = []
    shop, token = _resolve_shop_and_token()
    for prod in products_to_delete:
        shopify_id = prod.get("id") or None
        handle = prod.get("handle") or None
        try:
            if not shopify_id and handle:
                shopify_id = _find_shopify_product_id_by_handle(handle)
            if shopify_id:
                _shopify_request("DELETE", f"/products/{shopify_id}.json", shop=shop, token=token)
                shopify_delete_result.append({"id": shopify_id, "deleted": True})
            else:
                shopify_delete_result.append({"id": shopify_id, "deleted": False, "reason": "no shopify id"})
        except Exception as ex:
            shopify_delete_result.append({"id": shopify_id, "deleted": False, "error": str(ex)})

    return jsonify({
        "success": True,
        "deleted": before_count - after_count,
        "remaining": after_count,
        "shopify_deleted": shopify_delete_result
    }), 200

@products_bp.route('/create_product', methods=['POST'])
def create_product():
    """
    POST { ...product fields... }
    Creates a new product on Shopify and adds it to products.csv.
    """
    payload = request.get_json(silent=True) or request.form or {}
    # Minimal required fields for Shopify
    title = payload.get("title") or payload.get("Product Name")
    handle = payload.get("handle")
    vendor = payload.get("vendor")
    product_type = payload.get("product_type")
    if not title:
        return jsonify({"success": False, "message": "title/Product Name required"}), 400

    shop, token = _resolve_shop_and_token()
    if not shop or not token:
        return jsonify({"success": False, "message": "Shopify credentials missing"}), 400

    # Build Shopify product payload
    shopify_payload = {
        "product": {
            "title": title,
            "handle": handle,
            "vendor": vendor,
            "product_type": product_type,
            "tags": payload.get("tags", ""),
            "status": payload.get("status", "active"),
            "variants": [
                {
                    "sku": payload.get("sku_primary") or payload.get("Product number") or "",
                    "price": payload.get("price", "0.00")
                }
            ]
        }
    }

    try:
        resp = _shopify_request("POST", "/products.json", shop=shop, token=token, json=shopify_payload)
        product = resp.get("product")
        if not product or not product.get("id"):
            return jsonify({"success": False, "message": "Shopify product creation failed", "response": resp}), 500

        # Add to products.csv
        products = read_products_from_csv()
        new_row = dict(payload)
        new_row["id"] = product["id"]
        new_row["handle"] = product.get("handle", handle)
        new_row["title"] = product.get("title", title)
        new_row["vendor"] = product.get("vendor", vendor)
        new_row["product_type"] = product.get("product_type", product_type)
        new_row["sku_primary"] = shopify_payload["product"]["variants"][0]["sku"]
        products.append(new_row)
        write_products_to_csv(products)

        return jsonify({"success": True, "shopify_product": product, "csv_row": new_row}), 201
    except Exception as e:
        logging.exception("create_product failed")
        return jsonify({"success": False, "message": str(e)}), 500

@products_bp.route('/refresh_categories_from_shopify', methods=['POST'])
def refresh_categories_from_shopify():
    """
    Fetches all unique product_type, tags, and vendor values from Shopify and writes categories.csv.
    No reference to fields.csv.
    """
    import csv
    try:
        shop, token = _resolve_shop_and_token()
        if not shop or not token:
            return jsonify({'success': False, 'message': 'Shopify credentials missing'}), 400

        # Fetch all products (paginated)
        all_products = []
        last_id = 0
        limit = 250
        while True:
            params = {'limit': limit}
            if last_id:
                params['since_id'] = last_id
            resp = _shopify_request("GET", "/products.json", shop=shop, token=token, params=params)
            items = resp.get('products') or []
            if not items:
                break
            all_products.extend(items)
            last_id = items[-1].get('id') or 0
            if len(items) < limit:
                break

        # Collect unique category fields
        product_types = set()
        tags = set()
        vendors = set()
        for p in all_products:
            if p.get("product_type"):
                product_types.add(p["product_type"])
            if p.get("tags"):
                for tag in str(p["tags"]).split(","):
                    tag = tag.strip()
                    if tag:
                        tags.add(tag)
            if p.get("vendor"):
                vendors.add(p["vendor"])

        # Write to categories.csv in backend directory
        csv_path = os.path.abspath(os.path.join(current_app.root_path, "categories.csv"))
        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            # Only Shopify-derived fields, no custom fields
            writer.writerow(["category_type", "value", "description", "required", "options", "group"])
            for pt in sorted(product_types):
                writer.writerow(["product_type", pt, "", "", "", ""])
            for tag in sorted(tags):
                writer.writerow(["tag", tag, "", "", "", ""])
            for vendor in sorted(vendors):
                writer.writerow(["vendor", vendor, "", "", "", ""])

        return jsonify({
            'success': True,
            'product_types': list(product_types),
            'tags': list(tags),
            'vendors': list(vendors),
            'csv_path': csv_path
        }), 200

    except Exception as e:
        logging.exception("refresh_categories_from_shopify failed")
        return jsonify({'success': False, 'message': str(e)}), 500