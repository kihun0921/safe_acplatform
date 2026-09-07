import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSitePage, SitePage } from '../services/supabaseClient'
import Spinner from '../components/common/Spinner/Spinner'
import './LegalPage.css'

// 이용약관/개인정보처리방침/고객센터/환불규정 등 관리자가 편집하는 공개 페이지를 그대로
// 보여준다. slug만 다르고 구조는 동일해 하나의 컴포넌트로 공용 사용.
export default function LegalPage({ slug }: { slug: string }): JSX.Element {
  const [page, setPage] = useState<SitePage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSitePage(slug).then((data) => {
      if (!cancelled) {
        setPage(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div className="legal-page">
      <div className="container legal-page-inner">
        {loading ? (
          <Spinner />
        ) : page ? (
          <>
            <h1 className="legal-page-title">{page.title}</h1>
            <p className="legal-page-updated">
              최종 수정일: {new Date(page.updatedAt).toLocaleDateString('ko-KR')}
            </p>
            <div className="legal-page-content">{page.content}</div>
          </>
        ) : (
          <p className="legal-page-empty">페이지 내용을 불러올 수 없습니다.</p>
        )}
        <Link to="/" className="legal-page-back">
          ← 홈으로
        </Link>
      </div>
    </div>
  )
}
