import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Badge from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Spinner from '../components/common/Spinner/Spinner'
import { AdminCoupon, generateCoupons, getAllCoupons } from '../services/supabaseClient'
import './AdminCouponsPage.css'

const SOURCE_PRESETS = ['퇴직공제단말기 신청', '이벤트 당첨', '직접입력']

interface IssuedCoupon {
  code: string
  qrDataUrl: string
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function statusBadge(status: AdminCoupon['status']): { badgeStatus: 'success' | 'warn' | 'danger'; label: string } {
  if (status === 'used') return { badgeStatus: 'success', label: '사용됨' }
  if (status === 'revoked') return { badgeStatus: 'danger', label: '취소됨' }
  return { badgeStatus: 'warn', label: '미사용' }
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AdminCouponsPage(): JSX.Element {
  const [sourcePreset, setSourcePreset] = useState(SOURCE_PRESETS[0]!)
  const [customSource, setCustomSource] = useState('')
  const [count, setCount] = useState(1)
  const [issuing, setIssuing] = useState(false)
  const [issuedBatch, setIssuedBatch] = useState<IssuedCoupon[]>([])

  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)

  const loadCoupons = async () => {
    setLoading(true)
    const data = await getAllCoupons()
    setCoupons(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const effectiveSource = sourcePreset === '직접입력' ? customSource.trim() : sourcePreset

  const handleIssue = async () => {
    if (!effectiveSource || count < 1) return
    setIssuing(true)
    try {
      const created = await generateCoupons(effectiveSource, count)
      const withQr = await Promise.all(
        created.map(async (c) => ({
          code: c.code,
          qrDataUrl: await QRCode.toDataURL(`${window.location.origin}/documents?coupon=${c.code}`, {
            width: 220,
          }),
        })),
      )
      setIssuedBatch(withQr)
      await loadCoupons()
    } catch (err) {
      alert(`쿠폰 발급에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setIssuing(false)
    }
  }

  const handleDownloadQr = (code: string, dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `coupon-${code}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => undefined)
  }

  const handleExportCsv = () => {
    const rows = [
      ['코드', '상태', '발급사유', '발급일', '사용회원', '사용일', '적용문서'],
      ...coupons.map((c) => [
        c.code,
        c.status,
        c.source,
        new Date(c.createdAt).toLocaleString('ko-KR'),
        c.memberName ?? '',
        c.usedAt ? new Date(c.usedAt).toLocaleString('ko-KR') : '',
        c.documentTitle ?? '',
      ]),
    ]
    downloadCsv(`coupons-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="admin-coupons-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">쿠폰관리</h1>
        </div>

        <div className="coupon-issue-card">
          <h2>쿠폰 발급</h2>
          <p className="coupon-issue-desc">
            발급된 코드/QR 이미지를 카카오톡 등으로 전달하면, 회원이 계획서 다운로드 화면에서 등록해
            그 문서 1건을 계속 다운로드할 수 있습니다.
          </p>
          <div className="coupon-issue-form">
            <div className="input-wrapper">
              <label className="input-label">발급 사유</label>
              <select
                className="coupon-source-select"
                value={sourcePreset}
                onChange={(e) => setSourcePreset(e.target.value)}
              >
                {SOURCE_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {sourcePreset === '직접입력' && (
              <Input
                label="사유 직접입력"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="예: 협력사 프로모션"
              />
            )}
            <Input
              label="발급 수량"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            />
            <Button variant="primary" disabled={issuing || !effectiveSource} onClick={handleIssue}>
              {issuing ? '발급 중...' : '발급'}
            </Button>
          </div>

          {issuedBatch.length > 0 && (
            <div className="coupon-issue-results">
              <h3>방금 발급한 쿠폰 ({issuedBatch.length}개)</h3>
              <div className="coupon-issue-grid">
                {issuedBatch.map((c) => (
                  <div key={c.code} className="coupon-issue-item">
                    <img src={c.qrDataUrl} alt={`쿠폰 QR ${c.code}`} />
                    <div className="coupon-issue-code">{c.code}</div>
                    <div className="coupon-issue-actions">
                      <Button variant="secondary" size="sm" onClick={() => handleCopy(c.code)}>
                        코드 복사
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDownloadQr(c.code, c.qrDataUrl)}>
                        QR 저장
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="coupon-history-header">
          <h2>전체 쿠폰 이력</h2>
          <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={coupons.length === 0}>
            CSV 다운로드
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : coupons.length === 0 ? (
          <div className="empty-state">발급된 쿠폰이 없습니다.</div>
        ) : (
          <div className="coupons-table-wrap">
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>코드</th>
                  <th>상태</th>
                  <th>발급사유</th>
                  <th>발급일</th>
                  <th>사용회원</th>
                  <th>사용일</th>
                  <th>적용 문서</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const badge = statusBadge(c.status)
                  return (
                    <tr key={c.id}>
                      <td>{c.code}</td>
                      <td>
                        <Badge status={badge.badgeStatus} label={badge.label} />
                      </td>
                      <td>{c.source}</td>
                      <td>{new Date(c.createdAt).toLocaleString('ko-KR')}</td>
                      <td>{c.memberName ?? '-'}</td>
                      <td>{c.usedAt ? new Date(c.usedAt).toLocaleString('ko-KR') : '-'}</td>
                      <td>{c.documentTitle ?? '-'}</td>
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
