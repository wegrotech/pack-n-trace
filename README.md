# Pack-n-Trace

Inventory app with:
- React/Vite frontend
- Supabase database
- Python-only Telegram bot integration

## Frontend

```bash
npm install
npm run dev
```

## Python Telegram Bot

Telegram integration is implemented only in `python/telegram_bot`.

### Run locally

```bash
cd python/telegram_bot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Environment variables (Python service)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `SUPABASE_EVENT_SECRET`

### Supabase trigger callback migration

Apply:

- `supabase/migrations/20260217_telegram_bot_setup.sql`
- `supabase/migrations/20260218_telegram_event_triggers.sql`

Set DB settings used by trigger callbacks:

```sql
alter database postgres set "app.settings.python_webhook_url" = 'https://<your-python-host>';
alter database postgres set "app.settings.supabase_event_secret" = '<shared-secret>';
```

### Telegram webhook

Set webhook to Python endpoint:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<your-python-host>/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

## Removed TypeScript Telegram Endpoints

These no longer exist:
- `POST /api/telegram-webhook`
- `POST /api/telegram-notify?action=*`
