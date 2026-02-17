-- Python Telegram integration trigger callbacks
-- Required DB settings:
--   alter database postgres set "app.settings.python_webhook_url" = 'https://<your-python-host>';
--   alter database postgres set "app.settings.supabase_event_secret" = '<shared-secret>';

create extension if not exists pg_net;

create or replace function public.notify_telegram_stock_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text := current_setting('app.settings.python_webhook_url', true);
  v_secret text := current_setting('app.settings.supabase_event_secret', true);
  v_payload jsonb;
begin
  if v_base_url is null or length(trim(v_base_url)) = 0 then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'event_type', 'stock_transaction',
    'transaction_id', new.id,
    'product_id', new.product_id,
    'action', new.action,
    'qty', new.qty,
    'created_at', new.created_at
  );

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/supabase/events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body := v_payload
  );

  return new;
exception
  when others then
    raise warning 'notify_telegram_stock_event failed: %', sqlerrm;
    return new;
end;
$$;

create or replace function public.notify_telegram_product_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text := current_setting('app.settings.python_webhook_url', true);
  v_secret text := current_setting('app.settings.supabase_event_secret', true);
  v_payload jsonb;
begin
  if v_base_url is null or length(trim(v_base_url)) = 0 then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'event_type', 'new_product',
    'product_id', new.id,
    'created_at', new.created_at
  );

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/supabase/events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body := v_payload
  );

  return new;
exception
  when others then
    raise warning 'notify_telegram_product_event failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_notify_telegram_stock_event on public.stock_transactions;
create trigger trg_notify_telegram_stock_event
after insert on public.stock_transactions
for each row execute function public.notify_telegram_stock_event();

drop trigger if exists trg_notify_telegram_product_event on public.products;
create trigger trg_notify_telegram_product_event
after insert on public.products
for each row execute function public.notify_telegram_product_event();
