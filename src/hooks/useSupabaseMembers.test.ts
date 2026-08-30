import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSupabaseMembers } from './useSupabaseMembers'

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [
            {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              company: 'Test Co',
              phone: '010-1234-5678',
              status: 'active' as const,
              role: 'member' as const,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          error: null,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  },
}))

describe('useSupabaseMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch members on mount', async () => {
    const { result } = renderHook(() => useSupabaseMembers())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.members.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('should handle update member status', async () => {
    const { result } = renderHook(() => useSupabaseMembers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.updateMemberStatus('1', 'suspended')

    await waitFor(() => {
      const updated = result.current.members.find((m) => m.id === '1')
      expect(updated?.status).toBe('suspended')
    })
  })

  it('should handle member deletion', async () => {
    const { result } = renderHook(() => useSupabaseMembers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const initialCount = result.current.members.length

    await result.current.deleteMember('1')

    await waitFor(() => {
      expect(result.current.members.length).toBeLessThan(initialCount)
    })
  })
})
