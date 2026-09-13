import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { code, documentId } = await request.json();
  if (!code?.trim() || !documentId) {
    return NextResponse.json({ error: "쿠폰 코드를 입력해 주세요." }, { status: 400 });
  }

  const { error } = await supabase.rpc("redeem_coupon", {
    p_code: code.trim().toUpperCase(),
    p_document_id: documentId,
  });

  if (error) {
    const message = error.message.includes("INVALID_OR_USED_COUPON")
      ? "유효하지 않거나 이미 사용된 쿠폰입니다."
      : error.message.includes("FORBIDDEN_DOCUMENT")
      ? "본인이 작성한 문서에만 등록할 수 있습니다."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
