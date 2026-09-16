export type AgencyTemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  // 실제 LH 등 발주처 제출 서식에서 흔히 쓰이는 문구/형식을 미리 채워두는 값.
  // 회원은 빈 칸에서 시작하는 대신 이 초안을 바로 고쳐 쓸 수 있다. 저장된 값이
  // 없을 때만 서버 렌더링 시 이 값으로 채워지고, 한 글자라도 입력해 저장되면
  // 그 이후로는 항상 저장된 값이 우선한다(일반 필드 자동저장과 동일한 동작).
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
  // "Ⅰ. 사업개요 및 기본정보" 제목을 이 발주처 실제 서식 목차대로 바꿔야 할 때만
  // 채운다(예: LH 실제 목차는 "Ⅰ. 안전보건관리 체계"). 입력 필드 자체는 그대로다.
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
};

// section_order의 한 그룹 = 실제 문서의 장(章) 하나. roman/title은 좌측 목차에
// 대제목으로 한 번만 표시되고, members(공통 섹션 키 또는 sections[].id)는 그 장에
// 속하는 소제목들로 대제목 밑에 들여쓰기되어 나열된다 — 큰 목차 하나에 여러 절이
// 묶여 있는 실제 공공서식의 구조를 그대로 반영한다.
export type SectionOrderGroup = { roman: string; title: string; members: string[] };

// 다운로드 문서(DOCX/PDF/HWPX) 맨 앞에 붙는 표지 레이아웃 종류. 표지 데이터
// (공사명/공사기간/도급금액/작성자 등)는 발주처와 무관하게 항상 동일하고,
// 발주처마다 다른 건 그 데이터를 배치하는 레이아웃뿐이라 발주처별로 실제
// 표지 샘플을 확인한 뒤에만 전용 스타일을 추가한다(generateDocx.ts /
// generatePdf.tsx / generateHwpx.ts에 각각 렌더러가 있어야 함). 그 전까지는
// 모든 발주처가 범용 표지(generic)를 쓴다.
export const COVER_STYLES: { value: string; label: string }[] = [
  { value: "generic", label: "범용 표지 (기본)" },
  { value: "lh_standard", label: "한국토지주택공사(LH) 표준 표지" },
];
export type CoverStyle = "generic" | "lh_standard";

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

// 좌측 목차 맨 위(Ⅰ장보다 위)에 "표지" 안내 항목을 추가한다. 실제 표지는 별도
// 입력 없이 Ⅰ장에 이미 입력된 값(공사명/발주기관/공사기간/도급금액)과 회원정보로
// 다운로드 시 자동 생성되므로, 여기서는 그 사실을 안내하는 정보성 섹션만 둔다
// (입력요소가 없어 field-N 자동저장 인덱스에 영향을 주지 않고, 다운로드 문서
// 본문에도 중복 출력되지 않도록 wizardExport.ts에서 sec-cover는 별도 제외한다).
export function insertCoverNavAndSection(html: string): string {
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
  const section = `<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-cover">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-neutral-400 text-white text-xs font-bold flex items-center justify-center">
<span class="material-symbols-outlined text-sm">description</span>
</span>
<h2 class="font-headline font-bold text-base text-neutral-900">표지</h2>
</div>
<div class="p-6 text-xs text-neutral-600 leading-relaxed">
표지는 별도로 입력하지 않아도, 아래 입력하시는 공사명·발주기관·공사기간·도급금액과 회원정보(회사명·작성자)를 그대로 반영해 다운로드하시는 문서(DOCX/PDF/HWPX) 맨 앞장에 발주처 표준 양식으로 자동 생성됩니다.
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
function buildGroupedNavItemHtml(sectionId: string, label: string): string {
  return `<a class="flex items-center px-3 py-1.5 ml-2 rounded-lg text-[11.5px] font-medium text-neutral-600 border-l-2 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 hover:border-primary/40 transition group" href="#${sectionId}">
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
    for (const id of members) {
      const isExtra = id in extraLabels;
      const sectionId = isExtra ? `sec-tpl-${id}` : `sec-${id}`;
      const label = escapeHtml(isExtra ? extraLabels[id] : commonLabels[id] ?? id);

      const navMatch = result.match(new RegExp(`<a[^>]*href="#${sectionId}"[^>]*>`));
      if (navMatch && navMatch.index !== undefined) {
        const start = navMatch.index;
        const closeIdx = result.indexOf("</a>", start);
        if (closeIdx !== -1) {
          const end = closeIdx + "</a>".length;
          groupNavHtml += buildGroupedNavItemHtml(sectionId, label) + "\n";
          result = result.slice(0, start) + (navPlaced ? "" : NAV_TOKEN) + result.slice(end);
          navPlaced = true;
        }
      }

      const bodyMatch = result.match(new RegExp(`<section[^>]*id="${sectionId}"[^>]*>`));
      if (bodyMatch && bodyMatch.index !== undefined) {
        const start = bodyMatch.index;
        const closeIdx = result.indexOf("</section>", start);
        if (closeIdx !== -1) {
          const end = closeIdx + "</section>".length;
          let block = result.slice(start, end);
          if (isExtra) {
            block = block.replace(
              EXTRA_BODY_ICON,
              `<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">${roman}</span>`
            );
          } else {
            block = block.replace(COMMON_BODY_BADGE_RE, `$1${roman}$2`);
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
