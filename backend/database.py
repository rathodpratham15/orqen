"""
Async database session factory using SQLAlchemy 2.0.
All engine operations use async sessions; Celery tasks use a sync wrapper.
"""
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from config import settings


# Async engine — used by FastAPI routes and engine executor
#
# statement_cache_size=0 is required for Neon's PgBouncer pooler endpoint.
# PgBouncer (transaction mode) does not support asyncpg's prepared-statement
# protocol messages; disabling the cache forces the simple query protocol.
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)

async_session_factory = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency-injectable async session context manager."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency for route handlers."""
    async with get_session() as session:
        yield session


def worker_session_factory() -> async_sessionmaker:
    """Return a fresh async_sessionmaker backed by a NullPool engine.

    WHY NullPool:
      `async_session_factory` above binds its connection pool to the event
      loop created by the first asyncio.run() call. Celery prefork workers
      execute each task in a *new* event loop (a fresh asyncio.run() call),
      so any pooled connection from a prior loop raises:

          RuntimeError: got Future <…> attached to a different loop

      NullPool disables connection reuse entirely — every `async with session:`
      acquires a brand-new connection and releases it on exit. This is slightly
      slower (one extra TCP round-trip per task), but correct and safe in a
      prefork environment. Use this factory (not `async_session_factory`) from
      any code that may run inside a Celery task, e.g. engine/nodes/*.py.
    """
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0},
    )
    return async_sessionmaker(engine, expire_on_commit=False)
