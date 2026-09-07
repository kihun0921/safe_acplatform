// 외부 API로 아직 수집되지 않은 공고(LH 등)는 announcements 테이블에 행이 없어 공고문
// PDF도 없으므로, aiBusinessOverviewExtraction의 extract-business-overview 엣지함수를 탈 수
// 없다. 사용자가 공고문 텍스트를 직접 붙여넣었을 때 같은 방식(라벨 기반 파싱)으로 클라이언트에서
// 바로 사업개요를 뽑아준다 — 로직은 supabase/functions/extract-business-overview/index.ts의
// extractLabeledValue와 동일하게 맞춰뒀다.
import type { ExtractedBusinessOverview } from './aiBusinessOverviewExtraction'

const STOP_LABELS = [
  '구분',
  '유형',
  '기간',
  '위치',
  '내용',
  '공사추정금액',
  '추정금액',
  '기초금액',
  '추정가격',
  '부가가치세',
  '입찰개시일시',
  '입찰마감일시',
  '개찰일시',
  '비고',
  '도급액',
]

function looseLabelPattern(label: string): string {
  return label.split('').join('\\s*')
}

function extractLabeledValue(text: string, labelCandidates: string[]): string {
  for (const label of labelCandidates) {
    const re = new RegExp(looseLabelPattern(label) + '\\s*[:：]?\\s*(.+)', 's')
    const match = text.match(re)
    if (!match || match[1] === undefined) continue
    const rest = match[1]

    let cutIndex = Math.min(rest.length, 300)
    for (const stop of STOP_LABELS) {
      if (label.includes(stop) || stop.includes(label)) continue
      const stopRe = new RegExp(looseLabelPattern(stop))
      const stopMatch = rest.match(stopRe)
      if (stopMatch?.index !== undefined && stopMatch.index < cutIndex) {
        cutIndex = stopMatch.index
      }
    }

    const value = rest.slice(0, cutIndex).replace(/\s+/g, ' ').trim()
    if (value) return value
  }
  return ''
}

// 공고문에서 항목을 못 찾으면 빈 문자열로 남겨둔다 — 호출부는 이미 입력된 값을
// 덮어쓰지 않으므로, 사용자가 마법사에서 직접 채우면 된다.
export function extractBusinessOverviewFromText(text: string): ExtractedBusinessOverview {
  return {
    period: extractLabeledValue(text, ['공사기간', '사업기간', '기간']),
    location: extractLabeledValue(text, ['공사위치', '현장위치', '위치']),
    mainContent: extractLabeledValue(text, ['공사내용', '주요내용', '내용']),
  }
}
