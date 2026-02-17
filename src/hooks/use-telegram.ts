import { supabase } from '@/integrations/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface TelegramSubscription {
    id: string
    chat_id: number
    notification_type: string
    product_id: string | null
    is_active: boolean
    products?: {
        name: string
    } | null
}

export function useTelegramStatus() {
    return useQuery({
        queryKey: ['telegram-status'],
        queryFn: async () => {
            const response = await fetch('/api/telegram-notify?action=setup-webhook', {
                method: 'POST',
            })
            return response.json()
        },
    })
}

export function useTelegramChats() {
    return useQuery({
        queryKey: ['telegram-chats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('telegram_chats')
                .select('*')
                .eq('is_active', true)

            if (error) throw error
            return data
        },
    })
}

export function useTelegramSubscriptions(chatId?: number) {
    return useQuery({
        queryKey: ['telegram-subscriptions', chatId],
        queryFn: async () => {
            let query = supabase
                .from('telegram_subscriptions')
                .select(
                    `
          id,
          chat_id,
          notification_type,
          product_id,
          is_active,
          products(name)
        `
                )
                .eq('is_active', true)

            if (chatId) {
                query = query.eq('chat_id', chatId)
            }

            const { data, error } = await query

            if (error) throw error
            return data as TelegramSubscription[]
        },
    })
}

export function useAddTelegramSubscription() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: {
            chat_id: number
            notification_type: string
            product_id?: string | null
        }) => {
            const { data, error } = await supabase
                .from('telegram_subscriptions')
                .insert([
                    {
                        chat_id: input.chat_id,
                        notification_type: input.notification_type,
                        product_id: input.product_id || null,
                        is_active: true,
                    },
                ])
                .select()

            if (error) throw error
            return data[0]
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['telegram-subscriptions'] })
            toast.success('Subscription added')
        },
        onError: (error) => {
            toast.error((error as Error).message || 'Failed to add subscription')
        },
    })
}

export function useRemoveTelegramSubscription() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (subscriptionId: string) => {
            const { data, error } = await supabase
                .from('telegram_subscriptions')
                .delete()
                .eq('id', subscriptionId)
                .select()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['telegram-subscriptions'] })
            toast.success('Subscription removed')
        },
        onError: (error) => {
            toast.error((error as Error).message || 'Failed to remove subscription')
        },
    })
}

export function useTelegramNotificationLogs() {
    return useQuery({
        queryKey: ['telegram-notification-logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('telegram_notifications_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            return data
        },
    })
}
