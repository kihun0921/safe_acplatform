import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeAgencyName } from "@/lib/agencyTemplates";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { announcementId, title, agency } = body ?? {};
  if (!title) {
    return NextResponse.json({ error: "제목이 필요합니다." }, { status: 400 });
  }

  // 발주처 표준서식 자동 적용: 이 문서의 발주처와 이름이 일치하는 표준서식이
  // 등록돼 있으면(예: 한국토지주택공사) 처음부터 그 서식으로 시작한다 — 예전엔
  // 위저드 화면의 드롭다운에서 회원이 매번 직접 골라야 했는데, 어떤 공고든
  // 발주처가 같으면 항상 같은 표준서식으로 시작해야 한다는 요청으로 바뀌었다.
  // 정확히 같은 문자열이 아니라 괄호 약어를 뗀 이름으로 비교하는 이유는 공고
  // 출처(수동 등록/각 발주처 API 동기화)마다 "한국토지주택공사(LH)"/"한국토지주택공사"처럼
  // 표기가 갈리기 때문이다.
  let templateId: string | null = null;
  if (agency) {
    const { data: templates } = await supabase.from("agency_templates").select("id, agency");
    const normalizedAgency = normalizeAgencyName(agency);
    const match = templates?.find((t) => normalizeAgencyName(t.agency) === normalizedAgency);
    templateId = match?.id ?? null;
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      member_id: user.id,
      announcement_id: announcementId ?? null,
      title,
      agency: agency ?? null,
      template_id: templateId,
      status: "in_progress",
      content: {},
      percent_complete: 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}
