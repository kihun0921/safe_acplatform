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
};

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
