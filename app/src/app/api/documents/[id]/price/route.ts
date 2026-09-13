import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 문서 1건 다운로드 잠금해제 가격은 관리자만 조정할 수 있다(기본 5만원, LH처럼
// 서식이 복잡한 발주처는 최대 50만원 등으로 개별 책정). 일반 회원은 자신의
// 문서라도 이 값을 바꿀 수 없다 — PATCH /api/documents/[id]의 허용 필드에도
// price는 포함되어 있지 않다.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });

  const { price } = await request.json();
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "올바른 금액을 입력해 주세요." }, { status: 400 });
  }

  const { error } = await supabase.from("documents").update({ price: amount }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
