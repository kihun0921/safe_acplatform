import path from "path";
import fs from "fs";
import JSZip from "jszip";
import type { WizardSection } from "./wizardExport";

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

function buildSection0Xml(title: string, sections: WizardSection[]): string {
  const baseSection0 = fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "section0.xml"), "utf8");
  // 템플릿의 첫 <hp:p>(secPr가 들어있는, 페이지 크기/여백을 정의하는 문단)는 그대로 두고,
  // 그 뒤에 우리 본문 문단들을 추가한다.
  const closeTag = "</hs:sec>";
  const withoutClose = baseSection0.slice(0, baseSection0.indexOf(closeTag));

  const paragraphs: string[] = [];
  paragraphs.push(textParagraph(title, "5", false));
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

export async function generateWizardHwpx(title: string, sections: WizardSection[]): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype은 반드시 첫 번째 엔트리이며 압축하지 않아야 한다(ODF/OWPML 컨테이너 규약).
  zip.file("mimetype", fs.readFileSync(path.join(TEMPLATE_DIR, "mimetype")), { compression: "STORE" });

  zip.file("version.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "version.xml")));
  zip.file("settings.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "settings.xml")));
  zip.file("Contents/header.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "header.xml")));
  zip.file("Contents/content.hpf", fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "content.hpf")));
  zip.file("Contents/section0.xml", buildSection0Xml(title, sections));
  zip.file("META-INF/container.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.xml")));
  zip.file("META-INF/container.rdf", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.rdf")));
  zip.file("META-INF/manifest.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "manifest.xml")));
  zip.file("Preview/PrvImage.png", fs.readFileSync(path.join(TEMPLATE_DIR, "Preview", "PrvImage.png")));
  zip.file("Preview/PrvText.txt", title + "\r\n");

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
