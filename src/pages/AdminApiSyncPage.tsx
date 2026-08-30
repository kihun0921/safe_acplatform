import { useEffect, useState } from 'react'
import Button from '../components/common/Button/Button'
import Badge from '../components/common/Badge/Badge'
import { supabase } from '../services/supabaseClient'
import './AdminApiSyncPage.css'

interface SyncResult {
  ok: boolean
  fetched?: { pps: number; dapa: number; ppsAward?: number; kepco?: number; ex?: number }
  upserted?: number
  awardMatched?: number
  errors?: string[]
  error?: string
  exDebugSample?: string
}

interface SourceDef {
  key: string
  name: string
  scope: string
  desc: string
  status: 'live' | 'pending' | 'blocked'
  statusLabel: string
}

const SOURCES: SourceDef[] = [
  {
    key: 'pps',
    name: '조달청 나라장터',
    scope: '건설공사',
    desc: '입찰공고 + 낙찰정보서비스 · 15일 구간 페이징, 전체 최대 2,000건 · 낙찰 확정 건만 노출',
    status: 'live',
    statusLabel: '연동됨',
  },
  {
    key: 'dapa',
    name: '방위사업청',
    scope: '국내경쟁',
    desc: '입찰공고정보서비스 · 1회 조회 최대 100건 · 낙찰정보 API 없어 제출마감일 기준',
    status: 'live',
    statusLabel: '연동됨',
  },
  {
    key: 'kepco',
    name: '한국전력공사(한전)',
    scope: '건설용역',
    desc: '전자입찰계약정보 · progressState=Final(확정)만 조회, 최대 500건',
    status: 'live',
    statusLabel: '연동됨',
  },
  {
    key: 'ex',
    name: '한국도로공사',
    scope: '공사',
    desc: '전자조달 계약공개현황 · pbanClssCd=CT(공사)만 조회, 최근 30일 계약체결 기준 최대 300건',
    status: 'live',
    statusLabel: '연동됨',
  },
  {
    key: 'lh',
    name: 'LH 한국토지주택공사',
    scope: '예정',
    desc: '입찰공고정보 + 개찰결과정보 · 인증키 발급 완료, 자체 서버 활성화 대기 중',
    status: 'pending',
    statusLabel: '키 활성화 대기',
  },
  {
    key: 'kwater',
    name: 'K-water 한국수자원공사',
    scope: '예정',
    desc: '전자조달 입찰공고(tndr3) + 계약정보공개(cntrct3) · 오늘 승인, 게이트웨이 전파 대기 중',
    status: 'pending',
    statusLabel: '전파 대기',
  },
  {
    key: 'kogas',
    name: '한국가스공사',
    scope: '예정',
    desc: '입찰정보(bidInfoList) + 계약정보(contractInfoList4) · 오늘 승인, 게이트웨이 전파 대기 중',
    status: 'pending',
    statusLabel: '전파 대기',
  },
]

export default function AdminApiSyncPage(): JSX.Element {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [lastRun, setLastRun] = useState<{ ranAt: string; result: SyncResult } | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loadingStatus, setLoadingStatus] = useState(true)

  const loadStatus = async () => {
    setLoadingStatus(true)

    const countEntries = await Promise.all(
      SOURCES.filter((s) => s.status === 'live').map(async (s) => {
        const { count } = await supabase
          .from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('api_source', s.key)
        return [s.key, count ?? 0] as const
      }),
    )
    setCounts(Object.fromEntries(countEntries))

    const { data } = await supabase
      .from('sync_log')
      .select('ran_at, result')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setLastRun({ ranAt: data.ran_at as string, result: data.result as SyncResult })
    }

    setLoadingStatus(false)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke<SyncResult>(
        'sync-announcements',
        { method: 'POST' },
      )
      if (error) {
        setResult({ ok: false, error: error.message })
      } else {
        setResult(data ?? { ok: false, error: '응답 없음' })
      }
      await loadStatus()
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="admin-api-sync-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">API 연동 관리</h1>
        </div>

        <div className="sync-status-table-wrapper">
          <table className="sync-status-table">
            <thead>
              <tr>
                <th>발주처</th>
                <th>범위</th>
                <th>설명</th>
                <th>보유 건수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.key}>
                  <td className="cell-name">{s.name}</td>
                  <td>
                    <span className="source-badge">{s.scope}</span>
                  </td>
                  <td className="cell-desc">{s.desc}</td>
                  <td className="cell-count">
                    {s.status === 'live' ? (loadingStatus ? '…' : (counts[s.key] ?? 0).toLocaleString('ko-KR')) : '-'}
                  </td>
                  <td>
                    <Badge
                      status={s.status === 'live' ? 'success' : 'warn'}
                      label={s.statusLabel}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sync-action-panel">
          <div>
            <h3>공고 동기화</h3>
            <p>
              연동된 API에서 최신 실 공고를 가져와 데이터베이스에 저장합니다.
              {lastRun && (
                <span className="last-synced">
                  {' '}
                  마지막 동기화: {new Date(lastRun.ranAt).toLocaleString('ko-KR')}
                </span>
              )}
            </p>
          </div>
          <Button variant="primary" onClick={handleSync} disabled={syncing}>
            {syncing ? '동기화 중...' : '지금 동기화'}
          </Button>
        </div>

        {result && (
          <div className={`sync-result ${result.ok ? 'success' : 'error'}`}>
            {result.ok ? (
              <>
                <strong>동기화 완료</strong>
                <p>
                  조달청 {result.fetched?.pps ?? 0}건 · 낙찰정보 {result.fetched?.ppsAward ?? 0}건 ·
                  방위사업청 {result.fetched?.dapa ?? 0}건 · 한전 {result.fetched?.kepco ?? 0}건 ·
                  도로공사 {result.fetched?.ex ?? 0}건 조회 →
                  저장 {result.upserted ?? 0}건, 낙찰매칭 {result.awardMatched ?? 0}건
                </p>
                {result.exDebugSample && (
                  <p className="sync-debug-sample">EX 응답 샘플: {result.exDebugSample}</p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <ul className="sync-error-list">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <strong>동기화 실패</strong>
                <p>{result.error}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
