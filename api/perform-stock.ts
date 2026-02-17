import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

interface UpdatedProductResult {
    quantity_current: number
}

type SubscriptionRow = {
    telegram_chats: { chat_id: number } | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { p_product_id, p_action, p_qty, p_user_id = null, p_note = null } = req.body
    if (!p_product_id || !p_action || !p_qty) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!SUPABASE_URL || !SERVICE_KEY) {
        return res.status(500).json({ error: 'Supabase configuration missing on server' })
    }

    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/perform_stock_transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ p_product_id, p_action, p_qty, p_user_id, p_note }),
        })

        const data = await resp.json()
        if (!resp.ok) return res.status(resp.status).json({ error: data })

        // Send Telegram notification if bot is configured
        if (TELEGRAM_BOT_TOKEN) {
            try {
                await notifyTelegramSubscribers(
                    SUPABASE_URL,
                    SERVICE_KEY,
                    TELEGRAM_BOT_TOKEN,
                    p_product_id,
                    p_action,
                    p_qty,
                    p_note,
                    data
                ).catch(err => console.error('Failed to send Telegram notification:', err))
            } catch (telegramErr) {
                console.error('Telegram notification error:', telegramErr)
                // Don't fail the stock transaction if notification fails
            }
        }

        return res.status(200).json(data)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return res.status(500).json({ error: message })
    }
}

async function notifyTelegramSubscribers(
    supabaseUrl: string,
    serviceKey: string,
    botToken: string,
    productId: string,
    action: string,
    qty: number,
    note: string | null,
    updatedProduct: UpdatedProductResult
) {
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get product details
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

    if (!product) return

    // Get subscribed chats
    const { data: subscriptions } = await supabase
        .from('telegram_subscriptions')
        .select('telegram_chats(chat_id)')
        .eq('is_active', true)
        .or(`notification_type.eq.ALL,notification_type.eq.STOCK_${action},product_id.eq.${productId}`)

    if (!subscriptions || subscriptions.length === 0) return

    const emoji = action === 'IN' ? '📦' : '📤'
    const actionLabel = action === 'IN' ? 'Stock In' : 'Stock Out'

    const message = `
${emoji} <b>${actionLabel}</b>

<b>Product:</b> ${product.name}
<b>Code:</b> <code>${product.product_code}</code>

<b>Quantity:</b> ${qty} unit${qty > 1 ? 's' : ''}
<b>Current Stock:</b> ${updatedProduct.quantity_current}
${note ? `<b>Note:</b> ${note}` : ''}
`.trim()

    // Send to all subscribed chats
    const chatIds = subscriptions
        .map((sub: SubscriptionRow) => sub.telegram_chats?.chat_id)
        .filter(Boolean)

    for (const chatId of chatIds) {
        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                }),
            })
        } catch (err) {
            console.error(`Failed to notify chat ${chatId}:`, err)
        }
    }
}
