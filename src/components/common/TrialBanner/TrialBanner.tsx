import { Link } from 'react-router-dom'
import { useSubscriptionAccess } from '../../../hooks/useSubscriptionAccess'
import './TrialBanner.css'

// 체험기간 안내 + 구독 유도 배너. 실제 구독중이면 아무것도 렌더링하지 않는다.
export default function TrialBanner(): JSX.Element | null {
  const { loading, hasActiveSubscription, trialActive, trialDaysLeft } = useSubscriptionAccess()

  if (loading || hasActiveSubscription) return null

  return (
    <div className="trial-banner">
      <span>
        {trialActive
          ? `무료체험 ${trialDaysLeft}일 남음 · 계획서 다운로드는 구독 후 이용 가능합니다.`
          : '무료체험 기간이 종료되었습니다. 계속 이용하려면 구독이 필요합니다.'}
      </span>
      <Link to="/subscription" className="trial-banner-link">
        구독하기 →
      </Link>
    </div>
  )
}
