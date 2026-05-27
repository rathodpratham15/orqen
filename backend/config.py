import base64
import hashlib

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://orqen:orqen@localhost:5432/orqen"
    SYNC_DATABASE_URL: str = "postgresql://orqen:orqen@localhost:5432/orqen"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # AI — server-level fallback keys (used when a user hasn't set their own)
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Auth
    APP_SECRET_KEY: str = "change-me"
    # Optional: base64url-encoded 32-byte Fernet key.
    # If empty, derived deterministically from APP_SECRET_KEY (fine for dev).
    ENCRYPTION_KEY: str = ""

    # Legacy / unused
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def fernet(self):
        """Return a Fernet instance for encrypting/decrypting API keys."""
        from cryptography.fernet import Fernet

        key = self.ENCRYPTION_KEY
        if not key:
            # Derive a stable 32-byte key from APP_SECRET_KEY (dev convenience)
            raw = hashlib.sha256(self.APP_SECRET_KEY.encode()).digest()
            key = base64.urlsafe_b64encode(raw).decode()
        return Fernet(key.encode())


settings = Settings()
