// 첨부된 공고문 PDF에서 텍스트 레이어를 브라우저에서 직접 뽑아낸다 — 백엔드(Supabase Edge
// Function) 배포 없이, 파일 선택 즉시 클라이언트에서 사업개요 자동추출(manualAnnouncementExtraction)에
// 넘길 원문 텍스트를 얻기 위한 용도다.
import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
// Vite: ?url을 붙이면 워커 스크립트를 별도 파일로 번들링하고 그 최종 URL 문자열을 반환한다.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    pageTexts.push(content.items.filter(isTextItem).map((item) => item.str).join(' '))
  }

  return pageTexts.join('\n')
}
