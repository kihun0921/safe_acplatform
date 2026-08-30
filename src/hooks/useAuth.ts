import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export type UserRole = 'member' | 'admin' | null

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
  createdAt?: string
}

interface MemberProfile {
  role: UserRole
  name: string | null
  created_at: string | null
}

interface ProfileLookup {
  profile: MemberProfile | null
  fetchFailed: boolean
}

async function fetchMemberProfile(userId: string): Promise<ProfileLookup> {
  const { data, error } = await supabase
    .from('members')
    .select('role, name, created_at')
    .eq('id', userId)
    .maybeSingle()

  // error(네트워크/일시적 DB 오류)와 "프로필이 원래 없음"을 구분한다. 구분하지 않으면
  // 일시적인 조회 실패만으로 관리자 권한이 조용히 'member'로 강등되어, 관리자 페이지에서
  // 실제로는 로그인이 멀쩡한데도 "로그인이 필요합니다" 화면이 잘못 뜨는 원인이 된다.
  if (error) return { profile: null, fetchFailed: true }
  return { profile: (data as MemberProfile | null) ?? null, fetchFailed: false }
}

async function buildUser(
  authUser: { id: string; email?: string | null } | null,
  previous: { user: User | null; role: UserRole },
): Promise<{ user: User | null; role: UserRole }> {
  if (!authUser) return { user: null, role: null }

  const { profile, fetchFailed } = await fetchMemberProfile(authUser.id)

  // 프로필 조회가 일시적으로 실패했을 뿐이라면(세션 자체는 유효함), 이전에 확인된
  // 사용자 정보/권한을 그대로 유지한다 — 로그인 화면으로 튕기거나 권한을 잃지 않도록.
  if (fetchFailed && previous.user?.id === authUser.id) {
    return previous
  }

  const role = profile?.role ?? 'member'
  const user: User = {
    id: authUser.id,
    email: authUser.email ?? '',
    role,
    name: profile?.name ?? undefined,
    createdAt: profile?.created_at ?? undefined,
  }
  return { user, role }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    // buildUser 호출 사이에 "이전에 확인된 user/role"을 이어주기 위한 참조.
    // React state는 이 effect의 클로저 안에서 stale할 수 있어 별도로 들고 있는다.
    const current: { user: User | null; role: UserRole } = { user: null, role: null }

    const applyAuthState = async (session: { user: { id: string; email?: string | null } } | null) => {
      const result = await buildUser(session?.user ?? null, current)
      if (!mounted) return
      current.user = result.user
      current.role = result.role
      setUser(result.user)
      setRole(result.role)
      setIsLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => applyAuthState(session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthState(session)
    })

    // 탭을 오래 백그라운드에 두었다가 다시 활성화됐을 때 세션을 미리 재확인해,
    // 사용자가 메뉴를 클릭한 시점에야 만료된 세션을 처음 발견하는 상황을 줄인다.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => applyAuthState(session))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  return {
    user,
    role,
    isLoading,
    login,
    logout,
  }
}
