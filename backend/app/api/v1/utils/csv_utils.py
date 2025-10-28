import os
import csv
from pathlib import Path

# point to the v1 package directory (parent of utils)
BASE_DIR = Path(__file__).resolve().parent.parent

def get_fields_csv_path():
    # categories.csv lives under backend/app/api/v1/
    return BASE_DIR / "categories.csv"

def get_products_csv_path():
    # products.csv lives under backend/app/api/v1/
    return BASE_DIR / "products.csv"

def _safe_str(v):
    return '' if v is None else str(v)

def clean_dict_keys(obj):
    if isinstance(obj, dict):
        return {str(k) if k is not None else '': clean_dict_keys(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_dict_keys(i) for i in obj]
    return obj

# Fields (categories) CSV read/write
def load_fields():
    path = get_fields_csv_path()
    if not path.exists():
        return []
    out = []
    with path.open(newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            cleaned = {k: (_safe_str(v).strip() if v is not None else '') for k, v in row.items()}
            # ensure canonical keys
            out.append({
                'field_name': cleaned.get('field_name', '') or cleaned.get('name', ''),
                'required': cleaned.get('required', 'False'),
                'description': cleaned.get('description', ''),
                'options': cleaned.get('options', ''),
                'group': cleaned.get('group', '')
            })
    # stable sort
    out.sort(key=lambda x: (x.get('group', '').lower(), x.get('field_name', '').lower()))
    return out

def save_fields(fields):
    path = get_fields_csv_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ['field_name', 'required', 'description', 'options', 'group']
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in fields:
            writer.writerow({k: _safe_str(row.get(k, '')) for k in fieldnames})

# Products CSV read/write + simple normalization
def read_products_from_csv():
    path = get_products_csv_path()
    if not path.exists():
        return []
    out = []
    with path.open(newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            cleaned = { (k if k is not None else ''): ('' if v is None else v) for k, v in row.items() }
            out.append(cleaned)
    return out

def write_products_to_csv(products):
    path = get_products_csv_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not products:
        with path.open('w', newline='', encoding='utf-8') as fh:
            fh.write('')
        return
    header = []
    for p in products:
        for k in p.keys():
            if k not in header:
                header.append(k)
    with path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=header)
        writer.writeheader()
        for p in products:
            row = {k: ('' if p.get(k) is None else p.get(k)) for k in header}
            writer.writerow(row)

def load_products(normalize=True):
    prods = read_products_from_csv()
    if not normalize:
        return prods
    out = []
    for p in prods:
        p = clean_dict_keys(p)
        # Product Name priority (CSV header)
        title = p.get('Product Name') or p.get('Product name') or p.get('title') or p.get('handle') or ''
        p['title'] = str(title).strip() or 'Untitled Product'
        # category
        p['category'] = p.get('Product Group') or p.get('category') or 'Uncategorized'
        # status safe default
        status = str(p.get('status') or '').lower()
        p['status'] = status if status in ('active', 'draft', 'archived') else 'draft'
        out.append(p)
    return out

def save_products(products):
    try:
        write_products_to_csv(products)
        return True
    except Exception:
        return False