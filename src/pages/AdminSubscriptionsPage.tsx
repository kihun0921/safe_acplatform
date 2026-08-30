import { useEffect, useState } from 'react'
import Badge from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import Spinner from '../components/common/Spinner/Spinner'
import { useAuth } from '../hooks/useAuth'
import { getAllPaymentsAdmin, confirmBankTransferPayment, AdminPayment } from '../services/supabaseClient'
import './AdminSubscriptionsPage.css'

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function paymentStatusBadge(status: AdminPayment['status']): {
  badgeStatus: 'success' | 'warn' | 'danger'
  label: string
} {
  if (status === 'paid') return { badgeStatus: 'success', label: '완료' }
  if (status === 'pending') return { badgeStatus: 'warn', label: '대기' }
  if (status === 'failed') return { badgeStatus: 'danger', label: '실패' }
  return { badgeStatus: 'danger', label: '취소' }
}

export default function AdminSubscriptionsPage(): JSX.Element {
  const { user } = useAuth()
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await getAllPaymentsAdmin()
    setPayments(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleConfirm = async (paymentId: string) => {
    if (!user) return
    if (!window.confirm('입금을 확인하셨나요? 확인 시 해당 회원의 구독이 즉시 활성화됩니다.')) return
    setConfirmingId(paymentId)
    try {
      const { error } = await confirmBankTransferPayment(paymentId, user.id)
      if (error) throw error
      await load()
    } catch (err) {
      alert(`입금 확인 처리에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="admin-subscriptions-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">결제관리</h1>
        </div>

        {loading ? (
          <Spinner />
        ) : payments.length === 0 ? (
          <div className="empty-state">결제 내역이 없습니다.</div>
        ) : (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>플랜</th>
                  <th>금액</th>
                  <th>수단</th>
                  <th>입금자명</th>
                  <th>상태</th>
                  <th>신청일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const ps = paymentStatusBadge(p.status)
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.memberName}
                        {p.memberCompany && <span className="cell-sub"> ({p.memberCompany})</span>}
                      </td>
                      <td>{p.planType}</td>
                      <td>{p.amount.toLocaleString('ko-KR')}원</td>
                      <td>{p.method === 'card' ? '카드' : '무통장입금'}</td>
                      <td>{p.depositorName || '-'}</td>
                      <td>
                        <Badge status={ps.badgeStatus} label={ps.label} />
                      </td>
                      <td>{new Date(p.createdAt).toLocaleString('ko-KR')}</td>
                      <td>
                        {p.method === 'bank_transfer' && p.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={confirmingId !== null}
                            onClick={() => handleConfirm(p.id)}
                          >
                            {confirmingId === p.id ? '처리 중...' : '입금 확인'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
