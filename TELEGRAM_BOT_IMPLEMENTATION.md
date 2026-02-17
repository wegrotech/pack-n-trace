# Telegram Bot Integration - Implementation Summary

## Overview
A complete Telegram bot has been integrated with your Pack n Trace application to send real-time notifications about:
- **Stock In/Out Events** - Immediate alerts when inventory changes
- **New Product Listings** - Notifications when new products are added
- **Subscription Management** - Users can easily manage their notification preferences

## What Was Created

### 1. Database Schema
**File**: `supabase/migrations/20260217_telegram_bot_setup.sql`
- **telegram_chats**: Stores information about all Telegram users and groups
- **telegram_subscriptions**: Manages what each user/group wants to be notified about
- **telegram_notifications_log**: Audit trail of all sent notifications
- **Helper Functions**: SQL functions for efficient subscription queries

### 2. Backend Services

#### Telegram Webhook Handler
**File**: `api/telegram-webhook.ts`
- Receives messages from Telegram users
- Processes bot commands (/start, /help, /subscribe, /list, /unsubscribe)
- Manages user subscriptions

#### Notification Sender Service
**File**: `src/integrations/telegram/notifier.ts`
- Sends formatted notifications to subscribed chats
- Handles stock movements and new products
- Logs all notification attempts

#### Notification Trigger API
**File**: `api/telegram-notify.ts`
- Setup webhook with Telegram
- Trigger test notifications
- Can be called manually or automatically

#### Enhanced Stock Transaction API
**File**: `api/perform-stock.ts`
- Now automatically triggers Telegram notifications when stock changes
- Sends to all subscribed users/groups
- Doesn't interrupt the transaction if notification fails

### 3. Frontend Components

#### Telegram Bot Settings Page
**File**: `src/components/TelegramBotSettings.tsx`
- Setup instructions
- Configure webhook
- Test notifications
- Display bot information
- Status checks

#### Custom Hooks
**File**: `src/hooks/use-telegram.ts`
- `useTelegramStatus()` - Check bot configuration
- `useTelegramChats()` - List all connected chats
- `useTelegramSubscriptions()` - Get user subscriptions
- `useAddTelegramSubscription()` - Create subscriptions
- `useRemoveTelegramSubscription()` - Remove subscriptions
- `useTelegramNotificationLogs()` - View notification history

### 4. Documentation Files
- **TELEGRAM_SETUP.md** - Complete setup instructions
- **.env.telegram.example** - Environment variables template

## Bot Commands

Users can interact with the bot using these commands:

### Getting Started
- `/start` - Welcome message and overview
- `/help` - List all available commands

### Subscriptions
- `/subscribe all` - Get all notifications
- `/subscribe stock_in` - Only stock in events
- `/subscribe stock_out` - Only stock out events
- `/subscribe new_product` - New product notifications
- `/subscribe product_<PRODUCT_ID>` - Specific product updates
- `/list` - Show current subscriptions
- `/unsubscribe <TYPE>` - Remove specific subscription
- `/unsubscribe all` - Remove all subscriptions

## Database Schema

### telegram_chats
```sql
- id (BIGSERIAL PRIMARY KEY)
- chat_id (BIGINT, UNIQUE)
- chat_type (VARCHAR) -- 'private', 'group', 'supergroup', 'channel'
- chat_title (VARCHAR)
- first_name, last_name, username (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

### telegram_subscriptions
```sql
- id (UUID PRIMARY KEY)
- chat_id (BIGINT, FOREIGN KEY to telegram_chats)
- notification_type (ENUM) -- ALL, STOCK_IN, STOCK_OUT, NEW_PRODUCT
- product_id (UUID, nullable FOREIGN KEY)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

### telegram_notifications_log
```sql
- id (UUID PRIMARY KEY)
- chat_id (BIGINT)
- message_id (BIGINT, nullable)
- notification_type (ENUM)
- product_id (UUID, nullable)
- message_text (TEXT)
- status (VARCHAR) -- 'pending', 'sent', 'failed'
- error_message (TEXT, nullable)
- created_at (TIMESTAMPTZ)
```

## Setup Steps

1. **Create Telegram Bot**
   - Talk to @BotFather on Telegram
   - Run `/newbot` and follow instructions
   - Save the bot token

2. **Configure Environment**
   ```env
   TELEGRAM_BOT_TOKEN=<your-bot-token>
   TELEGRAM_BOT_USERNAME=<your-bot-username>
   TELEGRAM_WEBHOOK_URL=https://your-domain.vercel.app/api/telegram-webhook
   ```

3. **Setup Webhook**
   - Go to the Telegram settings page in your app
   - Click "Setup Webhook" button
   - Or call: `POST /api/telegram-notify?action=setup-webhook`

4. **Add Bot to Telegram**
   - Users search for your bot (@username)
   - Click /start to begin
   - Use /subscribe to choose notifications

5. **Test Notifications**
   - Use the test buttons in settings
   - Or make a stock transaction to see live notifications

## API Endpoints

All endpoints are POST requests:

### Setup Webhook
```bash
POST /api/telegram-notify?action=setup-webhook
```

### Send Test Notifications
```bash
POST /api/telegram-notify?action=notify-stock-in
Body: { "productId": "product-uuid" }

POST /api/telegram-notify?action=notify-stock-out
Body: { "productId": "product-uuid" }

POST /api/telegram-notify?action=notify-new-product
Body: { "productId": "product-uuid" }
```

### Stock Transaction (Automatic)
```bash
POST /api/perform-stock
Body: {
  "p_product_id": "product-uuid",
  "p_action": "IN" | "OUT",
  "p_qty": 10,
  "p_note": "Optional note"
}
# Automatically sends Telegram notifications
```

## How Notifications Work

1. **Stock Transaction** → `api/perform-stock.ts`
2. **Queries subscriptions** from `telegram_subscriptions`
3. **Formats message** with product and quantity details
4. **Sends to all subscribed chats** via Telegram API
5. **Logs result** in `telegram_notifications_log`

### Notification Filtering
Users receive notifications based on:
- `notification_type = 'ALL'` → Gets everything
- `notification_type = 'STOCK_IN'` → Gets stock in events
- `notification_type = 'STOCK_OUT'` → Gets stock out events
- `notification_type = 'NEW_PRODUCT'` → Gets new products
- `product_id` specified → Gets updates for that product only

## Integration with Your App

### Add to Dashboard
The TelegramBotSettings component can be added to your dashboard/settings page:

```tsx
import { TelegramBotSettings } from '@/components/TelegramBotSettings'

export function SettingsPage() {
  return <TelegramBotSettings />
}
```

### Trigger Notifications Programmatically
```typescript
import { notifyStockMovement, notifyNewProduct } from '@/integrations/telegram/notifier'

// When stock changes
await notifyStockMovement(product, transaction)

// When product is created
await notifyNewProduct(newProduct)
```

## Troubleshooting

### Bot not receiving messages
- Check TELEGRAM_BOT_TOKEN is correct
- Verify webhook is set up (check Telegram settings page)
- Ensure webhook URL is publicly accessible

### No notifications being sent
- Verify chats are saved in telegram_chats table
- Check telegram_subscriptions has active subscriptions
- Review error logs in telegram_notifications_log

### Users can't find or add bot
- Verify bot username is correct (@username)
- Check bot is active in BotFather
- Ensure bot hasn't been deleted/deactivated

## Files Modified/Created

### New Files
- `supabase/migrations/20260217_telegram_bot_setup.sql`
- `api/telegram-webhook.ts`
- `api/telegram-notify.ts`
- `src/integrations/telegram/notifier.ts`
- `src/components/TelegramBotSettings.tsx`
- `src/hooks/use-telegram.ts`
- `TELEGRAM_SETUP.md`
- `.env.telegram.example`

### Modified Files
- `api/perform-stock.ts` - Added Telegram notification on stock transactions

## Next Steps

1. **Apply Migration**: Run the Telegram migration in Supabase
2. **Set Environment Variables**: Add TELEGRAM_BOT_TOKEN to .env
3. **Test Setup**: Use the Telegram settings page to configure webhook
4. **Add Component**: Integrate TelegramBotSettings into your admin/settings page
5. **Test Notifications**: Perform a stock transaction to test

## Environment Variables Required

```env
# Required
TELEGRAM_BOT_TOKEN=<your-token>
VITE_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Optional
TELEGRAM_BOT_USERNAME=<your-bot-username>
TELEGRAM_WEBHOOK_URL=<your-webhook-url>
```

## Security Notes

- Webhook token validation is built into Telegram's API
- All user data is stored in your Supabase database
- Service role key is only used on the server
- RLS policies allow public read/write for Telegram data (can be restricted)
- Consider adding auth checks if you want admin-only telegram management

## Performance Considerations

- Notifications are sent asynchronously
- Failed notifications are logged for debugging
- Database queries use indexes on common filters
- Webhook handles multiple updates concurrently

## Support & Debugging

Check these files for insights:
- `TELEGRAM_SETUP.md` - Detailed setup guide
- `telegram_notifications_log` table - See what notifications were sent
- Browser console - Client-side errors
- Vercel logs - Server-side errors and webhook processing
- Telegram Bot API exceptions - In notification_log error_message field
