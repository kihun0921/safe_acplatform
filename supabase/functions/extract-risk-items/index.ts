// Edge Function: extract-risk-items
// 안전보건관리계획서 마법사에서 "예시파일 첨부" 또는 "AI 항목 추천"을 통해
// 위험성평가표(유해·위험요인/위험성수준/개선대책) 항목을 자동으로 채워준다.
//
// 두 가지 모드:
//   1) 파일 기반 추출 (mode: 'pdf' | 'image' | 'text')
//      회사가 이미 가진 안전관리계획서 파일을 그대로 읽어 항목을 추출한다.
//   2) 컨텍스트 기반 제안 (mode: 'suggest')
//      예시파일이 없을 때, 공사 종류/사업명만으로 표준 항목 라이브러리를 보완할
//      추가 항목을 제안한다.
//
// 인증: 로그인한 회원의 세션 JWT만 허용 (관리자 전용 아님 — 일반 회원이 본인 문서
// 작성 중에 호출하는 기능).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const jwt = authHeader.replace('Bearer ', '')
  const { data, error } = await anonClient.auth.getUser(jwt)
  return !error && Boolean(data.user)
}

interface RiskItemsRequest {
  mode: 'pdf' | 'image' | 'text' | 'suggest'
  fileBase64?: string
  mediaType?: string
  extractedText?: string
  constructionType?: string
  projectTitle?: string
}

const RISK_ITEMS_TOOL = {
  name: 'submit_risk_items',
  description: '위험성평가표에 추가할 유해·위험요인/개선대책 항목 목록을 제출합니다.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            hazard: { type: 'string', description: '유해·위험요인' },
            level: { type: 'string', enum: ['상', '중', '하', ''], description: '위험성수준 (모르면 빈 문자열)' },
            countermeasure: { type: 'string', description: '개선대책' },
          },
          required: ['hazard', 'countermeasure'],
        },
      },
    },
    required: ['items'],
  },
}

function buildMessageContent(body: RiskItemsRequest): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = []

  if (body.mode === 'pdf' && body.fileBase64) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: body.fileBase64 },
    })
    content.push({
      type: 'text',
      text:
        '첨부된 안전(보건)관리계획서 또는 위험성평가표 파일을 읽고, 그 안에 있는 위험성평가표의 ' +
        '유해·위험요인과 개선대책 항목을 문서에 적힌 표현을 최대한 그대로 유지해서 추출하세요. ' +
        '위험성수준(상/중/하)이 명시돼 있으면 함께 추출하고, 없으면 빈 문자열로 두세요. ' +
        '표가 여러 개면 전부 합쳐서 제출하세요. submit_risk_items 도구로만 응답하세요.',
    })
  } else if (body.mode === 'image' && body.fileBase64 && body.mediaType) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: body.mediaType, data: body.fileBase64 },
    })
    content.push({
      type: 'text',
      text:
        '첨부된 이미지(안전관리계획서 또는 위험성평가표 사진/스캔본)를 읽고, 위험성평가표의 ' +
        '유해·위험요인과 개선대책 항목을 최대한 그대로 추출해서 submit_risk_items 도구로 제출하세요.',
    })
  } else if (body.mode === 'text' && body.extractedText) {
    content.push({
      type: 'text',
      text:
        '다음은 안전(보건)관리계획서 문서에서 추출한 텍스트입니다. 이 안에 있는 위험성평가표의 ' +
        '유해·위험요인과 개선대책 항목을 최대한 그대로 추출해서 submit_risk_items 도구로 제출하세요.\n\n' +
        `--- 문서 내용 ---\n${body.extractedText.slice(0, 15000)}`,
    })
  } else {
    content.push({
      type: 'text',
      text:
        `다음 공사에 대한 표준 위험성평가 항목을 5~8개 제안해주세요.\n` +
        `공사 종류: ${body.constructionType || '일반공사'}\n` +
        `사업명: ${body.projectTitle || '(제목 없음)'}\n\n` +
        '한국 산업안전보건법 및 KOSHA 표준안전작업지침을 기준으로, 이미 잘 알려진 아주 일반적인 ' +
        '항목보다는 이 공사 종류와 제목에 특화된 구체적인 유해·위험요인과 개선대책을 제안하세요. ' +
        'submit_risk_items 도구로만 응답하세요.',
    })
  }

  return content
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as RiskItemsRequest
    const content = buildMessageContent(body)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        tools: [RISK_ITEMS_TOOL],
        tool_choice: { type: 'tool', name: 'submit_risk_items' },
        messages: [{ role: 'user', content }],
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      console.error('[extract-risk-items] Anthropic API error:', json)
      return new Response(
        JSON.stringify({ ok: false, error: json?.error?.message || 'AI 요청이 실패했습니다.' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolUse = (json?.content ?? []).find((c: any) => c.type === 'tool_use')
    const items = toolUse?.input?.items ?? []

    return new Response(JSON.stringify({ ok: true, items }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[extract-risk-items] failed:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
