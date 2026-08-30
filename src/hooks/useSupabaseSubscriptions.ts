import { useState, useEffect } from 'react'
import * as supabaseService from '../services/supabaseClient'

export interface Subscription {
  id: string
  memberId: string
  planType: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'cancelled' | 'expired'
  startDate: string
  endDate: string | null
  documentsLimit: number
  inquiriesLimit: number
  apiAccessAllowed: boolean
}

export function useSupabaseSubscriptions(memberId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!memberId) {
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabaseService.supabase
          .from('subscriptions')
          .select('*')
          .eq('member_id', memberId)
          .single()

        if (err && err.code !== 'PGRST116') throw err
        setSubscription((data || null) as Subscription | null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
        console.error('Error fetching subscription:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [memberId])

  const upgradePlan = async (newPlan: 'basic' | 'pro' | 'enterprise') => {
    if (!memberId) return

    try {
      const planLimitsMap: Record<'basic' | 'pro' | 'enterprise', { documents: number; inquiries: number; api: boolean }> = {
        basic: { documents: 50, inquiries: 20, api: false },
        pro: { documents: 500, inquiries: 200, api: true },
        enterprise: { documents: 5000, inquiries: 2000, api: true },
      }

      const limits = planLimitsMap[newPlan]

      const endDate = new Date()
      endDate.setFullYear(endDate.getFullYear() + 1)

      const { error: err } = await supabaseService.supabase
        .from('subscriptions')
        .update({
          planType: newPlan,
          documentsLimit: limits.documents,
          inquiriesLimit: limits.inquiries,
          apiAccessAllowed: limits.api,
          endDate: endDate.toISOString(),
        })
        .eq('member_id', memberId)

      if (err) throw err

      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              planType: newPlan,
              documentsLimit: limits.documents,
              inquiriesLimit: limits.inquiries,
              apiAccessAllowed: limits.api,
              endDate: endDate.toISOString(),
            }
          : null,
      )
    } catch (err) {
      console.error('Error upgrading plan:', err)
      throw err
    }
  }

  const cancelSubscription = async () => {
    if (!memberId) return

    try {
      const { error: err } = await supabaseService.supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('member_id', memberId)

      if (err) throw err

      setSubscription((prev) =>
        prev ? { ...prev, status: 'cancelled' } : null,
      )
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      throw err
    }
  }

  return {
    subscription,
    loading,
    error,
    upgradePlan,
    cancelSubscription,
  }
}
