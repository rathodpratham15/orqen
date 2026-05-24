# Orqen — Deployment Guide

Production stack: **Railway** (FastAPI + Celery worker) + **Vercel** (Next.js) + **Neon** (Postgres) + **Upstash** (Redis).

---

## Prerequisites

- GitHub repo pushed (`git push origin main`)
- [Railway](https://railway.app) account (free tier works)
- [Vercel](https://vercel.com) account (free tier works)
- Neon project created (see `backend/.env.example`)
- Upstash Redis created (see `backend/.env.example`)

---

## 1 — Deploy the Backend on Railway

### 1a. Create project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `rathodpratham15/orqen`
3. Railway detects `railway.toml` and `backend/Dockerfile` automatically

### 1b. Set environment variables

In Railway → your service → **Variables**, add all keys from `backend/.env.example`:

```
DATABASE_URL          postgresql+asyncpg://...
SYNC_DATABASE_URL     postgresql://...
REDIS_URL             rediss://...
CELERY_BROKER_URL     rediss://...
CELERY_RESULT_BACKEND rediss://...
ANTHROPIC_API_KEY     sk-ant-...
RESEND_API_KEY        re_...
APP_ENV               production
APP_SECRET_KEY        <run: python3 -c "import secrets; print(secrets.token_hex(32))">
CORS_ORIGINS          https://orqen.vercel.app   ← update after Vercel deploy
```

### 1c. Run migrations

In Railway → your service → **Settings** → **Deploy** → override start command temporarily:

```
alembic upgrade head
```

Redeploy once. After tables are created, revert to the normal start command:

```
uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
```

Or use the one-shot Railway run (CLI):

```bash
railway run --service orqen-backend alembic upgrade head
```

### 1d. Add Celery worker service

1. In the same Railway project → **New Service** → **GitHub** → same repo
2. Override the start command:
   ```
   celery -A workers worker --loglevel=info --concurrency=2 -Q workflows,default
   ```
3. Same environment variables as the backend service
4. No port needed (worker doesn't expose HTTP)

### 1e. Add Beat scheduler (optional — for cron workflows)

Same as worker but command:
```
celery -A workers beat --loglevel=info
```

---

## 2 — Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import `rathodpratham15/orqen`
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://orqen-backend.up.railway.app
   ```
   (replace with your actual Railway URL from step 1)
4. Deploy → Vercel builds and serves the Next.js app

---

## 3 — Update CORS

After Vercel gives you a URL (e.g. `https://orqen.vercel.app`), go back to Railway and update:

```
CORS_ORIGINS = https://orqen.vercel.app
```

Redeploy the backend service.

---

## Local Docker Compose

For running everything locally with managed cloud DBs:

```bash
cp backend/.env.example backend/.env   # fill in credentials

# Start all services (backend, worker, beat, flower, frontend)
docker compose up

# Run migrations once
docker compose run --rm migrate
```

Services:
- FastAPI: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Next.js: http://localhost:3000
- Flower (Celery UI): http://localhost:5555

---

## Health Check

```bash
curl https://orqen-backend.up.railway.app/health
# → {"status": "ok", "version": "0.1.0"}
```

---

## Troubleshooting

**Celery can't connect to Redis**
Ensure `CELERY_BROKER_URL` starts with `rediss://` (double-s for TLS). Upstash requires TLS.

**Migrations time out on Neon**
Always use the **direct** (non-pooler) connection for `SYNC_DATABASE_URL`. The pooler endpoint times out during long DDL operations.

**asyncpg error: unsupported parameter `channel_binding`**
Remove `channel_binding=require` from `DATABASE_URL`. asyncpg doesn't support that param — use `ssl=require` only.

**CORS errors from frontend**
`CORS_ORIGINS` in backend must exactly match the Vercel URL including protocol (`https://`), no trailing slash.
