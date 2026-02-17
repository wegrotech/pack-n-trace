# Telegram Bot - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Your Bot Token (2 mins)
1. Open Telegram
2. Search for `@BotFather` and start the chat
3. Send `/newbot`
4. Choose a name (e.g., "Pack n Trace Bot")
5. Choose a username (must end with "bot", e.g., "pack_trace_bot")
6. Copy the token you receive

### Step 2: Add Token to Environment (1 min)
Create or update `.env` file:
```env
TELEGRAM_BOT_TOKEN=paste_your_token_here
```

### Step 3: Deploy & Setup (2 mins)

**If using Vercel:**
1. Add `TELEGRAM_BOT_TOKEN` to Vercel project settings
2. Redeploy or let it auto-deploy
3. Done! Your bot is live

**If using local development:**
1. Restart your dev server
2. Use ngrok: `ngrok http 3000`
3. Update `.env`: `TELEGRAM_WEBHOOK_URL=https://your-ngrok-url/api/telegram-webhook`

### Step 4: Test It
1. Find your bot on Telegram: `@your_bot_username`
2. Click "Start"
3. Send `/help` to see commands
4. Send `/subscribe all` to get all updates
5. Make a stock transaction to see notification in real-time!

## Key Commands Users Need

```
/start           - Start the bot
/subscribe all   - Get all notifications
/subscribe stock_in - Only stock in
/subscribe stock_out - Only stock out
/subscribe new_product - New products
/list            - Show subscriptions
/unsubscribe all - Stop all notifications
/help            - Show all commands
```

## Common Issues

### Bot not responding
- Check TELEGRAM_BOT_TOKEN is correct
- Verify server is running/deployed
- Try `/start` command again

### No notifications
- Make sure you're subscribed: `/subscribe all`
- Check database has subscriptions: `SELECT * FROM telegram_subscriptions`
- Try making a stock transaction

### Bot not found on Telegram
- Check username ends with "bot"
- Verify bot is active in BotFather: `/mybots` → select bot → check active

## Next Steps

1. Add TelegramBotSettings component to your admin panel
2. Create a page for users to manage their subscriptions
3. Set up regular notifications for other inventory events
4. Add telegram notifications to product creation

## Documentation

- **Detailed Setup**: See `TELEGRAM_SETUP.md`
- **Full Implementation**: See `TELEGRAM_BOT_IMPLEMENTATION.md`
- **Code Examples**: See `src/integrations/telegram/notifier.ts`

## Support

If something isn't working:
1. Check browser console for errors
2. Check Vercel logs (Real-time tab)
3. Check `telegram_notifications_log` table for failed sends
4. Try the test notification button in settings
