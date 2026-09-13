import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDocumentUnlocked } from "@/lib/documentAccess";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { depositorName } = await request.json();
  if (!depositorName?.trim()) {
    return NextResponse.json({ error: "입금자명을 입력해 주세요." }, { status: 400 });
  }

  const { data: doc } = await supabase.from("documents").select("id, member_id, price").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  if (doc.member_id !== user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  // 이미 결제/쿠폰으로 잠금해제된 문서는 중복 입금신청을 막는다.
  if (await isDocumentUnlocked(supabase, id)) {
    return NextResponse.json({ error: "이미 다운로드 가능한 문서입니다." }, { status: 400 });
  }

  const { error } = await supabase.from("payments").insert({
    member_id: user.id,
    document_id: doc.id,
    plan_type: "per_document",
    amount: doc.price,
    method: "bank_transfer",
    status: "pending",
    order_id: crypto.randomUUID(),
    depositor_name: depositorName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
