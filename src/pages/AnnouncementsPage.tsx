import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Input from '../components/common/Input/Input'
import Badge from '../components/common/Badge/Badge'
import Spinner from '../components/common/Spinner/Spinner'
import { useSupabaseAnnouncements } from '../hooks/useSupabaseAnnouncements'
import { useSupabaseDocuments } from '../hooks/useSupabaseDocuments'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess'
import TrialBanner from '../components/common/TrialBanner/TrialBanner'
import { createEmptyWizardContent, mergeWizardContent } from '../types/wizardContent'
import { getMyDocumentTemplate } from '../services/supabaseClient'
import { classifyConstructionType, buildRiskOverviewText, buildRiskRowsFromTemplate } from '../types/constructionTemplates'
import { extractBusinessOverviewFromText } from '../utils/manualAnnouncementExtraction'
import { extractTextFromPdfFile } from '../utils/pdfTextExtraction'
import './AnnouncementsPage.css'

export default function AnnouncementsPage(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const manualStartRef = useRef<HTMLDivElement>(null)
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

  // 랜딩페이지/헤더의 "직접작성" 메뉴에서 /announcements#manual-start로 들어온 경우,
  // 목록 위에 있는 수동 입력 섹션까지 자동으로 스크롤해준다.
  useEffect(() => {
    if (location.hash === '#manual-start') {
      manualStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  const { createDocument } = useSupabaseDocuments(user?.id)
  const { canCreateDocument } = useSubscriptionAccess()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startingId, setStartingId] = useState<string | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualOrgName, setManualOrgName] = useState('')
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [manualStarting, setManualStarting] = useState(false)

  const categories = [...new Set(allAnnouncements.map((a) => a.category).filter(Boolean))]

  const filtered = announcements.filter(
    (ann) => !selectedCategory || ann.category === selectedCategory,
  )

  // 공고 자동수집(외부 API)과 수동 입력 시작 모두에서 쓰는 공통 체험기간 체크.
  const checkCanCreateDocument = () => {
    if (canCreateDocument) return true
    if (window.confirm('무료체험 기간이 종료되었습니다. 계획서 작성을 계속하려면 구독이 필요합니다.\n구독 관리 페이지로 이동할까요?')) {
      navigate('/subscription')
    }
    return false
  }

  const handleStart = async (announcementId: string, title: string) => {
    if (!checkCanCreateDocument()) return
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

  // LH 등 외부 API로 아직 자동수집되지 않은 공고는 검색에 걸리지 않아 계획서 작성을
  // 시작할 방법이 없었다. 공사명(필수)과, 있다면 발주기관·공고문 PDF 첨부로 직접 입력해서
  // 공고 연결 없이(announcement_id: null) 계획서를 시작할 수 있게 한다. 공고문 PDF를
  // 첨부하면 API로 공고를 가져왔을 때와 동일하게 공종을 추정해 표준 위험성평가 항목을 미리
  // 채우고, 브라우저에서 PDF 텍스트를 직접 뽑아 라벨 기반 파싱으로 사업개요(공사기간/위치/
  // 내용)도 자동으로 채워본다(서버 배포 없이 클라이언트에서만 처리).
  const handleManualStart = async () => {
    const title = manualTitle.trim()
    if (!title) return
    if (!checkCanCreateDocument()) return
    setManualStarting(true)
    try {
      const constructionType = classifyConstructionType(title)
      // 회원이 저장해둔 "내 기본 템플릿"이 있으면 그걸 출발점으로 쓰고, 없으면 빈 기본값에서 시작.
      const template = user ? await getMyDocumentTemplate(user.id) : null
      const initialContent = template ? mergeWizardContent(template) : createEmptyWizardContent()
      initialContent.cover.projectName = title
      initialContent.cover.orgName = manualOrgName.trim()
      initialContent.riskAssessment.constructionType = constructionType
      // 템플릿에 이미 위험성평가 항목이 있으면(회원이 저장해둔 매트릭스) 그대로 두고,
      // 없을 때만 공사종류 기반 표준 항목으로 채운다.
      if (initialContent.riskAssessment.rows.length === 0) {
        initialContent.riskAssessment.overview = buildRiskOverviewText(
          title,
          constructionType,
          initialContent.riskAssessment.method,
        )
        initialContent.riskAssessment.rows = buildRiskRowsFromTemplate(constructionType)
      }

      if (manualFile) {
        try {
          const text = await extractTextFromPdfFile(manualFile)
          initialContent.businessOverview = {
            ...initialContent.businessOverview,
            ...extractBusinessOverviewFromText(text),
          }
        } catch (err) {
          console.error('공고문 PDF 텍스트 추출 실패:', err)
        }
      }

      const doc = await createDocument(null, `${title} 계획서`, initialContent)
      if (doc) navigate(`/documents/wizard/${doc.id}`)
    } catch (err) {
      alert('계획서 생성에 실패했습니다.')
    } finally {
      setManualStarting(false)
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

        <div className="manual-start-section" id="manual-start" ref={manualStartRef}>
          <p className="manual-start-hint">
            찾는 공고가 목록에 없나요? LH 등 공고 자동수집(외부 API)에 아직 반영되지 않은 경우, 공사명과
            공고문 파일을 직접 입력해서 계획서 작성을 바로 시작할 수 있습니다.
          </p>
          <div className="manual-start-row">
            <Input
              type="text"
              placeholder="공사명을 입력하세요 (예: 화성동탄(2) 근린공원31호 지하주차장 설치공사)"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
            <Input
              type="text"
              placeholder="발주기관 (선택)"
              value={manualOrgName}
              onChange={(e) => setManualOrgName(e.target.value)}
            />
          </div>
          <div className="manual-file-row">
            <input
              id="manual-announcement-file"
              type="file"
              accept=".pdf,application/pdf"
              className="manual-file-input"
              onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="manual-announcement-file" className="btn btn-secondary btn-sm manual-file-label">
              <PaperclipIcon /> 공고문 첨부 (PDF)
            </label>
            {manualFile ? (
              <span className="manual-file-chip">
                {manualFile.name}
                <button
                  type="button"
                  className="manual-file-remove"
                  onClick={() => setManualFile(null)}
                  aria-label="첨부한 공고문 제거"
                >
                  ×
                </button>
              </span>
            ) : (
              <span className="manual-file-empty">
                PDF를 첨부하면 공사기간·위치·내용을 자동으로 채워봅니다. 첨부하지 않아도 계획서 작성 단계에서
                직접 입력할 수 있습니다.
              </span>
            )}
          </div>
          <button
            className="btn btn-secondary btn-sm manual-start-btn"
            disabled={!manualTitle.trim() || manualStarting}
            onClick={handleManualStart}
          >
            {manualStarting ? '생성 중...' : '직접 입력해서 시작'}
          </button>
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

function PaperclipIcon(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48" />
    </svg>
  )
}
