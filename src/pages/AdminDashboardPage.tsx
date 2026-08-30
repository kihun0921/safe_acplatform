import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/common/Badge/Badge'
import Spinner from '../components/common/Spinner/Spinner'
import { supabase } from '../services/supabaseClient'
import './AdminDashboardPage.css'

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalDocuments: number
  inProgressDocuments: number
  completedDocuments: number
  totalAnnouncements: number
  openInquiries: number
}

interface RecentMember {
  id: string
  name: string
  company: string
  created_at: string
}

interface RecentDocument {
  id: string
  title: string
  status: string
  updated_at: string
}

const EMPTY_STATS: DashboardStats = {
  totalMembers: 0,
  activeMembers: 0,
  totalDocuments: 0,
  inProgressDocuments: 0,
  completedDocuments: 0,
  totalAnnouncements: 0,
  openInquiries: 0,
}

export default function AdminDashboardPage(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [
          totalMembers,
          activeMembers,
          totalDocuments,
          inProgressDocuments,
          completedDocuments,
          totalAnnouncements,
          openInquiries,
          recentMembersRes,
          recentDocumentsRes,
          lastSyncRes,
        ] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('announcements').select('id', { count: 'exact', head: true }),
          supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          supabase
            .from('members')
            .select('id, name, company, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('documents')
            .select('id, title, status, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5),
          supabase.from('sync_log').select('ran_at').order('ran_at', { ascending: false }).limit(1).maybeSingle(),
        ])

        setStats({
          totalMembers: totalMembers.count ?? 0,
          activeMembers: activeMembers.count ?? 0,
          totalDocuments: totalDocuments.count ?? 0,
          inProgressDocuments: inProgressDocuments.count ?? 0,
          completedDocuments: completedDocuments.count ?? 0,
          totalAnnouncements: totalAnnouncements.count ?? 0,
          openInquiries: openInquiries.count ?? 0,
        })
        setRecentMembers((recentMembersRes.data as RecentMember[] | null) ?? [])
        setRecentDocuments((recentDocumentsRes.data as RecentDocument[] | null) ?? [])
        setLastSyncAt((lastSyncRes.data?.ran_at as string | undefined) ?? null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '대시보드 조회에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="admin-dashboard-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">관리자 대시보드</h1>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="dashboard-error">{error}</div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">전체 회원</span>
                <span className="stat-value">{stats.totalMembers.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">활성 회원</span>
                <span className="stat-value">{stats.activeMembers.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">전체 계획서</span>
                <span className="stat-value">{stats.totalDocuments.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">작성중 계획서</span>
                <span className="stat-value">{stats.inProgressDocuments.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">완료 계획서</span>
                <span className="stat-value">{stats.completedDocuments.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">전체 공고</span>
                <span className="stat-value">{stats.totalAnnouncements.toLocaleString('ko-KR')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">미답변 문의</span>
                <span className="stat-value">{stats.openInquiries.toLocaleString('ko-KR')}</span>
              </div>
            </div>

            <div className="dashboard-panels">
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h2>최근 가입 회원</h2>
                  <Link to="/admin/members">전체 보기 →</Link>
                </div>
                <ul className="recent-list">
                  {recentMembers.map((m) => (
                    <li key={m.id}>
                      <span className="recent-primary">
                        {m.name || '(이름 없음)'}
                        {m.company && <span className="recent-secondary"> · {m.company}</span>}
                      </span>
                      <span className="recent-date">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </li>
                  ))}
                  {recentMembers.length === 0 && <li className="recent-empty">가입한 회원이 없습니다.</li>}
                </ul>
              </div>

              <div className="dashboard-panel">
                <div className="panel-header">
                  <h2>최근 작성된 계획서</h2>
                </div>
                <ul className="recent-list">
                  {recentDocuments.map((d) => (
                    <li key={d.id}>
                      <span className="recent-primary">{d.title}</span>
                      <Badge
                        status={d.status === 'completed' ? 'success' : 'warn'}
                        label={d.status === 'completed' ? '완료' : '작성중'}
                      />
                      <span className="recent-date">
                        {d.updated_at ? new Date(d.updated_at).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </li>
                  ))}
                  {recentDocuments.length === 0 && <li className="recent-empty">작성된 계획서가 없습니다.</li>}
                </ul>
              </div>

              <div className="dashboard-panel">
                <div className="panel-header">
                  <h2>API 연동 현황</h2>
                  <Link to="/admin/api-credentials">관리 →</Link>
                </div>
                <p className="dashboard-panel-text">
                  마지막 동기화: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('ko-KR') : '동기화 이력 없음'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
