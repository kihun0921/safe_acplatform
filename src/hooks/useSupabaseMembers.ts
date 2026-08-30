import { useState, useEffect } from 'react'
import * as supabaseService from '../services/supabaseClient'

export interface AdminMember {
  id: string
  email: string
  name: string
  ceo_name: string
  company: string
  phone: string
  status: 'active' | 'inactive' | 'suspended'
  role: 'member' | 'admin'
  createdAt: string
  updatedAt: string
}

export function useSupabaseMembers() {
  const [members, setMembers] = useState<AdminMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabaseService.supabase
          .from('members')
          .select('*')
          .order('created_at', { ascending: false })

        if (err) throw err
        setMembers((data || []) as AdminMember[])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch members')
        console.error('Error fetching members:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const updateMemberStatus = async (
    memberId: string,
    status: 'active' | 'inactive' | 'suspended',
  ) => {
    try {
      const { error: err } = await supabaseService.supabase
        .from('members')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      if (err) throw err

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, status, updatedAt: new Date().toISOString() }
            : m,
        ),
      )
    } catch (err) {
      console.error('Error updating member status:', err)
      throw err
    }
  }

  const updateMemberRole = async (
    memberId: string,
    role: 'member' | 'admin',
  ) => {
    try {
      const { error: err } = await supabaseService.supabase
        .from('members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      if (err) throw err

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role } : m,
        ),
      )
    } catch (err) {
      console.error('Error updating member role:', err)
      throw err
    }
  }

  // 회원을 완전히 삭제하려면 해당 회원이 작성한 계획서(documents)와 문의(inquiries)가
  // 먼저 정리돼야 한다 (외래키 제약: documents_user_id_fkey). 관리자의 "삭제" 버튼은
  // 이 회원과 관련된 모든 데이터를 함께 제거하는 완전 삭제로 동작한다.
  const deleteMember = async (memberId: string) => {
    try {
      const { error: docsErr } = await supabaseService.supabase
        .from('documents')
        .delete()
        .eq('user_id', memberId)
      if (docsErr) throw docsErr

      const { error: inquiriesErr } = await supabaseService.supabase
        .from('inquiries')
        .delete()
        .eq('user_id', memberId)
      if (inquiriesErr) throw inquiriesErr

      const { error: err } = await supabaseService.supabase
        .from('members')
        .delete()
        .eq('id', memberId)

      if (err) throw err

      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error('Error deleting member:', err)
      throw err
    }
  }

  return {
    members,
    loading,
    error,
    updateMemberStatus,
    updateMemberRole,
    deleteMember,
  }
}
