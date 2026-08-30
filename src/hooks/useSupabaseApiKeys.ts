import { useState, useEffect } from 'react'
import * as supabaseService from '../services/supabaseClient'

export interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
}

export function useSupabaseApiKeys(userId: string | undefined) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchKeys = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabaseService.supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (err) throw err
        setKeys((data || []) as ApiKey[])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch API keys')
        console.error('Error fetching API keys:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKeys()
  }, [userId])

  const createApiKey = async (name: string) => {
    if (!userId) return

    try {
      const newKey = {
        id: `key-${Date.now()}`,
        name,
        key: `acplatform_${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
      }

      const { error: err } = await supabaseService.supabase
        .from('api_keys')
        .insert([{ ...newKey, user_id: userId }])

      if (err) throw err

      setKeys((prev) => [newKey, ...prev])
      return newKey
    } catch (err) {
      console.error('Error creating API key:', err)
      throw err
    }
  }

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error: err } = await supabaseService.supabase
        .from('api_keys')
        .update({ isActive: false })
        .eq('id', keyId)

      if (err) throw err

      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, isActive: false } : k)),
      )
    } catch (err) {
      console.error('Error revoking API key:', err)
      throw err
    }
  }

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error: err } = await supabaseService.supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)

      if (err) throw err

      setKeys((prev) => prev.filter((k) => k.id !== keyId))
    } catch (err) {
      console.error('Error deleting API key:', err)
      throw err
    }
  }

  return {
    keys,
    loading,
    error,
    createApiKey,
    revokeApiKey,
    deleteApiKey,
  }
}
