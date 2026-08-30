import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMySubscription } from '../services/supabaseClient'
import { TRIAL_DAYS, isTrialActive, trialDaysRemaining, isSubscriptionActive } from '../utils/subscriptionAccess'

export function useSubscriptionAccess() {
  const { user, role, isLoading: authLoading } = useAuth()
  // 관리자는 회원 대상 체험/구독/쿠폰 정책과 무관하게 항상 전체 이용 가능해야 한다 —
  // 그렇지 않으면 관리자 계정도 가입일 기준 체험배너·다운로드 제한에 걸려버린다.
  const isAdmin = role === 'admin'
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subLoading, setSubLoading] = useState(true)

  useEffect(() => {
    if (!user || isAdmin) {
      setHasActiveSubscription(false)
      setSubLoading(false)
      return
    }
    let cancelled = false
    const fetchStatus = (showLoading: boolean) => {
      if (showLoading) setSubLoading(true)
      getMySubscription(user.id).then((sub) => {
        if (cancelled) return
        setHasActiveSubscription(isSubscriptionActive(sub))
        setSubLoading(false)
      })
    }
    fetchStatus(true)

    // 결제/구독 상태를 변경하고 다른 탭에서 돌아온 경우, 이미 열려있던 탭이 구독 전 상태를
    // 그대로 들고 있지 않도록 탭이 다시 보일 때마다 최신 구독 상태를 재확인한다.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchStatus(false)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, isAdmin])

  const trialActive = isTrialActive(user?.createdAt)
  const trialDaysLeft = trialDaysRemaining(user?.createdAt)
  // useAuth() 자체가 아직 세션/역할을 확정하지 못한 순간에는(예: 관리자 여부를 아직 모름)
  // 어떤 상태도 확정해서 보여주지 않는다 — 그렇지 않으면 role이 'admin'으로 확정되기
  // 직전 찰나에 일반 회원 기준 체험배너가 잠깐 떴다 사라지는 깜빡임이 생긴다.
  const loading = authLoading || (isAdmin ? false : subLoading)

  return {
    loading,
    hasActiveSubscription: isAdmin ? true : hasActiveSubscription,
    trialActive,
    trialDaysLeft,
    trialDays: TRIAL_DAYS,
    // 계획서 신규 작성: 관리자이거나 체험 기간이거나 실제 구독중이면 가능
    canCreateDocument: isAdmin || hasActiveSubscription || trialActive,
    // 다운로드: 관리자이거나 실제 구독이 있어야만 가능 (체험 여부와 무관)
    canDownload: isAdmin || hasActiveSubscription,
  }
}
