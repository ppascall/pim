#!/usr/bin/env bash
set -euo pipefail
echo "[start.sh] Starting entrypoint..."

# --- Config ---
BACKEND_HOST=127.0.0.1
BACKEND_PORT=5000
# Default to 8080 if PORT is not set by the platform
FRONTEND_PORT="${PORT:-8080}"
echo "[start.sh] PORT env: ${PORT:-<unset>} | FRONTEND_PORT=${FRONTEND_PORT}"
PIM_DATA_DIR="${PIM_DATA_DIR:-/tmp/pim_data}"

# --- Frontend (Next.js) build first to minimize memory while backend is running ---
cd frontend
if command -v npm >/dev/null 2>&1; then
  if [ ! -d "node_modules" ]; then
    echo "[start.sh] Installing frontend deps..."
    npm install --no-audit --no-fund
  else
    echo "[start.sh] Using cached node_modules"
  fi
  echo "[start.sh] Building Next.js (fresh build each start)..."
  export NEXT_TELEMETRY_DISABLED=1
  export NEXT_DISABLE_SOURCEMAPS=1
  # Limit Node heap if platform enforces strict memory
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"
  rm -rf .next
  npm run build
else
  echo "[start.sh] npm not found. Please ensure Node.js is available in this environment."
  exit 1
fi
cd ..

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
  echo "[start.sh] Starting backend with gunicorn on ${BACKEND_HOST}:${BACKEND_PORT}"
  gunicorn -w 2 -k gthread -b ${BACKEND_HOST}:${BACKEND_PORT} 'backend.app.api.v1.main:create_app()' &
elif "$PY" -c "import gunicorn" >/dev/null 2>&1; then
  echo "[start.sh] Starting backend with module gunicorn on ${BACKEND_HOST}:${BACKEND_PORT}"
  "$PY" -m gunicorn -w 2 -k gthread -b ${BACKEND_HOST}:${BACKEND_PORT} 'backend.app.api.v1.main:create_app()' &
else
  echo "[start.sh] gunicorn not found; starting Flask dev server (not recommended for prod)"
  "$PY" backend/app/api/v1/main.py &
fi

# --- Frontend (Next.js) start ---
cd frontend
echo "[start.sh] Starting Next.js on 0.0.0.0:${FRONTEND_PORT} (proxies /api to ${BACKEND_HOST}:${BACKEND_PORT})"
# Prefer project-local next binary if available
if [ -x "node_modules/.bin/next" ]; then
  ./node_modules/.bin/next start -H 0.0.0.0 -p "${FRONTEND_PORT}"
else
  npx next start -H 0.0.0.0 -p "${FRONTEND_PORT}"
fi
