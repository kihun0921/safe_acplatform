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
  // 공통 6대 목차 + 발주처 전용 목차 전체를 이 발주처 실제 서식의 목차 순서/장
  // 번호로 재배치한다. 비어 있으면 원래 순서(공통 6개 + 전용 항목은 뒤에 이어붙임)를 쓴다.
  section_order?: SectionOrderItem[] | null;
};

// section_order 배열의 한 항목. id는 공통 섹션 키(overview/risk/execution/emergency/
// target/attachments) 또는 sections[].id(발주처 전용 목차) 중 하나이고, roman은 그
// 항목이 속하는 실제 장(章) 번호다. 여러 항목이 같은 roman을 공유하면(실제 문서에서
// 여러 절이 한 장 아래 있는 경우) 좌측 목차/본문에 같은 로마숫자 배지로 표시된다.
export type SectionOrderItem = { id: string; roman: string };

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
const NAV_ROMAN_PREFIX_RE = />([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])\.(\s*)/;

// 공통 6대 목차 + 발주처 전용 목차 전체를 order에 지정된 실제 장(章) 순서로 재배치한다.
// 각 항목의 nav <a>...</a>와 본문 <section id>...</section> 블록을 원래 위치에서
// 통째로 떼어낸 뒤, order 순서대로 다시 이어붙이고 로마숫자 배지만 order.roman으로
// 바꾼다(라벨 텍스트·입력 필드 구성은 절대 건드리지 않으므로 자동저장 인덱스에
// 영향이 없다). 첫 번째 떼어낸 위치에 재배치된 전체 묶음을 끼워 넣으므로, 재배치
// 대상이 아닌 다른 항목(예: 표지 안내 항목)의 상대적 위치는 그대로 유지된다.
export function applySectionOrder(
  html: string,
  order: SectionOrderItem[],
  extraLabels: Record<string, string>
): string {
  if (!order.length) return html;

  const navContents: string[] = [];
  const bodyContents: string[] = [];
  let result = html;
  let navPlaced = false;
  let bodyPlaced = false;
  const NAV_TOKEN = " __SECTION_ORDER_NAV__ ";
  const BODY_TOKEN = " __SECTION_ORDER_BODY__ ";

  for (const { id, roman } of order) {
    const isExtra = id in extraLabels;
    const sectionId = isExtra ? `sec-tpl-${id}` : `sec-${id}`;

    const navMatch = result.match(new RegExp(`<a[^>]*href="#${sectionId}"[^>]*>`));
    if (navMatch && navMatch.index !== undefined) {
      const start = navMatch.index;
      const closeIdx = result.indexOf("</a>", start);
      if (closeIdx !== -1) {
        const end = closeIdx + "</a>".length;
        let block = result.slice(start, end);
        if (isExtra) {
          const label = escapeHtml(extraLabels[id]);
          block = block.replace(`>${label}<`, `>${roman}. ${label}<`);
        } else {
          block = block.replace(NAV_ROMAN_PREFIX_RE, `>${roman}.$2`);
        }
        navContents.push(block);
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

  result = result.replace(NAV_TOKEN, navContents.join("\n"));
  result = result.replace(BODY_TOKEN, bodyContents.join("\n"));
  return result;
}
