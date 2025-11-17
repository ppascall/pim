#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
BACKEND_HOST=127.0.0.1
BACKEND_PORT=5000
FRONTEND_PORT="${PORT:-3000}"
PIM_DATA_DIR="${PIM_DATA_DIR:-/tmp/pim_data}"

# --- Backend (Flask) ---
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
mkdir -p "$PIM_DATA_DIR"

# Prefer gunicorn; fallback to Flask dev server if not available
if command -v gunicorn >/dev/null 2>&1; then
  echo "Starting backend with gunicorn on ${BACKEND_HOST}:${BACKEND_PORT}"
  gunicorn -w 2 -k gthread -b ${BACKEND_HOST}:${BACKEND_PORT} 'backend.app.api.v1.main:create_app()' &
else
  echo "gunicorn not found; starting Flask dev server (not recommended for prod)"
  python backend/app/api/v1/main.py &
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
