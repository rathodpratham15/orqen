"""
Authentication endpoints — email/password + Google OAuth 2.0.

Google OAuth flow:
  1. GET  /api/auth/google          → redirect to Google consent screen
  2. GET  /api/auth/google/callback → exchange code → JWT → redirect to frontend
  3. Frontend /auth/callback        → reads ?token= from URL, stores in Zustand

No extra OAuth library needed — Google's token endpoint is a plain HTTPS POST
which httpx (already a dependency) handles fine.
"""
from __future__ import annotations

import urllib.parse
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import CurrentUser, DBDep, create_access_token
from config import settings
from database import get_db
from models import User

router = APIRouter()

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Google OAuth constants ─────────────────────────────────────────────────────

_GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v3/userinfo"
_SCOPES           = "openid email profile"


# ── Schemas ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id:    str
    email: str
    name:  str
    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user:  UserOut


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_or_create_google_user(
    db: AsyncSession,
    email: str,
    name: str,
) -> User:
    """Find an existing user by email or create one for Google sign-in."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user:
        return user

    # New user via Google — no password (empty hash, can't log in via password)
    user = User(
        email=email.lower(),
        hashed_password="",   # cannot be used for password login
        name=name or email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Email / password endpoints ─────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DBDep):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists",
        )

    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    user = User(
        email=body.email.lower(),
        hashed_password=_pwd.hash(body.password),
        name=body.name.strip(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: DBDep):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not _pwd.verify(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser):
    return UserOut.model_validate(current_user)


# ── Google OAuth 2.0 endpoints ─────────────────────────────────────────────────

@router.get("/google")
async def google_login():
    """
    Redirect the browser to Google's OAuth consent screen.
    The frontend links directly to this backend URL.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    params = urllib.parse.urlencode({
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         _SCOPES,
        "access_type":   "online",
        "prompt":        "select_account",
    })
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
async def google_callback(code: str, db: DBDep, error: str | None = None):
    """
    Google redirects here with ?code=... after the user consents.
    We exchange the code for tokens, fetch the user profile, and issue a JWT.
    Then redirect the browser to the frontend /auth/callback?token=<jwt>
    so JavaScript can store it in localStorage.
    """
    if error:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error={urllib.parse.quote(error)}"
        )

    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        try:
            token_resp = await client.post(
                _GOOGLE_TOKEN_URL,
                data={
                    "code":          code,
                    "client_id":     settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
                    "grant_type":    "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()
        except Exception as exc:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/login?error={urllib.parse.quote(str(exc))}"
            )

        access_token = tokens.get("access_token")
        if not access_token:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/login?error=no_access_token"
            )

        # Fetch user profile from Google
        try:
            info_resp = await client.get(
                _GOOGLE_USERINFO,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info_resp.raise_for_status()
            info = info_resp.json()
        except Exception as exc:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/login?error={urllib.parse.quote(str(exc))}"
            )

    email = info.get("email", "")
    name  = info.get("name") or info.get("given_name") or email.split("@")[0]

    if not email:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=no_email_from_google"
        )

    user = await _get_or_create_google_user(db, email, name)
    jwt  = create_access_token(str(user.id))

    # Redirect to frontend callback page — it reads ?token= and stores it
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?token={urllib.parse.quote(jwt)}"
    )
