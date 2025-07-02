import os
import csv
import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'uploads'

CATEGORY_FILE = 'categories.csv'
PRODUCT_FILE = 'products.csv'

# --- Shopify Integration ---
SHOP = os.environ.get("SHOPIFY_SHOP")  # e.g. 'nextime-clocks.myshopify.com'
TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN")  # your Admin API access token

def fetch_shopify_products():
    if not SHOP or not TOKEN:
        return None, "Shopify credentials not set"
    url = f"https://{SHOP}/admin/api/2024-01/products.json"
    headers = {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
    all_products = []
    params = {'limit': 250}  # Shopify max limit per page
    last_id = None

    while True:
        if last_id:
            params['since_id'] = last_id
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            return None, resp.text
        products = resp.json().get("products", [])
        if not products:
            break
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
    with open(CATEGORY_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['field_name', 'required', 'description'])
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
    with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=products[0].keys())
        writer.writeheader()
        writer.writerows(products)

def save_product(product):
    file_exists = os.path.exists(PRODUCT_FILE)
    with open(PRODUCT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=product.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(product)

# --- API Endpoints ---

@app.route('/fields', methods=['GET'])
def get_fields():
    return jsonify({'fields': load_fields()})

@app.route('/add_field', methods=['POST'])
def add_field():
    data = request.form or request.json
    field_name = data.get('field_name', '').strip()
    required = data.get('required', 'no').strip().capitalize()
    description = data.get('description', '').strip()

    if not field_name:
        return jsonify({'success': False, 'message': 'Field name is required'}), 400

    fields = load_fields()
    if any(f['field_name'].lower() == field_name.lower() for f in fields):
        return jsonify({'success': False, 'message': 'Field already exists'}), 400

    new_field = {
        'field_name': field_name,
        'required': 'True' if required == 'Yes' else 'False',
        'description': description
    }

    fields.append(new_field)
    save_fields(fields)

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

    fields[index] = {
        'field_name': new_name,
        'description': updated_desc,
        'required': updated_required
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
    # Just return local products
    return jsonify({'products': load_products()})

@app.route('/shopify-products', methods=['GET'])
def get_shopify_products():
    products, error = fetch_shopify_products()
    if error:
        return jsonify({'success': False, 'message': error}), 500
    return jsonify({'products': products})

@app.route('/refresh_products', methods=['POST'])
def refresh_products():
    products, error = fetch_shopify_products()
    if error:
        return jsonify({'success': False, 'message': error}), 500
    if not products:
        return jsonify({'success': False, 'message': 'No products found on Shopify'}), 404
    save_shopify_products_to_csv(products)
    clean_products_csv()  # <-- Clean after saving!
    return jsonify({'success': True, 'count': len(products)})

@app.route('/add_product', methods=['POST'])
def add_product():
    data = request.form or request.json
    fields = load_fields()
    product = {field['field_name']: data.get(field['field_name'], '') for field in fields}
    save_product(product)
    return jsonify({'success': True})

@app.route('/update_product', methods=['POST'])
def update_product():
    data = request.json
    index = data.get('index')
    if index is None:
        return jsonify({'success': False, 'message': 'No index provided'}), 400
    products = load_products()
    if not (0 <= index < len(products)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400
    for key in data:
        if key != 'index':
            products[index][key] = data[key]
    save_products(products)
    return jsonify({'success': True})

@app.route('/delete_product', methods=['POST'])
def delete_product():
    data = request.json
    index = data.get('index')
    products = load_products()
    if index is None or not (0 <= index < len(products)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400
    del products[index]
    save_products(products)
    return jsonify({'success': True})

@app.route('/search_products', methods=['POST'])
def search_products():
    # Just search local products
    data = request.json
    query = data.get('query', '').lower()
    field_key = data.get('fieldKey', '')
    field_value = data.get('fieldValue', '')
    products = load_products()
    results = []
    for product in products:
        field_match = not field_key or not field_value or product.get(field_key, '') == field_value
        search_match = not query or any(query in str(v).lower() for v in product.values())
        if field_match and search_match:
            results.append(product)
    return jsonify({'products': results})

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    file = request.files['file']
    if file and (file.filename.endswith('.csv') or file.filename.endswith('.txt')):
        content = file.read().decode('utf-8')
        delimiter = '\t' if '\t' in content.splitlines()[0] else ','
        rows = list(csv.reader(content.splitlines(), delimiter=delimiter))
        if rows:
            headers = rows[0]
            existing_fields = set(f['field_name'] for f in load_fields())
            new_fields = [
                {'field_name': h, 'required': 'False', 'description': ''}
                for h in headers if h not in existing_fields
            ]
            if new_fields:
                with open(CATEGORY_FILE, 'a', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=['field_name', 'required', 'description'])
                    if os.path.getsize(CATEGORY_FILE) == 0:
                        writer.writeheader()
                    writer.writerows(new_fields)
            with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(rows[1:])
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid file'}), 400

@app.route('/download', methods=['GET'])
def download():
    return send_file(PRODUCT_FILE, as_attachment=True)

@app.route('/bulk_delete_products', methods=['POST'])
def bulk_delete_products():
    try:
        data = request.get_json()
        indices = data.get('indices', [])
        # Load products
        with open(PRODUCT_FILE, newline='', encoding='utf-8') as f:
            reader = list(csv.DictReader(f))
        # Remove products at the given indices
        new_products = [p for i, p in enumerate(reader) if i not in indices]
        # Write back
        with open(PRODUCT_FILE, 'w', newline='', encoding='utf-8') as f:
            if new_products:
                writer = csv.DictWriter(f, fieldnames=new_products[0].keys())
                writer.writeheader()
                writer.writerows(new_products)
            else:
                # If no products left, still write the header row using fields
                fields = load_fields()
                if fields:
                    writer = csv.DictWriter(f, fieldnames=[fld['field_name'] for fld in fields])
                    writer.writeheader()
                else:
                    f.truncate(0)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)