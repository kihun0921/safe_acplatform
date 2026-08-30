import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../components/common/Badge/Badge'
import Spinner from '../components/common/Spinner/Spinner'
import { useSupabaseAnnouncements } from '../hooks/useSupabaseAnnouncements'
import './LandingPage.css'

const PROCESS_STEPS = [
  { n: 1, title: '공고 검색', desc: '나라장터 API로 최신 입찰 공고를 검색합니다.' },
  { n: 2, title: '요구사항 자동 분석', desc: '공고 첨부 서식에서 필수 작성 항목을 자동으로 파악합니다.' },
  { n: 3, title: '단계별 작성', desc: '마법사를 따라 항목별로 계획서를 작성합니다.' },
  { n: 4, title: '다운로드', desc: '완성된 계획서를 PDF · DOCX로 바로 받아보세요.' },
]

function calcDday(deadline: string): string {
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  return diff >= 0 ? `D-${diff}` : '마감'
}

export default function LandingPage(): JSX.Element {
  const navigate = useNavigate()
  const { announcements, loading, error } = useSupabaseAnnouncements(20)
  const [heroQuery, setHeroQuery] = useState('')
  const [showcaseIndex, setShowcaseIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  const showcasePool = announcements.slice(0, 6)

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = heroQuery.trim() ? `?q=${encodeURIComponent(heroQuery.trim())}` : ''
    navigate(`/announcements${params}`)
  }

  // 실제 공고를 몇 초마다 순환 표시해 "실시간 분석 중"을 시각적으로 표현
  useEffect(() => {
    if (showcasePool.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setShowcaseIndex((prev) => (prev + 1) % showcasePool.length)
        setFadeIn(true)
      }, 300)
    }, 3500)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showcasePool.length])

  const showcase = showcasePool[showcaseIndex % showcasePool.length]

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="hero-badge">나라장터 연동 자동화 서비스</span>
            <h1 className="hero-title">
              공고에 맞는 안전보건관리계획서,
              <br />
              자동으로 완성하세요
            </h1>
            <p className="hero-subtitle">
              나라장터 공고문을 분석해 요구하는 항목을 자동으로 파악하고, 단계별
              절차에 따라 계획서를 작성한 뒤 PDF 또는 DOCX로 바로
              다운로드하세요.
            </p>

            <form className="hero-search" onSubmit={handleHeroSearch}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="공고명, 발주기관, 공고번호로 검색"
                aria-label="공고 검색"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-accent">
                검색
              </button>
            </form>

            <div className="hero-feature-list">
              <span>
                <CheckIcon /> PDF · DOCX 지원
              </span>
              <span>
                <CheckIcon /> 공고 요구 항목 자동 매칭
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-indicator">
              <span className="dot" />
              <span className="pulse-text-opacity">실시간 공고 분석 중</span>
            </div>
            <div className="floating-card">
              <div className={`floating-card-header ${fadeIn ? 'is-visible' : 'is-fading'}`}>
                <div className="file-icon">
                  <FileIcon />
                </div>
                <div className="file-info">
                  <div className="file-title">안전보건관리계획서.pdf</div>
                  <div className="file-subtitle">
                    {showcase ? showcase.title : 'OO초등학교 증축공사'}
                  </div>
                </div>
                <Badge status="success" label="작성 완료" />
              </div>

              <div className="hero-checklist">
                {['공고 요구사항', '작업 절차', '안전 관리 조직', '비상 대응 계획'].map(
                  (label) => (
                    <div key={label} className="hero-checklist-item">
                      <CheckIcon />
                      <span>{label}</span>
                      <span className="auto-tag">자동 인식</span>
                    </div>
                  )
                )}
              </div>

              <div className="hero-progress">
                <div className="hero-progress-bar">
                  <div className="hero-progress-fill" style={{ width: '100%' }} />
                </div>
                <div className="hero-progress-footer">
                  <span>4/4 단계 완료</span>
                  <span>PDF · DOCX 다운로드 가능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Preview */}
      <section id="announcements" className="announcements-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>나라장터 공고 검색</h2>
              <p className="section-note">조달청·방위사업청 실시간 연동 공고</p>
            </div>
            <Link to="/announcements" className="btn btn-secondary">
              전체 공고 보기
            </Link>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="empty-message">공고 조회에 실패했습니다: {error}</div>
          ) : announcements.length > 0 ? (
            <div className="announcement-list announcement-list-scroll">
              {announcements.map((a) => (
                <div key={a.id} className="announcement-card">
                  <div className="announcement-main">
                    <div className="announcement-badges">
                      {a.category && <Badge status="info" label={a.category} />}
                      <Badge status="warn" label={calcDday(a.deadline)} />
                    </div>
                    <h3>{a.title}</h3>
                    <p className="announcement-meta">
                      {a.organization || '-'} · 마감 {a.deadline || '-'}
                    </p>
                    {a.awarded && a.winnerName && (
                      <p className="announcement-meta announcement-winner">
                        낙찰자: {a.winnerName}
                        {a.winnerAmount &&
                          ` · 낙찰금액: ${Number(a.winnerAmount).toLocaleString('ko-KR')}원`}
                      </p>
                    )}
                  </div>
                  <div className="announcement-actions">
                    <Link to="/login" className="btn btn-primary btn-sm">
                      계획서 작성 시작
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-message">검색 조건에 맞는 공고가 없습니다.</div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="process-section">
        <div className="container">
          <div className="section-header-center">
            <h2>이용방법</h2>
            <p>공고 검색부터 다운로드까지, 네 단계면 충분합니다</p>
          </div>
          <div className="process-grid">
            {PROCESS_STEPS.map((step) => (
              <div key={step.n} className="process-card">
                <div className="process-number">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <h2>주요 기능</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <SearchIcon />
              </div>
              <h3>실시간 나라장터 연동</h3>
              <p>나라장터 공공데이터 개방 API로 최신 입찰 공고를 바로 검색합니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-badge">
                <DocIcon />
              </div>
              <h3>양식 자동 인식</h3>
              <p>공고 첨부 서식에서 필수 작성 항목을 자동으로 파악합니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-badge">
                <DownloadIcon />
              </div>
              <h3>PDF · DOCX 다운로드</h3>
              <p>완성된 계획서를 원하는 형식으로 바로 다운로드하세요.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container cta-box">
          <div>
            <h2>지금 바로 시작해보세요</h2>
            <p>공고 검색부터 계획서 작성까지, 7일간 무료로 체험해보세요.</p>
          </div>
          <Link to="/signup" className="btn btn-accent btn-lg">
            7일 무료체험 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <ShieldIcon />
              <span>올케어안전플랫폼</span>
            </div>
            <p>
              [회사명] · 대표 [대표자명]
              <br />
              사업자등록번호 [000-00-00000]
            </p>
          </div>
          <div className="footer-links">
            <span className="footer-heading">바로가기</span>
            <Link to="/announcements">공고검색</Link>
            <Link to="/documents">내 문서함</Link>
            <a href="#how-it-works">이용방법</a>
          </div>
          <div className="footer-links">
            <span className="footer-heading">고객지원</span>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 올케어안전플랫폼. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12 9 17 20 6" />
    </svg>
  )
}

function FileIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h5M9.5 15h5M9.5 9h2" />
    </svg>
  )
}

function SearchIcon(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function DocIcon(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </svg>
  )
}

function DownloadIcon(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

function ShieldIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v5c0 4.5-2.9 8.4-7 9.7C7.9 19.4 5 15.5 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
