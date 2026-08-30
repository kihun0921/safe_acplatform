import { useState, useEffect } from 'react'
import * as supabaseService from '../services/supabaseClient'
import { Announcement } from '../services/supabaseClient'

export function useSupabaseAnnouncements(limit?: number) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabaseService.getAnnouncements(limit)
      if (err) throw err
      setAnnouncements(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements')
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const filtered = announcements.filter((ann) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true

    const externalNo = ann.externalNo.toLowerCase()
    // 실제 공고번호는 "R26BK01693380" + 공고차수("-000")를 합쳐 표시되는 경우가
    // 많은데, 우리는 차수 없이 번호만 저장한다. 저장된 번호가 검색어의 접두어인
    // 경우("R26BK01693380-000" 검색 → "r26bk01693380" 매칭)도 인식하도록
    // 양방향으로 포함 여부를 검사한다.
    return (
      ann.title.toLowerCase().includes(q) ||
      ann.organization.toLowerCase().includes(q) ||
      (externalNo.length > 0 && (externalNo.includes(q) || q.includes(externalNo)))
    )
  })

  return {
    announcements: filtered,
    allAnnouncements: announcements,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchAnnouncements,
  }
}
