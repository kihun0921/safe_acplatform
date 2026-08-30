// 예시파일(PDF/이미지/DOCX)에서 AI(Claude)로 위험성평가 항목을 추출하거나,
// 예시파일이 없을 때 공사 종류/사업명 컨텍스트만으로 항목을 추천받는다.
// 실제 LLM 호출은 Supabase Edge Function(extract-risk-items)에서 수행하고,
// 여기서는 파일을 읽어 적절한 형태로 변환해 전달하는 역할만 한다.
import { supabase } from '../services/supabaseClient'
import type { RiskRow } from '../types/wizardContent'

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

export interface ExtractedRiskItem {
  hazard: string
  level: RiskRow['level']
  countermeasure: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function normalizeLevel(value: unknown): RiskRow['level'] {
  return value === '상' || value === '중' || value === '하' ? value : ''
}

function normalizeItems(raw: unknown): ExtractedRiskItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && typeof (item as Record<string, unknown>).hazard === 'string',
    )
    .map((item) => ({
      hazard: String(item.hazard).trim(),
      level: normalizeLevel(item.level),
      countermeasure: typeof item.countermeasure === 'string' ? item.countermeasure : '',
    }))
    .filter((item) => item.hazard.length > 0)
}

// supabase-js는 Edge Function이 non-2xx를 반환하면 실제 응답 본문 대신 "Edge Function
// returned a non-2xx status code"라는 뭉뚱그린 메시지만 던진다. 진짜 원인
// ({ok:false, error:'...'} 형태로 우리 함수가 반환한 값)은 error.context(Response)를
// 직접 읽어야 확인할 수 있다.
async function readFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      try {
        const body = await context.clone().json()
        if (body?.error) return String(body.error)
      } catch {
        try {
          const text = await context.clone().text()
          if (text) return text
        } catch {
          // ignore — fall through to generic message below
        }
      }
    }
  }
  return error instanceof Error ? error.message : String(error)
}

async function invokeExtract(body: Record<string, unknown>): Promise<ExtractedRiskItem[]> {
  const { data, error } = await supabase.functions.invoke('extract-risk-items', { body })
  if (error) throw new Error(await readFunctionError(error))
  if (!data?.ok) throw new Error(data?.error || 'AI 요청이 실패했습니다.')
  return normalizeItems(data.items)
}

/** 예시파일(PDF/이미지/DOCX)에서 위험성평가 항목을 AI로 추출한다. */
export async function extractRiskItemsFromFile(file: File): Promise<ExtractedRiskItem[]> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일이 너무 큽니다. 8MB 이하 파일로 첨부해주세요.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') {
    const fileBase64 = await fileToBase64(file)
    return invokeExtract({ mode: 'pdf', fileBase64 })
  }

  if (IMAGE_EXTENSIONS.includes(ext)) {
    const fileBase64 = await fileToBase64(file)
    const mediaType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return invokeExtract({ mode: 'image', fileBase64, mediaType })
  }

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const mammoth = await import('mammoth')
    const { value: extractedText } = await mammoth.extractRawText({ arrayBuffer })
    if (!extractedText.trim()) {
      throw new Error('문서에서 텍스트를 추출하지 못했습니다.')
    }
    return invokeExtract({ mode: 'text', extractedText })
  }

  throw new Error('지원하지 않는 파일 형식입니다 (PDF, 이미지, DOCX만 가능합니다).')
}

/** 예시파일이 없을 때, 공사 종류/사업명만으로 AI에게 추가 위험성평가 항목을 제안받는다. */
export async function suggestRiskItems(
  constructionType: string,
  projectTitle: string,
): Promise<ExtractedRiskItem[]> {
  return invokeExtract({ mode: 'suggest', constructionType, projectTitle })
}
