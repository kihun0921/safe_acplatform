import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Input from '../components/common/Input/Input'
import Badge from '../components/common/Badge/Badge'
import Spinner from '../components/common/Spinner/Spinner'
import { useSupabaseAnnouncements } from '../hooks/useSupabaseAnnouncements'
import { useSupabaseDocuments } from '../hooks/useSupabaseDocuments'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess'
import TrialBanner from '../components/common/TrialBanner/TrialBanner'
import './AnnouncementsPage.css'

export default function AnnouncementsPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    announcements,
    allAnnouncements,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useSupabaseAnnouncements()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { createDocument } = useSupabaseDocuments(user?.id)
  const { canCreateDocument } = useSubscriptionAccess()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startingId, setStartingId] = useState<string | null>(null)

  const categories = [...new Set(allAnnouncements.map((a) => a.category).filter(Boolean))]

  const filtered = announcements.filter(
    (ann) => !selectedCategory || ann.category === selectedCategory,
  )

  const handleStart = async (announcementId: string, title: string) => {
    if (!canCreateDocument) {
      if (window.confirm('무료체험 기간이 종료되었습니다. 계획서 작성을 계속하려면 구독이 필요합니다.\n구독 관리 페이지로 이동할까요?')) {
        navigate('/subscription')
      }
      return
    }
    setStartingId(announcementId)
    try {
      const doc = await createDocument(announcementId, `${title} 계획서`)
      if (doc) navigate(`/documents/wizard/${doc.id}`)
    } catch (err) {
      alert('계획서 생성에 실패했습니다.')
    } finally {
      setStartingId(null)
    }
  }

  return (
    <div className="announcements-page">
      <div className="container">
        <h1 className="page-title">공고 조회</h1>
        <TrialBanner />

        <div className="search-section">
          <Input
            type="text"
            placeholder="공고명이나 발주처를 검색하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="filter-buttons">
            <button
              className={`filter-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="empty-result">
            <p>공고 조회에 실패했습니다: {error}</p>
            <button className="filter-btn" onClick={refetch}>
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-result">
            <p>검색 조건에 맞는 공고가 없습니다.</p>
          </div>
        ) : (
          <div className="aw-list">
            {filtered.map((ann) => (
              <div key={ann.id} className="aw-card">
                <div className="aw-card-main">
                  <div className="aw-card-badges">
                    {ann.category && <Badge status="info" label={ann.category} />}
                    {ann.industryType && <Badge status="default" label={ann.industryType} />}
                  </div>
                  <h3>{ann.title}</h3>
                  <p className="aw-card-meta">
                    발주처: {ann.organization || '-'} · 마감일: {ann.deadline || '-'}
                    {ann.status && ` · 상태: ${ann.status}`}
                    {ann.estimatedPrice &&
                      ` · 기초금액/예정가격: ${Number(ann.estimatedPrice).toLocaleString('ko-KR')}원`}
                  </p>
                  {(ann.contactName || ann.contactPhone) && (
                    <p className="aw-card-meta">
                      담당자: {ann.contactName || '-'}
                      {ann.contactPhone && ` · 연락처: ${ann.contactPhone}`}
                    </p>
                  )}
                  {ann.awarded && ann.winnerName && (
                    <p className="aw-card-meta aw-card-winner">
                      낙찰자: {ann.winnerName}
                      {ann.winnerAmount && ` · 낙찰금액: ${Number(ann.winnerAmount).toLocaleString('ko-KR')}원`}
                    </p>
                  )}
                </div>
                <div className="aw-card-actions">
                  {ann.sourceUrl && (
                    <a
                      className="btn btn-secondary btn-sm"
                      href={ann.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      공고원문 보기
                    </a>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={startingId !== null}
                    onClick={() => handleStart(ann.id, ann.title)}
                  >
                    {startingId === ann.id ? '생성 중...' : '계획서 작성 시작'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
