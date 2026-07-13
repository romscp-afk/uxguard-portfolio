# UXguard Portfolio Management Platform

A Behance-style portfolio platform for UX researchers — publish case studies, get a shareable profile link (`/u/username`), and appear on a platform discover feed.

## Features

### Public site
- **Discover feed** (`/`) — recently published case studies from all users with author links
- **Personal portfolio** (`/u/username`) — shareable CV/LinkedIn link
- **Case study pages** (`/u/username/slug`) — structured research narratives

### CMS Admin (`/admin`)
- Case study editor with content blocks (text, quotes, findings, galleries)
- Media library, draft/publish workflow, impact metrics
- **Profile & Link** — username, bio, copyable portfolio URL

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| Auth | JWT + bcrypt |
| Production | Vercel (frontend + serverless demo API) + optional Render backend |

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Open **http://localhost:5174**

Or run separately:

```bash
# Backend (port 8001)
cd backend
python3 -m venv .venv && source .venv/bin/activate && pip install -e .
PYTHONPATH=. python scripts/seed.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Frontend (port 5174)
cd frontend && npm install && npm run dev
```

## Demo Credentials

| User | Email | Password | Portfolio |
|------|-------|----------|-----------|
| Alex Rivera | demo@uxguard.io | demo1234 | `/u/alex-rivera` |
| Jordan Kim | jordan@uxguard.io | demo1234 | `/u/jordan-kim` |

## Project Structure

```
├── backend/          # FastAPI API
├── frontend/         # React app + Vercel serverless routes
├── infrastructure/   # Render blueprint
├── docs/             # Deployment guide
└── start.sh          # Local dev launcher
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel + Render setup.

**Live:** https://uxguard-portfolio.vercel.app

## Billing & plans

See [docs/BILLING.md](docs/BILLING.md) for Free auto-activation, usage limits, mock payments, and Stripe-ready setup.

Public pricing: `/pricing` · Billing settings: `/admin/billing` · Upgrade: `/upgrade`

## License

MIT
