from typing import Dict, List, Set, Tuple


SHOPIFY_TYPES = {"product_type", "tag", "vendor"}


def tag_group_for(tag: str) -> str:
    t = (tag or "").strip()
    if t.startswith("Color_"):
        return "Colors"
    if t.startswith("Size_"):
        return "Sizes"
    if t.startswith("Material_"):
        return "Materials"
    if t.startswith("Special Features_"):
        return "Features"
    if t.startswith("Product Type_"):
        return "Product Types"
    if t.startswith("Brand_"):
        return "Brands"
    return "Tags"


def merge_categories(
    existing_rows: List[Dict[str, str]],
    shopify_sets: Dict[str, Set[str]],
) -> List[Dict[str, str]]:
    """
    Merge existing categories.csv rows with Shopify-derived sets.

    - Preserves all non-Shopify types as-is (custom fields).
    - For Shopify types (product_type, tag, vendor), returns union(existing, shopify).
    - When an existing row is present, keep its description/required/options/group.
    - For new Shopify entries, derive sensible group defaults.
    """
    existing_rows = existing_rows or []
    out: List[Dict[str, str]] = []

    # Keep all non-Shopify types as-is
    for row in existing_rows:
        ct = (row.get("category_type") or "").strip()
        if ct not in SHOPIFY_TYPES:
            out.append({
                "category_type": row.get("category_type", ""),
                "value": row.get("value", ""),
                "description": row.get("description", ""),
                "required": row.get("required", ""),
                "options": row.get("options", ""),
                "group": row.get("group", ""),
            })

    # Index existing by type+value for quick lookup
    by_type_value: Dict[Tuple[str, str], Dict[str, str]] = {}
    for row in existing_rows:
        ct = (row.get("category_type") or "").strip()
        val = (row.get("value") or "").strip()
        if not val:
            continue
        by_type_value[(ct, val)] = row

    # For each Shopify type, produce union
    for ct in ("product_type", "tag", "vendor"):
        values = set(v for v in (shopify_sets.get(ct) or set()))
        # also include existing values for this type to preserve user additions
        values |= {v for (t, v) in by_type_value.keys() if t == ct}

        for v in sorted(values):
            existing = by_type_value.get((ct, v))
            if existing:
                # keep existing row (preserve metadata)
                out.append({
                    "category_type": ct,
                    "value": v,
                    "description": existing.get("description", ""),
                    "required": existing.get("required", ""),
                    "options": existing.get("options", ""),
                    "group": existing.get("group", ""),
                })
            else:
                # new row coming from Shopify set
                group = ""
                if ct == "product_type":
                    group = "Product Types"
                elif ct == "vendor":
                    group = "Vendors"
                elif ct == "tag":
                    group = tag_group_for(v)
                out.append({
                    "category_type": ct,
                    "value": v,
                    "description": "",
                    "required": "",
                    "options": "",
                    "group": group,
                })

    return out
