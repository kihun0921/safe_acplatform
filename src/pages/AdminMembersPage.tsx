import { useState } from 'react'
import { useSupabaseMembers } from '../hooks/useSupabaseMembers'
import Badge from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import Spinner from '../components/common/Spinner/Spinner'
import ErrorState from '../components/common/ErrorState/ErrorState'
import EmptyState from '../components/common/EmptyState/EmptyState'
import './AdminMembersPage.css'

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

export default function AdminMembersPage(): JSX.Element {
  const { members, loading, error, updateMemberRole, deleteMember } = useSupabaseMembers()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="admin-members-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">회원 관리</h1>
          </div>
          <Spinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-members-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">회원 관리</h1>
          </div>
          <ErrorState title="오류 발생" error={error} />
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="admin-members-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">회원 관리</h1>
          </div>
          <EmptyState title="회원이 없습니다" message="아직 가입한 회원이 없습니다." />
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'success' | 'default' | 'warn' | 'danger'> = {
      active: 'success',
      inactive: 'default',
      suspended: 'danger',
    }
    const labelMap: Record<string, string> = {
      active: '활성',
      inactive: '비활성',
      suspended: '중지',
    }
    return (
      <Badge
        status={statusMap[status] || 'default'}
        label={labelMap[status] || status}
      />
    )
  }

  const handleToggleRole = async (memberId: string, currentRole: 'member' | 'admin') => {
    const nextRole = currentRole === 'admin' ? 'member' : 'admin'
    const confirmMsg =
      nextRole === 'admin'
        ? '이 회원을 관리자로 지정하시겠습니까?'
        : '이 관리자를 일반 회원으로 전환하시겠습니까?'
    if (!window.confirm(confirmMsg)) return

    setPendingId(memberId)
    try {
      await updateMemberRole(memberId, nextRole)
    } catch (err) {
      alert('권한 변경에 실패했습니다.')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (memberId: string, name: string) => {
    if (
      !window.confirm(
        `${name} 회원을 삭제하시겠습니까?\n이 회원이 작성한 계획서(문서)와 문의 내역도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`,
      )
    )
      return

    setPendingId(memberId)
    try {
      await deleteMember(memberId)
    } catch (err) {
      const message = errMessage(err)
      if (message.includes('foreign key') || message.includes('violates')) {
        alert(
          '이 회원에게 연결된 계획서(문서)나 문의 내역이 있어 삭제할 수 없습니다.\n' +
            '완전히 삭제하려면 해당 문서/문의를 먼저 정리해야 합니다.\n\n' +
            `(원본 오류: ${message})`,
        )
      } else {
        alert(`삭제에 실패했습니다.\n${message}`)
      }
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="admin-members-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">회원 관리</h1>
        </div>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>담당자</th>
                <th>대표이사</th>
                <th>이메일</th>
                <th>회사명</th>
                <th>연락처</th>
                <th>권한</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="cell-name">{member.name}</td>
                  <td className="cell-name">{member.ceo_name}</td>
                  <td className="cell-email">{member.email}</td>
                  <td className="cell-company">{member.company}</td>
                  <td className="cell-phone">{member.phone}</td>
                  <td className="cell-role">
                    <Badge
                      status={member.role === 'admin' ? 'info' : 'default'}
                      label={member.role === 'admin' ? '관리자' : '일반 회원'}
                    />
                  </td>
                  <td className="cell-status">{getStatusBadge(member.status)}</td>
                  <td className="cell-actions">
                    <Button
                      variant="text"
                      size="sm"
                      disabled={pendingId === member.id}
                      onClick={() => handleToggleRole(member.id, member.role)}
                    >
                      {member.role === 'admin' ? '회원으로 전환' : '관리자로 지정'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pendingId === member.id}
                      onClick={() => handleDelete(member.id, member.name)}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
