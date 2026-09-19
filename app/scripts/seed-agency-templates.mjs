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
//
// 각 필드의 default는 빈 칸이 아니라 실제 LH 발주 현장 "안전보건관리계획서"
// 완성 샘플(화성동탄(2) 근린공원31호 지하주차장 설치공사 등)에서 쓰인 표현과
// 형식을 그대로 반영한 초안이다 — 회원은 이 문구를 그대로 두거나 현장 실정에
// 맞게 고쳐 쓰기만 하면 된다(처음부터 빈 칸에 새로 작성할 필요가 없도록).
const TEMPLATES = [
  {
    agency: "한국토지주택공사(LH)",
    name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)",
    cover_style: "lh_standard",
    // 실제 LH 안전보건관리계획서 샘플(화성동탄(2) 근린공원31호 지하주차장 설치공사)의
    // 목차는 "표지"(제출문 포함) 다음 "Ⅰ. 안전보건관리 체계"로 시작하고, 그 1절
    // 제목이 "1. 사업개요"다(챕터 대제목은 아래 section_order의 Ⅰ그룹 title이
    // 따로 맡는다 — 여기에 챕터 제목을 그대로 넣으면 좌측 목차에 "Ⅰ.안전보건관리
    // 체계" 밑에 "안전보건관리 체계"가 또 나오는 중복이 생긴다). 입력 필드 구성은
    // 그대로 두고 소제목만 실제 목차에 맞춰 바꾼다.
    overview_label: "사업개요",
    show_cover_nav: true,
    // 실제 샘플의 "Ⅰ.안전보건관리체계 / 1.사업개요" 페이지는 일반 "라벨: 값" 목록이
    // 아니라 글꼴·위치·□ 체크박스 불릿까지 완전히 정형화된 별도 페이지라, 그
    // 서식을 그대로 재현하는 전용 렌더러를 쓴다(generateDocx.ts 등 참고).
    overview_page_style: "lh_standard",
    // "Ⅰ.사업개요" 바로 다음에 "안전보건 경영방침 및 목표" 절을 추가한다. 회원사가
    // 자체 안전보건경영방침 이미지를 갖고 있으면 그 이미지를 업로드해 그대로
    // 첨부하고, 없으면 이 발주처 표준 문구(회사명만 자동 치환, 음영 박스 2곳만
    // 직접 입력)를 쓴다(wizardHtml.ts의 buildManagementPolicySectionHtml 참고).
    show_management_policy: true,
    // "안전보건관리 조직구성"을 실제 조직도(현장소장/안전관리자/관리감독자/작업팀장)
    // 표 형식으로 보여준다. 직책명은 고정값이고 성명·연락처만 입력 가능하다
    // (wizardHtml.ts의 buildOrgChartSectionHtml 참고). 예전에는 agency_templates.
    // sections의 자유서식 텍스트 2칸이었지만, 실제 표준 조직도 서식과 더 가깝게
    // 표 형식으로 바꿨다.
    show_org_chart: true,
    // "구성원별 안전보건 관리 역할"을 회원이 실제 제출했던 서식(구분/주요업무/비고,
    // 헤드라인 음영)과 같은 표로 보여준다. 구분(직책)은 고정값, 주요업무는
    // 경쟁사 서식과 비교해 중복을 통합한 표준 문구가 채워진 채로 수정 가능,
    // 비고는 빈 칸으로 시작한다(wizardHtml.ts의 buildRoleResponsibilitiesSectionHtml
    // 참고). 특정 발주처 전용 내용이 아니라 모든 안전보건관리계획서에 공통으로
    // 들어가는 법정 내용이라 아래 한국전력공사 표준서식에도 동일하게 켜둔다.
    show_role_responsibilities: true,
    // "안전보건교육 계획"을 경쟁사 서식 및 실제 LH 샘플(화성동탄(2), 23~27p
    // "1.2 교육종류 등") 내용을 통합한 표(종류/대상/교육시간/교육강사/교육내용/
    // 교육교재, 헤드라인 음영)로 보여준다. 종류(교육명)는 고정값, 나머지 칸은
    // 표준 문구가 채워진 채로 수정 가능하다(wizardHtml.ts의
    // buildEducationPlanSectionHtml 참고). 특정 발주처 전용 내용이 아니라 모든
    // 안전보건관리계획서에 공통으로 들어가는 법정 내용이라 아래 한국전력공사
    // 표준서식에도 동일하게 켜둔다. 예전에는 sections의 자유서식 텍스트 2칸
    // (id: "education_plan")이었지만 실제 표 서식으로 바꿨다.
    show_education_plan: true,
    // "위험성평가 실시규정"(붙임1, 실제 LH 샘플 화성동탄(2) 131~145p) 전문과 서식
    // 2종(교육일지/회의록)을 팝업(모달)에서 작성하도록 보여준다. 15페이지 분량이라
    // 위저드 본문에는 안내문구+"작성하기" 버튼만 두고, 실제 법정 표준 문구는 팝업
    // 안에서 읽기전용으로 두며 제·개정일/담당자 성명 등 소수만 입력한다
    // (wizardHtml.ts의 buildRiskAssessmentRulesSectionHtml 참고). 산업안전보건법
    // 제36조에 따른 법정 내용이라 아래 한국전력공사 표준서식에도 동일하게 켜둔다.
    show_risk_assessment_rules: true,
    // "유해·위험 기계·기구·물질의 방호조치 및 관리계획" 3개 절(위험기계·기구/
    // 차량계건설기계·하역운반기계/유해·위험물질(MSDS), 실제 LH 샘플 화성동탄(2)
    // 40~90p)을 항목별 체크리스트 개요표 + 항목별 "상세 작성" 팝업 형태로 보여준다
    // (wizardHtml.ts의 buildHazardMachineryLikeSectionHtml/buildHazardSubstanceSectionHtml
    // 참고). 산업안전보건법에 따른 법정 내용이라 아래 한국전력공사 표준서식에도
    // 동일하게 켜둔다.
    show_hazard_management: true,
    // "안전점검 및 일일 순회계획"(실제 LH 샘플 화성동탄(2) 91~93p, "5.1 공정별
    // 안전점검 계획" — TBM 절차 + 작업 전·중·후·특별점검 항목표)을 고정값 서식으로
    // 보여준다(wizardHtml.ts의 buildDailyInspectionPlanSectionHtml 참고). 산업안전
    // 보건법령에 따른 표준 절차·항목이라 아래 한국전력공사 표준서식에도 동일하게
    // 켜둔다.
    show_daily_inspection_plan: true,
    // "중점 위험작업허가제(PTW)"(실제 LH 샘플 화성동탄(2) 33~37p, 허가대상 작업·
    // 허가절차·이행주체 역할표 등)를 고정값 서식으로 보여준다(wizardHtml.ts의
    // buildPtwPlanSectionHtml 참고). 위저드 기본 템플릿의 데모 카드("1. 안전점검
    // 및 일일 순회계획", "2. 중점 위험작업허가제")와 내용이 겹쳐 그 두 카드는 아예
    // 제거했다 — 산업안전보건법령에 따른 표준 절차라 아래 한국전력공사
    // 표준서식에도 동일하게 켜둔다.
    show_ptw_plan: true,
    // "보호구 지급 및 착용확인 절차"(실제 LH 샘플 화성동탄(2) 96p, "5.3 보호구
    // 지급 및 착용확인 절차")를 고정 서식 표로 보여준다. 품명·대상작업·유지관리는
    // 고정이고 지급 예정수량만 실제 입력 가능한 칸이다 — 예전에는 아래 sections의
    // 범용 "protection_equipment" 항목이라 수량이 "(수량 미입력)" 고정 문구로만
    // 나오고 입력할 방법이 없었다는 지적을 받아 이 플래그로 대체했다(sections에서
    // 해당 항목 제거함).
    show_protection_equipment_plan: true,
    // "중대산업재해 등 비상 상황시 조치계획"(실제 LH 샘플 화성동탄(2) 109~121p)을
    // 고정 서식으로 보여준다. 비상대책반 구성(다이어그램)·유관기관 비상연락체계(추가·
    // 삭제 가능한 표)만 실제 입력하고 나머지는 고정 문구다 — 기존 sections의 범용
    // "accident_procedure"(사고발생 시 조치 순서/보고체계) 항목과 내용이 겹쳐
    // 제거했고, 아래 disabled_common_sections로 기존 데모 카드("emergency")도 껐다.
    show_emergency_plan: true,
    // "안전보건협의체 회의계획"(실시주기·참석대상·주요 안건)을 고정 서식 표로
    // 보여준다 — 기존 sections의 범용 "safety_council" 항목 안 council_meeting_plan
    // textarea 필드였는데 표 형식으로 바꿔달라는 요청으로 이 플래그가 생겼다(해당
    // 필드는 아래 safety_council에서 제거함, council_members는 유지).
    show_council_meeting_plan: true,
    // "안전보건관리비 집행 청렴서약서"(실제 LH 샘플 화성동탄(2) 123p)를 정식
    // 서약서 양식(고정 서약 조항 + 서명란)으로 보여준다. 공사명·발주처·상호·
    // 대표자는 사업개요/회원 정보에서 자동으로 채워진다 — 기존 sections의 범용
    // "misc_admin" 항목 안 integrity_pledge textarea 필드였는데 서약서 양식으로
    // 바꿔달라는 요청으로 이 플래그가 생겼다(해당 필드는 아래 misc_admin에서 제거함).
    show_integrity_pledge: true,
    // "적격업체(관계수급인) 선정 평가기준"(실제 LH 샘플 화성동탄(2) 124~125p)을
    // 평가항목·배점표 + 평가등급·처리기준표 고정 서식으로 보여준다. 배점·등급
    // 기준 전부 표준 기준이라 별도 입력 항목은 없다 — 기존 sections의 범용
    // "misc_admin" 항목 안 subcontractor_evaluation textarea 필드였는데 표
    // 형식으로 바꿔달라는 요청으로 이 플래그가 생겼다(해당 필드는 아래
    // misc_admin에서 제거함).
    show_subcontractor_evaluation: true,
    // "종사자(관계수급인) 안전보건 관리비용 기준"(실제 LH 샘플 화성동탄(2)
    // 126~127p)을 계상현황 + 세부내역 표 고정 서식으로 보여준다. 산업안전보건
    // 관리비는 사업개요 도급공사비 기준 자동 계산 추정치를 기본값으로 채우고,
    // 안전관리비(건설기술진흥법) 세부 8개 항목·예비 안전관리비는 직접 입력하며
    // 합계는 항상 자동 계산된다 — 기존 sections의 범용 "safety_cost" 항목 안
    // textarea 2개(자유 입력)였는데 표 형식으로 바꿔달라는 요청으로 이 플래그가
    // 생겼다(해당 항목은 아래 sections에서 제거함).
    show_safety_cost_plan: true,
    // "재해발생 수준"을 자유 서술 대신 증빙자료(이미지) 첨부 방식으로 보여준다.
    // 산재요양승인확인서·산업재해율 조회결과는 필수, 안전보건경영시스템 인증서는
    // 있는 경우에만 첨부하며, 첨부된 이미지는 다운로드 문서에 그대로 한 페이지씩
    // 포함된다 — 기존 sections의 범용 "accident_level" 항목 안 textarea 2개(자유
    // 서술)였는데 증빙자료 첨부 방식으로 바꿔달라는 요청으로 이 플래그가 생겼다
    // (해당 항목은 아래 sections에서 전체 제거함).
    show_accident_level_uploads: true,
    // "작업투입 인력 인적사항"(실제 LH 샘플 화성동탄(2) 165~169p)을 3개 소서식
    // 고정 형태로 보여준다(안전취약근로자 식별/화재감시자 등 지정/2인1조
    // 편성표). 각 소서식은 목적·기준 고정문구 + 기준표(고정 3행) + 관리대장·
    // 명단·편성표(행 추가·삭제 가능) 구조다 — 기존 sections의 범용 "workforce"
    // 항목 안 textarea 3개(자유 입력)였는데 실제 서식대로 표로 바꿔달라는
    // 요청으로 이 플래그가 생겼다(해당 항목은 아래 sections에서 전체 제거함).
    show_workforce_plan: true,
    // 실제 목차 순서(표지 → Ⅰ.안전보건관리체계 → Ⅱ.실행계획 → Ⅲ.운영관리 →
    // Ⅳ.중대산업재해 등 비상 상황시 조치계획 → Ⅴ.기타사항 → Ⅵ.재해발생 수준 →
    // Ⅶ.붙임 → Ⅷ.작업투입 인력 인적사항)에 맞춰, 공통 6대 목차와 아래 sections의
    // 9개 발주처 전용 목차를 각 장(章) 밑에 소제목으로 묶는다. 좌측 목차에는 장별로
    // 대제목(로마숫자+실제 장 제목)이 한 번만 나오고, 그 밑에 속한 절들이 들여쓰기된
    // 소제목으로 나열된다(번호가 중복되어 헷갈리던 기존 평면 목차를 계층 구조로 정리).
    section_order: [
      {
        roman: "Ⅰ",
        title: "안전보건관리 체계",
        members: ["overview", "management-policy", "org_chart", "role_responsibilities"],
      },
      {
        roman: "Ⅱ",
        title: "실행계획",
        members: ["education_plan", "hazard_machinery", "hazard_vehicle", "hazard_substance", "risk", "execution"],
      },
      { roman: "Ⅲ", title: "운영관리", members: ["daily_inspection_plan", "ptw_plan", "protection_equipment"] },
      { roman: "Ⅳ", title: "중대산업재해 등 비상 상황시 조치계획", members: ["emergency_plan"] },
      { roman: "Ⅴ", title: "기타사항", members: ["safety_council", "council_meeting_plan", "integrity_pledge", "subcontractor_evaluation", "misc_admin", "safety_cost"] },
      { roman: "Ⅵ", title: "재해발생 수준", members: ["accident_level"] },
      { roman: "Ⅶ", title: "붙임", members: ["risk_assessment_rules", "attachments"] },
      { roman: "Ⅷ", title: "작업투입 인력 인적사항", members: ["workforce"] },
    ],
    // "emergency": 기존 base 템플릿의 Stitch 데모 카드("AI 현장 반경 5km 이내
    // 지정 응급의료기관 자동 연동" 등 가짜 내용)가 emergency_plan(실제 LH 샘플
    // 내용)과 겹쳐서 끈다.
    // "target": 역시 Stitch 데모 카드("KOSHA-MS 규격" 배지, "TBM 일일 실시 사진
    // 첨부 서식 자동생성 On" 등 가짜 토글)인데, 안전목표는 management-policy의
    // "나.안전보건 목표"와, TBM은 daily_inspection_plan의 실제 고정 내용과 이미
    // 겹쳐서 끈다.
    disabled_common_sections: ["emergency", "target"],
    sections: [
      {
        id: "safety_council",
        label: "안전보건관리 협의체 구성 및 운영",
        fields: [
          {
            key: "council_members",
            label: "협의체 구성원 명단",
            type: "textarea",
            placeholder: "현장소장/관리감독자/작업반장/협력업체 현장소장 및 관리감독자/근로자대표를 성명·소속·연락처와 함께 입력하세요",
            default:
              "참석대상: 현장소장, 관리감독자, 작업반장, 협력업체 현장소장 및 관리감독자, 근로자 대표\n" +
              "현장소장: (미입력) / 근로자 대표: (미입력) / 협력업체 현장소장: (미입력)",
          },
        ],
      },
      {
        id: "misc_admin",
        label: "정기 위험성평가 및 안전보건정보 활용",
        fields: [
          {
            key: "periodic_risk_assessment_plan",
            label: "정기 위험성평가 실시계획 (도급기간 1년 이상 시)",
            type: "textarea",
            placeholder: "최초 위험성평가 이후 매년 1회 이상 재평가 계획(실시주기, 담당자, 재평가 대상 공종)을 입력하세요",
            default:
              "도급기간이 1년 이상인 경우, 최초 위험성평가 이후 매년 1회 이상 정기 위험성평가를 실시하여 신규·변경된 유해·위험요인을 재평가하고 개선대책을 수립·이행한다.\n" +
              "평가주체: 현장소장(안전관리자 검토·보좌) / 평가방법: 빈도·강도법 / 재평가 대상: 전 공종 (도급기간이 1년 미만인 경우 해당 없음)",
          },
          {
            key: "safety_info_utilization",
            label: "안전보건정보 활용결과",
            type: "textarea",
            placeholder: "안전보건공단·고용노동부 등이 제공하는 재해사례·위험성평가 자료·안전작업지침 등을 어떻게 확보하고 계획서·교육에 반영했는지를 입력하세요",
            default:
              "안전보건공단(KOSHA)의 재해사례 및 위험성평가 지원시스템(KRAS), 고용노동부 고시·지침, 동종 업종 사망재해 사례 등을 확보하여 본 계획서의 위험성평가 항목 및 근로자 안전교육 자료에 반영하였다.\n" +
              "활용자료: (미입력) / 반영내용: (미입력)",
          },
        ],
      },
    ],
  },
  {
    agency: "한국전력공사",
    name: "한국전력공사 표준 서식 (2025 개정판)",
    // "구성원별 안전보건 관리 역할"은 특정 발주처 전용이 아니라 모든 안전보건
    // 관리계획서에 공통으로 들어가는 법정 내용이라 LH와 동일하게 켜둔다.
    show_role_responsibilities: true,
    // LH와 동일하게, 안전보건교육 계획도 모든 안전보건관리계획서에 공통으로
    // 들어가는 법정 내용이라 켜둔다.
    show_education_plan: true,
    // 위험성평가 실시규정도 산업안전보건법 제36조에 따른 법정 내용이라 켜둔다.
    show_risk_assessment_rules: true,
    // 유해·위험 기계·기구·물질 방호조치 및 관리계획도 산업안전보건법에 따른 법정
    // 내용이라 켜둔다.
    show_hazard_management: true,
    // 안전점검 및 일일 순회계획(TBM 절차 등)도 산업안전보건법령에 따른 표준
    // 절차라 켜둔다.
    show_daily_inspection_plan: true,
    // 중점 위험작업허가제(PTW)도 산업안전보건법령에 따른 표준 절차라 켜둔다.
    show_ptw_plan: true,
    disabled_common_sections: [],
    sections: [
      {
        id: "electrical_safety",
        label: "전기공사 특별 안전관리 사항",
        fields: [
          {
            key: "outage_plan",
            label: "정전작업 계획 및 절차",
            type: "textarea",
            placeholder: "정전작업 범위, 시간대, 복전 절차를 입력하세요",
            default:
              "정전작업 원칙: 활선작업을 지양하고 정전작업을 원칙으로 한다.\n" +
              "정전 범위: (미입력) / 정전 시간대: (미입력)\n" +
              "절차: ① 작업 전 차단기 확인(전기실/현장) → ② 스위치·차단기 내림 → ③ 잠금장치(LOTO) 시건 및 표지부착 → ④ 검전 실시 → ⑤ 작업 수행 → ⑥ 모든 작업 완료 후 운전부서 입회자의 요청에 의해서만 전원 복구",
          },
          {
            key: "grounding_check",
            label: "접지·활선 근접작업 점검 현황",
            type: "textarea",
            placeholder: "접지 설치 확인 및 활선 근접작업 이격거리 준수 계획을 입력하세요",
            default:
              "접지 설치: 작업 전 접지 설치상태 확인 및 접지저항 측정, 작업 중 수시 확인\n" +
              "활선 근접작업 이격거리: 전압별 안전이격거리 기준(산업안전보건기준에 관한 규칙 별표) 준수, 절연용 방호구 설치 후 작업",
          },
          {
            key: "insulation_gear",
            label: "절연용 보호구·방호구 지급 현황",
            type: "textarea",
            placeholder: "절연장갑, 절연화, 방호관 등 지급/점검 현황을 입력하세요",
            default:
              "지급품목: 절연장갑, 절연화, 절연모, 방호관, 절연용 방호구(고무블랑켓 등)\n" +
              "점검주기: 작업 전 매회 육안점검, 절연내력 정기시험(6개월 1회) — 시험성적서 현장 보관",
          },
        ],
      },
    ],
  },
  {
    agency: "한국수자원공사",
    name: "한국수자원공사(K-water) 표준 서식",
    // 실제 K-water 붙임2 "안전보건관리계획서 작성양식"(5개 장 구성: Ⅰ.과업개요 →
    // Ⅱ.안전보건관리체제 → Ⅲ.안전보건관리 실행 → Ⅳ.안전보건 운영관리 →
    // Ⅴ.재해발생 수준)을 기준으로 만들었다. LH·KEPCO에 이미 만들어 둔 범용
    // 절(경영방침/조직도/역할/교육계획/위험성평가실시규정/기계기구물질관리계획/
    // 안전점검·순회계획/PTW)은 K-water 샘플에도 동일한 법정 내용으로 등장하므로
    // 그대로 재사용하고, K-water 고유 항목(보호구 지급계획, 신호·연락체계,
    // 기계·장비 안전검사표, 장비 안전관리대책, 합동 안전·보건점검)만 아래
    // sections에 새로 추가했다.
    cover_style: "generic",
    overview_label: "과업 개요",
    show_management_policy: true,
    show_org_chart: true,
    show_role_responsibilities: true,
    show_education_plan: true,
    show_risk_assessment_rules: true,
    show_hazard_management: true,
    show_daily_inspection_plan: true,
    show_ptw_plan: true,
    show_protection_equipment_plan: true,
    show_emergency_plan: true,
    // 실제 목차 순서(Ⅰ.과업개요 → Ⅱ.안전보건관리체제 → Ⅲ.안전보건관리 실행 →
    // Ⅳ.안전보건 운영관리 → Ⅴ.재해발생 수준)에 맞춰 공통 절과 K-water 전용
    // 절을 장(章)별로 묶는다.
    section_order: [
      { roman: "Ⅰ", title: "과업 개요", members: ["overview"] },
      {
        roman: "Ⅱ",
        title: "안전보건관리체제",
        members: ["management-policy", "hazard_machinery", "hazard_vehicle", "hazard_substance", "org_chart", "role_responsibilities"],
      },
      {
        roman: "Ⅲ",
        title: "안전보건관리 실행",
        members: [
          "risk",
          "risk_assessment_rules",
          "education_plan",
          "protection_equipment",
          "daily_inspection_plan",
          "joint_inspection_kwater",
          "ptw_plan",
        ],
      },
      {
        roman: "Ⅳ",
        title: "안전보건 운영관리",
        members: ["signal_contact_kwater", "machinery_inspection_kwater", "equipment_safety_measures_kwater", "emergency_plan"],
      },
      { roman: "Ⅴ", title: "재해발생 수준", members: ["accident_level", "attachments"] },
    ],
    // "emergency": 기존 base 템플릿의 Stitch 데모 카드가 emergency_plan(실제 LH
    // 샘플 기반 고정 서식)과 내용이 겹쳐서 끈다.
    disabled_common_sections: ["emergency"],
    sections: [
      {
        id: "joint_inspection_kwater",
        label: "합동 안전·보건점검 이행",
        fields: [
          {
            key: "inspection_overview",
            label: "점검 개요",
            type: "textarea",
            placeholder: "점검 일정, 점검방법, 점검내용을 입력하세요",
            default: "작업 장소에 대한 점검 일정, 점검방법, 점검내용을 정하여 도급인·수급인 합동으로 정기 점검을 실시한다.",
          },
          {
            key: "corrective_action",
            label: "점검결과 조치이행",
            type: "textarea",
            placeholder: "점검결과 위험요인 발견 시 조치계획을 입력하세요",
            default: "점검 결과 위험요인 발견 시 즉시 시정조치하고, 조치 내용과 완료일을 기록·관리하며 차기 점검계획에 반영한다.",
          },
        ],
      },
      {
        id: "signal_contact_kwater",
        label: "신호 및 연락체계",
        fields: [
          {
            key: "contact_and_signal",
            label: "비상연락체계 · LOTO · 신호체계",
            type: "textarea",
            placeholder: "비상연락망, LOTO 절차, 신호체계(신호수·무전기·수신호 등)를 입력하세요",
            default:
              "□ 비상연락체계\n" +
              "관련기관: K-water 담당부서 / 관할 지방고용노동청 / 관할 소방서 / 관할 경찰서 / 인근 병원 — 각 담당자·연락처를 표로 정리하여 현장에 게시\n\n" +
              "□ LOTO(Lock Out, Tag Out) 작업절차 준수\n" +
              "대상: 정비·점검·수리 등 비정형작업\n" +
              "목적: 기계설비의 정비·청소·수리 작업 중 타 근로자가 그 설비를 운전하는 것을 방지\n" +
              "방법: ① 작업 전 전원부 등에 잠금장치 및 표지판 설치 → ② 작업 완료 후 직접 잠금장치 및 표지판 해제 → ③ 관련 작업자에게 공지\n\n" +
              "□ 신호체계\n" +
              "신호수·무전기·깃발 등을 이용한 신호체계를 구축하고, 건설현장 표준 수신호(작업시작/멈춤/비상멈춤/주행방향/포크 올리기·내리기/작업중지 등)를 전 근로자에게 교육한다.",
          },
        ],
      },
      {
        id: "machinery_inspection_kwater",
        label: "기계·장비 안전검사",
        fields: [
          {
            key: "inspection_list",
            label: "종류별 점검사항 및 점검주기",
            type: "textarea",
            placeholder: "현장에 반입되는 기계·장비별 안전검사 항목·주기·관리계획을 입력하세요",
            default:
              "※ 설치 끝난 날(신규 등록)부터 3년 이내 최초 안전검사 실시, 그 이후 2년마다 점검\n" +
              "· 크레인: 과부하방지장치, 권과방지장치, 안전장치, 훅해지장치 등 — 2년에 1회\n" +
              "· 압력용기: 압력방출장치(안전밸브), 압력계 등 — 2년에 1회\n" +
              "· 리프트: 과부하방지장치, 권과방지장치, 낙하방지장치, 비상정지장치 등 — 2년에 1회\n" +
              "· 프레스: 방호장치, 비상정지장치 등 — 2년에 1회\n" +
              "· 전단기: 방호장치(가드식, 광전자식), 비상정지장치 등 — 2년에 1회\n" +
              "· 곤돌라: 비상정지장치, 권과방지장치, 과부하방지장치, 낙하방지장치, 수평조절장치 등 — 2년에 1회\n" +
              "· 국소배기장치: 흡인성능(제어풍속), 댐퍼, 배풍기의 작동상태 등 — 2년에 1회\n" +
              "· 원심기: 비상정지장치, 덮개 브레이크 등 — 2년에 1회\n" +
              "· 롤러기: 급정지장치, 비상정지장치, 안전캡 등 — 2년에 1회\n" +
              "· 사출성형기: 출입문 리미트방호장치, 비상정지장치, 고온부 덮개 등 — 2년에 1회\n" +
              "· 고소작업대: 안전장치 부착 및 작동 유무, 작업대 고정볼트 체결 및 안전난간 설치 상태, 아웃트리거 설치 상태 등 — 2년에 1회\n" +
              "· 컨베이어: 원동기 및 풀리 기능 이상 유무, 이탈 등의 방지장치 기능 이상 유무, 비상정지장치의 기능 이상 유무 등 — 2년에 1회\n" +
              "· 산업용 로봇: 안전매트, 광전자식 안전장치, 안전방책 등 각종 방호장치 작동상태, 비상정지 스위치 작동 상태 등 — 2년에 1회",
          },
        ],
      },
      {
        id: "equipment_safety_measures_kwater",
        label: "장비 안전관리대책",
        fields: [
          {
            key: "measures",
            label: "구분·위험요소·안전대책",
            type: "textarea",
            placeholder: "장비별 위험요소와 안전대책을 입력하세요",
            default:
              "· 고소작업차 — 위험요소: 고소작업차 전도 / 안전대책: 아웃트리거 전개 확인, 작업 전 지반 지내력 확인, 유도자 배치\n" +
              "※ 사용 장비별로 작업 전 체크리스트·안전점검표 작성 및 조치, 작업계획 수립·검토 내용을 추가로 작성하고, 안전작업허가 대상 장비는 안전작업계획서도 함께 첨부한다.",
          },
        ],
      },
      {
        // LH는 이 id를 자체 sections에 정의해 두었지만(안전보건경영시스템 인증
        // 현황 등), K-water는 별도로 정의한 적이 없어 section_order에서 참조만
        // 하고 실제로는 어디에도 나오지 않는 채로 조용히 빠지는 문제가 있었다 —
        // K-water 샘플(Ⅴ.재해발생 수준)에 맞춰 새로 정의한다.
        id: "accident_level",
        label: "재해발생 수준",
        fields: [
          {
            key: "accident_handling",
            label: "산업재해 처리에 관한 사항",
            type: "textarea",
            placeholder: "산업재해 처리 및 산업재해보상보험과 관련된 절차 및 내용을 입력하세요",
            default:
              "산업재해 발생 시 산업재해보상보험법에 따라 근로복지공단에 요양급여를 신청하고, 발생 경위·원인·재발방지대책을 기록·보관한다. 중대재해에 해당하는 경우 관할 지방고용노동청 및 K-water 담당부서에 즉시 보고한다.",
          },
          {
            key: "accident_history",
            label: "산업재해 발생 현황",
            type: "textarea",
            placeholder: "업체명별 최근 3년간 산업재해 현황(건수)을 입력하세요",
            default: "업체명: (미입력) / 최근 3년간 산업재해 현황: 0건",
          },
          {
            key: "insurance_certificate",
            label: "산재보험 가입 증명원",
            type: "textarea",
            placeholder: "산재보험 가입을 증명할 수 있는 서류(스캔본) 첨부 여부를 입력하세요",
            default: "산재보험 가입증명원(스캔본)을 첨부한다.",
          },
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

  const coverStyle = t.cover_style ?? "generic";
  const overviewLabel = t.overview_label ?? null;
  const showCoverNav = t.show_cover_nav ?? false;
  const sectionOrder = t.section_order ?? [];
  const overviewPageStyle = t.overview_page_style ?? null;
  const showManagementPolicy = t.show_management_policy ?? false;
  const showOrgChart = t.show_org_chart ?? false;
  const showRoleResponsibilities = t.show_role_responsibilities ?? false;
  const showEducationPlan = t.show_education_plan ?? false;
  const showRiskAssessmentRules = t.show_risk_assessment_rules ?? false;
  const showHazardManagement = t.show_hazard_management ?? false;
  const showDailyInspectionPlan = t.show_daily_inspection_plan ?? false;
  const showPtwPlan = t.show_ptw_plan ?? false;
  const showProtectionEquipmentPlan = t.show_protection_equipment_plan ?? false;
  const showEmergencyPlan = t.show_emergency_plan ?? false;
  const showCouncilMeetingPlan = t.show_council_meeting_plan ?? false;
  const showIntegrityPledge = t.show_integrity_pledge ?? false;
  const showSubcontractorEvaluation = t.show_subcontractor_evaluation ?? false;
  const showSafetyCostPlan = t.show_safety_cost_plan ?? false;
  const showAccidentLevelUploads = t.show_accident_level_uploads ?? false;
  const showWorkforcePlan = t.show_workforce_plan ?? false;
  if (existing) {
    const { error } = await admin
      .from("agency_templates")
      .update({
        name: t.name,
        sections: t.sections,
        disabled_common_sections: t.disabled_common_sections,
        cover_style: coverStyle,
        overview_label: overviewLabel,
        show_cover_nav: showCoverNav,
        section_order: sectionOrder,
        overview_page_style: overviewPageStyle,
        show_management_policy: showManagementPolicy,
        show_org_chart: showOrgChart,
        show_role_responsibilities: showRoleResponsibilities,
        show_education_plan: showEducationPlan,
        show_risk_assessment_rules: showRiskAssessmentRules,
        show_hazard_management: showHazardManagement,
        show_daily_inspection_plan: showDailyInspectionPlan,
        show_ptw_plan: showPtwPlan,
        show_protection_equipment_plan: showProtectionEquipmentPlan,
        show_emergency_plan: showEmergencyPlan,
        show_council_meeting_plan: showCouncilMeetingPlan,
        show_integrity_pledge: showIntegrityPledge,
        show_subcontractor_evaluation: showSubcontractorEvaluation,
        show_safety_cost_plan: showSafetyCostPlan,
        show_accident_level_uploads: showAccidentLevelUploads,
        show_workforce_plan: showWorkforcePlan,
      })
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
        cover_style: coverStyle,
        overview_label: overviewLabel,
        show_cover_nav: showCoverNav,
        section_order: sectionOrder,
        overview_page_style: overviewPageStyle,
        show_management_policy: showManagementPolicy,
        show_org_chart: showOrgChart,
        show_role_responsibilities: showRoleResponsibilities,
        show_education_plan: showEducationPlan,
        show_risk_assessment_rules: showRiskAssessmentRules,
        show_hazard_management: showHazardManagement,
        show_daily_inspection_plan: showDailyInspectionPlan,
        show_ptw_plan: showPtwPlan,
        show_protection_equipment_plan: showProtectionEquipmentPlan,
        show_emergency_plan: showEmergencyPlan,
        show_council_meeting_plan: showCouncilMeetingPlan,
        show_integrity_pledge: showIntegrityPledge,
        show_subcontractor_evaluation: showSubcontractorEvaluation,
        show_safety_cost_plan: showSafetyCostPlan,
        show_accident_level_uploads: showAccidentLevelUploads,
        show_workforce_plan: showWorkforcePlan,
      })
      .select("id")
      .single();
    if (error) throw error;
    console.log(`${t.agency} 표준서식 생성 완료:`, data.id);
  }
}
