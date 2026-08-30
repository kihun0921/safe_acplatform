// Edge Function: confirm-toss-payment
// 토스페이먼츠 결제창(SDK v1)에서 카드 결제가 끝나고 successUrl로 리다이렉트되면,
// 프론트가 이 함수에 paymentKey/orderId/amount를 넘긴다. 이 함수가 시크릿키로
// 토스의 결제 승인(confirm) API를 호출해 실제로 결제를 확정하고, 우리 DB의
// payments/subscriptions 상태를 갱신한다.
//
// 시크릿키는 이 함수의 Supabase secret(TOSS_SECRET_KEY)에서만 읽으며, 클라이언트
// 번들에는 절대 포함되지 않는다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const jwt = authHeader.replace('Bearer ', '')
  const { data, error } = await anonClient.auth.getUser(jwt)
  if (error || !data.user) return null
  return data.user.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (!TOSS_SECRET_KEY) {
    return json({ ok: false, error: 'TOSS_SECRET_KEY가 설정되지 않았습니다.' }, 500)
  }

  const userId = await getAuthedUserId(req)
  if (!userId) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  try {
    const { paymentKey, orderId, amount } = await req.json()
    if (!paymentKey || !orderId || amount === undefined || amount === null) {
      return json({ ok: false, error: '필수 파라미터(paymentKey/orderId/amount)가 누락되었습니다.' }, 400)
    }

    const { data: paymentRow, error: paymentFetchErr } = await supabase
      .from('payments')
      .select('id, member_id, subscription_id, amount, status')
      .eq('order_id', orderId)
      .maybeSingle()

    if (paymentFetchErr || !paymentRow) {
      return json({ ok: false, error: '결제 내역을 찾을 수 없습니다.' }, 404)
    }
    // 본인이 생성한 결제 건인지, 우리 DB에 저장해둔 금액과 실제 승인 요청 금액이
    // 일치하는지 먼저 확인한다 (토스 공식 가이드의 금액 위변조 방지 절차).
    if (paymentRow.member_id !== userId) {
      return json({ ok: false, error: '본인 결제만 승인할 수 있습니다.' }, 403)
    }
    if (Number(paymentRow.amount) !== Number(amount)) {
      return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400)
    }
    if (paymentRow.status === 'paid') {
      return json({ ok: true, alreadyConfirmed: true })
    }

    const basicAuth = 'Basic ' + btoa(`${TOSS_SECRET_KEY}:`)
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: basicAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const tossJson = await tossRes.json()

    if (!tossRes.ok) {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentRow.id)
      console.error('[confirm-toss-payment] Toss confirm failed:', tossJson)
      return json({ ok: false, error: tossJson?.message || '토스 결제 승인에 실패했습니다.' }, 502)
    }

    const now = new Date()
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + 1)

    await supabase
      .from('payments')
      .update({
        status: 'paid',
        toss_payment_key: paymentKey,
        confirmed_at: now.toISOString(),
      })
      .eq('id', paymentRow.id)

    if (paymentRow.subscription_id) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          start_date: now.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
        })
        .eq('id', paymentRow.subscription_id)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('[confirm-toss-payment] failed:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
