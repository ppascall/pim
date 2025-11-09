"""Populate the 'group' column in categories.csv based on simple heuristics.

Usage:
  python backend/scripts/assign_groups.py [--dry-run]

Heuristics:
  product_type -> group 'Product Types'
  tag prefixes:
      Color_ -> 'Colors'
      Size_ -> 'Sizes'
      Material_ -> 'Materials'
      Special Features_ -> 'Features'
      Product Type_ -> 'Product Types'
      Brand_ -> 'Brands'
  vendor -> 'Vendors'
  custom_field -> 'Custom Fields'
  fallback empty -> 'Misc'

Existing non-empty group values are preserved.
Writes updated CSV in place unless --dry-run provided.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

from backend.app.api.v1.utils.csv_utils import get_categories_csv_path

PREFIX_MAP = {
    "Color_": "Colors",
    "Size_": "Sizes",
    "Material_": "Materials",
    "Special Features_": "Features",
    "Product Type_": "Product Types",
    "Collection_": "Collections",
    "Brand_": "Brands",
}

TYPE_DEFAULT = {
    "product_type": "Product Types",
    "tag": None,  # tag may be refined via prefix
    "vendor": "Vendors",
    "custom_field": "Custom Fields",
}


def infer_group(row: dict) -> str:
    existing = (row.get("group") or "").strip()
    if existing:
        return existing  # preserve manual assignment

    ctype = (row.get("category_type") or "").strip()
    value = (row.get("value") or "").strip()

    # prefix heuristics for tags
    if ctype == "tag":
        for prefix, group in PREFIX_MAP.items():
            if value.startswith(prefix):
                return group
        # generic tag categories based on substrings
        lowered = value.lower()
        if any(k in lowered for k in ["alarm", "clock"]):
            return "Alarm/Clock Tags"
        if any(k in lowered for k in ["thermo", "weer", "humidity", "co2", "hygro"]):
            return "Weather/Environment"
        if any(k in lowered for k in ["unique", "funny", "kids"]):
            return "Special/Novelty"
        # fallback to Tags
        return "Tags"

    default = TYPE_DEFAULT.get(ctype)
    if default:
        return default

    return "Misc"


def load_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            rows.append(dict(r))
    return rows


def write_rows(path: Path, rows: list[dict]) -> None:
    # unify headers
    headers = ["category_type", "value", "description", "required", "options", "group"]
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=headers)
        writer.writeheader()
        for r in rows:
            writer.writerow({h: r.get(h, "") for h in headers})


def main(argv: list[str]) -> int:
    dry_run = "--dry-run" in argv
    path = get_categories_csv_path()
    rows = load_rows(path)
    if not rows:
        print(f"No rows found at {path}")
        return 0
    updated = 0
    for r in rows:
        new_group = infer_group(r)
        if (r.get("group") or "").strip() != new_group:
            r["group"] = new_group
            updated += 1
    if dry_run:
        print(f"[dry-run] Would update {updated} rows.")
    else:
        write_rows(path, rows)
        print(f"Updated {updated} rows and wrote back to {path}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv[1:]))
