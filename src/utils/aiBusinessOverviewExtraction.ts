// 공고에 첨부된 공고문 PDF를 AI(Claude)로 읽어 "사업개요"(공사기간/위치/주요내용)를
// 자동으로 채운다. 실제 LLM 호출과 PDF 다운로드는 Supabase Edge Function
// (extract-business-overview)에서 서버 사이드로 수행한다.
import { supabase } from '../services/supabaseClient'

export interface ExtractedBusinessOverview {
  period: string
  location: string
  mainContent: string
}

interface AnnouncementAttachment {
  name: string
  url: string
}

// 공고에는 원본(.hwp/.hwpx)과 함께 변환된 PDF가 같이 첨부되는 경우가 대부분이라,
// PDF만 골라 쓴다 — 이름에 "공고문"이 들어간 것을 우선하고(내역서/예정공정표/시방서 등
// 다른 첨부와 섞여 있을 수 있음), 없으면 첫 번째 PDF를 사용한다.
export function pickAnnouncementPdf(attachments: AnnouncementAttachment[] | null | undefined): string | null {
  if (!attachments || attachments.length === 0) return null
  const pdfs = attachments.filter((a) => a.name?.toLowerCase().endsWith('.pdf'))
  if (pdfs.length === 0) return null
  const preferred = pdfs.find((a) => a.name.includes('공고문')) ?? pdfs[0]
  return preferred ? preferred.url : null
}

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

// 공고문을 못 불러오거나 항목을 못 찾으면 빈 문자열로 채워진 결과를 반환한다 —
// 호출부에서는 이미 입력된 값을 덮어쓰지 않으므로 실패 시 그냥 조용히 넘어가면 된다.
export async function extractBusinessOverviewFromAnnouncement(
  pdfUrl: string,
): Promise<ExtractedBusinessOverview> {
  const { data, error } = await supabase.functions.invoke('extract-business-overview', {
    body: { pdfUrl },
  })
  if (error) throw new Error(await readFunctionError(error))
  if (!data?.ok) throw new Error(data?.error || 'AI 요청이 실패했습니다.')
  return {
    period: data.businessOverview?.period ?? '',
    location: data.businessOverview?.location ?? '',
    mainContent: data.businessOverview?.mainContent ?? '',
  }
}
