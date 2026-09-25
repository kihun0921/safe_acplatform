import * as cheerio from "cheerio";
import { computeSectionOrderNumbers, type SectionOrderGroup } from "./agencyTemplates";

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
  // :not([data-accident-image-input]), textarea:not([data-risk-field]):not([data-hazard-field]),
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
    $section.find("input, textarea, select").each((_, el) => {
      const $el = $(el);
      const type = $el.attr("type");
      if (type === "hidden") return;
      // 현장설명서 공정추출용 파일 입력은 클릭 영역을 넓히려고 <label>로 감싸져
      // 있어(네이티브 라벨-클릭 패턴), findLabel()이 그 <label>의 안내문구를 엉뚱하게
      // 이 입력의 라벨로 오인해 "(미입력)" 값과 함께 출력물에 새어나간다 — 즉시
      // 처리 후 버리는 일회성 업로드용이라 애초에 문서 내용이 아니므로 제외한다.
      if ($el.attr("data-process-extract-input") !== undefined) return;
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
      const label = findLabel($, el);
      const value = fieldValue($, el);
      if (label) fields.push({ label, value });
    });

    // 섹션 안의 표를 전부(첫 번째만이 아니라) 배열로 담는다 — "중대산업재해 등
    // 비상 상황시 조치계획"처럼 표가 여러 개인 섹션이 있다.
    const tables: { headers: string[]; rows: string[][] }[] = [];
    $section.find("table").each((_, tableEl) => {
      const $table = $(tableEl);
      // "관리"(행 삭제 버튼) 열은 편집용 UI일 뿐 문서 내용이 아니므로 출력물에서
      // 헤더/셀 모두 제외한다(포함하면 아이콘 폰트 리거처 이름이 텍스트로 새어나감).
      const headers: string[] = [];
      $table
        .find("thead th")
        .each((_, th) => {
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
              $td.find("[data-risk-delete], [data-emergency-contact-delete], [data-workforce-delete], [data-hazard-delete]")
                .length
            )
              return;
            // 위험성평가 표처럼 셀 안에 실제 입력요소(input/textarea/select)가 있으면
            // 그 값을 읽고, 아니면(정적 텍스트 셀) 기존처럼 텍스트를 읽는다.
            const control = $td.find("input, textarea, select").first();
            const text = control.length ? fieldValue($, control.get(0)) : $td.text().replace(/\s+/g, " ").trim();
            row.push(text);
            // colspan="2" 같은 병합 셀(예: 적격업체 평가기준의 "합계" 행)은 물리적으로
            // <td> 하나뿐이라, 그대로 두면 그 뒤 실제 셀들이 전부 한 칸씩 앞으로
            // 밀려 헤더와 어긋난다 — 병합폭만큼 빈 칸을 채워 논리 컬럼 수를 맞춘다.
            const colspan = Math.max(1, parseInt($td.attr("colspan") ?? "1", 10) || 1);
            for (let i = 1; i < colspan; i += 1) row.push("");
          });
        if (row.length) rows.push(row);
      });
      if (rows.length > 0) tables.push({ headers, rows });
    });

    const emergencyTeam = id === "sec-emergency_plan" ? extractEmergencyTeamData($) : undefined;
    const hazardDetailGroups = HAZARD_DETAIL_FIELDS_BY_SECTION[id]
      ? extractHazardDetailGroups($, $section, id)
      : undefined;

    const headingNumber = chapterNumbers[bareSectionId(id)];
    sections.push({ id, heading, fields, tables, emergencyTeam, hazardDetailGroups, headingNumber });
  });

  return sections;
}
