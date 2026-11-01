from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Project metadata
    PROJECT_NAME: str = "JobTrackr API"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = (
        "postgresql://jobtrackr_user:jobtrackr_password@db:5432/jobtrackr_db"
    )
    TEST_DATABASE_URL: Optional[str] = None

    # Security & JWT Tokens
    SECRET_KEY: str = "dev_insecure_secret_key_change_in_production_min_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Default Superadmin Seeding
    ADMIN_EMAIL: str = "admin@jobtrackr.io"
    ADMIN_PASSWORD: str = "Admin@12345"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
