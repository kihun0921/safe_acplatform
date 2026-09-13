import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { paymentKey, orderId, amount } = await request.json();
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .eq("member_id", user.id)
    .single();

  if (!payment) return NextResponse.json({ error: "결제 정보를 찾을 수 없습니다." }, { status: 404 });
  if (payment.amount !== amount) {
    return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
  }

  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const tossData = await tossRes.json();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!tossRes.ok) {
    await service.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json({ error: tossData.message ?? "결제 승인에 실패했습니다." }, { status: 400 });
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  const { data: subscription, error: subError } = await service
    .from("subscriptions")
    .upsert(
      {
        member_id: user.id,
        status: "active",
        plan_type: "monthly",
        amount: payment.amount,
        payment_method: "card",
        start_date: now.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
      },
      { onConflict: "member_id" }
    )
    .select()
    .single();

  if (subError) return NextResponse.json({ error: subError.message }, { status: 400 });

  await service
    .from("payments")
    .update({
      status: "paid",
      subscription_id: subscription.id,
      toss_payment_key: paymentKey,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  return NextResponse.json({ ok: true });
}
