import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });

  const { agency, name, sections, disabledCommonSections } = await request.json();
  if (!agency?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "발주처명과 서식명을 입력해 주세요." }, { status: 400 });
  }
  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: "sections는 배열 형식이어야 합니다." }, { status: 400 });
  }
  if (disabledCommonSections !== undefined && !Array.isArray(disabledCommonSections)) {
    return NextResponse.json({ error: "disabledCommonSections는 배열 형식이어야 합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agency_templates")
    .insert({
      agency: agency.trim(),
      name: name.trim(),
      sections,
      disabled_common_sections: disabledCommonSections ?? [],
    })
    .select("id")
    .single();

  if (error) {
    const message = error.message.includes("duplicate key")
      ? "이미 이 발주처명으로 등록된 표준서식이 있습니다."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
