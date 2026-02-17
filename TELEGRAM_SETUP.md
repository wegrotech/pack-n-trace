# Telegram Bot Setup Guide

## Overview
This Telegram bot integrates with your Pack n Trace database to send real-time notifications about:
- Stock in/out events
- New product listings  
- User/group subscriptions

## Prerequisites
1. Telegram account
2. BotFather access in Telegram ([@BotFather](https://t.me/botfather))
3. Environment variables configured

## Step 1: Create Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Start the chat and use `/newbot`
3. Follow the prompts:
   - Name: e.g., "Pack n Trace Bot"
   - Username: e.g., "pack_n_trace_bot" (must be unique and end with "bot")
4. Copy the bot token provided (looks like: `123456789:ABCdefGHIJKlmnoPQRstuvwXYZCrGTE_9`)

## Step 2: Configure Environment Variables
Add to your `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.vercel.app/api/telegram-webhook
```

## Step 3: Setup Webhook
Make a POST request to setup the webhook:
```bash
curl -X POST https://your-domain.vercel.app/api/telegram-notify?action=setup-webhook
```

Or from your admin panel:
```typescript
const response = await fetch('/api/telegram-notify?action=setup-webhook', {
  method: 'POST',
})
const data = await response.json()
console.log(data)
```

## Step 4: Add Bot to Groups/Users
- Users can find your bot by username (e.g., @pack_n_trace_bot)
- Click "Start" to begin
- Use `/help` to see available commands

## Available Commands

### Subscription Commands
- `/subscribe all` - Subscribe to all notifications
- `/subscribe stock_in` - Stock in notifications only
- `/subscribe stock_out` - Stock out notifications only
- `/subscribe new_product` - New product notifications only
- `/subscribe product_<PRODUCT_ID>` - Notifications for specific product

### Management Commands
- `/list` - Show current subscriptions
- `/unsubscribe <TYPE>` - Unsubscribe from specific type
- `/unsubscribe all` - Unsubscribe from everything
- `/help` - Show help message

## Testing Notifications

### Test Stock Movement
```bash
curl -X POST https://your-domain.vercel.app/api/telegram-notify?action=notify-stock-in \
  -H "Content-Type: application/json" \
  -d '{"productId": "your-product-id"}'
```

### Test New Product
```bash
curl -X POST https://your-domain.vercel.app/api/telegram-notify?action=notify-new-product \
  -H "Content-Type: application/json" \
  -d '{"productId": "your-product-id"}'
```

## Integration with Your App

### Automatic Notifications on Stock Changes
When you perform a stock transaction via `api/perform-stock.ts`, add this code to trigger telegram notifications:

```typescript
// After successful stock transaction
import { notifyStockMovement } from "@/integrations/telegram/notifier";

const result = await performStockTransaction(...)
await notifyStockMovement(product, transaction)
```

### Automatic Notifications on New Product
When creating a new product:

```typescript
import { notifyNewProduct } from "@/integrations/telegram/notifier";

const newProduct = await createProduct(...)
await notifyNewProduct(newProduct)
```

## Database Schema

### telegram_chats
Stores chat information for users and groups

### telegram_subscriptions
Manages what notifications each chat receives
- **notification_type**: ALL, STOCK_IN, STOCK_OUT, NEW_PRODUCT
- **product_id**: Optional - for product-specific subscriptions

### telegram_notifications_log
Logs all notification sending attempts for debugging

## Troubleshooting

### Webhook not receiving updates
1. Verify webhook URL is correct: `TELEGRAM_WEBHOOK_URL`
2. Make sure domain is publicly accessible
3. Check API logs for any errors

### No notifications sent despite subscriptions
1. Verify chat_id is saved correctly in `telegram_chats`
2. Check `telegram_subscriptions` table for active subscriptions
3. Review `telegram_notifications_log` for errors

### Bot not responding to commands
1. Verify bot token is correct
2. Run `/help` command in Telegram
3. Check server logs for webhook processing errors

## Environment Variables Reference

```env
# Required
TELEGRAM_BOT_TOKEN=<your-bot-token>
VITE_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional
TELEGRAM_WEBHOOK_URL=<your-webhook-url>  # Defaults to https://pack-n-trace.vercel.app/api/telegram-webhook
```
