from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: str = "sqlite:///./data/study_ai.db"
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,https://hthuyngan.github.io"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = "dev-insecure-secret-study-ai-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Auth Cookies
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_COOKIE_PATH: str = "/api/v1/auth"

    def model_post_init(self, __context) -> None:
        if self.APP_ENV == "production":
            if (
                not self.JWT_SECRET_KEY
                or self.JWT_SECRET_KEY.startswith("dev-")
                or len(self.JWT_SECRET_KEY) < 32
            ):
                raise ValueError(
                    "Production mode requires a strong, non-default JWT_SECRET_KEY of at least 32 characters"
                )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
