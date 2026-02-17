from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request

from config import Settings, load_settings
from message_templates import new_product_message, stock_message
from supabase_repo import SupabaseRepo
from telegram_client import TelegramClient


app = FastAPI(title="Pack-n-Trace Telegram Bot")
settings: Settings = load_settings()
repo = SupabaseRepo(settings.supabase_url, settings.supabase_service_role_key)
telegram = TelegramClient(settings.telegram_bot_token)

_idempotency_window_seconds = 180
_event_cache: dict[str, float] = {}


def _is_duplicate(key: str) -> bool:
    now = time.time()
    expired = [k for k, ts in _event_cache.items() if now - ts > _idempotency_window_seconds]
    for k in expired:
        _event_cache.pop(k, None)
    if key in _event_cache:
        return True
    _event_cache[key] = now
    return False


async def _reply(chat_id: int, text: str) -> None:
    await telegram.send_message(chat_id, text)


def _parse_subscription_arg(arg: str) -> tuple[str, str | None] | None:
    value = arg.lower().strip()
    mapping = {
        "all": ("ALL", None),
        "stock_in": ("STOCK_IN", None),
        "stock_out": ("STOCK_OUT", None),
        "new_product": ("NEW_PRODUCT", None),
    }
    if value in mapping:
        return mapping[value]
    if value.startswith("product_"):
        return "ALL", value.replace("product_", "", 1)
    return None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid telegram webhook secret")

    update = await request.json()
    message = update.get("message")
    if not message:
        return {"ok": True}

    chat = message.get("chat", {})
    text = str(message.get("text", "")).strip()
    chat_id = int(chat.get("id"))

    repo.upsert_chat(
        {
            "chat_id": chat_id,
            "chat_type": chat.get("type", "private"),
            "chat_title": chat.get("title"),
            "first_name": chat.get("first_name"),
            "last_name": chat.get("last_name"),
            "username": chat.get("username"),
            "is_active": True,
        }
    )

    if not text:
        return {"ok": True}

    parts = text.split()
    command = parts[0].lower()
    args = parts[1:]

    if command == "/start":
        await _reply(
            chat_id,
            "🤖 <b>Pack n Trace Bot</b>\n\nUse /help for commands and /subscribe all to receive updates.",
        )
    elif command == "/help":
        await _reply(
            chat_id,
            (
                "<b>Commands</b>\n\n"
                "/start\n"
                "/help\n"
                "/subscribe all|stock_in|stock_out|new_product|product_<PRODUCT_ID>\n"
                "/unsubscribe all|stock_in|stock_out|new_product\n"
                "/list"
            ),
        )
    elif command == "/subscribe":
        if not args:
            await _reply(chat_id, "❌ Usage: /subscribe all|stock_in|stock_out|new_product|product_<PRODUCT_ID>")
            return {"ok": True}
        parsed = _parse_subscription_arg(args[0])
        if not parsed:
            await _reply(chat_id, "❌ Invalid subscription type.")
            return {"ok": True}
        notif_type, product_id = parsed
        if product_id and not repo.product_exists(product_id):
            await _reply(chat_id, "❌ Product not found.")
            return {"ok": True}
        repo.add_subscription(chat_id, notif_type, product_id)
        await _reply(chat_id, "✅ Subscription saved.")
    elif command == "/unsubscribe":
        if not args or args[0].lower() == "all":
            repo.remove_subscriptions(chat_id)
            await _reply(chat_id, "✅ Unsubscribed from all notifications.")
        else:
            parsed = _parse_subscription_arg(args[0])
            if not parsed:
                await _reply(chat_id, "❌ Invalid unsubscribe target.")
                return {"ok": True}
            notif_type, _ = parsed
            repo.remove_subscriptions(chat_id, notif_type)
            await _reply(chat_id, f"✅ Unsubscribed from {notif_type}.")
    elif command == "/list":
        subs = repo.list_subscriptions(chat_id)
        if not subs:
            await _reply(chat_id, "📭 You have no active subscriptions.")
        else:
            lines = repo.format_subscription_lines(subs)
            await _reply(chat_id, "<b>Your Subscriptions:</b>\n\n" + "\n".join(lines))
    else:
        await _reply(chat_id, "Unknown command. Type /help")

    return {"ok": True}


@app.post("/supabase/events")
async def supabase_event(
    request: Request,
    x_webhook_secret: str | None = Header(default=None),
) -> dict[str, bool]:
    if x_webhook_secret != settings.supabase_event_secret:
        raise HTTPException(status_code=401, detail="Invalid Supabase event secret")

    payload: dict[str, Any] = await request.json()
    event_type = str(payload.get("event_type", "")).lower()
    product_id = payload.get("product_id")
    transaction_id = payload.get("transaction_id")

    if event_type == "stock_transaction":
        if not product_id or not transaction_id:
            return {"ok": True}
        transaction = repo.get_transaction(str(transaction_id))
        product = repo.get_product(str(product_id))
        if not transaction or not product:
            return {"ok": True}
        action = str(transaction.get("action", "IN")).upper()
        notif_type = "STOCK_IN" if action == "IN" else "STOCK_OUT"
        message = stock_message(
            product=product,
            action=action,
            qty=int(transaction.get("qty", 0)),
            note=transaction.get("note"),
        )
    elif event_type == "new_product":
        if not product_id:
            return {"ok": True}
        product = repo.get_product(str(product_id))
        if not product:
            return {"ok": True}
        notif_type = "NEW_PRODUCT"
        message = new_product_message(product)
    else:
        return {"ok": True}

    chat_ids = repo.get_subscribed_chat_ids(notif_type, str(product_id) if product_id else None)
    for chat_id in chat_ids:
        dedupe_key = f"{event_type}:{transaction_id or product_id}:{chat_id}"
        if _is_duplicate(dedupe_key):
            continue
        try:
            result = await telegram.send_message(chat_id=chat_id, text=message)
            message_id = result.get("result", {}).get("message_id")
            repo.log_notification(
                chat_id=chat_id,
                notification_type=notif_type,
                product_id=str(product_id) if product_id else None,
                message_text=message,
                status="sent",
                message_id=message_id,
            )
        except Exception as exc:  # noqa: BLE001
            repo.log_notification(
                chat_id=chat_id,
                notification_type=notif_type,
                product_id=str(product_id) if product_id else None,
                message_text=message,
                status="failed",
                error_message=str(exc),
            )

    return {"ok": True}
