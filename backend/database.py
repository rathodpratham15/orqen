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

from config import settings


# Async engine — used by FastAPI routes and engine executor
#
# connect_args notes:
#   statement_cache_size=0  — required for Neon's PgBouncer pooler endpoint;
#                             PgBouncer (transaction mode) does not support
#                             asyncpg's prepared-statement protocol messages.
#   prepared_statement_cache_size=0 — alias kept for older asyncpg versions.
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
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
