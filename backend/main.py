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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
