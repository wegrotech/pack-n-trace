-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('STOCK_IN', 'STOCK_OUT', 'NEW_PRODUCT', 'ALL');

-- Telegram chat subscriptions table
CREATE TABLE public.telegram_chats (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    chat_type VARCHAR(20) NOT NULL,  -- 'private', 'group', 'supergroup', 'channel'
    chat_title VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    username VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view telegram chats" ON public.telegram_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert telegram chats" ON public.telegram_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update telegram chats" ON public.telegram_chats FOR UPDATE USING (true);

-- Telegram subscriptions table
CREATE TABLE public.telegram_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL REFERENCES public.telegram_chats(chat_id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL DEFAULT 'ALL',
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,  -- NULL means all products
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(chat_id, notification_type, product_id)
);

ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subscriptions" ON public.telegram_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subscriptions" ON public.telegram_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subscriptions" ON public.telegram_subscriptions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subscriptions" ON public.telegram_subscriptions FOR DELETE USING (true);

-- Telegram notifications log table (for debugging and tracking)
CREATE TABLE public.telegram_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL,
    message_id BIGINT,
    notification_type notification_type NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,  -- 'pending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view notifications log" ON public.telegram_notifications_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications log" ON public.telegram_notifications_log FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_telegram_chat_id ON public.telegram_chats(chat_id);
CREATE INDEX idx_telegram_chat_active ON public.telegram_chats(is_active);
CREATE INDEX idx_subscription_chat ON public.telegram_subscriptions(chat_id);
CREATE INDEX idx_subscription_type ON public.telegram_subscriptions(notification_type);
CREATE INDEX idx_subscription_product ON public.telegram_subscriptions(product_id);
CREATE INDEX idx_notification_log_chat ON public.telegram_notifications_log(chat_id);
CREATE INDEX idx_notification_log_type ON public.telegram_notifications_log(notification_type);
CREATE INDEX idx_notification_log_created ON public.telegram_notifications_log(created_at);

-- Auto-update timestamps
CREATE TRIGGER update_telegram_chats_updated_at BEFORE UPDATE ON public.telegram_chats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telegram_subscriptions_updated_at BEFORE UPDATE ON public.telegram_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get all subscribed chats for an event
CREATE OR REPLACE FUNCTION public.get_subscribed_chats(
    p_notification_type notification_type,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE(chat_id BIGINT, chat_type VARCHAR, chat_title VARCHAR)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT tc.chat_id, tc.chat_type, tc.chat_title
    FROM public.telegram_subscriptions ts
    JOIN public.telegram_chats tc ON ts.chat_id = tc.chat_id
    WHERE tc.is_active = TRUE 
    AND ts.is_active = TRUE
    AND (
        ts.notification_type = 'ALL'
        OR ts.notification_type = p_notification_type
        OR (p_product_id IS NOT NULL AND ts.product_id = p_product_id)
    )
$$;
