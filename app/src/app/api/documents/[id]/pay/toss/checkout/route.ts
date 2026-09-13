import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isDocumentUnlocked } from "@/lib/documentAccess";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("id, title, member_id, price").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  if (doc.member_id !== user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  // 이미 결제/쿠폰으로 잠금해제된 문서는 중복결제를 막는다.
  if (await isDocumentUnlocked(supabase, id)) {
    return NextResponse.json({ error: "이미 다운로드 가능한 문서입니다." }, { status: 400 });
  }

  const { data: member } = await supabase.from("members").select("name").eq("id", user.id).single();
  if (!member) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });

  const orderId = randomUUID();

  const { error } = await supabase.from("payments").insert({
    member_id: user.id,
    document_id: doc.id,
    plan_type: "per_document",
    amount: doc.price,
    method: "card",
    status: "pending",
    order_id: orderId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    orderId,
    amount: doc.price,
    orderName: `${doc.title} 다운로드`,
    customerName: member.name,
  });
}
