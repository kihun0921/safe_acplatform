import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 회원 본인의 기업/담당자 정보 수정. members RLS의 members_update_self 정책
// (auth.uid() = id)이 이미 본인 행 수정을 허용하므로, 여기서는 어떤 필드를
// 수정할 수 있는지만 화이트리스트로 제한한다(role/status/registration_number는
// 관리자 전용 별도 경로로만 변경 가능).
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { name, company, ceo_name, phone } = await request.json();
  const update: Record<string, string> = {};
  if (typeof name === "string" && name.trim()) update.name = name.trim();
  if (typeof company === "string" && company.trim()) update.company = company.trim();
  if (typeof ceo_name === "string") update.ceo_name = ceo_name.trim();
  if (typeof phone === "string" && phone.trim()) update.phone = phone.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("members").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
