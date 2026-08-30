import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/common/Input/Input'
import Button from '../components/common/Button/Button'
import { supabase } from '../services/supabaseClient'
import './SignupPage.css'

export default function SignupPage(): JSX.Element {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    ceoName: '',
    company: '',
    registrationNumber: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setInfoMessage('')
    setLoading(true)

    try {
      // members 테이블 프로필 생성은 DB 트리거(on_auth_user_created)가 자동으로 처리한다.
      // (가입 직후에는 세션이 없어 auth.uid()가 NULL이라, 클라이언트가 직접 insert하면
      //  RLS에 막히기 때문 — 트리거는 SECURITY DEFINER로 RLS를 우회해 안전하게 생성한다.)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            ceo_name: formData.ceoName,
            company: formData.company,
            phone: formData.phone,
            registration_number: formData.registrationNumber,
          },
        },
      })

      if (error) {
        setErrors({ form: error.message })
        return
      }

      if (!data.user) {
        setErrors({ form: '가입에 실패했습니다.' })
        return
      }

      if (!data.session) {
        // 이메일 인증이 활성화된 프로젝트 설정인 경우, 세션이 즉시 발급되지 않음
        setInfoMessage('가입 확인 이메일을 발송했습니다. 이메일을 확인한 후 로그인해주세요.')
        return
      }

      navigate('/announcements')
    } catch (err) {
      setErrors({ form: '가입에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-box">
          <h1 className="signup-title">회원가입</h1>
          <p className="signup-subtitle">안전보건관리계획서 플랫폼에 가입하세요</p>

          <form onSubmit={handleSignup} className="signup-form">
            {errors.form && <div className="form-error">{errors.form}</div>}
            {infoMessage && <div className="form-info">{infoMessage}</div>}

            <Input
              label="이메일"
              type="email"
              name="email"
              placeholder="example@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              disabled={loading}
            />

            <Input
              label="비밀번호"
              type="password"
              name="password"
              placeholder="8자 이상의 비밀번호"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              disabled={loading}
            />

            <Input
              label="담당자"
              type="text"
              name="name"
              placeholder="홍길동"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              disabled={loading}
            />

            <Input
              label="대표이사"
              type="text"
              name="ceoName"
              placeholder="홍길동"
              value={formData.ceoName}
              onChange={handleChange}
              error={errors.ceoName}
              required
              disabled={loading}
            />

            <Input
              label="회사명"
              type="text"
              name="company"
              placeholder="회사명을 입력하세요"
              value={formData.company}
              onChange={handleChange}
              error={errors.company}
              required
              disabled={loading}
            />

            <Input
              label="사업자등록번호"
              type="text"
              name="registrationNumber"
              placeholder="123-45-67890"
              value={formData.registrationNumber}
              onChange={handleChange}
              error={errors.registrationNumber}
              required
              disabled={loading}
            />

            <Input
              label="연락처"
              type="tel"
              name="phone"
              placeholder="010-1234-5678"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              required
              disabled={loading}
            />

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              가입하기
            </Button>
          </form>

          <div className="signup-footer">
            <p>
              이미 계정이 있으신가요? <a href="/login">로그인</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
