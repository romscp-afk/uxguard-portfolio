from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "UXguard Portfolio API"
    debug: bool = True
    database_url: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent / 'uxguard.db'}"
    jwt_secret: str = "uxguard-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    upload_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    max_upload_size_mb: int = 25
    cors_origins: list[str] = ["http://localhost:5174", "http://127.0.0.1:5174"]
    seed_on_startup: bool = True
    port: int = 8001

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
