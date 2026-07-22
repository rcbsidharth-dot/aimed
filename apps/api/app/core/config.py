from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Doctor in a Box"
    environment: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    cors_origins: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./aidoctor.db"
    redis_url: str = "redis://localhost:6379"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    groq_api_key: str = ""
    openrouter_api_key: str = ""
    google_maps_api_key: str = ""

    mock_ai: bool = True
    rate_limit_per_minute: int = 60
    admin_emails: str = "admin@example.com"

    primary_llm: str = "llama-3.3-70b-versatile"
    fallback_models: str = "google/gemma-3-27b-it,deepseek/deepseek-r1,qwen/qwen3-32b"
    vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_list(self) -> List[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def fallback_model_list(self) -> List[str]:
        return [m.strip() for m in self.fallback_models.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
