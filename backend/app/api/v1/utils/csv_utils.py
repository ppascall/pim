import os
import csv
from pathlib import Path

# v1 dir (…/backend/app/api/v1)
V1_DIR = Path(__file__).resolve().parents[1]

def get_categories_csv_path():
    return V1_DIR / "categories.csv"

def get_products_csv_path():
    return V1_DIR / "products.csv"

def _safe_str(v):
    return '' if v is None else str(v)

def _read_csv(path: Path):
    if not path.exists():
        return []
    out = []
    with path.open(newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            out.append({k: _safe_str(v) for k, v in (r or {}).items()})
    return out

def _write_csv(path: Path, rows: list[dict]):
    if not rows:
        with path.open('w', newline='', encoding='utf-8') as fh:
            fh.write('')
        return
    keys = []
    for r in rows:
        for k in r.keys():
            if k not in keys:
                keys.append(k)
    with path.open('w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        for r in rows:
            w.writerow({k: ('' if r.get(k) is None else r.get(k)) for k in keys})

# Products
def read_products_from_csv():
    return _read_csv(get_products_csv_path())

def write_products_to_csv(rows):
    _write_csv(get_products_csv_path(), rows)

# Back-compat aliases
def load_products():
    return read_products_from_csv()

def save_products(rows):
    return write_products_to_csv(rows)

# Fields (derived from categories.csv)
def load_fields():
    """
    Map categories.csv rows into the 'fields' shape expected by the frontend.
    field_name <= value
    """
    rows = _read_csv(get_categories_csv_path())
    out = []
    for row in rows:
        field_name = _safe_str(row.get('value')).strip()
        if not field_name:
            continue
        out.append({
            'field_name': field_name,
            'description': _safe_str(row.get('description')).strip(),
            'required': _safe_str(row.get('required') or 'False').strip(),
            'options': _safe_str(row.get('options')).strip(),
            'group': _safe_str(row.get('group')).strip(),
            'category_type': _safe_str(row.get('category_type')).strip(),
        })
    return out