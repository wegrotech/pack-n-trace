import { notifyNewProduct, notifyStockMovement } from '@/integrations/telegram/notifier'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://pack-n-trace.vercel.app/api/telegram-webhook'

if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing required environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function setupWebhook(): Promise<boolean> {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: WEBHOOK_URL }),
        })

        const data = await response.json()

        if (!data.ok) {
            console.error('Webhook setup failed:', data.description)
            return false
        }

        console.log('Webhook setup successful')
        return true
    } catch (error) {
        console.error('Error setting up webhook:', error)
        return false
    }
}

async function notifyStockEvent(productId: string, action: 'IN' | 'OUT'): Promise<boolean> {
    try {
        // Get product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single()

        if (productError || !product) {
            console.error('Product not found:', productError)
            return false
        }

        // Get latest transaction for this product
        const { data: transaction, error: transactionError } = await supabase
            .from('stock_transactions')
            .select('*')
            .eq('product_id', productId)
            .eq('action', action)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (transactionError || !transaction) {
            console.error('Transaction not found:', transactionError)
            return false
        }

        return await notifyStockMovement(product, transaction)
    } catch (error) {
        console.error('Error notifying stock event:', error)
        return false
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query as Record<string, string>

    switch (action) {
        case 'setup-webhook':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' })
            }

            const webhookSuccess = await setupWebhook()
            return res.status(webhookSuccess ? 200 : 500).json({
                success: webhookSuccess,
                webhook_url: WEBHOOK_URL,
            })

        case 'notify-stock-in':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' })
            }

            const { productId: inProductId } = req.body
            if (!inProductId) {
                return res.status(400).json({ error: 'Missing productId' })
            }

            const inSuccess = await notifyStockEvent(inProductId, 'IN')
            return res.status(inSuccess ? 200 : 500).json({
                success: inSuccess,
                message: 'Stock in notification sent',
            })

        case 'notify-stock-out':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' })
            }

            const { productId: outProductId } = req.body
            if (!outProductId) {
                return res.status(400).json({ error: 'Missing productId' })
            }

            const outSuccess = await notifyStockEvent(outProductId, 'OUT')
            return res.status(outSuccess ? 200 : 500).json({
                success: outSuccess,
                message: 'Stock out notification sent',
            })

        case 'notify-new-product':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' })
            }

            const { productId } = req.body
            if (!productId) {
                return res.status(400).json({ error: 'Missing productId' })
            }

            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single()

            if (error || !product) {
                return res.status(404).json({ error: 'Product not found' })
            }

            const newProductSuccess = await notifyNewProduct(product)
            return res.status(newProductSuccess ? 200 : 500).json({
                success: newProductSuccess,
                message: 'New product notification sent',
            })

        default:
            return res.status(400).json({ error: 'Invalid action' })
    }
}
