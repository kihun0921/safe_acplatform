import type { MySubscription } from '../services/supabaseClient'

// 가입 후 7일간은 계획서 작성(마법사 이용)을 무료로 체험할 수 있지만, 다운로드는
// 체험 여부와 무관하게 항상 실제 구독이 있어야만 가능하다 — 안전보건관리계획서는
// 일회성으로 끝나는 경우가 많아, 다운로드를 구독과 무조건 연결하는 것이 영업상 정책.
export const TRIAL_DAYS = 7

function trialEndDate(createdAt: string): Date {
  const end = new Date(createdAt)
  end.setDate(end.getDate() + TRIAL_DAYS)
  return end
}

export function isTrialActive(createdAt: string | undefined): boolean {
  if (!createdAt) return false
  return Date.now() <= trialEndDate(createdAt).getTime()
}

export function trialDaysRemaining(createdAt: string | undefined): number {
  if (!createdAt) return 0
  const diffMs = trialEndDate(createdAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function isSubscriptionActive(sub: MySubscription | null): boolean {
  if (!sub || sub.status !== 'active') return false
  if (!sub.endDate) return true
  // end_date 컬럼이 DATE("YYYY-MM-DD")든 TIMESTAMP("YYYY-MM-DD HH:mm:ss")든 안전하게 처리하기
  // 위해 날짜 부분만 잘라 쓴다 — 시간까지 포함된 문자열 뒤에 그대로 "T23:59:59"를 이어붙이면
  // "...T00:00:00T23:59:59" 같은 깨진 문자열(Invalid Date)이 되어 항상 만료로 오판된다.
  const datePart = sub.endDate.slice(0, 10)
  const end = new Date(`${datePart}T23:59:59`)
  if (Number.isNaN(end.getTime())) return true
  return end.getTime() >= Date.now()
}
