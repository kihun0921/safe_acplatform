import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// agency 값은 실제 나라장터/발주처 API 동기화 데이터의 발주기관명과 정확히
// 일치해야 매칭된다. "조달청"은 하나의 특정 발주기관이 아니라 여러 발주처의
// 공고를 대행하는 조달 창구(api_source='pps')라서, agency 컬럼에는 실제
// 요청기관명(예: "OO교육청")이 들어가고 "조달청"이라는 단일 값으로는 절대
// 매칭되지 않는다 — 그래서 조달청 전용 템플릿은 만들지 않는다.
const TEMPLATES = [
  {
    agency: "한국토지주택공사(LH)",
    name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)",
    disabled_common_sections: [],
    sections: [
      {
        id: "workforce",
        label: "작업투입 인력 인적사항",
        fields: [
          { key: "vulnerable_workers", label: "안전취약근로자 현황", type: "textarea", placeholder: "고령/외국인/신규 채용자 등 배치 현황을 입력하세요" },
          { key: "fire_watch", label: "화재감시자 배치 현황", type: "textarea", placeholder: "화재감시자 인원 및 배치 위치를 입력하세요" },
          { key: "pair_work", label: "2인1조 편성 현황", type: "textarea", placeholder: "밀폐공간·고소작업 등 2인1조 편성표를 입력하세요" },
        ],
      },
    ],
  },
  {
    agency: "한국전력공사",
    name: "한국전력공사 표준 서식 (2025 개정판)",
    disabled_common_sections: [],
    sections: [
      {
        id: "electrical_safety",
        label: "전기공사 특별 안전관리 사항",
        fields: [
          { key: "outage_plan", label: "정전작업 계획 및 절차", type: "textarea", placeholder: "정전작업 범위, 시간대, 복전 절차를 입력하세요" },
          { key: "grounding_check", label: "접지·활선 근접작업 점검 현황", type: "textarea", placeholder: "접지 설치 확인 및 활선 근접작업 이격거리 준수 계획을 입력하세요" },
          { key: "insulation_gear", label: "절연용 보호구·방호구 지급 현황", type: "textarea", placeholder: "절연장갑, 절연화, 방호관 등 지급/점검 현황을 입력하세요" },
        ],
      },
    ],
  },
];

for (const t of TEMPLATES) {
  const { data: existing } = await admin
    .from("agency_templates")
    .select("id")
    .eq("agency", t.agency)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("agency_templates")
      .update({ name: t.name, sections: t.sections, disabled_common_sections: t.disabled_common_sections })
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`${t.agency} 표준서식 업데이트 완료:`, existing.id);
  } else {
    const { data, error } = await admin
      .from("agency_templates")
      .insert({
        agency: t.agency,
        name: t.name,
        sections: t.sections,
        disabled_common_sections: t.disabled_common_sections,
      })
      .select("id")
      .single();
    if (error) throw error;
    console.log(`${t.agency} 표준서식 생성 완료:`, data.id);
  }
}
