from __future__ import annotations

from typing import Any, Iterable

from supabase import Client, create_client


class SupabaseRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self.client: Client = create_client(supabase_url, service_role_key)

    def upsert_chat(self, chat: dict[str, Any]) -> None:
        self.client.table("telegram_chats").upsert(chat, on_conflict="chat_id").execute()

    def get_product(self, product_id: str) -> dict[str, Any] | None:
        data = (
            self.client.table("products")
            .select("*")
            .eq("id", product_id)
            .limit(1)
            .execute()
            .data
        )
        return data[0] if data else None

    def get_transaction(self, transaction_id: str) -> dict[str, Any] | None:
        data = (
            self.client.table("stock_transactions")
            .select("*")
            .eq("id", transaction_id)
            .limit(1)
            .execute()
            .data
        )
        return data[0] if data else None

    def list_subscriptions(self, chat_id: int) -> list[dict[str, Any]]:
        return (
            self.client.table("telegram_subscriptions")
            .select("id,notification_type,product_id,products(name)")
            .eq("chat_id", chat_id)
            .eq("is_active", True)
            .execute()
            .data
            or []
        )

    def add_subscription(self, chat_id: int, notification_type: str, product_id: str | None) -> None:
        payload = {
            "chat_id": chat_id,
            "notification_type": notification_type,
            "product_id": product_id,
            "is_active": True,
        }
        self.client.table("telegram_subscriptions").upsert(
            payload,
            on_conflict="chat_id,notification_type,product_id",
        ).execute()

    def remove_subscriptions(self, chat_id: int, notification_type: str | None = None) -> None:
        query = self.client.table("telegram_subscriptions").delete().eq("chat_id", chat_id)
        if notification_type:
            query = query.eq("notification_type", notification_type)
        query.execute()

    def get_subscribed_chat_ids(self, notification_type: str, product_id: str | None) -> list[int]:
        query = (
            self.client.table("telegram_subscriptions")
            .select("chat_id")
            .eq("is_active", True)
            .or_(
                f"notification_type.eq.ALL,notification_type.eq.{notification_type}"
                + (f",product_id.eq.{product_id}" if product_id else "")
            )
        )
        rows = query.execute().data or []
        ids = {int(row["chat_id"]) for row in rows if row.get("chat_id") is not None}
        return list(ids)

    def log_notification(
        self,
        chat_id: int,
        notification_type: str,
        message_text: str,
        status: str,
        product_id: str | None = None,
        message_id: int | None = None,
        error_message: str | None = None,
    ) -> None:
        self.client.table("telegram_notifications_log").insert(
            {
                "chat_id": chat_id,
                "notification_type": notification_type,
                "product_id": product_id,
                "message_text": message_text,
                "status": status,
                "message_id": message_id,
                "error_message": error_message,
            }
        ).execute()

    def product_exists(self, product_id: str) -> bool:
        return self.get_product(product_id) is not None

    @staticmethod
    def format_subscription_lines(subscriptions: Iterable[dict[str, Any]]) -> list[str]:
        lines: list[str] = []
        for sub in subscriptions:
            if sub.get("product_id"):
                products = sub.get("products") or []
                product_name = products[0]["name"] if products and products[0].get("name") else sub["product_id"]
                lines.append(f"• Product: {product_name}")
            else:
                lines.append(f"• {str(sub['notification_type']).replace('_', ' ').title()}")
        return lines
