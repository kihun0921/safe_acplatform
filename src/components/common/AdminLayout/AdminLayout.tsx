import { NavLink } from 'react-router-dom'
import './AdminLayout.css'

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: '대시보드' },
  { to: '/admin/members', label: '회원관리' },
  { to: '/admin/api-credentials', label: 'API관리' },
  { to: '/admin/subscriptions', label: '결제관리' },
  { to: '/admin/coupons', label: '쿠폰관리' },
  { to: '/admin/site-pages', label: '사이트페이지 관리' },
]

// 관리자 페이지 전용 좌측 메뉴 레이아웃 — AdminRoute가 감싸는 모든 /admin/* 페이지에 공통 적용.
export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">관리자 메뉴</div>
        <nav className="admin-sidebar-nav">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  )
}
