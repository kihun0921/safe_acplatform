import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });

  const { data: payment, error: findErr } = await supabase.from("payments").select("*").eq("id", id).single();
  if (findErr || !payment) return NextResponse.json({ error: "결제 내역을 찾을 수 없습니다." }, { status: 404 });

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  const { error: payUpdateErr } = await supabase
    .from("payments")
    .update({ status: "paid", confirmed_by: user.id, confirmed_at: now.toISOString() })
    .eq("id", id);
  if (payUpdateErr) return NextResponse.json({ error: payUpdateErr.message }, { status: 400 });

  if (payment.subscription_id) {
    const { error: subUpdateErr } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        start_date: now.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
      })
      .eq("id", payment.subscription_id);
    if (subUpdateErr) return NextResponse.json({ error: subUpdateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
