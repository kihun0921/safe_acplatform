import { Link } from 'react-router-dom'
import Button from '../Button/Button'
import './UnauthorizedGuard.css'

export default function UnauthorizedGuard(): JSX.Element {
  return (
    <div className="unauthorized-guard">
      <div className="guard-content">
        <div className="guard-icon">🔒</div>
        <h2 className="guard-title">로그인이 필요합니다</h2>
        <p className="guard-message">이 페이지를 보려면 먼저 로그인해주세요.</p>
        <div className="guard-actions">
          <Link to="/login">
            <Button variant="primary" size="md" fullWidth>
              로그인
            </Button>
          </Link>
          <Link to="/signup">
            <Button variant="secondary" size="md" fullWidth>
              회원가입
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
