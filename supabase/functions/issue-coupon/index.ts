// Edge Function: issue-coupon
// allcaresolution.net(퇴직공제단말기 신청/이벤트) 백엔드가 서버간 호출로 쿠폰 코드를 발급받기
// 위한 엔드포인트. 로그인 세션이 아니라 공유 시크릿 헤더로 인증한다 — sync-announcements를
// 외부에서 트리거할 때 쓰는 SYNC_TRIGGER_SECRET과 동일한 패턴.
//
// allcaresolution.net 개발코드를 아직 인수하지 못해 실제 호출 연동은 이후 별도 작업이며, 이
// 함수는 그 연동을 위해 미리 준비해두는 것이다.
//
// 요청 예:
//   POST /functions/v1/issue-coupon
//   Headers: Content-Type: application/json, X-Coupon-Secret: <COUPON_ISSUE_SECRET>
//   Body: { "source": "퇴직공제단말기 신청", "count": 1 }
// 응답: { "ok": true, "codes": ["AB12CD34", ...] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const COUPON_ISSUE_SECRET = Deno.env.get('COUPON_ISSUE_SECRET')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-coupon-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8
const MAX_COUNT = 100

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => CODE_CHARSET[b % CODE_CHARSET.length]).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (!COUPON_ISSUE_SECRET) {
    return json({ ok: false, error: 'COUPON_ISSUE_SECRET가 설정되지 않았습니다.' }, 500)
  }
  if (req.headers.get('X-Coupon-Secret') !== COUPON_ISSUE_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  try {
    const { source, count } = await req.json()
    if (!source || typeof source !== 'string') {
      return json({ ok: false, error: 'source가 필요합니다.' }, 400)
    }
    const n = Math.min(MAX_COUNT, Math.max(1, Number(count) || 1))

    const codes: string[] = []
    for (let i = 0; i < n; i++) {
      let inserted = false
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const code = randomCode()
        const { error } = await supabase.from('coupons').insert({ code, source, status: 'unused' })
        if (!error) {
          codes.push(code)
          inserted = true
        } else if (error.code !== '23505') {
          throw error
        }
      }
      if (!inserted) throw new Error('쿠폰 코드 생성에 반복 실패했습니다.')
    }

    return json({ ok: true, codes })
  } catch (err) {
    console.error('[issue-coupon] failed:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
