import * as cheerio from "cheerio";

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
  table?: { headers: string[]; rows: string[][] };
}

function applySavedFields($: cheerio.CheerioAPI, fields: Record<string, string | boolean>) {
  // WizardScreen.tsx의 field-N 인덱싱 쿼리(input:not([type=hidden]):not([data-risk-field])
  // :not([data-policy-image-input]):not([data-process-extract-input]):not([data-hazard-field])
  // :not([data-hazard-check]):not([data-ppe-qty]):not([data-emergency-contact-field]),
  // textarea:not([data-risk-field]):not([data-hazard-field]), select:not([data-template-select])
  // :not([data-risk-field]))와 반드시 동일한 요소 집합·순서를 훑어야 한다 — 위험성평가 표
  // 입력요소, 표준서식 선택 드롭다운, 안전보건경영방침 이미지 파일 입력, 현장설명서
  // 공정추출용 파일 입력, 유해·위험 기계기구물질 관리계획의 항목별 체크박스/세부실행계획
  // 입력, 보호구 지급 예정수량, 유관기관 비상연락체계는 각각 별도 저장 경로(riskRows,
  // template_id, content.safetyPolicy, 즉시 처리 후 폐기, hazard*Rows, ppeQuantities,
  // emergencyContactRows)를 쓰므로 애초에 field-N 인덱스 대상에서 빠지는데, 여기서
  // 다르게 세면 그 뒤에 나오는 모든 필드의 인덱스가 밀려서 엉뚱한 값이 출력물에 들어간다.
  // readonly 필드(공고 정보 자동 채움 값, 법정 고정문구 안내 textarea 등)는 인덱스
  // 집계에는 그대로 포함시키되(기존 문서들의 field-N 매핑이 밀리지 않도록) 저장된
  // 값을 그 위에 덮어쓰지는 않는다 — WizardScreen.tsx와 동일한 원칙.
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
    contractAmount: byId("wizard-field-contract-amount"),
    safetyBudget: byId("wizard-field-safety-budget"),
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
    contractAmount: byId("wizard-field-contract-amount"),
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

export function extractWizardSections(
  html: string,
  savedFields: Record<string, string | boolean>,
  excludeIds: string[] = []
): WizardSection[] {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);

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
      const label = findLabel($, el);
      const value = fieldValue($, el);
      if (label) fields.push({ label, value });
    });

    let table: { headers: string[]; rows: string[][] } | undefined;
    const $table = $section.find("table").first();
    if ($table.length) {
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
            if ($td.find("[data-risk-delete], [data-emergency-contact-delete]").length) return;
            // 위험성평가 표처럼 셀 안에 실제 입력요소(input/textarea/select)가 있으면
            // 그 값을 읽고, 아니면(정적 텍스트 셀) 기존처럼 텍스트를 읽는다.
            const control = $td.find("input, textarea, select").first();
            const text = control.length ? fieldValue($, control.get(0)) : $td.text().replace(/\s+/g, " ").trim();
            row.push(text);
          });
        if (row.length) rows.push(row);
      });
      table = { headers, rows };
    }

    sections.push({ id, heading, fields, table });
  });

  return sections;
}
