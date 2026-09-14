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
    // 실제 LH 발주 현장의 "안전보건관리계획서" 완성 샘플(화성동탄(2) 근린공원31호
    // 지하주차장 설치공사 등)의 목차(Ⅰ~Ⅷ)를 기준으로 반영. 공통 6대 목차
    // (사업개요/위험성평가/실행계획/비상대책/안전목표/별첨)가 이미 샘플의
    // Ⅰ~Ⅳ에 해당하는 내용을 포괄하므로, 샘플에만 있고 공통 목차에는 없는
    // 항목(Ⅴ.기타사항, Ⅵ.재해발생 수준, Ⅷ.작업투입 인력)만 추가 섹션으로
    // 반영했다.
    agency: "한국토지주택공사(LH)",
    name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)",
    disabled_common_sections: [],
    sections: [
      {
        id: "workforce",
        label: "작업투입 인력 인적사항 (작업개시 전까지 제출)",
        fields: [
          {
            key: "vulnerable_workers",
            label: "안전취약근로자 식별 (55세 이상 고령자·여성근로자·외국인노동자)",
            type: "textarea",
            placeholder: "성명/소속/구분(고령·여성·외국인)/세부사항(연령·국적·체류자격)/담당 세부공정/배치 시 안전조치사항을 입력하세요",
          },
          {
            key: "fire_watch_and_director",
            label: "화재감시자·작업지휘자·감시자(신호수) 지정",
            type: "textarea",
            placeholder: "지정구분(화재감시자/작업지휘자/감시자)/성명/소속/담당 작업(장소)/지정일/교육이수사항을 입력하세요",
          },
          {
            key: "pair_work",
            label: "위험작업 시 2인1조 편성표",
            type: "textarea",
            placeholder: "작업내용/작업일자/1조(주작업자)/2조(보조·감시자)/소속/비상연락처를 입력하세요",
          },
        ],
      },
      {
        // 경쟁 툴("(공공입찰) 안전보건관리 계획서" 좌측 메뉴 "1. 인력운용")과 비교해
        // 빠져있던 항목 — 안전보건관리책임자/안전관리자/관리감독자 명단 및 조직도.
        id: "org_chart",
        label: "안전보건관리 조직구성",
        fields: [
          {
            key: "hq_site_org",
            label: "본사·현장 조직도 및 비상연락망",
            type: "textarea",
            placeholder: "본사 조직도(대표이사-안전보건관리부서 등)와 현장 조직도(안전보건관리책임자/안전보건총괄책임자-안전관리자-관리감독자-협력업체)를 부서·직책·성명 단위로 입력하세요",
          },
          {
            key: "key_personnel",
            label: "안전보건관리책임자·안전관리자·관리감독자 명단",
            type: "textarea",
            placeholder: "직책/성명/자격(산업안전기사 등)/휴대전화번호를 인원별로 입력하세요 — 안전보건관리책임자(현장소장), 안전관리자, 공종별 관리감독자 순",
          },
        ],
      },
      {
        // 경쟁 툴 "안전보건관리 협의체 구성"(인력운용)과 "안전보건 협의체 회의 계획"
        // (기타 안전관리)을 하나의 섹션으로 합쳐 반영 — 둘 다 같은 협의체에 대한
        // 내용(구성원 명단 vs 실제 운영 계획)이라 분리보다 한 화면이 관리에 유리하다.
        id: "safety_council",
        label: "안전보건관리 협의체 구성 및 운영",
        fields: [
          {
            key: "council_members",
            label: "협의체 구성원 명단",
            type: "textarea",
            placeholder: "현장소장/관리감독자/작업반장/협력업체 현장소장 및 관리감독자/근로자대표를 성명·소속·연락처와 함께 입력하세요",
          },
          {
            key: "council_meeting_plan",
            label: "협의체 회의 계획 (실시시기·참석대상·회의내용)",
            type: "textarea",
            placeholder: "정기 간담회(예: 매월 2회 이상)·수시 간담회 구분, 참석대상, 주요 안건(안전보건경영방침 달성 모니터링/유해위험요인 제거대책/법령 준수여부 등)을 입력하세요",
          },
        ],
      },
      {
        id: "education_plan",
        label: "안전보건교육 계획",
        fields: [
          {
            key: "education_schedule",
            label: "교육 종류별 대상·시기·시간 계획",
            type: "textarea",
            placeholder: "안전보건관리책임자 직무교육/관리감독자 교육/기초안전보건교육(신규채용)/정기교육/특별교육/TBM(일일교육) 등 종류별 대상·시기·시간을 입력하세요",
          },
          {
            key: "education_tracking",
            label: "교육 이수현황 관리 및 성과분석 방법",
            type: "textarea",
            placeholder: "교육 이수자/미이수자 명단 관리, 이수증 보관 방법, 교육 성과지표(재해율 등) 분석 및 차기 계획 반영 방법을 입력하세요",
          },
        ],
      },
      {
        id: "protection_equipment",
        label: "보호구 지급 현황",
        fields: [
          {
            key: "ppe_list",
            label: "품목별 지급 예정수량 및 지급 대상",
            type: "textarea",
            placeholder: "안전모/안전대/안전화/보안경/방진마스크 등 품목별 지급수량과 지급 대상(전 근로자/특정 공종)을 입력하세요",
          },
          {
            key: "ppe_management",
            label: "지급·착용확인 및 유지관리 절차",
            type: "textarea",
            placeholder: "지급대장 관리, 작업 전·중 착용상태 확인 절차, 훼손·노후 보호구 폐기 및 재지급 기준을 입력하세요",
          },
        ],
      },
      {
        id: "accident_procedure",
        label: "산업재해 사고처리 절차",
        fields: [
          {
            key: "response_steps",
            label: "사고발생 시 조치 순서",
            type: "textarea",
            placeholder: "① 응급조치(119 신고·구호) → ② 작업중지 및 대피 → ③ 관계기관(발주처·고용노동청 등) 신고 → ④ 현장보존 및 원인조사 → ⑤ 재발방지대책 수립 순으로 절차를 입력하세요",
          },
          {
            key: "report_chain",
            label: "보고체계 및 관계기관 연락처",
            type: "textarea",
            placeholder: "발주처 담당자/관할 지방고용노동청/경찰서/소방서/지정 응급의료기관의 연락처와 보고 순서·기한을 입력하세요",
          },
        ],
      },
      {
        id: "misc_admin",
        label: "기타사항 (청렴서약·적격업체 선정·정기 위험성평가)",
        fields: [
          {
            key: "integrity_pledge",
            label: "안전보건관리비 집행 청렴서약서",
            type: "textarea",
            placeholder: "목적 외 사용 금지, 증빙서류 정직성 확보, 발주처 감독·시정요구 준수, 위반 시 불이익 감수 등 서약 내용과 서약자(대표자/현장대리인) 정보를 입력하세요",
          },
          {
            key: "subcontractor_evaluation",
            label: "적격업체(관계수급인) 선정 평가기준",
            type: "textarea",
            placeholder: "안전보건관리체계·산업재해발생률·중대재해 발생이력·안전보건교육체계·안전보건경영시스템인증·법령준수 등 평가항목별 배점과 평가결과(우수/적격/부적격)를 입력하세요",
          },
          {
            key: "periodic_risk_assessment_plan",
            label: "정기 위험성평가 실시계획 (도급기간 1년 이상 시)",
            type: "textarea",
            placeholder: "최초 위험성평가 이후 매년 1회 이상 재평가 계획(실시주기, 담당자, 재평가 대상 공종)을 입력하세요",
          },
          {
            key: "safety_info_utilization",
            label: "안전보건정보 활용결과",
            type: "textarea",
            placeholder: "안전보건공단·고용노동부 등이 제공하는 재해사례·위험성평가 자료·안전작업지침 등을 어떻게 확보하고 계획서·교육에 반영했는지를 입력하세요",
          },
        ],
      },
      {
        id: "safety_cost",
        label: "종사자(관계수급인) 안전보건 관리비용 기준",
        fields: [
          {
            key: "safety_cost_basis",
            label: "산업안전보건관리비 / 안전관리비 계상현황",
            type: "textarea",
            placeholder: "산업안전보건법상 산업안전보건관리비, 건설기술진흥법상 안전관리비(정기안전점검비/가설구조물 안전성확인/안전관리계획 작성/통행안전관리대책/계측 및 CCTV 모니터링 등 세부항목)의 계상금액과 산정기준을 입력하세요",
          },
          {
            key: "safety_cost_distribution",
            label: "관계수급인 배분 및 사용기준",
            type: "textarea",
            placeholder: "관계수급인별 배분 방식(공사금액·투입인원 비율, 고위험작업 가중치), 사용항목(안전관리자 인건비/안전시설비/개인보호구/교육비 등), 집행 및 확인절차(월별 사용내역서 제출, 공정률별 최소 사용기준)를 입력하세요",
          },
        ],
      },
      {
        id: "accident_level",
        label: "재해발생 수준",
        fields: [
          {
            key: "accident_history",
            label: "산업재해 현황 (산재요양승인확인서 / 산업재해율 조회결과)",
            type: "textarea",
            placeholder: "근로복지공단 산재요양 승인/반려여부, 최근 3년간 사고사망만인율·재해율(고용노동부 산업재해율 조회결과) 등 실적을 입력하세요",
          },
          {
            key: "safety_certification",
            label: "안전보건경영시스템 인증 현황",
            type: "textarea",
            placeholder: "ISO45001, KOSHA-MS 등 인증서 번호·인증범위·유효기간을 입력하세요",
          },
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
