import csv
import json
import re
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parents[3]  # project root
FILES = [
    ROOT / "categories.csv",
    ROOT / "backend" / "app" / "api" / "v1" / "categories.csv"
]

def strip_quotes(s: str) -> str:
    if s is None:
        return ""
    s = str(s).strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1].strip()
    return s

def normalize_options(cell: str) -> str:
    s = strip_quotes(cell)
    if not s:
        return ""
    # try JSON array
    if s.startswith("[") and s.endswith("]"):
        try:
            arr = json.loads(s.replace("'", '"'))
            parts = [str(x).strip() for x in arr if x is not None and str(x).strip()]
            return ",".join(parts)
        except Exception:
            pass
    # unify alternate pipe-like chars
    s = re.sub(r'[\uFF5C\u2502\u2016]', '|', s)
    # split on pipe, comma, semicolon or newline and rejoin with commas
    parts = [p.strip() for p in re.split(r'\r?\n|;|,|\|', s) if p and p.strip()]
    # dedupe while preserving order
    seen = set()
    out = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return ",".join(out)

def process_file(path: Path):
    if not path.exists():
        print("skip (not found):", path)
        return
    bak = path.with_suffix(path.suffix + ".bak")
    copy2(path, bak)
    print("backup:", path, "->", bak)
    rows = []
    with path.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames or []
        for r in reader:
            # normalize only the 'options' column if present
            if 'options' in r:
                r['options'] = normalize_options(r.get('options', ''))
            rows.append(r)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print("normalized:", path)

def main():
    for f in FILES:
        process_file(f)

if __name__ == "__main__":
    main()