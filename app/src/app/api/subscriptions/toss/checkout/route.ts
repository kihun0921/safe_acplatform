import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const MONTHLY_AMOUNT = 50000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: member } = await supabase.from("members").select("name").eq("id", user.id).single();
  if (!member) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });

  const orderId = randomUUID();

  const { error } = await supabase.from("payments").insert({
    member_id: user.id,
    plan_type: "monthly",
    amount: MONTHLY_AMOUNT,
    method: "card",
    status: "pending",
    order_id: orderId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    orderId,
    amount: MONTHLY_AMOUNT,
    orderName: "올케어안전플랫폼 월간 구독",
    customerName: member.name,
  });
}
