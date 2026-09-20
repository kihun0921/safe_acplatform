import path from "path";
import fs from "fs";
import JSZip from "jszip";
import type { WizardSection, CoverPageData, OverviewPageData, ManagementPolicyData, OrgChartData } from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";
import { readImageDimensions } from "./imageDimensions";

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

// ── 실제 표(hp:tbl) 지원 ──────────────────────────────────────────────────
// 템플릿의 header.xml에 원래 정의된 borderFill(id 1·2)은 전부 네 변 type="NONE"
// (선 없음)이라 표 테두리로 못 쓴다. 그래서 zip을 만들 때 header.xml에 실선
// borderFill 2개를 새로 추가한다: id=3(본문 셀, 흰 배경+회색 실선), id=4(헤더
// 셀, 옅은 회색 배경+회색 실선 — DOCX 내보내기의 헤더 배경(F3F4F6)과 맞춤).
const TABLE_BODY_BORDER_FILL_ID = "3";
const TABLE_HEADER_BORDER_FILL_ID = "4";

function patchHeaderXmlForTables(headerXml: string): string {
  const newBorderFills = `<hh:borderFill id="${TABLE_BODY_BORDER_FILL_ID}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
<hh:slash type="NONE" Crooked="0" isCounter="0"/>
<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
<hh:leftBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:rightBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:topBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:bottomBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
</hh:borderFill>
<hh:borderFill id="${TABLE_HEADER_BORDER_FILL_ID}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
<hh:slash type="NONE" Crooked="0" isCounter="0"/>
<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
<hh:leftBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:rightBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:topBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:bottomBorder type="SOLID" width="0.1 mm" color="#999999"/>
<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
<hc:fillBrush><hc:winBrush faceColor="#F3F4F6" hatchColor="#999999" alpha="0"/></hc:fillBrush>
</hh:borderFill>`;
  return headerXml
    .replace(/<hh:borderFills itemCnt="2">/, '<hh:borderFills itemCnt="4">')
    .replace("</hh:borderFills>", `${newBorderFills}\n</hh:borderFills>`);
}

// 템플릿의 문단모양(paraPr) 20개 중 가운데 정렬(horizontal="CENTER")은 하나도
// 없어서(전부 JUSTIFY 또는 LEFT), 조직도 박스 안 텍스트·화살표를 가운데
// 맞추려면 새로 하나 추가해야 한다. id=0 문단모양을 그대로 복사하고
// align만 CENTER로 바꿔 id=20으로 추가한다(다른 속성은 기존 값 그대로라
// 위험이 낮다).
const CENTER_PARA_PR_ID = "20";

function patchHeaderXmlForCenterAlign(headerXml: string): string {
  const newParaPr = `<hh:paraPr id="${CENTER_PARA_PR_ID}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR">
<hh:align horizontal="CENTER" vertical="BASELINE"/>
<hh:heading type="NONE" idRef="0" level="0"/>
<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
<hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
<hp:switch>
<hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">
<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin>
<hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
</hp:case>
<hp:default>
<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin>
<hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
</hp:default>
</hp:switch>
<hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
</hh:paraPr>`;
  return headerXml
    .replace(/<hh:paraProperties itemCnt="20">/, '<hh:paraProperties itemCnt="21">')
    .replace("</hh:paraProperties>", `${newParaPr}\n</hh:paraProperties>`);
}

interface BoxNode {
  role: string;
  name: string;
  contact: string;
}

// 조직도·비상대책반 구성: DOCX(orgChartBoxCell)와 동일하게 "테두리 있는 표 칸을
// 박스처럼 쓰고 그 사이에 화살표 문단을 두는" 방식을 hp:tbl로 재현한다 —
// 유니코드 트리 문자보다 실제 다이어그램에 훨씬 가깝다.
function buildBoxCellXml(node: BoxNode, width: number, colAddr: number): string {
  const lines = [node.role, node.name || "(미입력)", node.contact || "(미입력)"];
  const cellParas = lines
    .map(
      (line) =>
        `<hp:p id="${nextId()}" paraPrIDRef="${CENTER_PARA_PR_ID}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:t>${escapeXml(
          line
        )}</hp:t></hp:run></hp:p>`
    )
    .join("\n");
  return `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${TABLE_BODY_BORDER_FILL_ID}">
<hp:cellAddr colAddr="${colAddr}" rowAddr="0"/>
<hp:cellSpan colSpan="1" rowSpan="1"/>
<hp:cellSz width="${width}" height="${BOX_ROW_HEIGHT}"/>
<hp:cellMargin left="${TABLE_CELL_MARGIN}" right="${TABLE_CELL_MARGIN}" top="200" bottom="200"/>
<hp:subList id="0" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="${width}" textHeight="0" hasTextRef="0" hasNumRef="0">
${cellParas}
</hp:subList>
</hp:tc>`;
}

function buildBoxRowTableXml(nodes: BoxNode[], fullWidth: boolean): string {
  const columnCount = nodes.length;
  const totalWidth = fullWidth ? TABLE_TOTAL_WIDTH : Math.round(TABLE_TOTAL_WIDTH * 0.5);
  const colWidth = Math.round(totalWidth / columnCount);
  const cells = nodes.map((n, i) => buildBoxCellXml(n, colWidth, i)).join("\n");
  const tblId = nextId();
  const horzAlign = fullWidth ? "LEFT" : "CENTER";
  return `<hp:tbl id="${tblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="1" colCnt="${columnCount}" cellSpacing="0" borderFillIDRef="${TABLE_BODY_BORDER_FILL_ID}" noAdjust="0">
<hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${BOX_ROW_HEIGHT}" heightRelTo="ABSOLUTE" protect="0"/>
<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="${horzAlign}" vertOffset="0" horzOffset="0"/>
<hp:outMargin left="0" right="0" top="0" bottom="0"/>
<hp:inMargin left="0" right="0" top="0" bottom="0"/>
<hp:tr>${cells}</hp:tr>
</hp:tbl>`;
}

function boxRowParagraph(nodes: BoxNode[], fullWidth: boolean): string {
  return `<hp:p id="${nextId()}" paraPrIDRef="${CENTER_PARA_PR_ID}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
<hp:run charPrIDRef="0">${buildBoxRowTableXml(nodes, fullWidth)}</hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`;
}

function arrowParagraph(): string {
  return `<hp:p id="${nextId()}" paraPrIDRef="${CENTER_PARA_PR_ID}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
<hp:run charPrIDRef="0"><hp:t>↓</hp:t></hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`;
}

// ── 이미지 첨부(hp:pic) ────────────────────────────────────────────────────
// 안전보건 경영방침 이미지, 재해발생 수준 증빙자료(산재요양승인확인서 등)를
// 실제 그림으로 끼워 넣는다. HWPX의 그림은 문서 밖 바이너리 데이터를
// Contents/BinData/에 두고 header.xml이 아니라 content.hpf의 매니페스트
// (opf:item)에 등록한 뒤, 문단 안 hp:pic 객체가 hc:img binaryItemIDRef로
// 그 항목 id를 참조하는 구조다. section0.xml을 문자열로 조립하는 시점에는
// 아직 zip에 파일을 추가할 수 없으므로, 등록이 필요한 이미지를 registered
// 배열에 모아 뒀다가 generateWizardHwpx에서 한 번에 zip/content.hpf에 반영한다.
export interface RegisteredHwpxImage {
  id: string;
  ext: "png" | "jpg";
  buffer: Buffer;
}

// 문서 전체에서 96dpi를 가정한다(DOCX 내보내기와 동일 — docx 라이브러리의
// ImageRun도 px 값을 96dpi 기준으로 EMU 변환한다). 1inch = 7200 HWPUNIT,
// 1inch = 96px 이므로 1px = 75 HWPUNIT.
const HWPUNIT_PER_PX = 75;
const IMAGE_MAX_WIDTH_PX = 620;

function detectImageFormat(buf: Buffer): "png" | "jpg" | null {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) return "png";
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  return null;
}

function buildImageParagraphs(
  buffer: Buffer,
  label: string | undefined,
  registered: RegisteredHwpxImage[],
  pageBreak: boolean
): string {
  const format = detectImageFormat(buffer);
  const dims = format ? readImageDimensions(buffer) : null;
  if (!format || !dims) {
    return textParagraph(
      `첨부된 "${label ?? "이미지"}" 형식을 지원하지 않아 표시할 수 없습니다. PNG 또는 JPEG로 다시 업로드해 주세요.`,
      "0",
      pageBreak
    );
  }

  const scale = Math.min(1, IMAGE_MAX_WIDTH_PX / dims.width);
  const widthUnit = Math.round(dims.width * scale * HWPUNIT_PER_PX);
  const heightUnit = Math.round(dims.height * scale * HWPUNIT_PER_PX);

  const imageId = `hwpximage${registered.length + 1}`;
  registered.push({ id: imageId, ext: format, buffer });

  const picId = nextId();
  const picXml = `<hp:pic id="${picId}" reverse="0" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${picId}" reverseVideo="0" isVectorImage="0">
<hp:offset x="0" y="0"/>
<hp:orgSz width="${widthUnit}" height="${heightUnit}"/>
<hp:curSz width="${widthUnit}" height="${heightUnit}"/>
<hp:flip horizontal="0" vertical="0"/>
<hp:rotationInfo angle="0" centerX="${Math.round(widthUnit / 2)}" centerY="${Math.round(heightUnit / 2)}" rotateimage="1"/>
<hp:renderingInfo>
<hc:transMatrix e1="1" e2="0" e3="0" e4="1" e5="0" e6="0"/>
<hc:scaMatrix e1="1" e2="0" e3="0" e4="1" e5="0" e6="0"/>
<hc:rotMatrix e1="1" e2="0" e3="0" e4="1" e5="0" e6="0"/>
</hp:renderingInfo>
<hp:sz width="${widthUnit}" widthRelTo="ABSOLUTE" height="${heightUnit}" heightRelTo="ABSOLUTE" protect="0"/>
<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/>
<hp:outMargin left="0" right="0" top="0" bottom="0"/>
<hp:imgRect>
<hc:pt0 x="0" y="0"/>
<hc:pt1 x="${widthUnit}" y="0"/>
<hc:pt2 x="${widthUnit}" y="${heightUnit}"/>
<hc:pt3 x="0" y="${heightUnit}"/>
</hp:imgRect>
<hp:imgClip left="0" top="0" right="${dims.width}" bottom="${dims.height}"/>
<hp:inMargin left="0" right="0" top="0" bottom="0"/>
<hp:imgDim dimwidth="${dims.width}" dimheight="${dims.height}"/>
<hc:img binaryItemIDRef="${imageId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>
</hp:pic>`;

  const paragraphs: string[] = [];
  if (label) {
    paragraphs.push(textParagraph(label, "5", pageBreak));
  }
  paragraphs.push(`<hp:p id="${nextId()}" paraPrIDRef="${CENTER_PARA_PR_ID}" styleIDRef="0" pageBreak="${
    label ? 0 : pageBreak ? 1 : 0
  }" columnBreak="0" merged="0">
<hp:run charPrIDRef="0">${picXml}</hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`);
  return paragraphs.join("\n");
}

// 위저드 화면 좌우 여백을 뺀 A4 본문 폭과 같은 값(다른 문단의 hp:lineseg
// horzsize="42520"과 통일) — 표를 문서 폭 전체로 채운다.
const TABLE_TOTAL_WIDTH = 42520;
const TABLE_ROW_HEIGHT = 1200;
const TABLE_CELL_MARGIN = 141;
// 조직도 박스는 역할/성명/연락처 3줄이 들어가 일반 표 행보다 더 높아야 한다.
const BOX_ROW_HEIGHT = 3200;

// DOCX 내보내기(generateDocx.ts)와 같은 기준: "연번"/"구분"처럼 원래 짧은
// 값만 들어가는 컬럼은 폭을 줄이고 나머지 컬럼이 남는 폭을 나눠 갖는다.
const NARROW_COLUMN_PATTERN =
  /^(연번|번호|no\.?|구분|분류|확인|서명|지정일|지정구분|작업일자|성명|소속|담당|비고|등급|점수|위험성|빈도|강도)/i;

function isNarrowColumn(header: string): boolean {
  return NARROW_COLUMN_PATTERN.test(header.trim());
}

function computeColumnWidths(headerLikeRow: string[], columnCount: number): number[] {
  const weights = Array.from({ length: columnCount }, (_, i) => (isNarrowColumn(headerLikeRow[i] ?? "") ? 1 : 2.4));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / total) * TABLE_TOTAL_WIDTH));
}

// 표 셀 안의 문단들("\n"이 섞인 셀 값은 줄마다 별도 hp:p로 나눠야 줄바꿈이 보임).
function cellParagraphs(text: string): string {
  const lines = (text || "").split("\n");
  return lines
    .map(
      (line) =>
        `<hp:p id="${nextId()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:t>${escapeXml(
          line
        )}</hp:t></hp:run></hp:p>`
    )
    .join("\n");
}

function buildTableCellXml(text: string, width: number, colAddr: number, rowAddr: number, isHeader: boolean): string {
  const borderFillId = isHeader ? TABLE_HEADER_BORDER_FILL_ID : TABLE_BODY_BORDER_FILL_ID;
  return `<hp:tc name="" header="${isHeader ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFillId}">
<hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/>
<hp:cellSpan colSpan="1" rowSpan="1"/>
<hp:cellSz width="${width}" height="${TABLE_ROW_HEIGHT}"/>
<hp:cellMargin left="${TABLE_CELL_MARGIN}" right="${TABLE_CELL_MARGIN}" top="${TABLE_CELL_MARGIN}" bottom="${TABLE_CELL_MARGIN}"/>
<hp:subList id="0" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="${width}" textHeight="0" hasTextRef="0" hasNumRef="0">
${cellParagraphs(text)}
</hp:subList>
</hp:tc>`;
}

// section.tables(위험성평가·유해위험 기계/차량/물질 관리계획·작업투입 인력
// 명단 등 위저드 대부분의 표 콘텐츠)를 실제 OWPML 표(hp:tbl)로 만든다. 예전엔
// " | "로 이어붙인 텍스트 한 줄이었는데(표라고 부를 수 없는 수준), 한글에서
// 열었을 때 실제 격자·테두리가 있는 표로 보이도록 바꿨다.
function buildTableXml(headers: string[], rows: string[][]): string {
  const columnCount = headers.length || rows[0]?.length || 1;
  const widths = computeColumnWidths(headers.length ? headers : rows[0] ?? [], columnCount);
  const rowCount = rows.length + (headers.length ? 1 : 0);
  const tblId = nextId();

  const rowXmls: string[] = [];
  let rowAddr = 0;
  if (headers.length) {
    const cells = headers.map((h, i) => buildTableCellXml(h, widths[i], i, rowAddr, true)).join("\n");
    rowXmls.push(`<hp:tr>${cells}</hp:tr>`);
    rowAddr += 1;
  }
  for (const row of rows) {
    const cells = row
      .map((cell, i) => buildTableCellXml(cell, widths[i] ?? widths[widths.length - 1], i, rowAddr, false))
      .join("\n");
    rowXmls.push(`<hp:tr>${cells}</hp:tr>`);
    rowAddr += 1;
  }

  return `<hp:tbl id="${tblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rowCount}" colCnt="${columnCount}" cellSpacing="0" borderFillIDRef="${TABLE_BODY_BORDER_FILL_ID}" noAdjust="0">
<hp:sz width="${TABLE_TOTAL_WIDTH}" widthRelTo="ABSOLUTE" height="${rowCount * TABLE_ROW_HEIGHT}" heightRelTo="ABSOLUTE" protect="0"/>
<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
<hp:outMargin left="0" right="0" top="0" bottom="0"/>
<hp:inMargin left="0" right="0" top="0" bottom="0"/>
${rowXmls.join("\n")}
</hp:tbl>`;
}

// 표는 문단 하나의 run 안에 들어가는 인라인 객체다(HWPX는 워드의 자유배치
// 표와 달리 표 자체가 하나의 문단을 차지하는 형태로 다룬다).
function tableParagraph(headers: string[], rows: string[][], pageBreak: boolean): string {
  return `<hp:p id="${nextId()}" paraPrIDRef="0" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0">
<hp:run charPrIDRef="0">${buildTableXml(headers, rows)}</hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>
</hp:p>`;
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

// "안전보건 경영방침 및 목표": 회사가 자체 이미지를 첨부했으면 그 이미지를
// 그대로 삽입하고(hp:pic), 아니면 표준 문구를 텍스트로 재현한다.
function buildManagementPolicyParagraphs(
  data: ManagementPolicyData,
  imageBuffer: Buffer | null | undefined,
  registered: RegisteredHwpxImage[]
): string[] {
  if (data.mode === "image" && imageBuffer) {
    return [
      textParagraph("안전보건 경영방침 및 목표", "5", false),
      emptyParagraph(),
      buildImageParagraphs(imageBuffer, undefined, registered, false),
      emptyParagraph(),
    ];
  }
  const paragraphs: string[] = [
    textParagraph("안전보건 경영방침 및 목표", "5", false),
    emptyParagraph(),
    textParagraph("가. 안전보건 경영방침", "0", false),
    textParagraph(data.slogan || "(미입력)", "0", false),
    emptyParagraph(),
    textParagraph(data.bodyParagraph, "0", false),
  ];
  for (const b of data.bullets) {
    paragraphs.push(textParagraph(`- ${b}`, "0", false));
  }
  paragraphs.push(emptyParagraph());
  paragraphs.push(textParagraph("나. 안전보건 목표", "0", false));
  paragraphs.push(textParagraph(data.goal || "(미입력)", "0", false));
  paragraphs.push(emptyParagraph());
  return paragraphs;
}

// "안전보건관리 조직구성"을 DOCX(buildOrgChartPage)와 같은 박스+화살표 표
// 다이어그램으로 그린다(현장소장 → 안전관리자 → 관리감독자가 한 줄씩 이어지고
// 마지막에 작업 1·2팀장만 나란히 배치 — 위저드 화면과 동일한 위계).
function buildOrgChartParagraphs(data: OrgChartData): string[] {
  return [
    textParagraph("안전보건관리 조직구성", "5", false),
    emptyParagraph(),
    textParagraph("나. 현장 사업소 조직도(임무 및 비상연락망 포함)", "0", false),
    emptyParagraph(),
    boxRowParagraph([data.siteManager], false),
    arrowParagraph(),
    boxRowParagraph([data.safetyManager], false),
    arrowParagraph(),
    boxRowParagraph([data.supervisor], false),
    arrowParagraph(),
    boxRowParagraph([data.team1, data.team2], true),
    emptyParagraph(),
    textParagraph("※ 위 선임 기술인력은 변경될 수 있습니다.", "0", false),
    emptyParagraph(),
  ];
}

function buildSection0Xml(
  title: string,
  sections: WizardSection[],
  registeredImages: RegisteredHwpxImage[],
  cover?: CoverPageData,
  coverStyle: CoverStyle = "generic",
  overviewPage?: OverviewPageData,
  overviewPageStyle?: string | null,
  managementPolicy?: ManagementPolicyData,
  managementPolicyImage?: Buffer | null,
  orgChart?: OrgChartData
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
  let managementPolicyInserted = false;
  if (managementPolicy) {
    const policyParagraphs = buildManagementPolicyParagraphs(managementPolicy, managementPolicyImage, registeredImages);
    if (policyParagraphs.length) {
      policyParagraphs[0] = policyParagraphs[0].replace(
        'pageBreak="0"',
        `pageBreak="${cover || overviewPageInserted ? 1 : 0}"`
      );
    }
    paragraphs.push(...policyParagraphs);
    managementPolicyInserted = true;
  }
  let orgChartInserted = false;
  if (orgChart) {
    const orgParagraphs = buildOrgChartParagraphs(orgChart);
    if (orgParagraphs.length) {
      orgParagraphs[0] = orgParagraphs[0].replace(
        'pageBreak="0"',
        `pageBreak="${cover || overviewPageInserted || managementPolicyInserted ? 1 : 0}"`
      );
    }
    paragraphs.push(...orgParagraphs);
    orgChartInserted = true;
  }
  paragraphs.push(
    textParagraph(title, "5", Boolean(cover) || overviewPageInserted || managementPolicyInserted || orgChartInserted)
  );
  paragraphs.push(emptyParagraph());

  sections.forEach((section, i) => {
    paragraphs.push(textParagraph(section.heading, "5", i > 0));
    paragraphs.push(emptyParagraph());
    if (section.emergencyTeam) {
      // 조직도와 동일한 박스+화살표 표 다이어그램(대책반장 → 안전관리자 →
      // 3개 팀 → 협력업체·근로자).
      const t = section.emergencyTeam;
      paragraphs.push(boxRowParagraph([t.chief], false));
      paragraphs.push(arrowParagraph());
      paragraphs.push(boxRowParagraph([t.safetyManager], false));
      paragraphs.push(arrowParagraph());
      paragraphs.push(boxRowParagraph([t.controlTeam, t.rescueTeam, t.supportTeam], true));
      paragraphs.push(arrowParagraph());
      paragraphs.push(textParagraph("협력업체, 근로자", "0", false));
      paragraphs.push(emptyParagraph());
    }
    for (const field of section.fields) {
      // 한 <hp:p>는 한 줄이라, "\n"이 섞인 긴 텍스트(위험성평가 실시규정 등)는
      // 줄마다 별도 문단으로 나눠야 실제로 줄바꿈이 보인다.
      const lines = (field.value || "(미입력)").split("\n");
      paragraphs.push(textParagraph(`${field.label}: ${lines[0]}`, "0", false));
      for (const line of lines.slice(1)) {
        paragraphs.push(textParagraph(line, "0", false));
      }
    }
    for (const t of section.tables) {
      if (t.rows.length === 0) continue;
      paragraphs.push(emptyParagraph());
      paragraphs.push(tableParagraph(t.headers, t.rows, false));
      paragraphs.push(emptyParagraph());
    }
    if (section.accidentImages?.length) {
      // DOCX(buildLabeledImagePage)와 동일하게 자료마다 제목 + 이미지 그대로
      // 한 페이지씩 넣는다.
      section.accidentImages.forEach((img) => {
        paragraphs.push(buildImageParagraphs(img.buffer, img.label, registeredImages, true));
      });
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
  overviewPageStyle?: string | null,
  managementPolicy?: ManagementPolicyData,
  managementPolicyImage?: Buffer | null,
  orgChart?: OrgChartData
): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype은 반드시 첫 번째 엔트리이며 압축하지 않아야 한다(ODF/OWPML 컨테이너 규약).
  zip.file("mimetype", fs.readFileSync(path.join(TEMPLATE_DIR, "mimetype")), { compression: "STORE" });

  zip.file("version.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "version.xml")));
  zip.file("settings.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "settings.xml")));
  zip.file(
    "Contents/header.xml",
    patchHeaderXmlForCenterAlign(
      patchHeaderXmlForTables(fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "header.xml"), "utf8"))
    )
  );
  const registeredImages: RegisteredHwpxImage[] = [];
  const section0Xml = buildSection0Xml(
    title,
    sections,
    registeredImages,
    cover,
    coverStyle,
    overviewPage,
    overviewPageStyle,
    managementPolicy,
    managementPolicyImage,
    orgChart
  );
  zip.file("Contents/section0.xml", section0Xml);

  // hp:pic이 참조하는 바이너리 파일들을 BinData/에 넣고, content.hpf의
  // opf:manifest에 같은 id로 등록한다(header.xml이 아니라 content.hpf 쪽에
  // 이미지 매니페스트가 있다 — 표 테두리(header.xml)와는 다른 경로).
  const contentHpfTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "Contents", "content.hpf"), "utf8");
  const imageManifestItems = registeredImages
    .map(
      (img) =>
        `<opf:item id="${img.id}" href="BinData/${img.id}.${img.ext}" media-type="image/${
          img.ext === "jpg" ? "jpeg" : "png"
        }"/>`
    )
    .join("\n");
  const contentHpf = imageManifestItems
    ? contentHpfTemplate.replace("</opf:manifest>", `${imageManifestItems}\n</opf:manifest>`)
    : contentHpfTemplate;
  zip.file("Contents/content.hpf", contentHpf);
  for (const img of registeredImages) {
    zip.file(`BinData/${img.id}.${img.ext}`, img.buffer);
  }

  zip.file("META-INF/container.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.xml")));
  zip.file("META-INF/container.rdf", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "container.rdf")));
  zip.file("META-INF/manifest.xml", fs.readFileSync(path.join(TEMPLATE_DIR, "META-INF", "manifest.xml")));
  zip.file("Preview/PrvImage.png", fs.readFileSync(path.join(TEMPLATE_DIR, "Preview", "PrvImage.png")));
  zip.file("Preview/PrvText.txt", title + "\r\n");

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
