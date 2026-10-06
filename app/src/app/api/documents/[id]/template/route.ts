import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingAgencyTemplates } from "@/lib/agencyTemplates";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("id, member_id, agency").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  const isAdmin = me?.role === "admin";
  if (doc.member_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { templateId } = await request.json();

  if (templateId) {
    // 이 문서의 발주처와 실제로 매칭되는 표준서식만 선택할 수 있게 한다
    // (엉뚱한 발주처의 전용 섹션이 붙는 것을 방지). 군부대는 부대명이 전부
    // 달라도 범용 "군부대" 서식 하나로 매칭되므로(findMatchingAgencyTemplates
    // 참고), 단순 문자열 일치 대신 이 공용 함수로 판단한다.
    const { data: template } = await supabase
      .from("agency_templates")
      .select("id, agency")
      .eq("id", templateId)
      .single();
    const isValidMatch = template && findMatchingAgencyTemplates(doc.agency, [template]).length > 0;
    if (!isValidMatch) {
      return NextResponse.json({ error: "이 문서의 발주처와 일치하는 표준서식이 아닙니다." }, { status: 400 });
    }
  }

  const { error } = await supabase.from("documents").update({ template_id: templateId || null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
