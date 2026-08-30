import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/common/Input/Input'
import Button from '../components/common/Button/Button'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: loginError } = await login(email, password)

      if (loginError) {
        setError(
          loginError.includes('Invalid login credentials')
            ? '이메일 또는 비밀번호가 올바르지 않습니다.'
            : loginError
        )
        return
      }

      navigate('/announcements')
    } catch (err) {
      setError('로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">로그인</h1>
          <p className="login-subtitle">안전보건관리계획서 플랫폼에 로그인하세요</p>

          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="form-error">{error}</div>}

            <Input
              label="이메일"
              type="email"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              로그인
            </Button>
          </form>

          <div className="login-footer">
            <p>
              계정이 없으신가요? <a href="/signup">회원가입</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
