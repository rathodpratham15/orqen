"""
Orqen — FastAPI application entrypoint.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import async_engine, Base
from api.workflows import router as workflows_router
from api.runs import router as runs_router
from api.approvals import router as approvals_router
from api.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (in dev; use alembic in prod)
    if settings.APP_ENV == "development":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await async_engine.dispose()


app = FastAPI(
    title="Orqen",
    description="AI Workflow Operating System — orchestrate agents, tools, and integrations visually.",
    version="0.1.0",
    lifespan=lifespan,
    debug=settings.APP_ENV == "development",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(workflows_router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(runs_router, prefix="/api/runs", tags=["Runs"])
app.include_router(approvals_router, prefix="/api/approvals", tags=["Approvals"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/healthz/db")
async def health_db():
    """DB connectivity probe — diagnose connection + env var injection."""
    import os, urllib.parse
    # Show what settings resolved AND what os.environ has (host only, no creds)
    settings_host = urllib.parse.urlparse(settings.DATABASE_URL).hostname
    raw_env_url   = os.environ.get("DATABASE_URL", "NOT_SET_IN_ENVIRON")
    env_host      = urllib.parse.urlparse(raw_env_url).hostname if raw_env_url != "NOT_SET_IN_ENVIRON" else "NOT_SET_IN_ENVIRON"
    diag = {"settings_db_host": settings_host, "environ_db_host": env_host, "app_env": settings.APP_ENV}
    try:
        from sqlalchemy import text
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"db": "ok", **diag}
    except Exception as exc:
        return {"db": "error", "detail": str(exc), "type": type(exc).__name__, **diag}
