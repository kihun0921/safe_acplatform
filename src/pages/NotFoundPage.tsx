import { Link } from 'react-router-dom'

export default function NotFoundPage(): JSX.Element {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', minHeight: '60vh' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>404</h1>
      <p style={{ fontSize: '20px', marginBottom: '30px', color: 'var(--text-secondary)' }}>
        페이지를 찾을 수 없습니다
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
