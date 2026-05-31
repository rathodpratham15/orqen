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
from api.auth import router as auth_router
from api.settings import router as settings_router
from api.webhooks import router as webhooks_router
from api.schedules import router as schedules_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (in dev; use alembic in prod)
    if settings.APP_ENV == "development":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await async_engine.dispose()


app = FastAPI(
    title="Orqen",
    description="AI Workflow Operating System — orchestrate agents, tools, and integrations visually.",
    version="0.2.0",
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
app.include_router(auth_router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(settings_router,  prefix="/api/settings",  tags=["Settings"])
app.include_router(workflows_router, prefix="/api/workflows",  tags=["Workflows"])
app.include_router(runs_router,      prefix="/api/runs",       tags=["Runs"])
app.include_router(approvals_router, prefix="/api/approvals",  tags=["Approvals"])
app.include_router(analytics_router, prefix="/api/analytics",  tags=["Analytics"])
app.include_router(webhooks_router,  prefix="/api/webhooks",  tags=["Webhooks"])
app.include_router(schedules_router, prefix="/api/schedules", tags=["Schedules"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}
