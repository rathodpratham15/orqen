"""
User settings — API key management.

Providers: anthropic | openai | google | groq

Keys are stored AES-encrypted in the DB; only the encrypted blob is persisted.
The decrypt helper is used at workflow execution time.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from api.deps import CurrentUser, DBDep
from config import settings
from models import UserAPIKey

router = APIRouter()

VALID_PROVIDERS = {"anthropic", "openai", "google", "groq"}


# ── Schemas ────────────────────────────────────────────────────────────────────

class APIKeyStatus(BaseModel):
    provider:   str
    is_set:     bool
    created_at: str | None = None
    updated_at: str | None = None


class SetAPIKeyRequest(BaseModel):
    key: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _encrypt(key: str) -> str:
    return settings.fernet.encrypt(key.encode()).decode()


def _decrypt(encrypted: str) -> str:
    return settings.fernet.decrypt(encrypted.encode()).decode()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[APIKeyStatus])
async def list_api_keys(current_user: CurrentUser, db: DBDep):
    """Return which providers have keys configured (never returns the actual key)."""
    result = await db.execute(
        select(UserAPIKey).where(UserAPIKey.user_id == current_user.id)
    )
    rows = {r.provider: r for r in result.scalars().all()}

    return [
        APIKeyStatus(
            provider=p,
            is_set=p in rows,
            created_at=rows[p].created_at.isoformat() if p in rows else None,
            updated_at=rows[p].updated_at.isoformat() if p in rows else None,
        )
        for p in sorted(VALID_PROVIDERS)
    ]


@router.put("/api-keys/{provider}", response_model=APIKeyStatus, status_code=status.HTTP_200_OK)
async def set_api_key(
    provider: str,
    body: SetAPIKeyRequest,
    current_user: CurrentUser,
    db: DBDep,
):
    """Create or replace an API key for the given provider."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider {provider!r}. Must be one of: {sorted(VALID_PROVIDERS)}",
        )
    if not body.key.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="API key must not be empty",
        )

    result = await db.execute(
        select(UserAPIKey).where(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.provider == provider,
        )
    )
    row = result.scalar_one_or_none()

    encrypted = _encrypt(body.key.strip())

    if row:
        row.encrypted_key = encrypted
    else:
        row = UserAPIKey(
            user_id=current_user.id,
            provider=provider,
            encrypted_key=encrypted,
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)

    return APIKeyStatus(
        provider=provider,
        is_set=True,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


@router.delete("/api-keys/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(provider: str, current_user: CurrentUser, db: DBDep):
    """Remove a provider's API key."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown provider {provider!r}")

    result = await db.execute(
        select(UserAPIKey).where(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.provider == provider,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")

    await db.delete(row)
    await db.commit()
