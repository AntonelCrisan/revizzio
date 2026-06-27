from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    database_url: str
    database_echo: bool = False
    database_pool_size: int = Field(default=5, ge=1, le=50)
    database_max_overflow: int = Field(default=10, ge=0, le=100)

    session_secret: SecretStr
    session_cookie_name: str = "revizzio_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_cookie_domain: str | None = None
    session_ttl_hours: int = Field(default=24, ge=1, le=168)
    remember_session_ttl_days: int = Field(default=30, ge=1, le=365)
    terms_version: str = "2026-06-11"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use PostgreSQL with the asyncpg driver."
            )

        try:
            url = make_url(value)
            port = url.port
        except (ArgumentError, ValueError) as exc:
            raise ValueError("DATABASE_URL is not a valid database URL.") from exc

        if not url.username or not url.host or not url.database:
            raise ValueError(
                "DATABASE_URL must include a username, host and database name."
            )
        if "@" in url.host:
            raise ValueError(
                "DATABASE_URL contains an unescaped '@' in the password. "
                "Use '%40' instead."
            )
        if port is None:
            raise ValueError("DATABASE_URL must include the PostgreSQL port.")

        return value

    @field_validator("session_secret")
    @classmethod
    def validate_session_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("SESSION_SECRET must contain at least 32 characters.")
        return value

    @field_validator("session_cookie_domain", mode="before")
    @classmethod
    def empty_cookie_domain_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @model_validator(mode="after")
    def validate_session_cookie_security(self) -> Settings:
        if self.session_cookie_samesite == "none" and not self.session_cookie_secure:
            raise ValueError(
                "SESSION_COOKIE_SECURE must be true when "
                "SESSION_COOKIE_SAMESITE is none."
            )
        if self.environment == "production":
            if not self.session_cookie_secure:
                raise ValueError("SESSION_COOKIE_SECURE must be true in production.")
            if (
                self.session_secret.get_secret_value()
                == "replace-with-at-least-32-random-characters"
            ):
                raise ValueError("SESSION_SECRET must be changed in production.")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
