import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import Header from './components/common/Header'
import Spinner from './components/common/Spinner/Spinner'
import UnauthorizedGuard from './components/common/UnauthorizedGuard/UnauthorizedGuard'
import NotFoundPage from './pages/NotFoundPage'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const DocumentWizardPage = lazy(() => import('./pages/DocumentWizardPage'))
const InquiriesPage = lazy(() => import('./pages/InquiriesPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminMembersPage = lazy(() => import('./pages/AdminMembersPage'))
const AdminSubscriptionsPage = lazy(() => import('./pages/AdminSubscriptionsPage'))
const AdminCouponsPage = lazy(() => import('./pages/AdminCouponsPage'))
const AdminApiSyncPage = lazy(() => import('./pages/AdminApiSyncPage'))
const DesignSyncValidationPage = lazy(() => import('./pages/DesignSyncValidationPage'))

function ProtectedRoute({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode
  isAuthenticated: boolean
}): JSX.Element {
  return isAuthenticated ? <>{children}</> : <UnauthorizedGuard />
}

function AdminRoute({
  children,
  role,
}: {
  children: React.ReactNode
  role: string | null
}): JSX.Element {
  return role === 'admin' ? <>{children}</> : <UnauthorizedGuard />
}

// 이미 로그인된 사용자가 /login, /signup에 진입하면(뒤로가기, 예전 링크, 직접 URL 입력 등)
// 로그인 폼이 아니라 각자의 홈으로 보낸다 — 세션은 멀쩡한데 로그인 화면이 떠서 혼란을 주는
// 문제를 막기 위함.
function GuestRoute({
  children,
  isAuthenticated,
  role,
}: {
  children: React.ReactNode
  isAuthenticated: boolean
  role: string | null
}): JSX.Element {
  if (!isAuthenticated) return <>{children}</>
  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/documents'} replace />
}

// 카카오톡 등으로 전달된 쿠폰 QR 딥링크(?coupon=CODE)는 로그인 여부와 무관하게 열릴 수 있다.
// /documents가 ProtectedRoute라 미로그인시 UnauthorizedGuard로 바뀌면서 쿼리파라미터가
// 사라지므로, 라우팅/인증 상태와 무관하게 항상 마운트되는 이 최상단에서 코드값을 미리
// localStorage에 저장해두고, 로그인 후 DocumentsPage가 그 값을 읽어 등록 모달을 띄운다.
function useStashCouponFromUrl(): void {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('coupon')
    if (code) localStorage.setItem('pendingCouponCode', code)
  }, [])
}

function App(): JSX.Element {
  const { user, role, isLoading, logout } = useAuth()
  const isAuthenticated = user !== null
  useStashCouponFromUrl()

  if (isLoading) {
    return <div>로드중...</div>
  }

  return (
    <Router>
      <Header role={role} user={user} onLogout={logout} />
      <main>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <GuestRoute isAuthenticated={isAuthenticated} role={role}>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute isAuthenticated={isAuthenticated} role={role}>
                  <SignupPage />
                </GuestRoute>
              }
            />

            <Route
              path="/announcements"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AnnouncementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/wizard/:documentId"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <DocumentWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiries"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <InquiriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-page"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <MyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SubscriptionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute role={role}>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/members"
              element={
                <AdminRoute role={role}>
                  <AdminMembersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <AdminRoute role={role}>
                  <AdminSubscriptionsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <AdminRoute role={role}>
                  <AdminCouponsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/api-credentials"
              element={
                <AdminRoute role={role}>
                  <AdminApiSyncPage />
                </AdminRoute>
              }
            />

            <Route
              path="/design-sync-validation"
              element={<DesignSyncValidationPage />}
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </Router>
  )
}

export default App
