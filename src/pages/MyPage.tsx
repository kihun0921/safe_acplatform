import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Spinner from '../components/common/Spinner/Spinner'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabaseClient'
import './MyPage.css'

interface MemberProfile {
  email: string
  name: string
  ceo_name: string
  company: string
  registration_number: string
  phone: string
  role: 'member' | 'admin'
}

type Mode = 'view' | 'editProfile' | 'changePassword' | 'accountSettings'

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export default function MyPage(): JSX.Element {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('view')
  const [saving, setSaving] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: '',
    ceoName: '',
    company: '',
    registrationNumber: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [emailForm, setEmailForm] = useState('')

  useEffect(() => {
    if (!user) return

    supabase
      .from('members')
      .select('email, name, ceo_name, company, registration_number, phone, role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as MemberProfile | null)
        setLoading(false)
      })
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const startEditProfile = () => {
    if (!profile) return
    setProfileForm({
      name: profile.name,
      ceoName: profile.ceo_name,
      company: profile.company,
      registrationNumber: profile.registration_number,
      phone: profile.phone,
    })
    setMode('editProfile')
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: profileForm.name,
          ceo_name: profileForm.ceoName,
          company: profileForm.company,
          registration_number: profileForm.registrationNumber,
          phone: profileForm.phone,
        })
        .eq('id', user.id)
      if (error) throw error

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: profileForm.name,
              ceo_name: profileForm.ceoName,
              company: profileForm.company,
              registration_number: profileForm.registrationNumber,
              phone: profileForm.phone,
            }
          : prev,
      )
      setMode('view')
    } catch (err) {
      alert(`프로필 수정에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.password.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (passwordForm.password !== passwordForm.confirm) {
      alert('새 비밀번호가 서로 일치하지 않습니다.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
      if (error) throw error
      setPasswordForm({ password: '', confirm: '' })
      setMode('view')
      alert('비밀번호가 변경되었습니다.')
    } catch (err) {
      alert(`비밀번호 변경에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChangeEmail = async () => {
    const newEmail = emailForm.trim()
    if (!newEmail) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailForm('')
      setMode('view')
      alert('입력하신 새 이메일로 확인 메일을 보냈습니다. 메일의 링크를 클릭해야 이메일이 최종 변경됩니다.')
    } catch (err) {
      alert(`이메일 변경 요청에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return <Spinner />
  }

  return (
    <div className="mypage">
      <div className="container">
        <h1 className="page-title">마이페이지</h1>

        <div className="profile-section">
          <div className="profile-card">
            <h2 className="profile-title">프로필</h2>

            {mode === 'editProfile' ? (
              <div className="edit-form">
                <Input
                  label="담당자"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="대표이사"
                  value={profileForm.ceoName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, ceoName: e.target.value }))}
                />
                <Input
                  label="회사명"
                  value={profileForm.company}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, company: e.target.value }))}
                />
                <Input
                  label="사업자등록번호"
                  value={profileForm.registrationNumber}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                />
                <Input
                  label="연락처"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <div className="edit-form-actions">
                  <Button variant="secondary" onClick={() => setMode('view')} disabled={saving}>
                    취소
                  </Button>
                  <Button variant="primary" loading={saving} onClick={handleSaveProfile}>
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-info">
                  <div className="info-row">
                    <span className="label">담당자</span>
                    <span className="value">{profile.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">대표이사</span>
                    <span className="value">{profile.ceo_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">이메일</span>
                    <span className="value">{profile.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">회사명</span>
                    <span className="value">{profile.company}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">사업자등록번호</span>
                    <span className="value">{profile.registration_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">연락처</span>
                    <span className="value">{profile.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">권한</span>
                    <span className="value">{profile.role === 'admin' ? '관리자' : '일반 회원'}</span>
                  </div>
                </div>
                <Button variant="secondary" fullWidth onClick={startEditProfile}>
                  프로필 수정
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="account-section">
          <div className="account-card">
            <h2 className="account-title">계정 관리</h2>

            {mode === 'changePassword' ? (
              <div className="edit-form">
                <Input
                  label="새 비밀번호"
                  type="password"
                  placeholder="8자 이상"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <Input
                  label="새 비밀번호 확인"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                />
                <div className="edit-form-actions">
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      setPasswordForm({ password: '', confirm: '' })
                      setMode('view')
                    }}
                  >
                    취소
                  </Button>
                  <Button variant="primary" loading={saving} onClick={handleChangePassword}>
                    변경
                  </Button>
                </div>
              </div>
            ) : mode === 'accountSettings' ? (
              <div className="edit-form">
                <Input
                  label="새 이메일 주소"
                  type="email"
                  placeholder={profile.email}
                  value={emailForm}
                  onChange={(e) => setEmailForm(e.target.value)}
                />
                <p className="edit-form-hint">
                  변경 요청 후 새 이메일로 발송되는 확인 메일의 링크를 클릭해야 최종 반영됩니다.
                </p>
                <div className="edit-form-actions">
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      setEmailForm('')
                      setMode('view')
                    }}
                  >
                    취소
                  </Button>
                  <Button variant="primary" loading={saving} onClick={handleChangeEmail}>
                    변경 요청
                  </Button>
                </div>
              </div>
            ) : (
              <div className="account-actions">
                <Button variant="text" onClick={() => setMode('changePassword')}>
                  비밀번호 변경
                </Button>
                <Button variant="text" onClick={() => setMode('accountSettings')}>
                  계정 설정 (이메일 변경)
                </Button>
                <Button variant="danger" fullWidth onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
