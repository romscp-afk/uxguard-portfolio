#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting UXguard Portfolio Platform..."

# Backend
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -e . -q
else
  source .venv/bin/activate
fi

python scripts/seed.py 2>/dev/null || PYTHONPATH=. python scripts/seed.py

echo "Backend → http://127.0.0.1:8001"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!

# Wait for backend to be ready
for i in {1..20}; do
  if curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1; then
    echo "Backend is ready."
    break
  fi
  sleep 0.5
done

# Frontend
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "Frontend → http://localhost:5174"
echo "CMS Login → http://localhost:5174/admin/login"
echo "Demo credentials: demo@uxguard.io / demo1234"
VITE_API_PROXY=http://127.0.0.1:8001 npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
