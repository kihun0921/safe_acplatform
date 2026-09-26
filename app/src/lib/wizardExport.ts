import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { computeSectionOrderChapters, computeSectionOrderNumbers, type SectionOrderGroup } from "./agencyTemplates";

// 최종 계획서(HWP/DOCX/PDF) 생성을 위해, WizardScreen이 화면에서 하는 것과 똑같은
// 방식으로 doc.content.fields(자동저장된 값)를 위저드 HTML 위에 적용한 뒤, 각
// 섹션(Ⅰ~Ⅵ)의 라벨/값/표를 추출한다. field-N 인덱스는 DOM 순서로 결정되므로,
// 클라이언트(WizardScreen.tsx)와 정확히 같은 순서로(input/textarea/select만, 순서대로)
// 훑어야 한다 — 다르면 엉뚱한 값이 엉뚱한 필드에 들어간다.
export interface WizardFieldRow {
  label: string;
  value: string;
}

export interface WizardSection {
  id: string;
  heading: string;
  fields: WizardFieldRow[];
  // 예전엔 섹션당 표가 최대 1개(.first())만 있다고 가정했는데, "중대산업재해 등
  // 비상 상황시 조치계획"처럼 표가 여러 개(유관기관 연락처 표, 발생유형별 대응
  // 시나리오 표 5개, 발생보고 표)인 섹션이 생기면서 뒤쪽 표들이 통째로 다운로드
  // 문서에서 누락되는 실제 버그가 있었다 — 섹션 안의 표를 전부 배열로 담는다.
  tables: { headers: string[]; rows: string[][] }[];
  // "중대산업재해 등 비상 상황시 조치계획"의 비상대책반 구성 다이어그램(대책반장
  // → 안전관리자 → 통제반/구조후송복구반/지원반 3분기)만 이 필드에 담는다.
  // wizard-field-emteam-* 입력은 findLabel()/fieldValue()로 잡히는 일반 필드
  // 목록에서는 제외하고(data-org-diagram-field), 대신 이 구조화된 형태로 뽑아
  // 다운로드 문서에서도 조직도와 동일한 박스+연결선 다이어그램으로 그린다.
  emergencyTeam?: EmergencyTeamData;
  // "위험성평가 실시규정(붙임1)"의 "4. 조직의 구성" — emergencyTeam과 모양이
  // 똑같은 대장 1명→부관 1명→3인 분기 다이어그램이라 같은 타입을 재사용한다.
  riskAssessmentOrgChart?: EmergencyTeamData;
  // "재해발생 수준"의 증빙자료(산재요양승인확인서/산업재해율 조회결과/안전보건
  // 경영시스템 인증서) 첨부 이미지. 이 함수(extractWizardSections)는 HTML 문자열만
  // 다루는 순수 파싱 함수라 Storage에서 실제 이진 데이터를 읽어올 수 없으므로, 이
  // 필드는 여기서 채워지지 않고 export route가 extractWizardSections 호출 이후
  // sections 배열에서 id로 찾아 직접 채워 넣는다(비동기 I/O가 필요해서).
  accidentImages?: { label: string; buffer: Buffer }[];
  // 유해·위험 기계/차량/물질 관리계획: 항목(장비명·물질명)별로 "관리계획/세부실행
  // 계획/비고" 소표를 하나씩 둔다(실제 LH 샘플 서식과 동일). 예전엔 팝업의 세부
  // 실행계획 textarea들이 일반 라벨+값 필드로 잡혀 어떤 장비·물질에 대한
  // 내용인지 알 수 없는 서술형 텍스트가 항목 수만큼 나열되는 버그가 있었다 —
  // extractWizardSections()가 개요표 항목명·체크박스와 팝업 세부 내용을 항목
  // 단위로 묶어 이 배열에 담는다.
  hazardDetailGroups?: HazardDetailGroup[];
  // 이 절이 속한 장(章, 로마숫자) 안에서 몇 번째 절인지(1부터, 장이 바뀌면 다시
  // 1로 초기화) — agencyTemplates.ts의 computeSectionOrderNumbers()가 section_order
  // 기준으로 계산해서 채워준다. section_order가 없는 발주처(공통 6대 목차만
  // 쓰는 경우)는 각 목차 자체가 곧 하나의 장이라 항상 undefined로 남고, 생성기가
  // 문서 전체를 순서대로 훑는 연속 번호로 대체한다.
  headingNumber?: number;
  // 이 절이 속한 장(章)의 로마숫자+제목("Ⅱ", "실행계획") — 생성기가 장이 바뀔
  // 때마다 "Ⅱ. 실행계획" 대제목을 본문에 보여주기 위해 쓴다. headingNumber와
  // 마찬가지로 section_order가 없으면 undefined로 남는다.
  chapterRoman?: string;
  chapterTitle?: string;
  // "작업투입 인력 인적사항"(sec-workforce)의 3개 소서식(안전취약근로자 식별/
  // 화재감시자 등 지정/2인1조 편성표)을 항목별로 구조화한 배열. 원래는 "가.목적"
  // textarea 3개가 전부 똑같은 라벨(label)로, 표 5개(기준표 2개+관리대장 3개)가
  // 어느 소서식 것인지 구분 없이 한꺼번에 나열돼 어떤 내용이 어디 소속인지 알 수
  // 없었다 — 이 필드가 있으면 fields/tables 대신 이 필드로 렌더링해 소서식별
  // 번호("1.", "2.", "3.")·목적/대상 문구·표를 순서대로 보여준다.
  workforcePlanGroups?: WorkforcePlanGroup[];
  // "현장 안전보건 실행계획"(sec-execution)의 2개 선택항목(건설기계·장비 안전검사
  // 관리/하도급 협력업체 협의체 운영) 토글 상태와 내용. 토글이 꺼진 항목은
  // 생성기에서 아예 출력하지 않는다(발주처 특기시방서에 없는 조항 제외 기능).
  executionOptions?: ExecutionOptionsData;
  // "위험성평가 실시규정"의 서식1(교육일지)·서식2(회의록) 상단 정보(장소·일시·
  // 종류·강사/안건 등). 실제 샘플과 같은 rowspan/colspan 병합표로 그리기 위해
  // wizardHtml.ts가 표 셀 안에 심어둔 data-risk-form-field 입력을 일반 필드
  // 목록(findLabel 기반)이 아니라 이 구조화된 형태로 뽑는다 — 표 셀 입력은
  // 직계 자식 <label>이 없어 findLabel()이 라벨을 찾지 못해 애초에 일반 필드
  // 목록에서는 빠지므로, 여기서 채우지 않으면 다운로드 문서에 아예 나오지
  // 않는다.
  riskAssessmentFormFields?: RiskAssessmentFormFieldsData;
}

export interface RiskAssessmentFormFieldsData {
  eduLocation: string;
  eduDatetime: string;
  eduType: string;
  eduInstructor: string;
  meetingLocation: string;
  meetingDatetime: string;
  meetingType: string;
  meetingAgenda: string;
}

// 실제 LH 샘플(화성동탄(2), 143~145p) 서식1·2의 고정 문구. wizardHtml.ts(위저드
// 화면 표)와 generateDocx/Pdf/Hwpx(다운로드 문서 표)가 동일한 문구를 각각
// rowspan/colspan 병합표 안에 그려야 하므로 여기 한 곳에만 정의해 재사용한다.
export const RISK_ASSESSMENT_FORM_1_CONTENT_TEXT =
  "1. 위험성평가를 위한 사업주의 방침과 목표\n" +
  "2. 위험성평가 추진방법 및 내용\n" +
  "3. 위험성평가 절차\n" +
  "  - 1단계: 사전준비(실시규정 작성 등)\n" +
  "  - 2단계: 유해위험요인 파악\n" +
  "  - 3단계: 위험성 결정\n" +
  "  - 4단계: 위험성 개선대책 수립·실행\n" +
  "4. 기록\n" +
  "5. 위험성평가 실시시기 및 범위 등";

export const RISK_ASSESSMENT_FORM_2_CONTENT_TEXT =
  "1. 위험성평가를 위한 위험성평가 실시규정의 검토·작성\n" +
  "2. 위험성평가 실시에 따른 책임과 역할 부여\n" +
  "3. 단위 공종별 유해위험요인 파악 및 위험성 결정\n" +
  "4. 개선대책 강구, 대책 실행방법 및 확인\n" +
  "5. 기록의 유지\n" +
  "6. 위험성평가 관련 관심사항 토론 등";

export interface ExecutionOptionsData {
  machineryEnabled: boolean;
  machineryIntro: string;
  machineryCount: string;
  machineryCertAttached: boolean;
  councilEnabled: boolean;
  councilText: string;
}

export interface WorkforcePlanGroup {
  title: string;
  intro: string;
  criteriaTable?: { headers: string[]; rows: string[][] };
  table: { headers: string[]; rows: string[][] };
}

export interface HazardDetailGroup {
  name: string;
  entries: { category: string; detail: string }[];
  note: string;
}

// wizardHtml.ts의 HAZARD_MC_DETAIL_FIELDS/HAZARD_SB_DETAIL_FIELDS(팝업 세부
// 실행계획 textarea들의 key·라벨)와 반드시 같은 값을 유지할 것 — 라벨 문구가
// 바뀌면 여기도 같이 고쳐야 다운로드 문서의 표 헤더가 위저드 화면과 어긋나지
// 않는다.
const HAZARD_DETAIL_FIELDS_BY_SECTION: Record<string, { key: string; label: string }[]> = {
  "sec-hazard_machinery": [
    { key: "safetyCheck", label: "안전점검" },
    { key: "ppe", label: "보호구 지급·착용" },
    { key: "education", label: "안전보건교육" },
    { key: "etc", label: "안전보건표지부착·안전수칙게시 및 기타 대책" },
  ],
  "sec-hazard_vehicle": [
    { key: "safetyCheck", label: "안전점검" },
    { key: "ppe", label: "보호구 지급·착용" },
    { key: "education", label: "안전보건교육" },
    { key: "etc", label: "안전보건표지부착·안전수칙게시 및 기타 대책" },
  ],
  "sec-hazard_substance": [
    { key: "ppe", label: "보호구 지급·착용" },
    { key: "education", label: "안전보건교육" },
    { key: "signage", label: "안전보건표지부착·안전수칙게시" },
    { key: "etc", label: "기타 대책(물질안전보건자료(MSDS) 부착 등)" },
  ],
};

function extractHazardDetailGroups(
  $: cheerio.CheerioAPI,
  $section: ReturnType<cheerio.CheerioAPI>,
  sectionId: string
): HazardDetailGroup[] {
  const detailFields = HAZARD_DETAIL_FIELDS_BY_SECTION[sectionId];
  if (!detailFields) return [];
  const modalPrefix = $section.attr("data-hazard-modal-prefix") ?? "";
  const groups: HazardDetailGroup[] = [];
  let index = 0;
  $section.find("tr[data-hazard-id]").each((_, tr) => {
    index += 1;
    const $tr = $(tr as Parameters<cheerio.CheerioAPI>[0]);
    const id = $tr.attr("data-hazard-id") ?? "";
    const nameEl = $tr.find('[data-hazard-field="name"]').get(0);
    const rawName = (nameEl ? fieldValue($, nameEl) : "").trim() || "(미입력)";
    // 항목이 몇 개든(장비·차량·물질) 어느 것에 대한 소표인지 한눈에 보이도록
    // "1) 페인트, 신나" 처럼 순번을 붙인다. 대제목("Ⅱ. ..." 등) 번호는 이
    // 항목 번호와 별개로 다루기로 함(요청에 따라 이번엔 손대지 않음).
    const name = `${index}) ${rawName}`;
    const $modal = $(`[data-modal="${modalPrefix}-${id}"]`);
    const entries = detailFields.map(({ key, label }) => {
      const el = $modal.find(`[data-hazard-field="detail-${key}"]`).get(0);
      const detail = (el ? fieldValue($, el) : "").trim() || "(미입력)";
      return { category: label, detail };
    });
    const noteEl = $modal.find('[data-hazard-field="note"]').get(0);
    const note = (noteEl ? fieldValue($, noteEl) : "").trim();
    groups.push({ name, entries, note });
  });
  return groups;
}

function applySavedFields($: cheerio.CheerioAPI, fields: Record<string, string | boolean>) {
  // WizardScreen.tsx의 field-N 인덱싱 쿼리(input:not([type=hidden]):not([data-risk-field])
  // :not([data-policy-image-input]):not([data-process-extract-input]):not([data-hazard-field])
  // :not([data-hazard-check]):not([data-ppe-qty]):not([data-emergency-contact-field])
  // :not([data-safety-cost-industrial]):not([data-safety-cost-item]):not([data-safety-cost-reserve])
  // :not([data-accident-image-input]):not([data-risk-form-field]), textarea:not([data-risk-field]):not([data-hazard-field]),
  // select:not([data-template-select]):not([data-risk-field]))와 반드시 동일한 요소 집합·순서를
  // 훑어야 한다 — 위험성평가 표 입력요소, 표준서식 선택 드롭다운, 안전보건경영방침/재해발생
  // 수준 증빙자료 이미지 파일 입력, 현장설명서 공정추출용 파일 입력, 유해·위험 기계기구물질
  // 관리계획의 항목별 체크박스/세부실행계획 입력, 보호구 지급 예정수량, 유관기관 비상연락체계,
  // 안전보건 관리비용 금액은 각각 별도 저장 경로(riskRows, template_id, content.safetyPolicy,
  // 즉시 처리 후 폐기, hazard*Rows, ppeQuantities, emergencyContactRows, safetyCostAmounts,
  // accidentLevelAttachments)를 쓰므로 애초에 field-N 인덱스 대상에서 빠지는데, 여기서
  // 다르게 세면 그 뒤에 나오는 모든 필드의 인덱스가 밀려서 엉뚱한 값이 출력물에 들어간다.
  // readonly 필드(공고 정보 자동 채움 값, 법정 고정문구 안내 textarea, 안전관리비 합계
  // 등)는 인덱스 집계에는 그대로 포함시키되(기존 문서들의 field-N 매핑이 밀리지 않도록)
  // 저장된 값을 그 위에 덮어쓰지는 않는다 — WizardScreen.tsx와 동일한 원칙.
  const els = $("input, textarea, select").filter((_, el) => {
    const $el = $(el);
    const type = $el.attr("type");
    if (type === "hidden") return false;
    if ($el.attr("data-risk-field") !== undefined) return false;
    if ($el.attr("data-policy-image-input") !== undefined) return false;
    if ($el.attr("data-process-extract-input") !== undefined) return false;
    if ($el.attr("data-hazard-field") !== undefined) return false;
    if ($el.attr("data-hazard-check") !== undefined) return false;
    if ($el.attr("data-ppe-qty") !== undefined) return false;
    if ($el.attr("data-emergency-contact-field") !== undefined) return false;
    if ($el.attr("data-safety-cost-industrial") !== undefined) return false;
    if ($el.attr("data-safety-cost-item") !== undefined) return false;
    if ($el.attr("data-safety-cost-reserve") !== undefined) return false;
    if ($el.attr("data-accident-image-input") !== undefined) return false;
    // "현장 안전보건 실행계획"의 선택항목 토글·필드는 documents.content.
    // executionOptions에 별도 저장되고 wizardHtml.ts가 서버에서 미리 값을
    // 구워 넣으므로(buildExecutionSectionHtml), field-N 인덱스 대상에서 뺀다.
    if ($el.attr("data-execution-toggle") !== undefined || $el.attr("data-execution-field") !== undefined) return false;
    // 서식1·2 상단 정보 입력도 documents.content.riskAssessmentFormFields에 별도
    // 저장되고 wizardHtml.ts가 서버에서 미리 값을 구워 넣으므로, field-N 인덱스
    // 대상에서 뺀다.
    if ($el.attr("data-risk-form-field") !== undefined) return false;
    if (el.tagName === "select" && $el.attr("data-template-select") !== undefined) return false;
    return true;
  });
  els.each((i, el) => {
    const $el = $(el);
    if ($el.attr("readonly") !== undefined) return;
    const key = `field-${i}`;
    const saved = fields[key];
    if (saved === undefined) return;
    const type = $el.attr("type");
    if (type === "checkbox" || type === "radio") {
      if (saved) $el.attr("checked", "");
      else $el.removeAttr("checked");
    } else if (el.tagName === "textarea") {
      $el.text(String(saved));
    } else {
      $el.attr("value", String(saved));
    }
  });
}

function fieldValue($: cheerio.CheerioAPI, el: unknown): string {
  const $el = $(el as never);
  const tag = (el as { tagName?: string }).tagName;
  if (tag === "select") {
    const selected = $el.find("option[selected]").first();
    return (selected.length ? selected.text() : $el.find("option").first().text()).trim();
  }
  if (tag === "textarea") return $el.text().trim();
  const type = $el.attr("type");
  if (type === "checkbox" || type === "radio") {
    return $el.attr("checked") !== undefined ? "예" : "아니오";
  }
  return ($el.attr("value") ?? "").trim();
}

function findLabel($: cheerio.CheerioAPI, el: unknown): string {
  // 조상을 한 단계씩 올라가며, "직계 자식"으로 <label>을 가진 첫 조상을 찾는다.
  // .find()(자손 전체 탐색)를 쓰면 여러 필드가 같은 grid 컨테이너를 공유할 때
  // 엉뚱한 형제 필드의 라벨을 집어올 수 있어(예: A필드의 값 옆에 B필드의 라벨이
  // 붙는 오분류), 반드시 "직계 자식"만 본다 — 그러면 이 입력 필드 자신의 래퍼
  // 안에 있는 라벨만 정확히 매칭된다.
  let current: ReturnType<typeof $> = $(el as never);
  for (let depth = 0; depth < 4; depth++) {
    const parent = current.parent();
    if (!parent.length) break;
    const label = parent.children("label").first();
    if (label.length) return label.text().replace(/\s+/g, " ").trim();
    current = parent;
  }
  return "";
}

// LH 등 공공발주처가 실제로 요구하는 표준 표지(공사명/공사기간/도급금액/계상
// 안전관리비 표, 제출문, 작성·검토·승인 결재란)를 출력물 맨 앞에 붙이기 위한 데이터.
// wizardHtml.ts의 Ⅰ.사업개요 섹션에 심어둔 고정 id(wizard-field-*)로 값을 읽으므로,
// 사용자가 실제로 입력·수정한 값이 그대로 반영된다(별도로 다시 계산하지 않음).
export interface CoverPageData {
  projectName: string;
  agency: string;
  period: string;
  contractAmount: string;
  safetyBudget: string;
  submitDate: string;
  companyName: string;
  writerName: string;
}

// 발주처 API가 자동으로 채운 금액은 이미 "4,850,000,000원" 처럼 콤마·단위가
// 붙어 있지만, 사용자가 이 입력칸에 직접 숫자만 타이핑해 고치면("13416254513")
// 콤마 없이 그대로 다운로드 문서에 나가는 실제 문제가 있었다. 값 전체가 순수
// 숫자로만 이뤄진 경우에만 천단위 콤마를 넣고, 이미 단위·콤마가 붙어 있거나
// "(미입력)" 같은 안내문구면 그대로 둔다.
function formatAmountForDisplay(value: string): string {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed).toLocaleString("ko-KR") : value;
}

export function extractCoverPageData(
  html: string,
  savedFields: Record<string, string | boolean>,
  companyName: string,
  writerName: string
): CoverPageData {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);

  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  const today = new Date();
  const submitDate = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;

  return {
    projectName: byId("wizard-field-project-name"),
    agency: byId("wizard-field-agency"),
    period: byId("wizard-field-period"),
    contractAmount: formatAmountForDisplay(byId("wizard-field-contract-amount")),
    safetyBudget: formatAmountForDisplay(byId("wizard-field-safety-budget")),
    submitDate,
    companyName,
    writerName,
  };
}

// LH가 실제로 요구하는 "Ⅰ.안전보건관리체계 / 1.사업개요" 정형 페이지(글꼴·위치·
// □ 체크박스 불릿까지 실제 서식 그대로)를 위한 데이터. wizard-field-* 고정 id로
// 값을 읽으므로, 사용자가 실제로 입력·수정한 값이 그대로 반영된다.
export interface OverviewPageData {
  chapterTitle: string;
  projectName: string;
  period: string;
  contractAmount: string;
  location: string;
  mainContentLines: string[];
}

export function extractOverviewPageData(
  html: string,
  savedFields: Record<string, string | boolean>,
  chapterTitle: string
): OverviewPageData {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);

  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  const mainContentRaw = $("#wizard-field-main-content").text().trim();
  const mainContentLines = mainContentRaw
    ? mainContentRaw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    chapterTitle,
    projectName: byId("wizard-field-project-name"),
    period: byId("wizard-field-period"),
    contractAmount: formatAmountForDisplay(byId("wizard-field-contract-amount")),
    location: byId("wizard-field-site-location"),
    mainContentLines,
  };
}

// "안전보건 경영방침 및 목표"(Ⅰ.사업개요 다음 절)를 위한 데이터. 회사가 자체
// 이미지를 첨부했으면(mode="image") 표지·사업개요와 달리 실제 이미지 바이트는
// export route가 Supabase Storage에서 직접 읽어와 각 생성기에 별도로 넘긴다
// (이 함수는 HTML만 다루므로 이진 데이터를 알 수 없음). 표준 문구 모드일 때만
// 여기서 읽는 slogan/goal 두 값과 회사명 보간 문단이 실제로 쓰인다.
export interface ManagementPolicyData {
  mode: "image" | "standard";
  companyName: string;
  slogan: string;
  goal: string;
  bodyParagraph: string;
  bullets: string[];
}

const MANAGEMENT_POLICY_BULLETS = [
  "기본과 원칙을 준수하는 안전/보건문화를 정착한다.",
  "체계적인 사전 위험성평가와 지속적 개선활동을 통하여 무재해 목표 달성을 실천한다.",
  "전 구성원의 능동적 참여, 협력사와의 상생으로 안전하고 쾌적한 작업환경을 조성한다.",
];

export function extractManagementPolicyData(
  html: string,
  savedFields: Record<string, string | boolean>,
  companyName: string,
  mode: "image" | "standard"
): ManagementPolicyData {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);

  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  const company = companyName || "회사명 미등록";

  return {
    mode,
    companyName: company,
    slogan: byId("wizard-field-policy-slogan"),
    goal: byId("wizard-field-policy-goal"),
    bodyParagraph: `${company} 사업장의 각종 산업재해예방 및 근로자의 생명을 보호하기 위해 사업주와 근로자가 안전보건의무를 이행함으로써 재해없는 일터, 행복하고 건강한 일터를 조성하는 것을 목표로 경영방침, 안전목표 달성을 위해 각자 주어진 업무와 역할을 충실히 수행함으로써 안전문화 정착을 통한 상호협력 및 상생을 통한 지속가능한 기업으로 추구하고자 한다.`,
    bullets: MANAGEMENT_POLICY_BULLETS,
  };
}

// "안전보건관리 조직구성"을 실제 조직도 다이어그램(박스+연결선)으로 그리기 위한
// 데이터. 직책은 wizardHtml.ts의 ORG_CHART_ROLES와 동일한 고정값이고, 성명·
// 연락처만 wizard-field-org-* 고정 id로 읽어온다.
export interface OrgChartNode {
  role: string;
  name: string;
  contact: string;
}
export interface OrgChartData {
  siteManager: OrgChartNode;
  safetyManager: OrgChartNode;
  supervisor: OrgChartNode;
  team1: OrgChartNode;
  team2: OrgChartNode;
}

const ORG_CHART_ROLE_LABELS = {
  siteManager: "안전보건관리책임자(현장소장)",
  safetyManager: "안전관리자(안전담당자)",
  supervisor: "관리감독자",
  team1: "작업 1팀장",
  team2: "작업 2팀장",
} as const;

export function extractOrgChartData(html: string, savedFields: Record<string, string | boolean>): OrgChartData {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);
  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";

  const node = (key: string, role: string): OrgChartNode => ({
    role,
    name: byId(`wizard-field-org-${key}-name`),
    contact: byId(`wizard-field-org-${key}-contact`),
  });

  return {
    siteManager: node("site-manager", ORG_CHART_ROLE_LABELS.siteManager),
    safetyManager: node("safety-manager", ORG_CHART_ROLE_LABELS.safetyManager),
    supervisor: node("supervisor", ORG_CHART_ROLE_LABELS.supervisor),
    team1: node("team1", ORG_CHART_ROLE_LABELS.team1),
    team2: node("team2", ORG_CHART_ROLE_LABELS.team2),
  };
}

// "중대산업재해 등 비상 상황시 조치계획"의 비상대책반 구성을 조직도와 동일한
// 박스+연결선 다이어그램으로 그리기 위한 데이터. 직책은 wizardHtml.ts의
// EMERGENCY_TEAM_ROLES와 동일한 고정값이고, 성명·연락처만 wizard-field-emteam-*
// 고정 id로 읽어온다. extractOrgChartData와 달리 html을 새로 로드하지 않고
// extractWizardSections가 이미 applySavedFields를 적용해 둔 $를 그대로 받는다
// (섹션 하나를 순회하는 도중에 호출되므로).
export interface EmergencyTeamData {
  chief: OrgChartNode;
  safetyManager: OrgChartNode;
  controlTeam: OrgChartNode;
  rescueTeam: OrgChartNode;
  supportTeam: OrgChartNode;
}

const EMERGENCY_TEAM_ROLE_LABELS = {
  chief: "대책반장(현장소장)",
  safetyManager: "안전관리자(안전보건협의체 팀장)",
  controlTeam: "통제반(품질1팀 팀장)",
  rescueTeam: "구조·후송·복구반(공사팀 팀장)",
  supportTeam: "지원반(품질2팀 팀장)",
} as const;

// "위험성평가 실시규정(붙임1)"의 "4. 조직의 구성"을 실제 샘플과 동일한
// 안전보건협의체 박스+화살표 다이어그램으로 그리기 위한 데이터. EmergencyTeamData와
// 모양(대장 1명 → 부관 1명 → 3인 분기)이 똑같아 타입과 렌더러(buildEmergencyTeamDiagram
// 등)를 그대로 재사용하고, role 라벨만 이 규정 전용 문구로 바꾼다. 이름은
// wizard-field-rar-reviewer-name(=현장소장)·-preparer-name(=안전관리자)·
// -org-general/-construction/-quality-name(=조직 3팀장)에서 읽어온다 — 예전엔 이
// 5개 입력값이 "4. 조직의 구성" 읽기전용 안내문에 전혀 반영되지 않아 이름을
// 입력해도 아무것도 바뀌지 않는 것처럼 보이던 문제를 고친 것이다.
const RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS = {
  chief: "안전보건관리책임자(안전보건총괄책임자, 현장소장)",
  safetyManager: "안전관리자",
  controlTeam: "공무팀장",
  rescueTeam: "공사팀장(관리감독자 겸임)",
  supportTeam: "품질팀장",
} as const;

function extractRiskAssessmentOrgChartData($: cheerio.CheerioAPI): EmergencyTeamData {
  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  const node = (id: string, role: string): OrgChartNode => ({ role, name: byId(id), contact: "" });
  return {
    chief: node("wizard-field-rar-reviewer-name", RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS.chief),
    safetyManager: node("wizard-field-rar-preparer-name", RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS.safetyManager),
    controlTeam: node("wizard-field-rar-org-general-name", RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS.controlTeam),
    rescueTeam: node("wizard-field-rar-org-construction-name", RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS.rescueTeam),
    supportTeam: node("wizard-field-rar-org-quality-name", RISK_ASSESSMENT_ORG_CHART_ROLE_LABELS.supportTeam),
  };
}

// 서식1·2의 상단 정보 입력(교육장소/일시/종류/강사, 회의장소/일시/평가종류/안건)은
// wizardHtml.ts가 rowspan/colspan 병합표 셀 안에 data-risk-form-field 속성으로
// 심어둔 <input>이라 findLabel()이 라벨을 못 찾아(직계 자식 <label>이 없음) 일반
// 필드 목록에 잡히지 않는다 — id로 직접 읽어 구조화한다.
function extractRiskAssessmentFormFieldsData($: cheerio.CheerioAPI): RiskAssessmentFormFieldsData {
  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  return {
    eduLocation: byId("wizard-field-rar-edu-location"),
    eduDatetime: byId("wizard-field-rar-edu-datetime"),
    eduType: byId("wizard-field-rar-edu-type"),
    eduInstructor: byId("wizard-field-rar-edu-instructor"),
    meetingLocation: byId("wizard-field-rar-meeting-location"),
    meetingDatetime: byId("wizard-field-rar-meeting-datetime"),
    meetingType: byId("wizard-field-rar-meeting-type"),
    meetingAgenda: byId("wizard-field-rar-meeting-agenda"),
  };
}

function extractEmergencyTeamData($: cheerio.CheerioAPI): EmergencyTeamData {
  const byId = (id: string) => $(`#${id}`).attr("value")?.trim() ?? "";
  const node = (key: string, role: string): OrgChartNode => ({
    role,
    name: byId(`wizard-field-emteam-${key}-name`),
    contact: byId(`wizard-field-emteam-${key}-contact`),
  });
  return {
    chief: node("chief", EMERGENCY_TEAM_ROLE_LABELS.chief),
    safetyManager: node("safety-manager", EMERGENCY_TEAM_ROLE_LABELS.safetyManager),
    controlTeam: node("control-team", EMERGENCY_TEAM_ROLE_LABELS.controlTeam),
    rescueTeam: node("rescue-team", EMERGENCY_TEAM_ROLE_LABELS.rescueTeam),
    supportTeam: node("support-team", EMERGENCY_TEAM_ROLE_LABELS.supportTeam),
  };
}

// 표 하나(<table>)에서 헤더·행 값을 뽑는다. extractWizardSections()의 섹션 전체
// 표 스캔과 extractWorkforcePlanGroups()의 소서식별 표 스캔이 똑같은 규칙(관리
// 열 제외, 셀 안 입력요소면 그 값, colspan 병합 셀은 빈 칸으로 채워 컬럼 수
// 맞추기)을 공유해야 해서 함수로 뺐다.
function extractTableData($: cheerio.CheerioAPI, tableEl: AnyNode): { headers: string[]; rows: string[][] } | null {
  const $table = $(tableEl);
  const headers: string[] = [];
  $table.find("thead th").each((_, th) => {
    const text = $(th).text().replace(/\s+/g, " ").trim();
    if (text !== "관리") headers.push(text);
  });
  const rows: string[][] = [];
  $table.find("tbody tr").each((_, tr) => {
    const row: string[] = [];
    $(tr)
      .find("td")
      .each((_, td) => {
        const $td = $(td);
        if (
          $td.find("[data-risk-delete], [data-emergency-contact-delete], [data-workforce-delete], [data-hazard-delete]").length
        )
          return;
        const control = $td.find("input, textarea, select").first();
        const text = control.length ? fieldValue($, control.get(0)) : $td.text().replace(/\s+/g, " ").trim();
        row.push(text);
        const colspan = Math.max(1, parseInt($td.attr("colspan") ?? "1", 10) || 1);
        for (let i = 1; i < colspan; i += 1) row.push("");
      });
    if (row.length) rows.push(row);
  });
  return rows.length > 0 ? { headers, rows } : null;
}

// "작업투입 인력 인적사항"(sec-workforce)의 3개 소서식 div(class="space-y-3",
// wizardHtml.ts buildWorkforceSectionHtml이 순서대로 렌더링)을 각각 제목("N. ..."
// 에서 번호를 뗀 나머지)·목적/대상 안내문(dipReadonlyBlock의 readonly textarea)·
// 기준표(있으면)·관리대장/명단/편성표로 구조화한다. 소서식 3(2인1조 편성표)은
// 기준표가 없어 표가 1개뿐이다.
function extractWorkforcePlanGroups($: cheerio.CheerioAPI, $section: ReturnType<cheerio.CheerioAPI>): WorkforcePlanGroup[] {
  const groups: WorkforcePlanGroup[] = [];
  $section.find("div.space-y-3").each((_, groupEl) => {
    const $group = $(groupEl);
    const rawTitle = $group.find("> p.font-bold").first().text().trim();
    const title = rawTitle.replace(/^\d+\.\s*/, "");
    const intro = $group.find("textarea[readonly]").first().text().trim();
    const tableEls = $group.find("table").toArray();
    let criteriaTable: { headers: string[]; rows: string[][] } | undefined;
    let table: { headers: string[]; rows: string[][] } | undefined;
    if (tableEls.length >= 2) {
      criteriaTable = extractTableData($, tableEls[0]) ?? undefined;
      table = extractTableData($, tableEls[1]) ?? undefined;
    } else if (tableEls.length === 1) {
      table = extractTableData($, tableEls[0]) ?? undefined;
    }
    if (title && table) groups.push({ title, intro, criteriaTable, table });
  });
  return groups;
}

// "현장 안전보건 실행계획"(sec-execution)의 2개 선택항목(건설기계·장비 안전검사
// 관리/하도급 협력업체 협의체 운영) 토글 상태와 내용을 뽑는다. 토글 자체는
// 위저드 화면의 일반 field-N 자동저장으로 그대로 저장되므로(값 종류가 항상
// 정확히 2개 토글+4개 필드로 고정돼 있어 행 추가·삭제가 있는 위험성평가·작업투입
// 인력과 달리 별도 저장소가 필요 없다), 여기서는 applySavedFields가 이미 반영한
// DOM 값을 그대로 읽기만 한다.
function extractExecutionOptionsData($: cheerio.CheerioAPI, $section: ReturnType<cheerio.CheerioAPI>): ExecutionOptionsData {
  const isChecked = (selector: string) => $section.find(selector).attr("checked") !== undefined;
  const textareaValue = (selector: string) => $section.find(selector).first().text().trim();
  const inputValue = (selector: string) => ($section.find(selector).attr("value") ?? "").trim();
  return {
    machineryEnabled: isChecked('[data-execution-toggle="machinery"]'),
    machineryIntro: textareaValue('[data-execution-field="machinery-intro"]'),
    machineryCount: inputValue('[data-execution-field="machinery-count"]'),
    machineryCertAttached: isChecked('[data-execution-field="machinery-cert"]'),
    councilEnabled: isChecked('[data-execution-toggle="council"]'),
    councilText: textareaValue('[data-execution-field="council-text"]'),
  };
}

// "sec-tpl-education_plan" → "education_plan", "sec-overview" → "overview" —
// section_order의 members가 쓰는 원래 id로 되돌린다(발주처 전용 항목은
// buildTemplateSectionsHtml이 "sec-tpl-" 접두어를 붙이고, 공통/고정서식 항목은
// "sec-"만 붙인다 — agencyTemplates.ts의 applySectionOrder와 동일한 규칙).
function bareSectionId(id: string): string {
  if (id.startsWith("sec-tpl-")) return id.slice("sec-tpl-".length);
  if (id.startsWith("sec-")) return id.slice("sec-".length);
  return id;
}

export function extractWizardSections(
  html: string,
  savedFields: Record<string, string | boolean>,
  excludeIds: string[] = [],
  sectionOrder: SectionOrderGroup[] = []
): WizardSection[] {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);
  const chapterNumbers = computeSectionOrderNumbers(sectionOrder);
  const chapters = computeSectionOrderChapters(sectionOrder);

  const sections: WizardSection[] = [];
  // sec-cover는 위저드 화면에서만 보여주는 안내용 섹션(표지는 다운로드 시
  // extractCoverPageData()가 별도로 만드는 실제 표지 페이지가 담당)이라 본문
  // 섹션 목록에서는 항상 제외한다 — 포함하면 표지 내용이 문서에 중복 출력된다.
  // excludeIds는 그 외에 추가로 뺄 섹션(예: overview_page_style이 켜져 정형
  // 페이지가 사업개요를 전담할 때의 sec-overview)을 지정한다.
  const excluded = new Set(["sec-cover", ...excludeIds]);
  $("section[id^='sec-']")
    .filter((_, el) => !excluded.has($(el).attr("id") ?? ""))
    .each((_, sectionEl) => {
    const $section = $(sectionEl);
    const id = $section.attr("id") ?? "";
    const heading = $section.find("h2").first().text().trim();

    const fields: WizardFieldRow[] = [];
    // sec-workforce는 목적/대상 안내문(readonly textarea)까지 포함해 위
    // extractWorkforcePlanGroups()가 소서식별로 전부 구조화해서 뽑으므로,
    // 여기서는 아예 훑지 않는다 — 안 그러면 3개 소서식의 "가.목적/대상" textarea가
    // 전부 똑같은 라벨(예: "가. 목적")로 구분 없이 중복 출력된다.
    if (id !== "sec-workforce")
    $section.find("input, textarea, select").each((_, el) => {
      const $el = $(el);
      const type = $el.attr("type");
      if (type === "hidden") return;
      // 현장설명서 공정추출용 파일 입력은 클릭 영역을 넓히려고 <label>로 감싸져
      // 있어(네이티브 라벨-클릭 패턴), findLabel()이 그 <label>의 안내문구를 엉뚱하게
      // 이 입력의 라벨로 오인해 "(미입력)" 값과 함께 출력물에 새어나간다 — 즉시
      // 처리 후 버리는 일회성 업로드용이라 애초에 문서 내용이 아니므로 제외한다.
      if ($el.attr("data-process-extract-input") !== undefined) return;
      // "재해발생 수준"(sec-accident_level)의 증빙자료 첨부 파일 입력도 같은
      // 이유로 제외한다 — <label>로 감싸져 있어 findLabel()이 "이미지 파일
      // 선택" 버튼 문구(및 아이콘 리거처 이름 "upload_file")를 이 입력의
      // 라벨로 오인해 "upload_file 이미지 파일 선택: (미입력)"이 그대로 출력물에
      // 새어나가는 실제 버그가 있었다. 첨부된 이미지 자체는 export route가
      // Storage에서 읽어와 section.accidentImages로 별도 채운다.
      if ($el.attr("data-accident-image-input") !== undefined) return;
      // 비상대책반 구성 다이어그램의 성명·연락처 입력은 아래 extractEmergencyTeamData()가
      // 별도로 구조화해서 뽑아 박스+연결선 다이어그램으로 그리므로, 여기서 또
      // "역할 성명: 값" 식 일반 필드로 중복 출력하지 않는다.
      if ($el.attr("data-org-diagram-field") !== undefined) return;
      // 유해·위험 기계/차량/물질 관리계획의 개요표 항목명·체크박스와 팝업 세부
      // 실행계획 textarea는 아래 extractHazardDetailData()가 항목별로 구조화해서
      // 표로 뽑으므로, 여기서 또 "안전점검: ..." 식 일반 라벨+값으로 나열하면
      // 어떤 장비·물질에 대한 내용인지 알 수 없는 텍스트가 항목 수만큼 중복
      // 출력된다(실제로 발생했던 버그).
      if ($el.attr("data-hazard-field") !== undefined || $el.attr("data-hazard-check") !== undefined) return;
      // 작업투입 인력 인적사항의 관리대장·명단·편성표 행 입력(성명/소속/구분 등)도
      // 마찬가지로 아래 extractWorkforcePlanGroups()가 표로 구조화해서 뽑으므로,
      // 여기서 "관리: 값" 식 일반 필드로 중복 출력하지 않는다(실제로 발생했던 버그 —
      // 표 5개 분량의 셀 값이 전부 라벨 없는 필드로 새어나갔다).
      if ($el.attr("data-workforce-field") !== undefined) return;
      // "현장 안전보건 실행계획"(sec-execution)의 2개 선택항목(건설기계·장비
      // 안전검사 관리/하도급 협력업체 협의체 운영)도 아래 extractExecutionOptionsData()가
      // 토글 상태에 따라 구조화해서 뽑으므로, 여기서 일반 필드로 중복 출력하지
      // 않는다 — 특히 토글이 꺼진 항목의 내용까지 "포함: 아니오"와 함께 그대로
      // 새어나가면 안 되기 때문이다.
      if ($el.attr("data-execution-field") !== undefined || $el.attr("data-execution-toggle") !== undefined) return;
      // 서식1·2 상단 정보(교육/회의 장소·일시 등)도 아래 extractRiskAssessmentFormFieldsData()가
      // id로 직접 읽어 구조화하므로 여기서 중복 출력하지 않는다(표 셀 안 입력이라
      // findLabel()이 애초에 라벨을 못 찾아 실질적으로는 중복될 일이 없지만, 다른
      // 제외 속성들과 같은 관례를 맞춰 명시적으로 제외한다).
      if ($el.attr("data-risk-form-field") !== undefined) return;
      const label = findLabel($, el);
      const value = fieldValue($, el);
      if (label) fields.push({ label, value });
    });

    // 섹션 안의 표를 전부(첫 번째만이 아니라) 배열로 담는다 — "중대산업재해 등
    // 비상 상황시 조치계획"처럼 표가 여러 개인 섹션이 있다. "작업투입 인력
    // 인적사항"(sec-workforce)은 이 표들을 소서식별로 구조화한 workforcePlanGroups로
    // 대신 내보내므로 여기서는 비워 둔다(안 그러면 같은 표 5개가 두 번 나온다).
    const tables: { headers: string[]; rows: string[][] }[] = [];
    if (id !== "sec-workforce") {
      $section.find("table").each((_, tableEl) => {
        // 서식1·2의 상단 정보 표(현장명/장소/일시 등, rowspan·colspan 병합표)는
        // 아래 extractRiskAssessmentFormFieldsData()가 구조화해서 뽑고 생성기가
        // 실제 샘플과 같은 병합표로 직접 그리므로, 여기서 또 "헤더+행" 일반 표로
        // 뽑아 이중으로 출력하지 않는다.
        if ($(tableEl).attr("data-form-info-table") !== undefined) return;
        const t = extractTableData($, tableEl);
        if (t) tables.push(t);
      });
    }

    const emergencyTeam = id === "sec-emergency_plan" ? extractEmergencyTeamData($) : undefined;
    const riskAssessmentOrgChart =
      id === "sec-risk_assessment_rules" ? extractRiskAssessmentOrgChartData($) : undefined;
    const riskAssessmentFormFields =
      id === "sec-risk_assessment_rules" ? extractRiskAssessmentFormFieldsData($) : undefined;
    const hazardDetailGroups = HAZARD_DETAIL_FIELDS_BY_SECTION[id]
      ? extractHazardDetailGroups($, $section, id)
      : undefined;
    const workforcePlanGroups = id === "sec-workforce" ? extractWorkforcePlanGroups($, $section) : undefined;
    const executionOptions = id === "sec-execution" ? extractExecutionOptionsData($, $section) : undefined;

    const bareId = bareSectionId(id);
    const headingNumber = chapterNumbers[bareId];
    const chapter = chapters[bareId];
    sections.push({
      id,
      heading,
      workforcePlanGroups,
      executionOptions,
      fields,
      tables,
      emergencyTeam,
      riskAssessmentOrgChart,
      riskAssessmentFormFields,
      hazardDetailGroups,
      headingNumber,
      chapterRoman: chapter?.roman,
      chapterTitle: chapter?.title,
    });
  });

  return sections;
}
