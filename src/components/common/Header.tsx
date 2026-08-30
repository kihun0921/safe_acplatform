import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, UserRole } from '../../hooks/useAuth'
import logo from '../../assets/logo.png'
import './Header.css'

interface HeaderProps {
  role: UserRole
  user: User | null
  onLogout: () => Promise<void>
}

export default function Header({ role, user, onLogout }: HeaderProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    await onLogout()
    navigate('/')
  }

  const isAuthenticated = user !== null
  const isAdmin = role === 'admin'

  const closeMenu = (): void => setIsMenuOpen(false)

  return (
    <header className={`header ${isAdmin ? 'header-admin' : ''}`}>
      <div className="header-container">
        <div className="header-logo">
          <Link to="/" className="logo-link">
            <img src={logo} alt="올케어안전플랫폼" className="logo-image" />
            <span>올케어안전플랫폼</span>
            {isAdmin && <span className="admin-badge">관리자</span>}
          </Link>
        </div>

        <nav className={`header-nav ${isMenuOpen ? 'open' : ''}`}>
          <ul className="nav-links">
            {isAuthenticated && role === 'member' && (
              <>
                <li>
                  <Link to="/announcements" onClick={closeMenu}>
                    공고검색
                  </Link>
                </li>
                <li>
                  <Link to="/documents" onClick={closeMenu}>
                    내 문서함
                  </Link>
                </li>
                <li>
                  <Link to="/inquiries" onClick={closeMenu}>
                    문의하기
                  </Link>
                </li>
                <li>
                  <Link to="/subscription" onClick={closeMenu}>
                    구독관리
                  </Link>
                </li>
                <li>
                  <Link to="/my-page" onClick={closeMenu}>
                    마이페이지
                  </Link>
                </li>
              </>
            )}

            {isAuthenticated && isAdmin && (
              <>
                <li>
                  <Link to="/admin/dashboard" onClick={closeMenu}>
                    대시보드
                  </Link>
                </li>
                <li>
                  <Link to="/admin/members" onClick={closeMenu}>
                    회원관리
                  </Link>
                </li>
                <li>
                  <Link to="/admin/api-credentials" onClick={closeMenu}>
                    API관리
                  </Link>
                </li>
                <li>
                  <Link to="/admin/subscriptions" onClick={closeMenu}>
                    결제관리
                  </Link>
                </li>
                <li>
                  <Link to="/admin/coupons" onClick={closeMenu}>
                    쿠폰관리
                  </Link>
                </li>
                <li>
                  <Link to="/admin/inquiries" onClick={closeMenu}>
                    문의관리
                  </Link>
                </li>
              </>
            )}

            {!isAuthenticated && (
              <>
                <li>
                  <Link to="/announcements" onClick={closeMenu}>
                    공고검색
                  </Link>
                </li>
                <li>
                  <Link to="/#how-it-works" onClick={closeMenu}>
                    이용방법
                  </Link>
                </li>
                <li>
                  <Link to="/login" onClick={closeMenu}>
                    로그인
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="btn btn-accent header-cta" onClick={closeMenu}>
                    7일 무료체험 시작하기
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-actions">
          {isAuthenticated && user && (
            <div className="user-menu">
              <span className="user-name">{user.name}님</span>
              <button className="logout-btn" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>

        <button
          className="mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="메뉴 토글"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  )
}
