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
  const els = $("input, textarea, select").filter((_, el) => {
    const type = $(el).attr("type");
    return type !== "hidden";
  });
  els.each((i, el) => {
    const key = `field-${i}`;
    const saved = fields[key];
    if (saved === undefined) return;
    const $el = $(el);
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
  let current = $(el as never);
  for (let depth = 0; depth < 4; depth++) {
    const parent = current.parent();
    if (!parent.length) break;
    const label = parent.children("label").first();
    if (label.length) return label.text().replace(/\s+/g, " ").trim();
    current = parent;
  }
  return "";
}

export function extractWizardSections(
  html: string,
  savedFields: Record<string, string | boolean>
): WizardSection[] {
  const $ = cheerio.load(html);
  applySavedFields($, savedFields);

  const sections: WizardSection[] = [];
  $("section[id^='sec-']").each((_, sectionEl) => {
    const $section = $(sectionEl);
    const id = $section.attr("id") ?? "";
    const heading = $section.find("h2").first().text().trim();

    const fields: WizardFieldRow[] = [];
    $section.find("input, textarea, select").each((_, el) => {
      const type = $(el).attr("type");
      if (type === "hidden") return;
      const label = findLabel($, el);
      const value = fieldValue($, el);
      if (label) fields.push({ label, value });
    });

    let table: { headers: string[]; rows: string[][] } | undefined;
    const $table = $section.find("table").first();
    if ($table.length) {
      const headers: string[] = [];
      $table
        .find("thead th")
        .each((_, th) => headers.push($(th).text().replace(/\s+/g, " ").trim()));
      const rows: string[][] = [];
      $table.find("tbody tr").each((_, tr) => {
        const row: string[] = [];
        $(tr)
          .find("td")
          .each((_, td) => row.push($(td).text().replace(/\s+/g, " ").trim()));
        if (row.length) rows.push(row);
      });
      table = { headers, rows };
    }

    sections.push({ id, heading, fields, table });
  });

  return sections;
}
