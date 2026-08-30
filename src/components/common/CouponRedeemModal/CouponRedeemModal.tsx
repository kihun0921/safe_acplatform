import { useState } from 'react'
import jsQR from 'jsqr'
import Button from '../Button/Button'
import Input from '../Input/Input'
import { redeemCoupon } from '../../../services/supabaseClient'
import './CouponRedeemModal.css'

// QR 이미지가 인코딩한 값은 딥링크 URL(.../documents?coupon=CODE)이거나, 코드 텍스트 자체일
// 수도 있어(관리자가 코드만 QR로 만들어 보낸 경우 등) 둘 다 처리한다.
function extractCouponCode(decoded: string): string {
  try {
    const url = new URL(decoded)
    const fromQuery = url.searchParams.get('coupon')
    if (fromQuery) return fromQuery
  } catch {
    // URL 형식이 아니면 코드 자체로 간주
  }
  return decoded.trim()
}

export interface CouponDocumentOption {
  id: string
  title: string
}

interface CouponRedeemModalProps {
  documents: CouponDocumentOption[]
  initialDocumentId?: string
  initialCode?: string
  onClose: () => void
  onRedeemed: (documentId: string) => void
}

export default function CouponRedeemModal({
  documents,
  initialDocumentId,
  initialCode,
  onClose,
  onRedeemed,
}: CouponRedeemModalProps): JSX.Element {
  const [code, setCode] = useState(initialCode ?? '')
  const [documentId, setDocumentId] = useState(initialDocumentId ?? documents[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [decodeNotice, setDecodeNotice] = useState<string | null>(null)

  const lockedDocument = initialDocumentId
    ? documents.find((d) => d.id === initialDocumentId)
    : undefined

  const handleImageSelected = async (file: File) => {
    setDecoding(true)
    setDecodeNotice(null)
    setError(null)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no-canvas-context')
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = jsQR(imageData.data, imageData.width, imageData.height)
      if (!result) {
        setDecodeNotice('이미지에서 QR 코드를 인식하지 못했습니다. 코드를 직접 입력해주세요.')
        return
      }
      setCode(extractCouponCode(result.data))
      setDecodeNotice('QR 코드를 인식했습니다. 코드가 자동으로 입력되었습니다.')
    } catch {
      setDecodeNotice('이미지를 읽는 중 오류가 발생했습니다. 코드를 직접 입력해주세요.')
    } finally {
      setDecoding(false)
    }
  }

  const handleSubmit = async () => {
    if (!code.trim() || !documentId) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await redeemCoupon(code, documentId)
      if (err) {
        setError(err.message)
        return
      }
      alert('쿠폰이 등록되었습니다. 이 계획서는 이제 계속 다운로드할 수 있습니다.')
      onRedeemed(documentId)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="coupon-modal-overlay" onClick={onClose}>
      <div className="coupon-modal" onClick={(e) => e.stopPropagation()}>
        <h2>쿠폰 등록</h2>
        <p className="coupon-modal-desc">
          제휴처(퇴직공제단말기 신청/이벤트)에서 받은 쿠폰 코드를 등록하면, 선택한 계획서 1건을
          계속 다운로드할 수 있습니다.
        </p>

        <Input
          label="쿠폰 코드"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: AB12CD34"
          autoFocus
        />

        <label className="coupon-modal-upload">
          <span>{decoding ? 'QR 인식 중...' : '또는 받은 쿠폰 QR 이미지 첨부'}</span>
          <input
            type="file"
            accept="image/*"
            disabled={decoding}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageSelected(file)
              e.target.value = ''
            }}
          />
        </label>
        {decodeNotice && <p className="coupon-modal-decode-notice">{decodeNotice}</p>}

        {lockedDocument ? (
          <div className="coupon-modal-doc-fixed">
            적용 대상: <strong>{lockedDocument.title}</strong>
          </div>
        ) : documents.length === 0 ? (
          <p className="coupon-modal-empty">
            등록된 계획서가 없습니다. 먼저 공고 조회에서 계획서를 작성해주세요.
          </p>
        ) : (
          <div className="input-wrapper">
            <label className="input-label" htmlFor="coupon-doc-select">
              적용할 계획서
            </label>
            <select
              id="coupon-doc-select"
              className="coupon-modal-select"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="coupon-modal-error">{error}</p>}

        <div className="coupon-modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !code.trim() || !documentId}
          >
            {submitting ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    </div>
  )
}
