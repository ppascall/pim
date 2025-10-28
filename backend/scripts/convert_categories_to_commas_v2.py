import csv, json, re
from pathlib import Path
from shutil import copy2

SCRIPT = Path(__file__).resolve()
CANDIDATES = [
    SCRIPT.parent.parent / "app" / "api" / "v1" / "categories.csv",  # backend/scripts -> backend/app/api/v1
    Path.cwd() / "backend" / "app" / "api" / "v1" / "categories.csv",
    Path.cwd() / "categories.csv",
    SCRIPT.parent.parent.parent / "categories.csv",
]

def strip_quotes(s):
    if s is None: return ""
    s = str(s).strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1].strip()
    return s

def normalize_options(cell):
    s = strip_quotes(cell)
    if not s:
        return ""
    # JSON array
    if s.startswith("[") and s.endswith("]"):
        try:
            arr = json.loads(s.replace("'", '"'))
            parts = [str(x).strip() for x in arr if x is not None and str(x).strip()]
            return ",".join(dict.fromkeys(parts))
        except Exception:
            pass
    # unify alternate pipe-like chars
    s = re.sub(r'[\uFF5C\u2502\u2016]', '|', s)
    s = s.replace("\\|", "|").replace("\\,", ",")
    parts = [p.strip() for p in re.split(r'\r?\n|;|,|\|', s) if p and p.strip()]
    # dedupe while preserving order
    seen = set(); out = []
    for p in parts:
        if p not in seen:
            seen.add(p); out.append(p)
    return ",".join(out)

def main():
    csv_path = None
    for p in CANDIDATES:
        if p.exists():
            csv_path = p
            break
    if not csv_path:
        print("categories.csv not found in expected locations. Tried:")
        for p in CANDIDATES: print("  ", p)
        return
    bak = csv_path.with_suffix(csv_path.suffix + ".bak")
    copy2(csv_path, bak)
    print("Backup written to", bak)

    rows = []
    with csv_path.open("r", newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        orig_fieldnames = rdr.fieldnames or []
        for r in rdr:
            # normalize only the 'options' column if present
            if 'options' in r:
                r['options'] = normalize_options(r.get('options', ''))
            # remove accidental None keys and ensure keys are strings
            if None in r:
                del r[None]
            # coerce all keys/values to str for safety
            clean_row = { (str(k) if k is not None else ''): ('' if v is None else v) for k, v in r.items() }
            rows.append(clean_row)

    # compute final fieldnames: start from original header if present, else common default,
    # then append any extra keys found in rows (preserve order)
    default_order = ['field_name','required','description','options','group']
    final_fieldnames = list(orig_fieldnames) if orig_fieldnames else list(default_order)
    # collect extra keys
    for r in rows:
        for k in r.keys():
            if k not in final_fieldnames and k != '':
                final_fieldnames.append(k)

    # remove any empty-string field
    final_fieldnames = [f for f in final_fieldnames if f and f.strip()]

    with csv_path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=final_fieldnames)
        w.writeheader()
        for r in rows:
            # ensure writer gets only keys in final_fieldnames
            out_row = {k: r.get(k, '') for k in final_fieldnames}
            w.writerow(out_row)

    print("Normalized options -> commas in", csv_path)

if __name__ == "__main__":
    main()