import os
import csv
import requests
import time
import random
from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

# Use absolute paths for data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CATEGORY_FILE = os.path.join(BASE_DIR, 'categories.csv')
PRODUCT_FILE = os.path.abspath(os.path.join(BASE_DIR, '../../../../products.csv'))
USER_FILE = os.path.join(BASE_DIR, '../../db/users.csv')

# Correct .env path (three levels up from this file)
load_dotenv(dotenv_path=os.path.abspath(os.path.join(BASE_DIR, '../../../.env')))

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'uploads'

# --- Shopify Integration ---
SHOP = os.environ.get("SHOPIFY_SHOP")  # e.g. 'nextime-clocks.myshopify.com'
TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN")  # your Admin API access token

print("SHOPIFY_SHOP:", SHOP)
print("SHOPIFY_ADMIN_TOKEN:", TOKEN)

def fetch_shopify_products():
    if not SHOP or not TOKEN:
        return None, "Shopify credentials not set"
    url = f"https://{SHOP}/admin/api/2024-01/products.json"
    headers = {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
    all_products = []
    params = {'limit': 250}
    last_id = None

    # Fetch all locations (warehouses)
    locations = fetch_shopify_locations(headers)
    location_map = {loc['id']: loc['name'] for loc in locations}

    while True:
        if last_id:
            params['since_id'] = last_id
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            return None, resp.text
        products = resp.json().get("products", [])
        if not products:
            break
        all_inventory_item_ids = []
        product_variant_map = {}  # Map inventory_item_id to (product, variant)

        for product in products:
            inventory_total = 0
            warehouse_stock = {}
            for variant in product.get('variants', []):
                inventory_total += variant.get('inventory_quantity', 0)
                inventory_item_id = variant.get('inventory_item_id')
                if inventory_item_id:
                    all_inventory_item_ids.append(inventory_item_id)
                    product_variant_map[inventory_item_id] = (product, variant)

            product['read_inventory'] = inventory_total
            product['warehouse_stock'] = warehouse_stock

        # Fetch all inventory levels in batches
        levels = fetch_inventory_levels_batch(headers, all_inventory_item_ids)

        # Map location_id to name
        for level in levels:
            loc_id = level['location_id']
            available = level['available']
            inventory_item_id = level['inventory_item_id']
            warehouse_name = location_map.get(loc_id, f"Warehouse {loc_id}")
            product, variant = product_variant_map[inventory_item_id]
            if 'warehouse_stock' not in product:
                product['warehouse_stock'] = {}
            product['warehouse_stock'][warehouse_name] = product['warehouse_stock'].get(warehouse_name, 0) + (available if available is not None else 0)

        all_products.extend(products)
        if len(products) < params['limit']:
            break
        last_id = products[-1]['id']

    return all_products, None

def save_shopify_products_to_csv(products):
    if not products:
        return
    # Collect all unique keys from all products
    keys = set()
    for p in products:
        keys.update(p.keys())
    keys = list(keys)

    # Update categories.csv (fields)
    existing_fields = set(f['field_name'] for f in load_fields())
    new_fields = [
        {'field_name': k, 'required': 'False', 'description': ''}
        for k in keys if k not in existing_fields
    ]
    if new_fields:
        with open(CATEGORY_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['field_name', 'required', 'description'])
            if os.path.getsize(CATEGORY_FILE) == 0:
                writer.writeheader()
            writer.writerows(new_fields)

    # Write products.csv
    with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for p in products:
            row = {k: (str(p[k]) if not isinstance(p[k], (str, int, float, bool, type(None))) else p[k]) for k in keys}
            writer.writerow(row)

# --- Helper Functions ---

def load_fields():
    if not os.path.exists(CATEGORY_FILE):
        return []
    with open(CATEGORY_FILE, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def save_fields(fields):
    fieldnames = ['field_name', 'required', 'description', 'options', 'group']
    with open(CATEGORY_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(fields)

def load_products():
    if not os.path.exists(PRODUCT_FILE):
        return []
    with open(PRODUCT_FILE, newline='', encoding='utf-8', errors='ignore') as f:
        return list(csv.DictReader(f))

def save_products(products):
    if not products:
        return
    # Collect all unique keys for header
    all_keys = set()
    for p in products:
        all_keys.update(p.keys())
    all_keys = list(all_keys)
    with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=all_keys)
        writer.writeheader()
        for p in products:
            writer.writerow(p)

def save_product(product):
    file_exists = os.path.exists(PRODUCT_FILE)
    with open(PRODUCT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=product.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(product)

def load_users():
    if not os.path.exists(USER_FILE):
        return []
    with open(USER_FILE, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def save_users(users):
    if not users:
        return
    with open(USER_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['email', 'hashed_password', 'role'])
        writer.writeheader()
        writer.writerows(users)

# --- API Endpoints ---

@app.route('/fields', methods=['GET'])
def get_fields():
    fields = load_fields()
    return jsonify({'fields': fields})

@app.route('/add_field', methods=['POST'])
def add_field():
    data = request.form or request.json
    field_name = data.get('field_name', '').strip()
    required = data.get('required', 'no').strip().capitalize()
    description = data.get('description', '').strip()
    options = data.get('options', '').strip()
    group = data.get('group', '').strip()

    if not field_name:
        return jsonify({'success': False, 'message': 'Field name is required'}), 400

    fields = load_fields()
    if any(f['field_name'].lower() == field_name.lower() for f in fields):
        return jsonify({'success': False, 'message': 'Field already exists'}), 400

    new_field = {
        'field_name': field_name,
        'required': 'True' if required == 'Yes' else 'False',
        'description': description,
        'options': options,
        'group': group
    }

    fields.append(new_field)
    save_fields(fields)

    # --- Add this block to create metafield definition in Shopify ---
    if SHOP and TOKEN:
        try:
            ensure_metafield_definition(
                key=field_name,
                name=description or field_name.replace("_", " ").title(),
                type_="single_line_text_field"  # or infer from options/required
            )
        except Exception as e:
            print(f"Shopify metafield definition error: {e}")

    return jsonify({'success': True})

@app.route('/update_field', methods=['POST'])
def update_field():
    data = request.json
    index = data.get('index')
    if index is None:
        return jsonify({'success': False, 'message': 'No index provided'}), 400
    fields = load_fields()
    if not (0 <= index < len(fields)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400

    old_name = fields[index]['field_name']
    new_name = data.get('field_name', old_name)
    updated_desc = data.get('description', fields[index].get('description', ''))
    updated_required = data.get('required', fields[index].get('required', 'False'))
    updated_options = data.get('options', fields[index].get('options', ''))
    updated_group = data.get('group', fields[index].get('group', ''))  # <-- Add this line

    fields[index] = {
        'field_name': new_name,
        'description': updated_desc,
        'required': updated_required,
        'options': updated_options,
        'group': updated_group  # <-- Add this line
    }
    save_fields(fields)

    # Update products if field name changed
    if old_name != new_name:
        products = load_products()
        for product in products:
            if old_name in product:
                product[new_name] = product.pop(old_name)
        save_products(products)

    return jsonify({'success': True})

@app.route('/delete_field', methods=['POST'])
def delete_field():
    data = request.json
    index = data.get('index')
    fields = load_fields()
    if index is None or not (0 <= index < len(fields)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400
    deleted_field = fields[index]['field_name']
    del fields[index]
    save_fields(fields)

    products = load_products()
    for product in products:
        product.pop(deleted_field, None)
    save_products(products)
    return jsonify({'success': True})

@app.route('/products', methods=['GET'])
def get_products():
    products = load_products()
    products = [clean_dict_keys(p) for p in products]
    return jsonify({'products': products})

@app.route('/shopify-products', methods=['GET'])
def get_shopify_products():
    products, error = fetch_shopify_products()
    if error:
        return jsonify({'success': False, 'message': error}), 500
    return jsonify({'products': products})

@app.route('/refresh_products', methods=['POST'])
def refresh_products():
    try:
        if not SHOP or not TOKEN:
            return jsonify({'success': False, 'message': 'Shopify credentials not set'}), 500

        try:
            start = int(request.args.get('start', 0))
            count = int(request.args.get('count', 5))  # Keep batch small!
        except Exception:
            start = 0
            count = 5

        products = load_products()
        allowed_fields = ["title", "body_html", "vendor", "product_type", "tags", "status"]

        headers_shopify = {
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json"
        }

        updated = 0
        created = 0
        failed = 0
        errors = []

        batch = products[start:start+count]
        for idx, product in enumerate(batch):
            global_idx = start + idx
            shopify_id = product.get('id') or product.get('shopify_id')
            shopify_fields = {k: v for k, v in product.items() if k in allowed_fields}
            custom_fields = {k: v for k, v in product.items() if k not in allowed_fields and k not in ['id', 'shopify_id']}

            try:
                print(f"Processing product {global_idx} (ID: {shopify_id})")
                if shopify_id:
                    try:
                        shopify_id_int = int(shopify_id)
                    except Exception:
                        failed += 1
                        errors.append({
                            "type": "invalid_id",
                            "product_index": global_idx,
                            "product": product,
                            "message": f"Invalid Shopify ID: {shopify_id}"
                        })
                        continue

                    url = f"https://{SHOP}/admin/api/2024-01/products/{shopify_id_int}.json"
                    payload = {"product": {"id": shopify_id_int, **shopify_fields}}
                    print(f"Sending request to Shopify: {url}")
                    resp = requests.put(url, headers=headers_shopify, json=payload, timeout=10)
                    print(f"Shopify response: {resp.status_code} {resp.text}")
                    if resp.status_code == 429:
                        # Rate limited, wait and retry once
                        time.sleep(1.5)
                        resp = requests.put(url, headers=headers_shopify, json=payload)
                    if resp.status_code == 200:
                        updated += 1
                        if custom_fields:
                            push_metafields_to_shopify_with_rate_limit(shopify_id_int, custom_fields)
                    else:
                        failed += 1
                        errors.append({
                            "type": "update_failed",
                            "product_index": global_idx,
                            "product": product,
                            "message": f"Failed to update product {shopify_id}: {resp.text}"
                        })
                else:
                    url = f"https://{SHOP}/admin/api/2024-01/products.json"
                    payload = {"product": shopify_fields}
                    resp = requests.post(url, headers=headers_shopify, json=payload)
                    if resp.status_code == 429:
                        time.sleep(1.5)
                        resp = requests.post(url, headers=headers_shopify, json=payload)
                    if resp.status_code == 201:
                        shopify_product = resp.json().get("product")
                        if shopify_product and "id" in shopify_product:
                            new_id = shopify_product["id"]
                            product["id"] = str(new_id)
                            created += 1
                            if custom_fields:
                                push_metafields_to_shopify_with_rate_limit(new_id, custom_fields)
                    else:
                        failed += 1
                        errors.append({
                            "type": "create_failed",
                            "product_index": global_idx,
                            "product": product,
                            "message": f"Failed to create product: {resp.text}"
                        })
            except Exception as e:
                failed += 1
                errors.append({
                    "type": "exception",
                    "product_index": global_idx,
                    "product": product,
                    "message": str(e)
                })
            # Always sleep between products to avoid rate limit
            time.sleep(0.7)

        save_products(products)
        total = len(products)
        next_start = start + count if (start + count) < total else None

        print(f"Returning response: updated={updated}, created={created}, failed={failed}, errors={errors}")

        return jsonify({
            'success': failed == 0,
            'updated': updated,
            'created': created,
            'failed': failed,
            'errors': errors,
            'message': f"Processed {len(batch)} products. Updated {updated}, created {created}, failed {failed}.",
            'next_start': next_start,
            'total': total
        })
    except Exception as e:
        print(f"UNHANDLED EXCEPTION in /refresh_products: {e}")
        return jsonify({'success': False, 'message': f'Internal server error: {e}'}), 500

def push_metafields_to_shopify_with_rate_limit(product_id, custom_fields):
    if not SHOP or not TOKEN:
        return
    for key, value in custom_fields.items():
        try:
            ensure_metafield_definition(key)
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
            resp = requests.post(url, headers=headers, json=metafield)
            if resp.status_code == 429:
                time.sleep(1.5)
                resp = requests.post(url, headers=headers, json=metafield)
            # Always sleep between metafield calls
            time.sleep(0.7)
        except Exception as e:
            print(f"Metafield error for {key}: {e}")

def clean_products_csv():
    import ast
    import tempfile

    # Read and clean each row
    cleaned_rows = []
    with open(PRODUCT_FILE, newline='', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        for row in reader:
            # Example: Clean 'images' field if it's a Python list
            if 'images' in row and row['images']:
                try:
                    images = ast.literal_eval(row['images'])
                    if isinstance(images, list):
                        row['images'] = ','.join([img['src'] for img in images if isinstance(img, dict) and 'src' in img])
                except Exception:
                    pass
            # You can add more cleaning for other fields here
            cleaned_rows.append(row)
    # Write cleaned rows back
    with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)

def fetch_shopify_locations(headers):
    url = f"https://{SHOP}/admin/api/2024-01/locations.json"
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return []
    return resp.json().get("locations", [])

def fetch_inventory_levels(headers, inventory_item_id):
    url = f"https://{SHOP}/admin/api/2024-01/inventory_levels.json"
    params = {'inventory_item_ids': inventory_item_id}
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code != 200:
        return []
    return resp.json().get("inventory_levels", [])

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

def clean_dict_keys(obj):
    if isinstance(obj, dict):
        return {str(k) if k is not None else '' : clean_dict_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_dict_keys(i) for i in obj]
    else:
        return obj

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
    # Check if definition exists first (optional: GET /metafield_definitions.json?namespace=custom&key=key)
    resp = requests.post(url, headers=headers, json=payload)
    # Shopify will error if it already exists, so you may want to ignore 422 errors

def push_metafields_to_shopify(product_id, custom_fields):
    if not SHOP or not TOKEN:
        return
    for key, value in custom_fields.items():
        ensure_metafield_definition(key)
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
        requests.post(url, headers=headers, json=metafield)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)