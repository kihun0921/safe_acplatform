import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Badge from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Spinner from '../components/common/Spinner/Spinner'
import { useAuth } from '../hooks/useAuth'
import {
  supabase,
  SUBSCRIPTION_PLANS,
  getMySubscription,
  getMyPayments,
  createPendingSubscriptionAndPayment,
  MySubscription,
  Payment,
} from '../services/supabaseClient'
import './SubscriptionPage.css'

// TossPayments SDK v1 결제창은 CDN 스크립트로 제공되어 npm 설치가 필요 없다.
const TOSS_SDK_URL = 'https://js.tosspayments.com/v1/payment'
const TOSS_CLIENT_KEY = (import.meta.env.VITE_TOSS_CLIENT_KEY as string) || ''

// 실제 계좌정보로 교체 필요 — 무통장입금 안내에 노출되는 플레이스홀더
const BANK_ACCOUNT_INFO = {
  bank: '우리은행',
  accountNumber: '1005-804-614327',
  holder: '올케어솔루션 주식회사',
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, options: Record<string, unknown>) => Promise<void>
    }
  }
}

function loadTossScript(): Promise<void> {
  if (window.TossPayments) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TOSS_SDK_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// supabase-js는 Edge Function이 non-2xx를 반환하면 실제 응답 본문 대신 "Edge Function
// returned a non-2xx status code"라는 뭉뚱그린 메시지만 던진다. 진짜 원인
// ({ok:false, error:'...'} 형태로 우리 함수가 반환한 값)은 error.context(Response)를
// 직접 읽어야 확인할 수 있다.
async function readFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      try {
        const body = await context.clone().json()
        if (body?.error) return String(body.error)
      } catch {
        try {
          const text = await context.clone().text()
          if (text) return text
        } catch {
          // ignore — fall through to generic message below
        }
      }
    }
  }
  return error instanceof Error ? error.message : String(error)
}

function statusBadge(status: string): { badgeStatus: 'success' | 'warn' | 'default'; label: string } {
  if (status === 'active') return { badgeStatus: 'success', label: '구독중' }
  if (status === 'pending') return { badgeStatus: 'warn', label: '결제 확인 대기' }
  return { badgeStatus: 'default', label: '미구독' }
}

function paymentStatusBadge(status: Payment['status']): { badgeStatus: 'success' | 'warn' | 'danger'; label: string } {
  if (status === 'paid') return { badgeStatus: 'success', label: '완료' }
  if (status === 'pending') return { badgeStatus: 'warn', label: '대기' }
  if (status === 'failed') return { badgeStatus: 'danger', label: '실패' }
  return { badgeStatus: 'danger', label: '취소' }
}

export default function SubscriptionPage(): JSX.Element {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [subscription, setSubscription] = useState<MySubscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showBankForm, setShowBankForm] = useState(false)
  const [depositorName, setDepositorName] = useState('')
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  // StrictMode의 개발 모드 이펙트 이중실행 등으로 동일한 orderId에 대해 승인 요청이
  // 중복 발송되는 것을 막기 위한 가드 (토스 confirm API는 중복 요청을 오류로 거절함).
  const confirmedOrderRef = useRef<string | null>(null)

  const plan = SUBSCRIPTION_PLANS[0]!

  const loadData = async (memberId: string) => {
    setLoading(true)
    const [sub, pays] = await Promise.all([getMySubscription(memberId), getMyPayments(memberId)])
    setSubscription(sub)
    setPayments(pays)
    setLoading(false)
  }

  useEffect(() => {
    if (user) loadData(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // 토스 결제창에서 successUrl로 리다이렉트된 경우, 쿼리파라미터를 읽어 자동으로
  // 결제 승인 Edge Function을 호출한다.
  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')
    if (!paymentKey || !orderId || !amount) return
    if (confirmedOrderRef.current === orderId) return
    confirmedOrderRef.current = orderId

    setConfirmingPayment(true)
    supabase.functions
      .invoke('confirm-toss-payment', { body: { paymentKey, orderId, amount: Number(amount) } })
      .then(async ({ data, error }) => {
        if (error || !data?.ok) {
          const message = error ? await readFunctionError(error) : data?.error || '알 수 없는 오류'
          alert(`결제 승인에 실패했습니다.\n${message}`)
        } else {
          alert('결제가 완료되었습니다. 구독이 활성화되었습니다.')
        }
      })
      .finally(() => {
        setConfirmingPayment(false)
        setSearchParams({}, { replace: true })
        if (user) loadData(user.id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleCardPayment = async () => {
    if (!user) return
    setProcessing(true)
    try {
      const { orderId } = await createPendingSubscriptionAndPayment(user.id, plan, 'card')
      await loadTossScript()
      const toss = window.TossPayments?.(TOSS_CLIENT_KEY)
      if (!toss) throw new Error('결제 모듈 초기화에 실패했습니다.')
      await toss.requestPayment('카드', {
        amount: plan.amount,
        orderId,
        orderName: plan.name,
        customerName: user.name || user.email,
        successUrl: `${window.location.origin}/subscription`,
        failUrl: `${window.location.origin}/subscription`,
      })
    } catch (err) {
      alert(`결제 요청에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleBankTransfer = async () => {
    if (!user || !depositorName.trim()) return
    setProcessing(true)
    try {
      await createPendingSubscriptionAndPayment(user.id, plan, 'bank_transfer', depositorName.trim())
      setShowBankForm(false)
      setDepositorName('')
      alert('무통장입금 신청이 접수되었습니다. 입금 확인 후 구독이 활성화됩니다.')
      await loadData(user.id)
    } catch (err) {
      alert(`신청에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  if (loading || confirmingPayment) {
    return (
      <div className="subscription-page">
        <div className="container">
          <Spinner />
          {confirmingPayment && <p className="confirming-text">결제 승인을 확인하는 중입니다...</p>}
        </div>
      </div>
    )
  }

  const status = statusBadge(subscription?.status ?? '')

  return (
    <div className="subscription-page">
      <div className="container">
        <h1 className="page-title">구독 관리</h1>

        <div className="subscription-status-card">
          <div className="status-row">
            <span className="label">현재 상태</span>
            <Badge status={status.badgeStatus} label={status.label} />
          </div>
          {subscription?.endDate && (
            <div className="status-row">
              <span className="label">만료일</span>
              <span className="value">{new Date(subscription.endDate).toLocaleDateString('ko-KR')}</span>
            </div>
          )}
        </div>

        <div className="plan-card">
          <h2>{plan.name}</h2>
          <p className="plan-price">{plan.amount.toLocaleString('ko-KR')}원 / 월</p>
          <div className="plan-actions">
            <Button variant="primary" disabled={processing} onClick={handleCardPayment}>
              카드로 결제
            </Button>
            <Button variant="secondary" disabled={processing} onClick={() => setShowBankForm((v) => !v)}>
              무통장입금 신청
            </Button>
          </div>

          {showBankForm && (
            <div className="bank-transfer-form">
              <p className="bank-info">
                {BANK_ACCOUNT_INFO.bank} {BANK_ACCOUNT_INFO.accountNumber} (예금주: {BANK_ACCOUNT_INFO.holder})
              </p>
              <Input
                label="입금자명"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="실제 입금하실 분의 성함"
              />
              <Button variant="primary" disabled={processing || !depositorName.trim()} onClick={handleBankTransfer}>
                신청 완료
              </Button>
            </div>
          )}
        </div>

        <div className="payment-history">
          <h2>결제 내역</h2>
          {payments.length === 0 ? (
            <p className="empty-text">결제 내역이 없습니다.</p>
          ) : (
            <div className="payment-table-wrap">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>플랜</th>
                    <th>금액</th>
                    <th>수단</th>
                    <th>상태</th>
                    <th>신청일</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const ps = paymentStatusBadge(p.status)
                    return (
                      <tr key={p.id}>
                        <td>{p.planType}</td>
                        <td>{p.amount.toLocaleString('ko-KR')}원</td>
                        <td>{p.method === 'card' ? '카드' : '무통장입금'}</td>
                        <td>
                          <Badge status={ps.badgeStatus} label={ps.label} />
                        </td>
                        <td>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
