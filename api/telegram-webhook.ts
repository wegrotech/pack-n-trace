import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        chat: {
            id: number
            type: string
            title?: string
            first_name?: string
            last_name?: string
            username?: string
        }
        text?: string
        from: {
            id: number
            is_bot: boolean
            first_name: string
            last_name?: string
            username?: string
        }
    }
}

interface TelegramChat {
    chat_id: number
    chat_type: string
    chat_title?: string
    first_name?: string
    last_name?: string
    username?: string
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('Missing TELEGRAM_BOT_TOKEN')
        return false
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error(`Failed to send message to ${chatId}:`, error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error sending Telegram message:', error)
        return false
    }
}

async function handleTelegramMessage(update: TelegramUpdate) {
    if (!update.message) return
    const supabase = getSupabaseClient()
    if (!supabase) {
        console.error('Missing Supabase server env vars')
        return
    }

    const { chat, text } = update.message
    const chatData: TelegramChat = {
        chat_id: chat.id,
        chat_type: chat.type,
        chat_title: chat.title,
        first_name: chat.first_name,
        last_name: chat.last_name,
        username: chat.username,
    }

    // Save or update chat info
    await supabase
        .from('telegram_chats')
        .upsert([chatData], { onConflict: 'chat_id' })
        .catch(err => console.error('Error saving chat:', err))

    // Handle bot commands
    if (!text) return

    const args = text.trim().split(' ')
    const command = args[0].toLowerCase()

    switch (command) {
        case '/start':
            await handleStart(chat.id)
            break
        case '/help':
            await handleHelp(chat.id)
            break
        case '/subscribe':
            await handleSubscribe(chat.id, args.slice(1))
            break
        case '/unsubscribe':
            await handleUnsubscribe(chat.id, args.slice(1))
            break
        case '/list':
            await handleListSubscriptions(chat.id)
            break
        default:
            if (text) {
                await sendTelegramMessage(
                    chat.id,
                    'Unknown command. Type /help for available commands.'
                )
            }
    }
}

async function handleStart(chatId: number) {
    const message = `
🤖 <b>Pack n Trace Bot</b>

Welcome to the Pack n Trace notification bot! You can subscribe to get real-time updates about:
• Stock in/out events
• New product listings

Use /help for all available commands.
  `.trim()

    await sendTelegramMessage(chatId, message)
}

async function handleHelp(chatId: number) {
    const message = `
<b>Available Commands:</b>

/start - Show welcome message
/help - Show this help message

<b>Subscription Management:</b>
/subscribe all - Subscribe to all notifications
/subscribe stock_in - Subscribe to stock in events
/subscribe stock_out - Subscribe to stock out events
/subscribe new_product - Subscribe to new product events
/subscribe product_&lt;PRODUCT_ID&gt; - Subscribe to specific product updates

/unsubscribe all - Unsubscribe from all notifications
/list - Show your current subscriptions
  `.trim()

    await sendTelegramMessage(chatId, message)
}

async function handleSubscribe(chatId: number, args: string[]) {
    const supabase = getSupabaseClient()
    if (!supabase) {
        await sendTelegramMessage(chatId, 'Server configuration error. Please contact admin.')
        return
    }

    if (args.length === 0) {
        await sendTelegramMessage(chatId, '❌ Please specify what to subscribe to. Type /help for options.')
        return
    }

    const subscriptionType = args[0].toLowerCase()

    try {
        // Validate subscription type
        const validTypes = ['all', 'stock_in', 'stock_out', 'new_product']
        let type = subscriptionType
        let productId = null

        if (subscriptionType.startsWith('product_')) {
            type = 'all'
            productId = subscriptionType.replace('product_', '')

            // Verify product exists
            const { data: product } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .single()

            if (!product) {
                await sendTelegramMessage(chatId, '❌ Product not found.')
                return
            }
        } else if (!validTypes.includes(type)) {
            await sendTelegramMessage(chatId, '❌ Invalid subscription type. Type /help for options.')
            return
        }

        // Create subscription
        const { error } = await supabase.from('telegram_subscriptions').upsert(
            [
                {
                    chat_id: chatId,
                    notification_type: type.toUpperCase(),
                    product_id: productId,
                    is_active: true,
                },
            ],
            { onConflict: 'chat_id,notification_type,product_id' }
        )

        if (error) throw error

        const displayType = productId ? `product updates for ${productId}` : type.replace(/_/g, ' ')
        await sendTelegramMessage(chatId, `✅ Subscribed to ${displayType}!`)
    } catch (error) {
        console.error('Error subscribing:', error)
        await sendTelegramMessage(chatId, '❌ Error subscribing. Please try again.')
    }
}

async function handleUnsubscribe(chatId: number, args: string[]) {
    const supabase = getSupabaseClient()
    if (!supabase) {
        await sendTelegramMessage(chatId, 'Server configuration error. Please contact admin.')
        return
    }

    try {
        if (args.length === 0 || args[0].toLowerCase() === 'all') {
            // Unsubscribe from all
            const { error } = await supabase
                .from('telegram_subscriptions')
                .delete()
                .eq('chat_id', chatId)

            if (error) throw error
            await sendTelegramMessage(chatId, '✅ Unsubscribed from all notifications.')
        } else {
            // Unsubscribe from specific type
            const type = args[0].toUpperCase()
            const { error } = await supabase
                .from('telegram_subscriptions')
                .delete()
                .eq('chat_id', chatId)
                .eq('notification_type', type)

            if (error) throw error
            await sendTelegramMessage(chatId, `✅ Unsubscribed from ${type.replace(/_/g, ' ')}.`)
        }
    } catch (error) {
        console.error('Error unsubscribing:', error)
        await sendTelegramMessage(chatId, '❌ Error unsubscribing. Please try again.')
    }
}

async function handleListSubscriptions(chatId: number) {
    const supabase = getSupabaseClient()
    if (!supabase) {
        await sendTelegramMessage(chatId, 'Server configuration error. Please contact admin.')
        return
    }

    try {
        const { data: subscriptions } = await supabase
            .from('telegram_subscriptions')
            .select(
                `
        id,
        notification_type,
        product_id,
        products(name)
      `
            )
            .eq('chat_id', chatId)
            .eq('is_active', true)

        if (!subscriptions || subscriptions.length === 0) {
            await sendTelegramMessage(chatId, '📭 You have no active subscriptions.')
            return
        }

        let message = '<b>Your Subscriptions:</b>\n\n'
        subscriptions.forEach((sub: any) => {
            if (sub.product_id) {
                message += `• Product: ${sub.products?.name || sub.product_id}\n`
            } else {
                message += `• ${sub.notification_type.replace(/_/g, ' ')}\n`
            }
        })

        await sendTelegramMessage(chatId, message)
    } catch (error) {
        console.error('Error listing subscriptions:', error)
        await sendTelegramMessage(chatId, '❌ Error fetching subscriptions.')
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }
    if (!TELEGRAM_BOT_TOKEN || !getSupabaseClient()) {
        return res.status(500).json({ error: 'Missing Telegram or Supabase server configuration' })
    }

    try {
        const update = req.body as TelegramUpdate

        // Handle Telegram webhook
        if (update.message) {
            await handleTelegramMessage(update)
        }

        return res.status(200).json({ ok: true })
    } catch (error) {
        console.error('Error handling Telegram update:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
