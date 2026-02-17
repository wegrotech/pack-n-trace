import { createClient } from '@supabase/supabase-js'

interface NotificationOptions {
    chatId?: number
    chatIds?: number[]
    text: string
}

interface Product {
    id: string
    name: string
    product_code: string
    quantity_current: number
    price: number
}

interface StockTransaction {
    id: string
    product_id: string
    action: 'IN' | 'OUT'
    qty: number
    note?: string
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export async function sendTelegramNotification(options: NotificationOptions): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('Missing TELEGRAM_BOT_TOKEN')
        return false
    }

    try {
        const chatIds = options.chatIds || (options.chatId ? [options.chatId] : [])

        if (chatIds.length === 0) {
            console.warn('No chat IDs provided for notification')
            return false
        }

        let successCount = 0
        const errors: Error[] = []

        for (const chatId of chatIds) {
            try {
                const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: options.text,
                        parse_mode: 'HTML',
                    }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    errors.push(new Error(`Telegram API error for chat ${chatId}: ${error.description}`))
                    continue
                }

                const data = await response.json()
                successCount++

                // Log successful notification
                await logNotification(chatId, options.text, 'sent', data.result?.message_id)
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error))
                errors.push(err)
                await logNotification(chatId, options.text, 'failed', undefined, err.message)
            }
        }

        if (errors.length > 0) {
            console.error('Errors sending notifications:', errors)
        }

        return successCount > 0
    } catch (error) {
        console.error('Error sending Telegram notifications:', error)
        return false
    }
}

export async function notifyStockMovement(
    product: Product,
    transaction: StockTransaction
): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) {
        console.error('Missing Supabase server env vars')
        return false
    }

    try {
        const action = transaction.action === 'IN' ? '📦 Stock In' : '📤 Stock Out'
        const emoji = transaction.action === 'IN' ? '⬆️' : '⬇️'

        const message = `
${emoji} <b>${action}</b>

<b>Product:</b> ${product.name}
<b>Code:</b> <code>${product.product_code}</code>

<b>Quantity:</b> ${transaction.qty} unit${transaction.qty > 1 ? 's' : ''}
<b>Current Stock:</b> ${product.quantity_current}
${transaction.note ? `<b>Note:</b> ${transaction.note}` : ''}
`.trim()

        // Get subscribed chats for this stock movement
        const { data: subscriptions } = await supabase
            .from('telegram_subscriptions')
            .select('chat_id')
            .eq('is_active', true)
            .or(
                `notification_type.eq.ALL,notification_type.eq.STOCK_${transaction.action},product_id.eq.${product.id}`
            )

        if (!subscriptions || subscriptions.length === 0) {
            console.log('No subscriptions for this stock movement')
            return true
        }

        const chatIds = subscriptions.map(sub => sub.chat_id)
        return await sendTelegramNotification({
            chatIds,
            text: message,
        })
    } catch (error) {
        console.error('Error notifying stock movement:', error)
        return false
    }
}

export async function notifyNewProduct(product: Product): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) {
        console.error('Missing Supabase server env vars')
        return false
    }

    try {
        const message = `
✨ <b>New Product Added</b>

<b>Product:</b> ${product.name}
<b>Code:</b> <code>${product.product_code}</code>
<b>Price:</b> $${product.price.toFixed(2)}
<b>Initial Stock:</b> ${product.quantity_current} unit${product.quantity_current !== 1 ? 's' : ''}
`.trim()

        // Get subscribed chats for new products
        const { data: subscriptions } = await supabase
            .from('telegram_subscriptions')
            .select('chat_id')
            .eq('is_active', true)
            .or('notification_type.eq.ALL,notification_type.eq.NEW_PRODUCT')

        if (!subscriptions || subscriptions.length === 0) {
            console.log('No subscriptions for new products')
            return true
        }

        const chatIds = subscriptions.map(sub => sub.chat_id)
        return await sendTelegramNotification({
            chatIds,
            text: message,
        })
    } catch (error) {
        console.error('Error notifying new product:', error)
        return false
    }
}

async function logNotification(
    chatId: number,
    messageText: string,
    status: string,
    messageId?: number,
    errorMessage?: string
) {
    const supabase = getSupabaseClient()
    if (!supabase) return

    try {
        await supabase.from('telegram_notifications_log').insert({
            chat_id: chatId,
            message_id: messageId || null,
            notification_type: 'ALL',
            message_text: messageText,
            status,
            error_message: errorMessage || null,
        })
    } catch (error) {
        console.error('Error logging notification:', error)
    }
}
