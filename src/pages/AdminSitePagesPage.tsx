import { useEffect, useState } from 'react'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Textarea from '../components/common/Textarea/Textarea'
import { getAllSitePages, updateSitePage, SitePage } from '../services/supabaseClient'
import { getErrorMessage } from '../utils/errorMessage'
import './AdminSitePagesPage.css'

interface EditableState {
  title: string
  content: string
}

export default function AdminSitePagesPage(): JSX.Element {
  const [pages, setPages] = useState<SitePage[]>([])
  const [drafts, setDrafts] = useState<Record<string, EditableState>>({})
  const [loading, setLoading] = useState(true)
  const [savingSlug, setSavingSlug] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await getAllSitePages()
    setPages(data)
    setDrafts(Object.fromEntries(data.map((p) => [p.slug, { title: p.title, content: p.content }])))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const updateDraft = (slug: string, patch: Partial<EditableState>) =>
    setDrafts((prev) => {
      const current: EditableState = prev[slug] ?? { title: '', content: '' }
      const next: EditableState = { ...current, ...patch }
      return { ...prev, [slug]: next }
    })

  const handleSave = async (slug: string) => {
    const draft = drafts[slug]
    if (!draft) return
    setSavingSlug(slug)
    setSavedSlug(null)
    try {
      const { error } = await updateSitePage(slug, draft.title, draft.content)
      if (error) throw error
      setSavedSlug(slug)
      await load()
    } catch (err) {
      alert(`저장에 실패했습니다: ${getErrorMessage(err)}`)
    } finally {
      setSavingSlug(null)
    }
  }

  return (
    <div className="admin-site-pages-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">사이트 페이지 관리</h1>
        </div>
        <p className="page-desc">
          여기서 수정하고 저장하면 즉시 공개 페이지(이용약관·개인정보처리방침·고객센터·환불규정)에
          반영됩니다.
        </p>

        {loading ? (
          <p>로드중...</p>
        ) : (
          pages.map((page) => {
            const draft = drafts[page.slug] ?? { title: page.title, content: page.content }
            return (
              <div key={page.slug} className="site-page-card">
                <div className="site-page-card-header">
                  <span className="site-page-slug">/{page.slug}</span>
                  <span className="site-page-updated">
                    최종 수정: {new Date(page.updatedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <Input
                  label="제목"
                  value={draft.title}
                  onChange={(e) => updateDraft(page.slug, { title: e.target.value })}
                />
                <Textarea
                  label="내용"
                  value={draft.content}
                  onChange={(e) => updateDraft(page.slug, { content: e.target.value })}
                  rows={14}
                />
                <div className="site-page-card-actions">
                  {savedSlug === page.slug && <span className="site-page-saved">저장됨</span>}
                  <Button
                    variant="primary"
                    onClick={() => handleSave(page.slug)}
                    disabled={savingSlug === page.slug}
                  >
                    {savingSlug === page.slug ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
