import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge, { BadgeStatus } from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Spinner from '../components/common/Spinner/Spinner'
import CouponRedeemModal from '../components/common/CouponRedeemModal/CouponRedeemModal'
import { useAuth } from '../hooks/useAuth'
import { useSupabaseDocuments } from '../hooks/useSupabaseDocuments'
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess'
import TrialBanner from '../components/common/TrialBanner/TrialBanner'
import { AppDocument, getSignedFileUrl, getRedeemedCouponDocumentIds } from '../services/supabaseClient'
import { collectAttachmentPaths } from '../types/wizardContent'
import { exportToPDF, exportToDOCX, buildExportContent, sanitizeFilename } from '../utils/documentExport'
import { getErrorMessage } from '../utils/errorMessage'
import './DocumentsPage.css'

const PENDING_COUPON_KEY = 'pendingCouponCode'

interface CouponModalState {
  initialDocumentId?: string
  initialCode?: string
}

function countAttachments(doc: AppDocument): number {
  return collectAttachmentPaths(doc.content).length
}

function statusBadge(doc: AppDocument): { status: BadgeStatus; label: string } {
  if (doc.status === 'completed') return { status: 'success', label: '완료' }
  if (doc.percentComplete === 0) return { status: 'default', label: '임시저장' }
  return { status: 'warn', label: '작성중' }
}

export default function DocumentsPage(): JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { documents, loading, error, refetch, deleteDocument } = useSupabaseDocuments(user?.id)
  const { canDownload } = useSubscriptionAccess()
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [unlockedDocIds, setUnlockedDocIds] = useState<Set<string>>(new Set())
  const [couponModal, setCouponModal] = useState<CouponModalState | null>(null)

  useEffect(() => {
    if (!user) return
    getRedeemedCouponDocumentIds(user.id).then(setUnlockedDocIds)
  }, [user?.id])

  // QR 딥링크(App.tsx가 URL의 ?coupon=을 로그인 상태와 무관하게 미리 저장해둔 값)로 진입한 경우,
  // 이 페이지에 도착하는 시점에 등록 모달을 자동으로 띄운다.
  useEffect(() => {
    const pendingCode = localStorage.getItem(PENDING_COUPON_KEY)
    if (pendingCode) {
      localStorage.removeItem(PENDING_COUPON_KEY)
      setCouponModal({ initialCode: pendingCode })
    }
  }, [])

  const canDownloadDocument = (docId: string) => canDownload || unlockedDocIds.has(docId)

  // documents는 이미 최근 저장순으로 정렬되어 있음 — 그 순서를 그대로 번호(최신=최댓값)로 사용해
  // 검색/필터로 목록이 줄어도 번호가 흔들리지 않도록 한다.
  const numbered = documents.map((doc, idx) => ({ doc, no: documents.length - idx }))

  const query = searchQuery.trim().toLowerCase()
  const filtered = numbered.filter(({ doc }) => {
    if (filter !== 'all' && doc.status !== filter) return false
    if (!query) return true
    return (
      doc.title.toLowerCase().includes(query) || doc.content.cover.orgName.toLowerCase().includes(query)
    )
  })

  const handleDownload = async (docId: string, format: 'pdf' | 'docx') => {
    if (!canDownloadDocument(docId)) return
    try {
      setDownloading(`${docId}-${format}`)

      const doc = documents.find((d) => d.id === docId)
      if (!doc) throw new Error('문서를 찾을 수 없습니다')

      const content = await buildExportContent(doc.content, async (path) => {
        const { data } = await getSignedFileUrl(path)
        return data
      })

      const safeTitle = sanitizeFilename(doc.title)
      if (format === 'pdf') {
        await exportToPDF(content, `${safeTitle}.pdf`)
      } else {
        await exportToDOCX(content, `${safeTitle}.docx`)
      }
    } catch (error) {
      console.error('다운로드 오류:', error)
      alert(`다운로드에 실패했습니다.\n${getErrorMessage(error)}`)
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (docId: string, title: string) => {
    if (
      !window.confirm(
        `"${title}" 문서를 삭제하시겠습니까?\n첨부한 파일도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
    } catch (err) {
      alert(`삭제에 실패했습니다.\n${getErrorMessage(err)}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="documents-page">
      <div className="container">
        <h1 className="page-title">내 문서함</h1>
        <TrialBanner />

        <div className="documents-toolbar">
          <div className="filter-tabs">
            <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              전체 ({documents.length})
            </button>
            <button
              className={`tab ${filter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setFilter('in_progress')}
            >
              작성중 ({documents.filter((d) => d.status === 'in_progress').length})
            </button>
            <button
              className={`tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              완료 ({documents.filter((d) => d.status === 'completed').length})
            </button>
          </div>
          <Input
            placeholder="제목, 발주처 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="empty-state">
            문서함 조회에 실패했습니다: {error}
            <div>
              <Button variant="secondary" size="sm" onClick={refetch}>
                다시 시도
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {documents.length === 0
              ? '아직 작성한 계획서가 없습니다. 공고 조회에서 계획서 작성을 시작해보세요.'
              : '조건에 맞는 문서가 없습니다.'}
          </div>
        ) : (
          <div className="documents-table-wrap">
            <table className="documents-table">
              <thead>
                <tr>
                  <th className="col-no">번호</th>
                  <th>제목</th>
                  <th className="col-org">발주처</th>
                  <th className="col-narrow">첨부파일</th>
                  <th className="col-date">최근 저장</th>
                  <th className="col-narrow">작성상태</th>
                  <th className="col-actions col-download">다운로드</th>
                  <th className="col-actions"></th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ doc, no }) => {
                  const badge = statusBadge(doc)
                  const attachments = countAttachments(doc)
                  return (
                    <tr key={doc.id}>
                      <td className="col-no">{no}</td>
                      <td className="col-doc-title">{doc.title}</td>
                      <td className="col-org">{doc.content.cover.orgName || '-'}</td>
                      <td className="col-narrow">{attachments > 0 ? `${attachments}건` : '-'}</td>
                      <td className="col-date">
                        {doc.lastSavedAt ? (
                          <>
                            <div>{new Date(doc.lastSavedAt).toLocaleDateString('ko-KR')}</div>
                            <div className="col-date-time">
                              {new Date(doc.lastSavedAt).toLocaleTimeString('ko-KR')}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="col-narrow">
                        <Badge status={badge.status} label={badge.label} />
                      </td>
                      <td className="col-actions col-download">
                        <div className="download-menu">
                          {canDownloadDocument(doc.id) ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={downloading !== null}
                                onClick={() => handleDownload(doc.id, 'pdf')}
                              >
                                {downloading === `${doc.id}-pdf` ? '...' : 'PDF'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={downloading !== null}
                                onClick={() => handleDownload(doc.id, 'docx')}
                              >
                                {downloading === `${doc.id}-docx` ? '...' : 'DOCX'}
                              </Button>
                            </>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => navigate('/subscription')}>
                              구독하기
                            </Button>
                          )}
                          {!unlockedDocIds.has(doc.id) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setCouponModal({ initialDocumentId: doc.id })}
                            >
                              쿠폰 등록
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="col-actions">
                        <Button variant="primary" size="sm" onClick={() => navigate(`/documents/wizard/${doc.id}`)}>
                          {doc.status === 'completed' ? '보기' : '계속 작성'}
                        </Button>
                      </td>
                      <td className="col-actions">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={deletingId !== null}
                          onClick={() => handleDelete(doc.id, doc.title)}
                        >
                          {deletingId === doc.id ? '삭제 중...' : '삭제'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {couponModal && (
        <CouponRedeemModal
          documents={documents.map((d) => ({ id: d.id, title: d.title }))}
          initialDocumentId={couponModal.initialDocumentId}
          initialCode={couponModal.initialCode}
          onClose={() => setCouponModal(null)}
          onRedeemed={(docId) => setUnlockedDocIds((prev) => new Set(prev).add(docId))}
        />
      )}
    </div>
  )
}
