from __future__ import annotations

from html import escape
from typing import Any


def stock_message(product: dict[str, Any], action: str, qty: int, note: str | None) -> str:
    is_in = action.upper() == "IN"
    action_label = "Stock In" if is_in else "Stock Out"
    icon = "📦" if is_in else "📤"

    product_name = escape(str(product.get("name", "Unknown")))
    product_code = escape(str(product.get("product_code", "-")))
    quantity_current = product.get("quantity_current", "-")
    note_line = f"\n<b>Note:</b> {escape(note)}" if note else ""

    return (
        f"{icon} <b>{action_label}</b>\n\n"
        f"<b>Product:</b> {product_name}\n"
        f"<b>Code:</b> <code>{product_code}</code>\n\n"
        f"<b>Quantity:</b> {qty}\n"
        f"<b>Current Stock:</b> {quantity_current}"
        f"{note_line}"
    )


def new_product_message(product: dict[str, Any]) -> str:
    product_name = escape(str(product.get("name", "Unknown")))
    product_code = escape(str(product.get("product_code", "-")))
    price = product.get("price", 0)
    quantity_current = product.get("quantity_current", 0)

    return (
        "✨ <b>New Product Added</b>\n\n"
        f"<b>Product:</b> {product_name}\n"
        f"<b>Code:</b> <code>{product_code}</code>\n"
        f"<b>Price:</b> ${price}\n"
        f"<b>Initial Stock:</b> {quantity_current}"
    )
