import path from "path";
import fs from "fs";
import JSZip from "jszip";
import type { WizardSection, CoverPageData, OverviewPageData } from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";

// HWPX(.hwpx)는 한글과컴퓨터의 개방형 문서 표준(OWPML, KS X 6101)으로, ZIP 컨테이너 안에
// XML 파일들이 들어있는 구조다(DOCX/OOXML과 비슷한 개념). 다만 header.xml에는 문서 전체의
// 글자모양(charPr)·문단모양(paraPr)·스타일 등이 ID로 정의되어 있고 section0.xml의 각 문단이
// 그 ID를 참조하는 구조라, 이 매핑을 처음부터 직접 만들면 한글 프로그램에서 깨지기 쉽다.
// 그래서 실제로 한글에서 저장한 최소 빈 문서 하나를 템플릿으로 받아(src/assets/hwpx-template),
// header.xml/version.xml/설정 파일들은 그대로 두고 section0.xml의 본문 문단만 우리 데이터로
// 다시 만든다. charPrIDRef="0"(본문, 10pt), charPrIDRef="5"(제목, 16pt 파란색)는 템플릿의
// header.xml에 이미 정의되어 있는 걸 확인하고 그대로 재사용한다.

const TEMPLATE_DIR = path.join(process.cwd(), "src", "assets", "hwpx-template");

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let idCounter = 1000;
function nextId(): number {
  idCounter += 1;
  return idCounter;
}

function textParagraph(text: string, charPrIDRef: string, pageBreak: boolean): string {
  return `<hp:p id="${nextId()}" paraPrIDRef="0" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0">
<hp:run charPrIDRef="${charPrIDRef}"><hp:t>${escapeXml(text)}</hp:t></hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`;
}

function emptyParagraph(): string {
  return `<hp:p id="${nextId()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
<hp:run charPrIDRef="0"><hp:t/></hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`;
}

// 결재란(작성/검토/승인)은 발주처와 무관하게 공공 제출서식 어디서나 쓰이는
// 공통 요소라 스타일 구분 없이 재사용한다.
function buildApprovalParagraphs(cover: CoverPageData): string[] {
  return [
    textParagraph("구분 | 작성자 | 검토자 | 승인자", "0", false),
    textParagraph(`직책 |  |  | `, "0", false),
    textParagraph(`성명 | ${cover.writerName} |  | `, "0", false),
    textParagraph(`서명 |  |  | `, "0", false),
    emptyParagraph(),
  ];
}

// LH가 실제로 요구하는 표준 표지 내용을, 이 생성기가 이미 쓰고 있는 "문단 텍스트 +
// 다음 문단부터 페이지 나눔" 관례로 구성한다(HWPX 표 XML을 새로 만들지 않고, 기존
// 표 출력 방식(" | "로 구분된 한 줄)과 통일된 형태를 유지). 다른 발주처의 실제
// 표지 샘플이 확보되면 이 함수 옆에 buildXxxCoverParagraphs()를 추가하고
// COVER_PARAGRAPH_BUILDERS에 등록한다.
function buildLhStandardCoverParagraphs(cover: CoverPageData): string[] {
  const paragraphs: string[] = [];
  paragraphs.push(emptyParagraph());
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph("안 전 보 건 관 리 계 획 서", "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(`공 사(용 역) 명 : ${cover.projectName || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph(`공 사 기 간 : ${cover.period || "(미입력)"}`, "0", false));
  paragraphs.push(
    textParagraph(
      `도 급 금 액 : ${cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : "(미입력)"}`,
      "0",
      false
    )
  );
  paragraphs.push(textParagraph(`계상된 안전관리비 : ${cover.safetyBudget || "(미입력)"}`, "0", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(cover.submitDate, "0", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(`${cover.agency || "발주기관"} 귀하`, "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(cover.companyName || "(미입력)", "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(emptyParagraph());
  paragraphs.push(...buildApprovalParagraphs(cover));
  return paragraphs;
}

// 아직 실제 표지 샘플을 확보하지 못한 발주처를 위한 범용 표지.
function buildGenericCoverParagraphs(cover: CoverPageData): string[] {
  const paragraphs: string[] = [];
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph("안전보건관리계획서", "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(`공사(용역)명 : ${cover.projectName || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph(`공사기간 : ${cover.period || "(미입력)"}`, "0", false));
  paragraphs.push(
    textParagraph(
      `도급금액 : ${cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : "(미입력)"}`,
      "0",
      false
    )
  );
  paragraphs.push(textParagraph(`계상된 안전관리비 : ${cover.safetyBudget || "(미입력)"}`, "0", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(cover.submitDate, "0", false));
  paragraphs.push(textParagraph(`${cover.agency || "발주기관"} 귀하`, "5", false));
  paragraphs.push(textParagraph(cover.companyName || "(미입력)", "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(...buildApprovalParagraphs(cover));
  return paragraphs;
}

const COVER_PARAGRAPH_BUILDERS: Record<CoverStyle, (cover: CoverPageData) => string[]> = {
  lh_standard: buildLhStandardCoverParagraphs,
  generic: buildGenericCoverParagraphs,
};

// LH가 실제로 요구하는 "Ⅰ.안전보건관리체계 / 1.사업개요" 정형 페이지를, 이
// 생성기의 "문단 텍스트 + 다음 문단부터 페이지 나눔" 관례로 재현한다.
function buildLhOverviewPageParagraphs(data: OverviewPageData): string[] {
  const paragraphs: string[] = [];
  paragraphs.push(textParagraph(data.chapterTitle, "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph("1. 사업개요", "5", false));
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph(`□ 사 업 명 : ${data.projectName || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph(`□ 사업기간 : ${data.period || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph(`□ 사업금액 : ${data.contractAmount || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph(`□ 위    치 : ${data.location || "(미입력)"}`, "0", false));
  paragraphs.push(textParagraph("□ 주요내용 :", "0", false));
  if (data.mainContentLines.length) {
    for (const line of data.mainContentLines) {
      paragraphs.push(textParagraph(`     -. ${line}`, "0", false));
    }
  } else {
    paragraphs.push(textParagraph("     -. (미입력)", "0", false));
  }
  paragraphs.push(emptyParagraph());
  return paragraphs;
}

const OVERVIEW_PAGE_PARAGRAPH_BUILDERS: Record<string, (data: OverviewPageData) => string[]> = {
  lh_standard: buildLhOverviewPageParagraphs,
};

function buildSection0Xml(
  title: string,
  sections: WizardSection[],
  cover?: CoverPageData,
  coverStyle: CoverStyle = "generic",
  overviewPage?: OverviewPageData,
  overviewPageStyle?: string | null
): string {
  const baseSection0 = fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "section0.xml"), "utf8");
  // 템플릿의 첫 <hp:p>(secPr가 들어있는, 페이지 크기/여백을 정의하는 문단)는 그대로 두고,
  // 그 뒤에 우리 본문 문단들을 추가한다.
  const closeTag = "</hs:sec>";
  const withoutClose = baseSection0.slice(0, baseSection0.indexOf(closeTag));

  const paragraphs: string[] = [];
  if (cover) {
    const build = COVER_PARAGRAPH_BUILDERS[coverStyle] ?? buildGenericCoverParagraphs;
    paragraphs.push(...build(cover));
  }
  let overviewPageInserted = false;
  if (overviewPage && overviewPageStyle) {
    const build = OVERVIEW_PAGE_PARAGRAPH_BUILDERS[overviewPageStyle];
    if (build) {
      const overviewParagraphs = build(overviewPage);
      // 첫 문단은 표지 뒤 새 페이지에서 시작해야 하므로 pageBreak를 준다(표지가 없으면
      // 문서 맨 앞 페이지가 되므로 줄바꿈 없이 시작).
      if (overviewParagraphs.length) {
        overviewParagraphs[0] = overviewParagraphs[0].replace('pageBreak="0"', `pageBreak="${cover ? 1 : 0}"`);
      }
      paragraphs.push(...overviewParagraphs);
      overviewPageInserted = true;
    }
  }
  paragraphs.push(textParagraph(title, "5", Boolean(cover) || overviewPageInserted));
  paragraphs.push(emptyParagraph());

  sections.forEach((section, i) => {
    paragraphs.push(textParagraph(section.heading, "5", i > 0));
    paragraphs.push(emptyParagraph());
    for (const field of section.fields) {
      paragraphs.push(textParagraph(`${field.label}: ${field.value || "(미입력)"}`, "0", false));
    }
    if (section.table && section.table.rows.length > 0) {
      paragraphs.push(emptyParagraph());
      if (section.table.headers.length > 0) {
        paragraphs.push(textParagraph(section.table.headers.join(" | "), "0", false));
      }
      for (const row of section.table.rows) {
        paragraphs.push(textParagraph(row.join(" | "), "0", false));
      }
    }
    paragraphs.push(emptyParagraph());
  });

  return withoutClose + paragraphs.join("\n") + "\n" + closeTag + "\n";
}

export async function generateWizardHwpx(
  title: string,
  sections: WizardSection[],
  cover?: CoverPageData,
  coverStyle: CoverStyle = "generic",
  overviewPage?: OverviewPageData,
  overviewPageStyle?: string | null
): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype은 반드시 첫 번째 엔트리이며 압축하지 않아야 한다(ODF/OWPML 컨테이너 규약).
  zip.file("mimetype", fs.readFileSync(path.join(TEMPLATE_DIR, "mimetype")), { compression: "STORE" });

  zip.file("version.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "version.xml")));
  zip.file("settings.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "settings.xml")));
  zip.file("Contents/header.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "header.xml")));
  zip.file("Contents/content.hpf", fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "content.hpf")));
  zip.file(
    "Contents/section0.xml",
    buildSection0Xml(title, sections, cover, coverStyle, overviewPage, overviewPageStyle)
  );
  zip.file("META-INF/container.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.xml")));
  zip.file("META-INF/container.rdf", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.rdf")));
  zip.file("META-INF/manifest.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "manifest.xml")));
  zip.file("Preview/PrvImage.png", fs.readFileSync(path.join(TEMPLATE_DIR, "Preview", "PrvImage.png")));
  zip.file("Preview/PrvText.txt", title + "\r\n");

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
