#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
BACKEND_HOST=127.0.0.1
BACKEND_PORT=5000
FRONTEND_PORT="${PORT:-3000}"
PIM_DATA_DIR="${PIM_DATA_DIR:-/tmp/pim_data}"

# --- Backend (Flask) ---
# Resolve a Python interpreter (prefer $PY_BIN, then python3, then python)
PY_BIN=${PY_BIN:-}
if [ -z "$PY_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PY_BIN=python3
  elif command -v python >/dev/null 2>&1; then
    PY_BIN=python
  else
    echo "ERROR: No Python interpreter found (python3 or python). Please enable Python in this environment." >&2
    exit 1
  fi
fi

# Try to create a virtualenv; if that fails, fall back to system interpreter
if "$PY_BIN" -m venv .venv >/dev/null 2>&1; then
  . .venv/bin/activate
  PY="$(pwd)/.venv/bin/python"
else
  echo "Warning: could not create venv, falling back to system interpreter: $PY_BIN"
  PY="$PY_BIN"
fi

"$PY" -m pip install --upgrade pip
"$PY" -m pip install -r backend/requirements.txt
mkdir -p "$PIM_DATA_DIR"

# Prefer gunicorn; fallback to Flask dev server if not available
if command -v gunicorn >/dev/null 2>&1; then
  echo "Starting backend with gunicorn on ${BACKEND_HOST}:${BACKEND_PORT}"
  gunicorn -w 2 -k gthread -b ${BACKEND_HOST}:${BACKEND_PORT} 'backend.app.api.v1.main:create_app()' &
elif "$PY" -c "import gunicorn" >/dev/null 2>&1; then
  echo "Starting backend with module gunicorn on ${BACKEND_HOST}:${BACKEND_PORT}"
  "$PY" -m gunicorn -w 2 -k gthread -b ${BACKEND_HOST}:${BACKEND_PORT} 'backend.app.api.v1.main:create_app()' &
else
  echo "gunicorn not found; starting Flask dev server (not recommended for prod)"
  "$PY" backend/app/api/v1/main.py &
fi

# --- Frontend (Next.js) ---
cd frontend
if command -v npm >/dev/null 2>&1; then
  echo "Installing frontend deps..."
  npm install --no-audit --no-fund
  echo "Building Next.js..."
  npm run build
  echo "Starting Next.js on port ${FRONTEND_PORT} (proxies /api to ${BACKEND_HOST}:${BACKEND_PORT})"
  npx next start -p "${FRONTEND_PORT}"
else
  echo "npm not found. Please ensure Node.js is available in this environment."
  exit 1
fi
