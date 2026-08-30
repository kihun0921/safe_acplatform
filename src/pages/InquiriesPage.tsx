import { useState } from 'react'
import Input from '../components/common/Input/Input'
import Textarea from '../components/common/Textarea/Textarea'
import Badge from '../components/common/Badge/Badge'
import Button from '../components/common/Button/Button'
import { MOCK_INQUIRIES } from '../services/mockData'
import './InquiriesPage.css'

export default function InquiriesPage(): JSX.Element {
  const [inquiries, setInquiries] = useState(MOCK_INQUIRIES)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const createdAt: string = new Date().toLocaleDateString('en-CA')
    const newInquiry = {
      id: `inq-${Date.now()}`,
      userId: 'user-1',
      title: formData.title,
      content: formData.content,
      status: 'open' as const,
      createdAt,
    }
    setInquiries([newInquiry, ...inquiries])
    setFormData({ title: '', content: '' })
    setShowForm(false)
  }

  return (
    <div className="inquiries-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">문의</h1>
          <Button
            variant="primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '취소' : '문의 작성'}
          </Button>
        </div>

        {showForm && (
          <div className="inquiry-form-box">
            <form onSubmit={handleSubmit} className="inquiry-form">
              <Input
                label="제목"
                type="text"
                placeholder="문의 제목을 입력하세요"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <Textarea
                label="내용"
                placeholder="문의 내용을 입력하세요"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                maxLength={1000}
                required
              />
              <Button type="submit" variant="primary" fullWidth>
                문의 등록
              </Button>
            </form>
          </div>
        )}

        <div className="inquiries-list">
          {inquiries.length === 0 ? (
            <div className="empty-state">문의가 없습니다</div>
          ) : (
            inquiries.map((inq) => (
              <div key={inq.id} className="inquiry-card">
                <div className="inquiry-header">
                  <h3 className="inquiry-title">{inq.title}</h3>
                  <Badge
                    status={inq.status === 'answered' ? 'success' : 'warn'}
                    label={inq.status === 'answered' ? '답변완료' : '대기중'}
                  />
                </div>
                <p className="inquiry-content">{inq.content}</p>
                {inq.answer && (
                  <div className="inquiry-answer">
                    <p className="answer-label">관리자 답변:</p>
                    <p className="answer-text">{inq.answer}</p>
                  </div>
                )}
                <p className="inquiry-date">
                  {inq.status === 'answered' && inq.answeredAt ? (
                    <>답변일: {inq.answeredAt}</>
                  ) : (
                    <>작성일: {inq.createdAt}</>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
