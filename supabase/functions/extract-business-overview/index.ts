// Edge Function: extract-business-overview
// 공고와 연결해 계획서를 새로 작성할 때, 그 공고에 첨부된 공고문 PDF(나라장터 등에서
// 그대로 받아온 원본)를 읽어 "사업개요"(공사기간/위치/주요내용)를 자동으로 채워준다.
//
// AI(Anthropic) 호출 없이 PDF 텍스트 레이어를 직접 뽑아 라벨 기반으로 파싱한다 —
// 크레딧이 없어도 동작해야 한다는 요구사항 때문. 조달청(PPS) 표준 공고문 양식은
// "공사개요" 표에 구분/유형/기간/위치/내용이 고정된 라벨로 나오므로 정규식으로도
// 꽤 안정적으로 뽑을 수 있다. 다만 AI만큼 유연하지는 않아서, 문서 양식이 다르거나
// 라벨을 못 찾으면 그냥 빈 문자열로 남긴다(요구사항대로 — 없으면 비워두는 게 정상).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// pdf-parse: PDF 텍스트 레이어 추출 전용 라이브러리. Deno의 npm: 호환 레이어로 로드.
import pdfParse from 'npm:pdf-parse@1.1.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PDF_BYTES = 15 * 1024 * 1024 // 15MB — 공고문 PDF는 보통 수백 KB~수 MB 수준

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const jwt = authHeader.replace('Bearer ', '')
  const { data, error } = await anonClient.auth.getUser(jwt)
  return !error && Boolean(data.user)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// 라벨 사이에 공백이 섞여 나오는 경우(PDF 렌더링 특성상 "기 간"처럼 글자가 벌어지는 일이
// 흔함)까지 허용하는 정규식 패턴으로 변환.
function looseLabelPattern(label: string): string {
  return label.split('').join('\\s*')
}

// 이 순서(긴 라벨 → 짧은 라벨)로 시도해 "공사기간"처럼 더 구체적인 라벨이 있으면 그걸 쓰고,
// 없으면 표 안의 단순 "기간"으로 대체 매칭한다.
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

function extractLabeledValue(text: string, labelCandidates: string[]): string {
  for (const label of labelCandidates) {
    const re = new RegExp(looseLabelPattern(label) + '\\s*[:：]?\\s*(.+)', 's')
    const match = text.match(re)
    if (!match) continue
    const rest = match[1]

    let cutIndex = Math.min(rest.length, 300) // 안전장치: 라벨을 못 찾아도 300자 이상은 안 감
    for (const stop of STOP_LABELS) {
      if (label.includes(stop) || stop.includes(label)) continue // 자기 자신과 겹치는 라벨은 제외
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (!(await isAuthorized(req))) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  try {
    const { pdfUrl } = await req.json()
    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return json({ ok: false, error: 'pdfUrl이 필요합니다.' }, 400)
    }

    let pdfRes: Response
    try {
      pdfRes = await fetch(pdfUrl)
    } catch (err) {
      return json({ ok: false, error: `공고문 파일을 불러오지 못했습니다: ${String(err)}` }, 502)
    }
    if (!pdfRes.ok) {
      return json({ ok: false, error: `공고문 파일 응답 오류 (HTTP ${pdfRes.status})` }, 502)
    }

    const buf = await pdfRes.arrayBuffer()
    if (buf.byteLength === 0) {
      return json({ ok: false, error: '공고문 파일이 비어 있습니다.' }, 502)
    }
    if (buf.byteLength > MAX_PDF_BYTES) {
      return json({ ok: false, error: '공고문 파일이 너무 큽니다.' }, 502)
    }

    let text: string
    try {
      const parsed = await pdfParse(new Uint8Array(buf))
      text = parsed.text || ''
    } catch (err) {
      console.error('[extract-business-overview] pdf-parse failed:', err)
      return json({ ok: false, error: `PDF 텍스트 추출에 실패했습니다: ${String(err)}` }, 502)
    }

    const businessOverview = {
      period: extractLabeledValue(text, ['공사기간', '사업기간', '기간']),
      location: extractLabeledValue(text, ['공사위치', '현장위치', '위치']),
      mainContent: extractLabeledValue(text, ['공사내용', '주요내용', '내용']),
    }

    return json({ ok: true, businessOverview, textSample: text.slice(0, 500) })
  } catch (err) {
    console.error('[extract-business-overview] failed:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
