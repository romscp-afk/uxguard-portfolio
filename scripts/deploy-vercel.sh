#!/usr/bin/env bash
# Deploy UXguard to Vercel (standalone repo — Vercel root directory: frontend)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "Warning: VITE_API_URL not set — site will use serverless demo API until configured in Vercel."
fi

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  (cd "$FRONTEND" && npm install)
fi

cd "$ROOT"

echo "Deploying UXguard to Vercel (project: uxguard-portfolio)..."
npx vercel link --project uxguard-portfolio --yes 2>/dev/null || npx vercel link --project uxguard-portfolio
VITE_API_URL="${VITE_API_URL:-}" npx vercel --prod --yes

echo ""
echo "Live at: https://uxguard-portfolio.vercel.app"
echo "Set VITE_API_URL in Vercel → Settings → Environment Variables for production API."
