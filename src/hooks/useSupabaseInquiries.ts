import { useState, useEffect } from 'react'
import * as supabaseService from '../services/supabaseClient'
import { MockInquiry } from '../services/mockData'

export function useSupabaseInquiries(userId: string | undefined) {
  const [inquiries, setInquiries] = useState<MockInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch inquiries
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchInquiries = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabaseService.getInquiries(userId)
        if (err) throw err
        setInquiries(data || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch inquiries')
        console.error('Error fetching inquiries:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInquiries()
  }, [userId])

  const createInquiry = async (title: string, content: string) => {
    if (!userId) return

    try {
      const { error: err } = await supabaseService.createInquiry(
        userId,
        title,
        content,
      )
      if (err) throw err

      const newInquiry: MockInquiry = {
        id: `inq-${Date.now()}`,
        userId,
        title,
        content,
        status: 'open',
        createdAt: new Date().toISOString(),
      }

      setInquiries((prev) => [newInquiry, ...prev])
      return newInquiry
    } catch (err) {
      console.error('Error creating inquiry:', err)
      throw err
    }
  }

  return {
    inquiries,
    loading,
    error,
    createInquiry,
  }
}
