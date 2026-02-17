from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    telegram_bot_token: str
    telegram_webhook_secret: str
    supabase_event_secret: str


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def load_settings() -> Settings:
    return Settings(
        supabase_url=_require_env("SUPABASE_URL"),
        supabase_service_role_key=_require_env("SUPABASE_SERVICE_ROLE_KEY"),
        telegram_bot_token=_require_env("TELEGRAM_BOT_TOKEN"),
        telegram_webhook_secret=_require_env("TELEGRAM_WEBHOOK_SECRET"),
        supabase_event_secret=_require_env("SUPABASE_EVENT_SECRET"),
    )
