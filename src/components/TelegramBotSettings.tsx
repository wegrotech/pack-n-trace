import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Copy, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function TelegramBotSettings() {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [webhookConfigured, setWebhookConfigured] = useState(false)
  const [botStatus, setBotStatus] = useState<'checking' | 'active' | 'inactive'>('checking')

  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
  const hasToken = !!botToken && botToken !== 'TELEGRAM_BOT_TOKEN'
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'pack_n_trace_bot'
  const webhookUrl =
    import.meta.env.VITE_TELEGRAM_WEBHOOK_URL || 'https://pack-n-trace.vercel.app/api/telegram-webhook'

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const setupWebhook = async () => {
    try {
      setIsSettingUp(true)
      const response = await fetch('/api/telegram-notify?action=setup-webhook', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setWebhookConfigured(true)
        toast.success('Webhook configured successfully!')
      } else {
        toast.error('Failed to setup webhook. Check your bot token.')
      }
    } catch (error) {
      toast.error('Error setting up webhook')
      console.error(error)
    } finally {
      setIsSettingUp(false)
    }
  }

  const testNotification = async (type: 'stock_in' | 'stock_out' | 'new_product') => {
    try {
      // Get first product for testing
      const { data: products } = await supabase.from('products').select('id').limit(1)

      if (!products || products.length === 0) {
        toast.error('No products found. Create a product first.')
        return
      }

      const endpoint =
        type === 'new_product'
          ? '/api/telegram-notify?action=notify-new-product'
          : `/api/telegram-notify?action=notify-stock-${type.split('_')[1]}`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: products[0].id }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Test ${type} notification sent!`)
      } else {
        toast.error('Failed to send test notification')
      }
    } catch (error) {
      toast.error('Error sending test notification')
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Bot Configuration
              {hasToken ? (
                <Badge className="bg-green-600">Configured</Badge>
              ) : (
                <Badge variant="destructive">Missing</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            {hasToken ? (
              <p>Bot token is configured in environment variables</p>
            ) : (
              <p className="text-red-600">Bot token not found. Add TELEGRAM_BOT_TOKEN to .env</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Webhook Status
              {webhookConfigured ? (
                <Badge className="bg-green-600">Active</Badge>
              ) : (
                <Badge variant="secondary">Setup Needed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            {webhookConfigured ? (
              <p>Webhook is configured and receiving updates</p>
            ) : (
              <p>Click the button below to configure webhook</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bot Info */}
      {hasToken && (
        <Card>
          <CardHeader>
            <CardTitle>Bot Information</CardTitle>
            <CardDescription>Share this with users to add your bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Bot Username</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">@{botUsername}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`@${botUsername}`)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm truncate">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
          <CardDescription>Follow these steps to get your bot working</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                1
              </div>
              <div>
                <p className="font-medium">Get Bot Token</p>
                <p className="text-sm text-gray-600 mt-1">
                  Talk to{' '}
                  <a
                    href="https://t.me/botfather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    @BotFather
                  </a>{' '}
                  on Telegram to create a bot and get your token
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                2
              </div>
              <div>
                <p className="font-medium">Configure Environment</p>
                <p className="text-sm text-gray-600 mt-1">
                  Add your bot token to <code className="bg-gray-100 px-1">.env</code> as{' '}
                  <code className="bg-gray-100 px-1">TELEGRAM_BOT_TOKEN</code>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                3
              </div>
              <div>
                <p className="font-medium">Setup Webhook</p>
                <p className="text-sm text-gray-600 mt-1">
                  Click the button below to register your webhook with Telegram
                </p>
                {hasToken && (
                  <Button
                    className="mt-3"
                    onClick={setupWebhook}
                    disabled={isSettingUp || webhookConfigured}
                  >
                    {isSettingUp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {webhookConfigured ? 'Webhook Configured' : 'Setup Webhook'}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                4
              </div>
              <div>
                <p className="font-medium">Add Bot to Chats</p>
                <p className="text-sm text-gray-600 mt-1">
                  Search for your bot in Telegram and click "Start", or add it to a group
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>Send test notifications to verify setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => testNotification('stock_in')}
              disabled={!webhookConfigured}
            >
              Test Stock In
            </Button>
            <Button
              variant="outline"
              onClick={() => testNotification('stock_out')}
              disabled={!webhookConfigured}
            >
              Test Stock Out
            </Button>
            <Button
              variant="outline"
              onClick={() => testNotification('new_product')}
              disabled={!webhookConfigured}
            >
              Test New Product
            </Button>
          </div>
          {!webhookConfigured && (
            <p className="text-sm text-gray-600 mt-3">
              Setup webhook first to send test notifications
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            See <code className="bg-gray-100 px-1">TELEGRAM_SETUP.md</code> for detailed setup
            instructions and command reference.
          </p>
          <Button variant="outline" asChild>
            <a href="/TELEGRAM_SETUP.md" target="_blank" rel="noopener noreferrer">
              View Full Guide
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
