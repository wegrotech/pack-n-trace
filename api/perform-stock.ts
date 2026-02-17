import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { p_product_id, p_action, p_qty, p_user_id = null, p_note = null } = req.body
    if (!p_product_id || !p_action || !p_qty) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

        // Telegram notifications are handled by Python service via Supabase DB triggers.
        return res.status(200).json(data)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return res.status(500).json({ error: message })
    }
}
