import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_AMOUNT = 50000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { depositorName } = await request.json();
  if (!depositorName?.trim()) {
    return NextResponse.json({ error: "입금자명을 입력해 주세요." }, { status: 400 });
  }

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        member_id: user.id,
        status: "pending",
        plan_type: "monthly",
        amount: PLAN_AMOUNT,
        payment_method: "bank_transfer",
      },
      { onConflict: "member_id" }
    )
    .select("id")
    .single();
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 400 });

  const { error: payErr } = await supabase.from("payments").insert({
    member_id: user.id,
    subscription_id: sub.id,
    plan_type: "monthly",
    amount: PLAN_AMOUNT,
    method: "bank_transfer",
    status: "pending",
    order_id: crypto.randomUUID(),
    depositor_name: depositorName,
  });
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
