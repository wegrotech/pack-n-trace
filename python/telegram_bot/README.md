# Python Telegram Bot Service

This service is now the only Telegram implementation for the project.

## Endpoints

- `POST /telegram/webhook`  
  Handles Telegram commands: `/start`, `/help`, `/subscribe`, `/unsubscribe`, `/list`.
- `POST /supabase/events`  
  Receives Supabase DB trigger callbacks for stock/product changes.
- `GET /health`  
  Health check.

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `SUPABASE_EVENT_SECRET`

## Local Run

```bash
cd python/telegram_bot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Telegram Webhook Setup

Use Bot API `setWebhook` with secret token:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<your-python-host>/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

## Supabase Trigger Callback Setup

Apply migration `supabase/migrations/20260218_telegram_event_triggers.sql`.

Then configure DB settings used by the trigger:

```sql
alter database postgres set "app.settings.python_webhook_url" = 'https://<your-python-host>';
alter database postgres set "app.settings.supabase_event_secret" = '<SUPABASE_EVENT_SECRET>';
```
