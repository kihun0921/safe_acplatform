// 발주처명 매칭용 정규화 — "한국토지주택공사(LH)"처럼 사람이 직접 입력하거나
// 특정 API 소스가 붙이는 괄호 약어(LH, K-water 등)를 떼어내고 비교한다.
// documents.agency와 agency_templates.agency의 실제 문자열이 소스마다 다르게
// 들어올 수 있다 — 예: 관리자가 수동 등록한 공고는 "한국토지주택공사(LH)"인데,
// LH 개찰정보 API로 동기화된 공고는 "한국토지주택공사"(괄호 없음)로 들어와
// 정확히 일치하는 문자열 비교(eq)로는 표준서식을 못 찾는 문제가 실제로 있었다.
export function normalizeAgencyName(agency: string): string {
  return agency.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

// 군부대(육·해·공군, 국방부 직할부대 등)는 발주기관명이 부대마다 전부 다르다
// (제1군수지원사령부/제17보병사단/제20전투비행단 등) — 다른 발주처처럼 "기관명
// 하나당 서식 하나"로 정확히 1:1 매칭할 수 없다. 이 시스템은 애초에 군부대 공사를
// 하나의 범용 서식으로 다루도록 설계됐으므로(부대마다 서식을 따로 등록하지
// 않는다), 발주기관명에 군 부대 특유의 명칭 패턴이 있으면 전부 agency_templates에
// "군부대"라는 이름으로 등록된 단 하나의 범용 서식으로 매칭한다.
export const GENERIC_MILITARY_AGENCY = "군부대";
const MILITARY_AGENCY_KEYWORDS = [
  "군수지원사령부",
  "군수사령부",
  "방공유도탄사령부",
  "특수전사령부",
  "교육사령부",
  "수도방위사령부",
  "작전사령부",
  "항공작전사령부",
  "함대사령부",
  "전투비행단",
  "비행단",
  "방위사업청",
  "국방부",
  "합동참모본부",
  "육군본부",
  "해군본부",
  "공군본부",
  "해병대사령부",
  "사단",
  "여단",
  "연대",
  "대대",
  "군단",
  "전단",
];
export function isMilitaryAgency(agency: string): boolean {
  return MILITARY_AGENCY_KEYWORDS.some((kw) => agency.includes(kw));
}

// 발주처 표준서식 매칭의 단일 진입점 — 문서 생성(route.ts), 위저드 화면 렌더링
// (wizard/page.tsx), 서식 수동 전환(template/route.ts) 세 곳이 서로 다른 매칭
// 로직을 쓰면 "위저드에선 보이는데 생성 땐 안 붙는다" 같은 불일치가 생기므로
// 반드시 이 함수 하나로 통일한다. 1) 정규화된 기관명이 정확히 일치하는 서식이
// 있으면 그것을 쓰고, 2) 없고 군부대로 판단되면 범용 "군부대" 서식으로 대체한다.
export function findMatchingAgencyTemplates<T extends { agency: string }>(
  agency: string | null | undefined,
  templates: T[] | null | undefined
): T[] {
  if (!agency || !templates) return [];
  const normalized = normalizeAgencyName(agency);
  const exact = templates.filter((t) => normalizeAgencyName(t.agency) === normalized);
  if (exact.length > 0) return exact;
  if (isMilitaryAgency(agency)) {
    return templates.filter((t) => t.agency === GENERIC_MILITARY_AGENCY);
  }
  return [];
}

export type AgencyTemplateField = {
  key: string;
  label: string;
  // "richHtml": 라벨+입력칸 한 줄이 아니라, 실제 표(위험성평가표·보호구 지급표 등)
  // 처럼 제출 문서다운 구조가 필요한 내용을 위한 타입이다. default에 담긴 HTML을
  // 이스케이프 없이 그대로 심는다 — 그 HTML 안의 input/textarea/select는 일반
  // id만 달면(data-wizard-key 없이) 다른 발주처 전용 필드와 동일하게 field-N
  // 자동저장 체계에 그대로 잡히고, 안의 <table>도 다운로드 문서(DOCX/PDF/HWPX)
  // 생성기가 섹션 안의 표를 모두 긁어가는 범용 로직에 그대로 걸려 실제 표 형태로
  // 출력된다 — 별도 전용 추출/렌더 코드를 새로 만들 필요가 없다(나열식 텍스트
  // 대신 서식 있는 표로 출력해 달라는 요청으로 추가됨).
  type: "text" | "textarea" | "richHtml";
  placeholder?: string;
  // 실제 LH 등 발주처 제출 서식에서 흔히 쓰이는 문구/형식을 미리 채워두는 값.
  // 회원은 빈 칸에서 시작하는 대신 이 초안을 바로 고쳐 쓸 수 있다. 저장된 값이
  // 없을 때만 서버 렌더링 시 이 값으로 채워지고, 한 글자라도 입력해 저장되면
  // 그 이후로는 항상 저장된 값이 우선한다(일반 필드 자동저장과 동일한 동작).
  // richHtml 타입에서는 이 값이 HTML 원본 자체다.
  default?: string;
};

export type AgencyTemplateSection = {
  id: string;
  label: string;
  fields: AgencyTemplateField[];
};

export type AgencyTemplateRow = {
  id: string;
  agency: string;
  name: string;
  sections: AgencyTemplateSection[];
  disabled_common_sections?: string[];
  cover_style?: CoverStyle;
  // section_order를 쓰는 경우, "사업개요" 절 자체의 소제목만 바꾼다(그 절이 속한
  // 장의 대제목은 section_order 그룹의 title이 따로 결정한다 — 둘을 혼동해 같은
  // 문구를 넣으면 "Ⅰ.안전보건관리 체계" 대제목 밑에 "안전보건관리 체계"라는
  // 소제목이 또 나오는 식으로 중복돼 보인다). section_order를 안 쓰는 경우엔
  // "Ⅰ. 사업개요 및 기본정보" 제목 전체를 이 값으로 바꾼다. 입력 필드 자체는 그대로다.
  overview_label?: string | null;
  // 좌측 목차 맨 위(Ⅰ장보다 위)에 "표지" 안내 항목을 보여줄지 여부.
  show_cover_nav?: boolean;
  // 공통 6대 목차 + 발주처 전용 목차 전체를 이 발주처 실제 서식의 장(章) 구조로
  // 재배치한다. 비어 있으면 원래 순서(공통 6개 + 전용 항목은 뒤에 이어붙임)를 쓴다.
  section_order?: SectionOrderGroup[] | null;
  // "Ⅰ장 1.사업개요"를 발주처가 실제로 요구하는 완전 정형화된 서식(글꼴·위치·
  // □ 체크박스 불릿 등)으로 별도 페이지에 렌더링할 스타일. null이면 기존처럼
  // 일반 "라벨: 값" 목록으로 나간다(generateDocx.ts 등의 OVERVIEW_PAGE_RENDERERS 참고).
  overview_page_style?: string | null;
  // "Ⅰ.사업개요" 바로 다음에 "안전보건 경영방침 및 목표" 절을 보여줄지 여부.
  show_management_policy?: boolean;
  // "안전보건관리 조직구성"을 실제 조직도 표(직책 고정값, 성명·연락처만 입력)로
  // 보여줄지 여부.
  show_org_chart?: boolean;
  // "구성원별 안전보건 관리 역할"을 표(구분/주요업무/비고, 헤드라인 음영)로
  // 보여줄지 여부.
  show_role_responsibilities?: boolean;
  // "안전보건교육 계획"을 표(종류/대상/교육시간/교육강사/교육내용/교육교재,
  // 헤드라인 음영)로 보여줄지 여부.
  show_education_plan?: boolean;
  // "위험성평가 실시규정"(붙임1) 전문 + 서식 2종을 팝업(모달)에서 작성하는 절을
  // 보여줄지 여부. 본문에는 안내문구 + "작성하기" 버튼만 두고, 실제 내용은
  // 팝업 안에 있다.
  show_risk_assessment_rules?: boolean;
  // "유해·위험 기계·기구·물질의 방호조치 및 관리계획" 3개 절(위험기계·기구/
  // 차량계건설기계·하역운반기계/유해·위험물질(MSDS))을 항목별 체크리스트 개요표 +
  // 항목별 "상세 작성" 팝업 형태로 보여줄지 여부. 세 절은 항상 함께 다뤄지는
  // 하나의 장이라 플래그도 하나로 묶는다.
  show_hazard_management?: boolean;
  // "안전점검 및 일일 순회계획"(TBM 절차 + 작업 전·중·후·특별점검 항목표)을
  // 고정값 서식으로 보여줄지 여부. 산업안전보건법령에 따른 표준 절차·항목이라
  // 입력 요소 없이 그대로 다운로드 문서에 포함된다.
  show_daily_inspection_plan?: boolean;
  // "중점 위험작업허가제(PTW)"(허가대상 작업·허가절차·이행주체 역할표 등)를
  // 고정값 서식으로 보여줄지 여부. 위저드 기본 템플릿에 있던 Stitch 데모 카드
  // ("1. 안전점검 및 일일 순회계획", "2. 중점 위험작업허가제")는 이 내용과 겹쳐서
  // 아예 제거했으므로(wizardHtml.ts HTML_documents_wizard), 이 플래그가 꺼진
  // 발주처 서식에는 해당 내용이 어느 쪽에도 나오지 않는다 — 새 발주처를 추가할
  // 때는 반드시 이 두 플래그(및 show_daily_inspection_plan)를 켤 것.
  show_ptw_plan?: boolean;
  // "보호구 지급 및 착용확인 절차"(품목별 지급 예정수량·대상·유지관리·착용확인 절차)를
  // 고정 서식 표로 보여줄지 여부. 품명·대상작업·유지관리 문구는 실제 LH 샘플(화성동탄(2)
  // 96p)대로 고정되어 있고, 지급 예정수량 칸만 실제 입력 가능한 input이다(과거에는
  // agency_templates.sections의 범용 label+textarea 항목이라 "(수량 미입력)"이라는
  // 고정 문구만 표시되고 실제로 입력할 방법이 없었다). 이 플래그를 켜는 발주처는
  // sections 배열에서 기존 "protection_equipment" 범용 항목을 반드시 제거할 것 —
  // 안 그러면 같은 이름의 절이 두 번 나온다.
  show_protection_equipment_plan?: boolean;
  // "중대산업재해 등 비상 상황시 조치계획"(실제 LH 샘플 화성동탄(2) 109~121p)을
  // 고정 서식으로 보여줄지 여부. 비상대책반 구성(다이어그램, 성명·연락처 입력)과
  // 유관기관 비상연락체계(기관명·담당부서·전화번호를 자유롭게 추가·삭제 가능한 표)만
  // 실제 입력 가능하고, 나머지(비상사태 대응계획, 발생유형별 대응 시나리오, 재해조사
  // 및 대책수립, 발생보고, 처리계통도, 응급처치요령)는 고정 문구다. 기존 base
  // 템플릿의 공통 섹션 "emergency"(Stitch 데모 카드)와 내용이 겹치므로, 이 플래그를
  // 켜는 발주처는 반드시 disabled_common_sections에 "emergency"를 추가할 것.
  show_emergency_plan?: boolean;
  // "안전보건협의체 회의계획"(실시주기·참석대상·주요 안건)을 고정 서식 표로
  // 보여줄지 여부. 기존에는 sections의 범용 "safety_council" 항목 안 textarea
  // 필드(council_meeting_plan)였는데, 표 형식으로 바꿔달라는 요청으로 이 플래그가
  // 생겼다 — 이 플래그를 켜는 발주처는 sections의 safety_council에서
  // council_meeting_plan 필드를 반드시 제거할 것(council_members는 그대로 둠,
  // 안 그러면 같은 내용이 두 번 나온다).
  show_council_meeting_plan?: boolean;
  // "안전보건관리비 집행 청렴서약서"(실제 LH 샘플 화성동탄(2) 123p)를 정식 서약서
  // 양식(고정 서약 조항 + 서명란)으로 보여줄지 여부. 공사명·발주처·상호(회사명)·
  // 대표자는 사업개요/회원 정보에서 자동으로 채워지고(각각 doc.title/doc.agency/
  // members.company/members.ceo_name), 현장대리인만 회원 이름을 기본값으로 채운 뒤
  // 필요시 직접 수정한다. 기존에는 sections의 범용 "misc_admin" 항목 안 textarea
  // 필드(integrity_pledge)였는데, 서약서 양식으로 바꿔달라는 요청으로 이 플래그가
  // 생겼다 — 이 플래그를 켜는 발주처는 sections의 misc_admin에서 integrity_pledge
  // 필드를 반드시 제거할 것(다른 필드는 그대로 둠).
  show_integrity_pledge?: boolean;
  // "적격업체(관계수급인) 선정 평가기준"(실제 LH 샘플 화성동탄(2) 124~125p)을
  // 평가항목·배점표 + 평가등급·처리기준표 고정 서식으로 보여줄지 여부. 평가목적·
  // 배점·등급기준·평가시기·증빙서류 보관은 전부 표준 기준이라 고정이고, 별도
  // 입력 항목은 없다. 기존에는 sections의 범용 "misc_admin" 항목 안 textarea
  // 필드(subcontractor_evaluation)였는데, 표 형식으로 바꿔달라는 요청으로 이
  // 플래그가 생겼다 — 이 플래그를 켜는 발주처는 sections의 misc_admin에서
  // subcontractor_evaluation 필드를 반드시 제거할 것(다른 필드는 그대로 둠).
  show_subcontractor_evaluation?: boolean;
  // "종사자(관계수급인) 안전보건 관리비용 기준"(실제 LH 샘플 화성동탄(2) 126~127p)을
  // 계상현황 + 세부내역 표 고정 서식으로 보여줄지 여부. 산업안전보건관리비는
  // 사업개요 도급공사비 기준 자동 계산 추정치를 기본값으로 채우고, 안전관리비
  // (건설기술진흥법) 세부 8개 항목·예비 안전관리비는 직접 입력하며 합계는 항상
  // 자동 계산된다(documents.content.safetyCostAmounts). 기존에는 sections의
  // 범용 "safety_cost" 항목 안 textarea 2개(자유 입력)였는데, 표 형식으로 바꿔
  // 달라는 요청으로 이 플래그가 생겼다 — 이 플래그를 켜는 발주처는 sections에서
  // "safety_cost" 항목을 반드시 제거할 것.
  show_safety_cost_plan?: boolean;
  // "재해발생 수준"을 자유 서술 대신 증빙자료 첨부 방식으로 보여줄지 여부.
  // 산재요양승인확인서 / 산업재해율 조회결과 / 안전보건경영시스템 인증서(있는
  // 경우) 3종을 각각 이미지(PNG/JPG)로 업로드하며(documents.content.
  // accidentLevelAttachments), 업로드된 자료는 다운로드 문서(DOCX/PDF)에서
  // 그 자체로 한 페이지씩 삽입된다(HWPX는 이미지를 지원하지 않아 첨부 여부만
  // 문구로 표시). 첨부하지 않은 항목은 미첨부로 처리하고 생략한다. 이 플래그를
  // 켜는 발주처는 sections의 accident_level에서 accident_history/
  // safety_certification 필드를 반드시 제거할 것.
  show_accident_level_uploads?: boolean;
  // "작업투입 인력 인적사항"(실제 LH 샘플 화성동탄(2) 165~169p)을 3개 소서식
  // 고정 형태로 보여줄지 여부: (1)안전취약근로자(고령·여성·외국인) 식별 —
  // 목적 고정문구 + 식별기준/안전관리방안 고정 표(3행) + 식별·관리대장(행
  // 추가·삭제 가능, documents.content.workforceVulnerableRows), (2)화재감시자·
  // 작업지휘자·감시자 지정 — 목적 고정문구 + 지정기준/임무 고정 표(3행) +
  // 지정 명단(행 추가·삭제 가능, documents.content.workforceFireWatchRows),
  // (3)위험작업 시 2인1조 편성표 — 대상 고정문구 + 편성표(행 추가·삭제 가능,
  // documents.content.workforcePairWorkRows). 기존에는 sections의 범용
  // "workforce" 항목 안 textarea 3개(자유 입력)였는데, 실제 서식대로 표로
  // 바꿔달라는 요청으로 이 플래그가 생겼다 — 이 플래그를 켜는 발주처는
  // sections에서 "workforce" 항목을 반드시 제거할 것(section_order의
  // "workforce" id 참조는 그대로 두어도 된다 — 새 전용 섹션이 같은 id로 렌더된다).
  show_workforce_plan?: boolean;
};

// section_order의 한 그룹 = 실제 문서의 장(章) 하나. roman/title은 좌측 목차에
// 대제목으로 한 번만 표시되고, members(공통 섹션 키 또는 sections[].id)는 그 장에
// 속하는 소제목들로 대제목 밑에 들여쓰기되어 나열된다 — 큰 목차 하나에 여러 절이
// 묶여 있는 실제 공공서식의 구조를 그대로 반영한다.
export type SectionOrderGroup = { roman: string; title: string; members: string[] };

// section_order의 각 장(章) 안에서 절이 몇 번째인지(1부터 시작, 장이 바뀌면 다시
// 1로 초기화)를 구해 { member id → 장 내 순번 } 맵으로 돌려준다. 좌측 목차의
// buildGroupedNavItemHtml() 번호(로마숫자 대제목 밑에서만 세는 아라비아 숫자)와
// 정확히 같은 규칙이라, 다운로드 문서(DOCX/PDF/HWPX)의 소제목 번호도 이 맵을
// 그대로 써서 화면 목차 번호와 일치시킨다.
export function computeSectionOrderNumbers(groups: SectionOrderGroup[] | null | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const group of groups ?? []) {
    group.members.forEach((id, idx) => {
      result[id] = idx + 1;
    });
  }
  return result;
}

// { member id → 그 절이 속한 장(章)의 로마숫자+제목 } 맵. 다운로드 문서에서
// "Ⅱ. 실행계획"처럼 장이 바뀔 때마다 대제목을 보여주기 위해, 각 절이 어느
// 장 소속인지 조회하는 용도로 쓴다.
export function computeSectionOrderChapters(
  groups: SectionOrderGroup[] | null | undefined
): Record<string, { roman: string; title: string }> {
  const result: Record<string, { roman: string; title: string }> = {};
  for (const group of groups ?? []) {
    for (const id of group.members) {
      result[id] = { roman: group.roman, title: group.title };
    }
  }
  return result;
}

// 다운로드 문서(DOCX/PDF/HWPX) 맨 앞에 붙는 표지 레이아웃 종류. 표지 데이터
// (공사명/공사기간/도급금액/작성자 등)는 발주처와 무관하게 항상 동일하고,
// 발주처마다 다른 건 그 데이터를 배치하는 레이아웃뿐이라 발주처별로 실제
// 표지 샘플을 확인한 뒤에만 전용 스타일을 추가한다(generateDocx.ts /
// generatePdf.tsx / generateHwpx.ts에 각각 렌더러가 있어야 함). 그 전까지는
// 모든 발주처가 범용 표지(generic)를 쓴다.
export const COVER_STYLES: { value: string; label: string }[] = [
  { value: "generic", label: "범용 표지 (기본)" },
  { value: "lh_standard", label: "한국토지주택공사(LH) 표준 표지" },
  { value: "kwater_standard", label: "한국수자원공사(K-water) 표준 표지" },
  { value: "military_standard", label: "군부대 표준 표지" },
];
export type CoverStyle = "generic" | "lh_standard" | "kwater_standard" | "military_standard";

// 공통 6대 목차 — 각 항목의 실제 DOM id(sec-*)와 관리자 화면에 보여줄 한글 라벨.
export const COMMON_SECTIONS: { key: string; label: string }[] = [
  { key: "overview", label: "Ⅰ. 사업개요 및 기본정보" },
  { key: "risk", label: "Ⅱ. 관리체계 및 위험성평가" },
  { key: "execution", label: "Ⅲ. 현장 안전보건 실행계획" },
  { key: "emergency", label: "Ⅳ. 현장 운영 및 비상대책" },
  { key: "target", label: "Ⅴ. 재해예방 및 안전목표" },
  { key: "attachments", label: "Ⅵ. 별첨 서류 및 증빙" },
];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// agency_templates.sections에 정의된 발주처 전용 목차를, 공통 위저드 템플릿과 동일한
// DOM 관례(section id="sec-*", label이 input/textarea를 감싸는 형태)로 렌더링한다.
// 이 관례를 따르기 때문에 WizardScreen의 필드 자동저장/자동인덱싱과
// wizardExport.ts의 다운로드용 섹션 추출 로직이 별도 수정 없이 그대로 동작한다.
// field.default가 있으면 필드 값을 여기서 미리 채워 넣는다(사전 작성된 문구/형식) —
// WizardScreen이 마운트 시 DOM 순서대로 field-0, field-1... 인덱스를 매기고,
// 저장된 값(doc.content.fields)이 있는 키만 그 값으로 덮어쓰므로, 아직 한 번도
// 저장되지 않은 필드는 이 기본값이 그대로 화면에 보이고 그대로 저장·출력된다.
// 이 섹션들을 항상 공통 섹션 "뒤"(main 닫기 직전)에 이어붙이기만 하면 기존 필드의
// 인덱스를 건드리지 않고 그대로 동작한다.
export function buildTemplateSectionsHtml(sections: AgencyTemplateSection[]): string {
  if (!sections.length) return "";

  return sections
    .map((section) => {
      const fieldsHtml = section.fields
        .map((field) => {
          if (field.type === "richHtml") {
            // 이스케이프 없이 그대로 심는다 — 위 AgencyTemplateField.type 주석 참고.
            return `<div class="md:col-span-2">${field.default ?? ""}</div>`;
          }
          const fieldHtml =
            field.type === "textarea"
              ? `<textarea class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 leading-relaxed" rows="${
                  field.default ? Math.min(14, Math.max(4, field.default.split("\n").length + 1)) : 3
                }" placeholder="${escapeHtml(field.placeholder ?? "")}">${escapeHtml(field.default ?? "")}</textarea>`
              : `<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" placeholder="${escapeHtml(
                  field.placeholder ?? ""
                )}" value="${escapeHtml(field.default ?? "")}"/>`;
          return `<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">${escapeHtml(field.label)}</label>
${fieldHtml}
</div>`;
        })
        .join("\n");

      return `<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-tpl-${escapeHtml(
        section.id
      )}">
<div class="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-lg">domain</span>
<h2 class="text-sm font-bold text-neutral-900">${escapeHtml(section.label)}</h2>
<span class="text-[11px] text-neutral-400 font-normal">발주처 표준서식 전용 항목</span>
</div>
<div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
${fieldsHtml}
</div>
</section>`;
    })
    .join("\n");
}

export function buildTemplateTocHtml(sections: AgencyTemplateSection[], startIndex: number): string {
  if (!sections.length) return "";
  return sections
    .map(
      (section, i) => `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-tpl-${escapeHtml(
        section.id
      )}">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-mono">
                  ${(startIndex + i).toString().padStart(2, "0")}
                </span>
<span class="group-hover:text-neutral-900">${escapeHtml(section.label)}</span>
</div>
<span class="text-[11px] px-1.5 py-0.5 rounded bg-primary-soft text-primary font-medium">표준서식</span>
</a>`
    )
    .join("\n");
}

// 공통 6대 목차 중 이 발주처 서식에서 꺼진 섹션을 본문(<section id="sec-X">...</section>)과
// 좌측 목차 링크(<a href="#sec-X">...</a>) 양쪽에서 통째로 제거한다. 두 태그 모두 이
// 템플릿 안에서는 중첩되지 않으므로(섹션 안에 섹션, 링크 안에 링크가 없음) 여는 태그
// 뒤에 처음 나오는 닫는 태그까지만 잘라내면 항상 정확히 그 블록만 제거된다.
function removeBlock(html: string, openTagPattern: RegExp, closeTag: string): string {
  const match = html.match(openTagPattern);
  if (!match || match.index === undefined) return html;
  const startIdx = match.index;
  const closeIdx = html.indexOf(closeTag, startIdx);
  if (closeIdx === -1) return html;
  return html.slice(0, startIdx) + html.slice(closeIdx + closeTag.length);
}

export function removeDisabledCommonSections(html: string, disabledKeys: string[]): string {
  let result = html;
  for (const key of disabledKeys) {
    const sectionId = `sec-${key}`;
    result = removeBlock(result, new RegExp(`<section[^>]*id="${sectionId}"[^>]*>`), "</section>");
    result = removeBlock(result, new RegExp(`<a[^>]*href="#${sectionId}"[^>]*>`), "</a>");
  }
  return result;
}

// "Ⅰ. 사업개요 및 기본정보" 좌측 목차 라벨과 본문 h2 제목을 이 발주처 실제 서식의
// 제목으로 바꾼다(예: LH → "안전보건관리 체계"). Ⅰ 뱃지·입력 필드 구성은 그대로
// 두고 보이는 텍스트만 바뀐다.
export function applyOverviewLabel(html: string, overviewLabel: string | null | undefined): string {
  if (!overviewLabel?.trim()) return html;
  const label = escapeHtml(overviewLabel.trim());
  return html
    .replace("Ⅰ. 사업개요 및 기본정보", `Ⅰ. ${label}`)
    .replace(">사업개요 및 기본 정보<", `>${label}<`);
}

// "Ⅰ.사업개요" 입력칸에 이미 심어진 wizard-field-* 값들을, 그 필드를 렌더링한
// HTML 문자열에서 직접 뽑아온다. id 속성이 항상 value 속성보다 앞에 오는(이
// 파일의 모든 raRField류 헬퍼가 공유하는) 관례를 이용한 정규식 추출이라 별도
// cheerio 파싱 없이 가볍게 처리한다 — wizardExport.ts의 extractCoverPageData()가
// (savedFields 적용 이후, 다운로드 시점에) 읽는 것과 같은 id를 그대로 쓴다.
function extractFieldValueForPreview(html: string, id: string): string {
  const m = html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`));
  return m ? m[1] : "";
}

// 실제 다운로드 문서(DOCX/PDF/HWPX)의 표지·제출문과 최대한 같은 문구·구성으로
// 미리보기를 그린다 — generateDocx.ts의 buildLhStandardCover/buildKwaterStandardCover/
// buildGenericCover/buildLhSubmissionLetter와 동일한 문구를 유지해야, 위저드
// 화면에서 본 것과 실제로 받는 파일이 다르게 느껴지지 않는다.
function buildCoverPreviewHtml(
  style: CoverStyle,
  data: {
    projectName: string;
    agency: string;
    period: string;
    contractAmount: string;
    safetyBudget: string;
    submitDate: string;
    companyName: string;
    writerName: string;
    ceoName: string;
  }
): string {
  const na = (v: string) => (v.trim() ? v : "(미입력)");
  const submitYearMonth = (() => {
    const m = data.submitDate.match(/^(\d{4})\.\s*(\d{1,2})\./);
    return m ? `${m[1]}년 ${m[2].padStart(2, "0")}월` : data.submitDate;
  })();

  const approvalTable = `<table class="w-full text-[11px] border border-neutral-300 mt-6">
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-1.5">구 분</td><td class="border border-neutral-300 font-bold text-center py-1.5">작성자</td><td class="border border-neutral-300 font-bold text-center py-1.5">검토자</td><td class="border border-neutral-300 font-bold text-center py-1.5">승인자</td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2">직 책</td><td class="border border-neutral-300 py-2"></td><td class="border border-neutral-300 py-2"></td><td class="border border-neutral-300 py-2"></td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2">성 명</td><td class="border border-neutral-300 text-center py-2">${na(data.writerName)}</td><td class="border border-neutral-300 py-2"></td><td class="border border-neutral-300 py-2"></td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2">서 명</td><td class="border border-neutral-300 py-2"></td><td class="border border-neutral-300 py-2"></td><td class="border border-neutral-300 py-2"></td></tr>
</table>`;

  const pageWrap = (inner: string) =>
    `<div class="max-w-xl mx-auto border border-neutral-300 rounded-lg bg-white px-8 py-10 text-xs text-neutral-800">${inner}</div>`;

  const titleBox = (text: string) =>
    `<div class="border-2 border-neutral-800 rounded px-6 py-8 text-center mb-8"><p class="text-lg font-bold tracking-[0.4em]">${text}</p></div>`;

  const lhSubmissionLetterHtml = `<p class="mt-8 mb-3 text-[11px] text-neutral-400">다음 장: 제출문</p>
${pageWrap(`
<p class="text-center text-base font-bold mb-8">제 출 문</p>
<p class="text-center leading-relaxed mb-8">귀사 발주공사인 "${na(data.projectName)}" 수행을 위해 아래와 같이 안전보건관리계획서를 제출합니다.</p>
<p class="text-center mb-8">${submitYearMonth}</p>
<p class="mb-2">업 체 명 : ${na(data.companyName)}</p>
<p class="mb-8">대표이사 : ${data.writerName}</p>
<p class="text-right font-bold">${na(data.agency)} 사장 귀하</p>
`)}`;

  if (style === "lh_standard") {
    return (
      pageWrap(`
${titleBox("안 전 보 건 관 리 계 획 서")}
<table class="w-full text-[11px] border border-neutral-300">
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center w-28 py-2.5">공 사(용 역) 명</td><td class="border border-neutral-300 text-center py-2.5">${na(data.projectName)}</td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2.5">공 사 기 간</td><td class="border border-neutral-300 text-center py-2.5">${na(data.period)}</td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2.5">도 급 금 액</td><td class="border border-neutral-300 text-center py-2.5">${data.contractAmount ? `${data.contractAmount} (부가세 포함)` : "(미입력)"}</td></tr>
<tr><td class="border border-neutral-300 bg-neutral-50 font-bold text-center py-2.5">계상된 안전관리비</td><td class="border border-neutral-300 text-center py-2.5">${na(data.safetyBudget)}</td></tr>
</table>
<p class="text-center mt-8 mb-6">${data.submitDate}</p>
<p class="text-center font-bold mb-6">${na(data.agency)} 귀하</p>
<p class="text-center font-bold mb-2">${na(data.companyName)}</p>
${approvalTable}
`) + lhSubmissionLetterHtml
    );
  }

  if (style === "kwater_standard") {
    const project = data.projectName || "OOOOO";
    return (
      pageWrap(`
<p class="text-center font-bold mb-6">${project} 공사(용역)</p>
${titleBox("안전보건관리계획서")}
<p class="text-center mt-10 mb-10">${data.submitDate}</p>
<p class="text-center font-bold">${data.companyName || "회사명(로고)"}</p>
`) +
      `<p class="mt-8 mb-3 text-[11px] text-neutral-400">다음 장: 제출문</p>` +
      pageWrap(`
<p class="text-center text-base font-bold mb-8">제 출 문</p>
<p class="mb-8 leading-relaxed">귀사의 ${project} 수행을 위해 아래와 같이 안전보건관리계획서를 제출합니다.</p>
<p class="text-center mb-6">${data.submitDate}</p>
<p class="mb-2">업 체 명 : ${na(data.companyName)}</p>
<p class="mb-8">대표이사 : ${data.writerName}${data.writerName ? "" : ""}<span class="ml-4">(서명 또는 인)</span></p>
<p class="text-center font-bold">${na(data.agency)} 귀하</p>
`)
    );
  }

  if (style === "military_standard") {
    const submitYearMonthDay = (() => {
      const m = data.submitDate.match(/^(\d{4})\.\s*(\d{1,2})\./);
      return m ? `${m[1]} 년 ${m[2]} 월` : data.submitDate;
    })();
    return (
      pageWrap(`
<p class="text-center font-bold mb-10" style="color:#1f7a3f">${na(data.projectName)}</p>
<div class="border-t-2 border-b-2 border-neutral-800 py-6 text-center mb-16">
<p class="text-lg font-bold tracking-[0.3em]">안전 · 보건 관리계획서</p>
</div>
<p class="text-center mb-16">${submitYearMonthDay}</p>
<p class="text-center font-bold">${na(data.companyName)}</p>
`) +
      `<p class="mt-8 mb-3 text-[11px] text-neutral-400">다음 장: 제출문</p>` +
      pageWrap(`
<p class="text-center text-base font-bold mb-8">제 출 문</p>
<p class="text-center leading-relaxed mb-10">"${na(data.projectName)}" 수행을 위해 아래와 같이<br/>도급사업 안전·보건 관리계획서를 제출합니다.</p>
<p class="text-center mb-10">${submitYearMonthDay} 일</p>
<p class="mb-2">업 체 명 : ${na(data.companyName)}</p>
<p class="mb-10">대표이사 : ${na(data.ceoName)} (서명 또는 인)</p>
<p class="text-right font-bold">${na(data.agency)} 귀하</p>
`)
    );
  }

  // generic
  const infoLine = (label: string, value: string) =>
    `<p class="text-center mb-3"><span class="font-bold">${label} : </span>${value || "(미입력)"}</p>`;
  return pageWrap(`
${titleBox("안전보건관리계획서")}
${infoLine("공사(용역)명", data.projectName)}
${infoLine("공사기간", data.period)}
${infoLine("도급금액", data.contractAmount ? `${data.contractAmount} (부가세 포함)` : "")}
${infoLine("계상된 안전관리비", data.safetyBudget)}
<p class="text-center mt-8 mb-6">${data.submitDate}</p>
<p class="text-center font-bold mb-6">${na(data.agency)} 귀하</p>
<p class="text-center font-bold mb-2">${na(data.companyName)}</p>
${approvalTable}
`);
}

// 좌측 목차 맨 위(Ⅰ장보다 위)에 "표지" 항목을 추가하고, 실제 다운로드 문서
// 맨 앞장에 나가는 표지(발주처별 lh_standard/kwater_standard/generic 서식)와
// 제출문을 그대로 미리 보여준다. 별도 입력칸은 없다 — Ⅰ장에 이미 입력된 값
// (공사명/발주기관/공사기간/도급금액)과 회원정보를 그대로 반영해 보여주고,
// 실제로 저장되는 값도 그 필드들이므로 이 섹션 자체는 field-N 자동저장
// 인덱스에 영향을 주지 않으며, 다운로드 문서 본문에도 중복 출력되지 않도록
// wizardExport.ts에서 sec-cover는 별도 제외한다.
export function insertCoverNavAndSection(
  html: string,
  coverStyle: CoverStyle = "generic",
  companyName = "",
  writerName = "",
  ceoName = ""
): string {
  const navItem = `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-cover">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center">
<span class="material-symbols-outlined text-sm" data-icon="description">description</span>
</span>
<span class="group-hover:text-neutral-900 font-semibold">표지</span>
</div>
<span class="text-[11px] text-neutral-400 font-medium">자동 생성</span>
</a>
`;
  const submitDate = (() => {
    const today = new Date();
    return `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  })();
  const coverPreview = buildCoverPreviewHtml(coverStyle, {
    projectName: extractFieldValueForPreview(html, "wizard-field-project-name"),
    agency: extractFieldValueForPreview(html, "wizard-field-agency"),
    period: extractFieldValueForPreview(html, "wizard-field-period"),
    contractAmount: extractFieldValueForPreview(html, "wizard-field-contract-amount"),
    safetyBudget: extractFieldValueForPreview(html, "wizard-field-safety-budget"),
    submitDate,
    companyName,
    writerName,
    ceoName,
  });
  const section = `<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-cover">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-neutral-400 text-white text-xs font-bold flex items-center justify-center">
<span class="material-symbols-outlined text-sm">description</span>
</span>
<h2 class="font-headline font-bold text-base text-neutral-900">표지</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-5">표지는 별도로 입력하지 않아도, Ⅰ장에 입력하시는 공사명·발주기관·공사기간·도급금액과 회원정보(회사명·작성자·대표자)를 그대로 반영해 아래와 같이 다운로드 문서(DOCX/PDF/HWPX) 맨 앞장에 자동 생성됩니다.</p>
${coverPreview}
</div>
</section>
`;

  const navAnchor = '<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold bg-primary-soft text-primary border-l-4 border-primary transition shadow-xs" href="#sec-overview">';
  const sectionAnchor = '<!-- ════════ SECTION Ⅰ: 사업개요 및 기본 정보 ════════ -->';

  let result = html;
  if (result.includes(navAnchor)) {
    result = result.replace(navAnchor, navItem + navAnchor);
  }
  if (result.includes(sectionAnchor)) {
    result = result.replace(sectionAnchor, section + sectionAnchor);
  }
  return result;
}

const COMMON_BODY_BADGE_RE =
  /(<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">)[^<]*(<\/span>)/;
const EXTRA_BODY_ICON = '<span class="material-symbols-outlined text-primary text-lg">domain</span>';

// WizardScreen.tsx의 스크롤 위치 기반 강조 표시(IntersectionObserver)는
// `nav a[href^="#sec-"]`를 전부 조회해 classList.toggle로 활성 스타일을 켜고 끄므로,
// 아래에서 새로 만드는 소제목 <a>가 이 속성(href="#sec-X")만 갖고 있으면 클래스
// 구성과 무관하게 그대로 동작한다 — 별도 JS 수정이 필요 없다.
// order: 이 절이 속한 장(章) 안에서 몇 번째 절인지(1부터 시작, 장이 바뀌면 다시
// 1로 초기화) — 로마숫자 대제목 밑에 소제목이 몇 개인지 한눈에 보이도록 아라비아
// 숫자를 붙여 달라는 요청으로 추가했다.
function buildGroupedNavItemHtml(sectionId: string, label: string, order: number): string {
  return `<a class="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-lg text-[11.5px] font-medium text-neutral-600 border-l-2 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 hover:border-primary/40 transition group" href="#${sectionId}">
<span class="text-neutral-400 font-mono shrink-0">${order}.</span>
<span class="truncate">${label}</span>
</a>`;
}

// 대제목을 누르면 그 밑 소제목들이 접히고 펼쳐진다(WizardScreen.tsx가
// data-toc-group-toggle 클릭을 감지해 형제 data-toc-group-panel의 hidden을 토글).
// 문서 목차가 길어질수록(발주처 전용 항목까지 합쳐 15개 안팎) 전부 펼쳐두면
// 스크롤할 때 좌측 목차가 화면을 다 잡아먹어 어수선해지므로, 처음 열었을 때는
// 첫 장만 펼치고 나머지는 접어 둔다(defaultOpen).
function buildGroupHeaderHtml(roman: string, title: string, defaultOpen: boolean): string {
  return `<button type="button" class="w-full flex items-center gap-2 pt-3 pb-1 px-2 first:pt-0.5" data-toc-group-toggle>
<span class="w-5 h-5 rounded bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">${roman}</span>
<span class="text-[11.5px] font-extrabold text-neutral-800 tracking-wide truncate flex-1 text-left">${title}</span>
<span class="material-symbols-outlined text-neutral-400 text-base shrink-0 transition-transform${
    defaultOpen ? "" : " -rotate-90"
  }" data-toc-group-chevron>expand_more</span>
</button>`;
}

// 공통 6대 목차 + 발주처 전용 목차 전체를 groups에 지정된 실제 장(章) 구조로
// 재배치한다.
//  - 좌측 목차(nav): 장(章)마다 대제목(로마숫자+실제 장 제목)을 한 번만 보여주고,
//    그 밑에 속한 절들은 대제목 없이 들여쓰기된 소제목만 나열한다(요청한
//    "대제목 밑에 소제목이 들어가는" 계층 구조). 각 절의 status 배지(진행률/완료 등)는
//    항목이 많아질수록 오히려 산만해지므로 생략하고 라벨만 보여준다.
//  - 본문(body): 각 절 카드는 그대로 두되, 배지만 자신이 속한 장의 로마숫자로
//    바꾼다(카드 자체가 이미 시각적으로 분리돼 있어 그룹 배지가 반복돼도 헷갈리지 않음).
// 라벨 텍스트·입력 필드 구성은 전혀 건드리지 않으므로 자동저장 인덱스에 영향이 없다.
export function applySectionOrder(
  html: string,
  groups: SectionOrderGroup[],
  extraLabels: Record<string, string>,
  commonLabels: Record<string, string>
): string {
  if (!groups.length) return html;

  const navContents: string[] = [];
  const bodyContents: string[] = [];
  let result = html;
  let navPlaced = false;
  let bodyPlaced = false;
  const NAV_TOKEN = " __SECTION_ORDER_NAV__ ";
  const BODY_TOKEN = " __SECTION_ORDER_BODY__ ";

  groups.forEach(({ roman, title, members }, groupIndex) => {
    let groupNavHtml = "";
    // 장(章)이 바뀔 때마다 1로 되돌아가는 아라비아 숫자 — 아직 켜지지 않은
    // 플래그라 실제로는 나오지 않는 절(멤버 목록엔 있지만 매치가 안 되는 경우)은
    // 건너뛰고 실제로 보이는 절만 세어야 번호가 중간에 비지 않는다. 본문 카드
    // 존재 여부(bodyMatch)를 기준으로 세어서 nav 배지와 본문 배지가 항상 같은
    // 번호를 가리키게 한다.
    let navOrder = 0;
    for (const id of members) {
      const isExtra = id in extraLabels;
      const sectionId = isExtra ? `sec-tpl-${id}` : `sec-${id}`;
      const label = escapeHtml(isExtra ? extraLabels[id] : commonLabels[id] ?? id);

      const sectionRe = new RegExp(`<section[^>]*id="${sectionId}"[^>]*>`);
      if (!sectionRe.test(result)) continue;

      navOrder += 1;
      // 같은 장(章) 안에서는 모든 절 카드가 똑같은 로마숫자 배지("Ⅰ")만 달고
      // 있어 어느 절이 몇 번째인지 구분이 안 된다는 지적(예: "사업개요"와
      // "안전보건 경영방침 및 목표"가 둘 다 "Ⅰ")을 받아, 로마숫자 뒤에 장 내
      // 순번을 붙인 "Ⅰ-1", "Ⅰ-2" 형태로 바꿨다.
      const badgeLabel = `${roman}-${navOrder}`;

      const navMatch = result.match(new RegExp(`<a[^>]*href="#${sectionId}"[^>]*>`));
      if (navMatch && navMatch.index !== undefined) {
        const start = navMatch.index;
        const closeIdx = result.indexOf("</a>", start);
        if (closeIdx !== -1) {
          const end = closeIdx + "</a>".length;
          groupNavHtml += buildGroupedNavItemHtml(sectionId, label, navOrder) + "\n";
          result = result.slice(0, start) + (navPlaced ? "" : NAV_TOKEN) + result.slice(end);
          navPlaced = true;
        }
      }

      // nav 치환으로 result가 바뀌었을 수 있으므로, 본문 위치는 여기서 다시 찾는다
      // (위 existsInBody 체크 때의 인덱스를 그대로 쓰면 nav 치환만큼 어긋난다).
      const bodyMatch = result.match(sectionRe);
      if (bodyMatch && bodyMatch.index !== undefined) {
        const start = bodyMatch.index;
        const closeIdx = result.indexOf("</section>", start);
        if (closeIdx !== -1) {
          const end = closeIdx + "</section>".length;
          let block = result.slice(start, end);
          if (isExtra) {
            block = block.replace(
              EXTRA_BODY_ICON,
              `<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">${badgeLabel}</span>`
            );
          } else {
            block = block.replace(COMMON_BODY_BADGE_RE, `$1${badgeLabel}$2`);
          }
          bodyContents.push(block);
          result = result.slice(0, start) + (bodyPlaced ? "" : BODY_TOKEN) + result.slice(end);
          bodyPlaced = true;
        }
      }
    }
    if (groupNavHtml) {
      const defaultOpen = groupIndex === 0;
      navContents.push(
        buildGroupHeaderHtml(roman, title, defaultOpen) +
          `\n<div class="space-y-0.5"${defaultOpen ? "" : " hidden"} data-toc-group-panel>\n${groupNavHtml}</div>\n`
      );
    }
  });

  result = result.replace(NAV_TOKEN, navContents.join(""));
  result = result.replace(BODY_TOKEN, bodyContents.join("\n"));
  return result;
}
