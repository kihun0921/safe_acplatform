import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import type {
  WizardSection,
  CoverPageData,
  OverviewPageData,
  ManagementPolicyData,
  OrgChartData,
  OrgChartNode,
  EmergencyTeamData,
  HazardDetailGroup,
} from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";
import { readImageDimensions } from "./imageDimensions";

const FONT = "맑은 고딕";

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" } as const;
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 };

// 위험성평가·작업투입 인력 명단 등 위저드에서 나오는 표는 컬럼 폭·의미가 제각각이라
// 지금까지는 전 컬럼을 균등폭으로 나눴는데, "연번"·"구분"처럼 원래 짧은 값만 들어가는
// 컬럼까지 "안전관리 방안"처럼 긴 서술형 컬럼과 같은 폭을 받아 표 전체가 정렬이
// 안 맞아 보이는 원인이었다. 헤더 텍스트로 짧은 값 컬럼을 가려내 폭을 줄이고 남는
// 폭을 나머지 컬럼에 고르게 배분하며, 그런 짧은 값 컬럼은 가운데 정렬(그 외는
// 왼쪽 정렬)해 표를 읽기 쉽게 만든다.
const NARROW_COLUMN_PATTERN =
  /^(연번|번호|no\.?|구분|분류|확인|서명|지정일|지정구분|작업일자|성명|소속|담당|비고|등급|점수|위험성|빈도|강도)/i;

function isNarrowColumn(header: string): boolean {
  return NARROW_COLUMN_PATTERN.test(header.trim());
}

function computeColumnWidths(headerLikeRow: string[], columnCount: number): number[] {
  const weights = Array.from({ length: columnCount }, (_, i) => (isNarrowColumn(headerLikeRow[i] ?? "") ? 1 : 2.4));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / total) * 1000) / 10);
}

// 유해·위험 기계/차량/물질 관리계획: 실제 LH 샘플처럼 항목(장비명·물질명)별로
// "관리계획 / 세부실행 계획" 표를 하나씩 둔다. 예전엔 팝업의 세부실행계획
// textarea들이 일반 라벨+값 필드로 잡혀 어떤 장비·물질에 대한 내용인지 알
// 수 없는 서술형 텍스트가 항목 수만큼 나열되는 버그가 있었다.
function buildHazardDetailGroupsBlocks(groups: HazardDetailGroup[]): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  groups.forEach((group) => {
    blocks.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: group.name, bold: true, size: 20, font: FONT })],
      })
    );
    const tableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: "F3F4F6" },
            borders: CELL_BORDERS,
            margins: CELL_MARGINS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "관리계획", bold: true, size: 18, font: FONT })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 78, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: "F3F4F6" },
            borders: CELL_BORDERS,
            margins: CELL_MARGINS,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: "세부실행 계획", bold: true, size: 18, font: FONT })],
              }),
            ],
          }),
        ],
      }),
      ...group.entries.map(
        (entry) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: CELL_BORDERS,
                margins: CELL_MARGINS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: entry.category, bold: true, size: 18, font: FONT })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: CELL_BORDERS,
                margins: CELL_MARGINS,
                children: entry.detail.split("\n").map(
                  (line) =>
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      children: [new TextRun({ text: line, size: 18, font: FONT })],
                    })
                ),
              }),
            ],
          })
      ),
    ];
    blocks.push(
      new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED })
    );
    if (group.note) {
      blocks.push(
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: [new TextRun({ text: `비고(관계법령): ${group.note}`, size: 16, font: FONT, color: "6b7280" })],
        })
      );
    } else {
      blocks.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  });
  return blocks;
}

function coverLabelCell(text: string): TableCell {
  return new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: "F3F4F6" },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, font: FONT })],
      }),
    ],
  });
}

function coverValueCell(text: string): TableCell {
  return new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: text || "(미입력)", size: 20, font: FONT })],
      }),
    ],
  });
}

function approvalCell(text: string, bold = false): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text, bold, size: 18, font: FONT })],
      }),
    ],
  });
}

// 결재란(작성/검토/승인)은 발주처와 무관하게 공공 제출서식 어디서나 쓰이는
// 공통 요소라 스타일 구분 없이 재사용한다.
function buildApprovalTable(cover: CoverPageData): Table {
  return new Table({
    width: { size: 90, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        children: [
          approvalCell("구 분", true),
          approvalCell("작성자", true),
          approvalCell("검토자", true),
          approvalCell("승인자", true),
        ],
      }),
      new TableRow({ children: [approvalCell("직 책", true), approvalCell(""), approvalCell(""), approvalCell("")] }),
      new TableRow({
        children: [approvalCell("성 명", true), approvalCell(cover.writerName), approvalCell(""), approvalCell("")],
      }),
      new TableRow({ children: [approvalCell("서 명", true), approvalCell(""), approvalCell(""), approvalCell("")] }),
    ],
  });
}

// 공공 제출서식 표지는 대부분 제목을 테두리 박스로 감싸서 강조한다 — 발주처
// 스타일과 무관하게 재사용하는 공통 요소.
function buildTitleBox(text: string): Table {
  return new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            margins: { top: 300, bottom: 300 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 34, font: FONT })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// LH가 실제로 요구하는 표준 표지(제목 박스, 공사명/공사기간/도급금액/계상
// 안전관리비 표, 제출문, 작성·검토·승인 결재란)를 첫 페이지로 렌더링한다.
// 다른 발주처의 실제 표지 샘플이 확보되면 이 함수 옆에 buildXxxCover()를
// 추가하고 generateWizardDocx()의 분기에 등록한다.
function buildLhStandardCover(cover: CoverPageData): (Paragraph | Table)[] {
  return [
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    buildTitleBox("안 전 보 건 관 리 계 획 서"),
    new Paragraph({ spacing: { before: 500, after: 100 }, children: [] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [coverLabelCell("공 사(용 역) 명"), coverValueCell(cover.projectName)] }),
        new TableRow({ children: [coverLabelCell("공 사 기 간"), coverValueCell(cover.period)] }),
        new TableRow({
          children: [coverLabelCell("도 급 금 액"), coverValueCell(cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : "")],
        }),
        new TableRow({ children: [coverLabelCell("계상된 안전관리비"), coverValueCell(cover.safetyBudget)] }),
      ],
    }),
    new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: cover.submitDate, size: 22, font: FONT })] }),
    new Paragraph({
      spacing: { before: 500, after: 500 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${cover.agency || "발주기관"} 귀하`, bold: true, size: 26, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 500 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.companyName || "(미입력)", bold: true, size: 24, font: FONT })],
    }),
    buildApprovalTable(cover),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// 아직 실제 표지 샘플을 확보하지 못한 발주처를 위한 범용 표지. LH처럼 정보를
// 표(테두리 있는 라벨/값 칸)로 나누지는 않지만, 제목만큼은 공공 제출서식 표지의
// 관례대로 테두리 박스로 감싸 격식을 갖춘다.
function buildGenericCover(cover: CoverPageData): (Paragraph | Table)[] {
  const infoLine = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 160 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${label} : `, bold: true, size: 22, font: FONT }),
        new TextRun({ text: value || "(미입력)", size: 22, font: FONT }),
      ],
    });

  return [
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    buildTitleBox("안전보건관리계획서"),
    new Paragraph({ spacing: { before: 500, after: 100 }, children: [] }),
    infoLine("공사(용역)명", cover.projectName),
    infoLine("공사기간", cover.period),
    infoLine("도급금액", cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : ""),
    infoLine("계상된 안전관리비", cover.safetyBudget),
    new Paragraph({ spacing: { before: 700 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: cover.submitDate, size: 22, font: FONT })] }),
    new Paragraph({
      spacing: { before: 500, after: 500 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${cover.agency || "발주기관"} 귀하`, bold: true, size: 26, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 500 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.companyName || "(미입력)", bold: true, size: 24, font: FONT })],
    }),
    buildApprovalTable(cover),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// 실제 K-water 붙임2 서식(안전보건관리계획서 작성양식) 1~2p를 그대로 재현한다:
// 1p는 표지(공사명 부제 + 제목 박스 + 제출일자 + 회사명), 2p는 별도 페이지의
// 제출문(수신문 + 제출일자 + 업체명·대표이사 + 발주처 귀하)이다. LH·범용
// 표지처럼 표/결재란으로 정보를 나열하지 않고, 실제 샘플처럼 문장형 제출문을
// 그대로 쓰는 것이 K-water 서식의 특징이라 전용 렌더러로 분리했다.
function buildKwaterStandardCover(cover: CoverPageData): (Paragraph | Table)[] {
  const project = cover.projectName || "OOOOO";
  return [
    // 1페이지: 표지
    new Paragraph({ spacing: { after: 300 }, children: [] }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${project} 공사(용역)`, bold: true, size: 24, font: FONT })],
    }),
    buildTitleBox("안전보건관리계획서"),
    new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: cover.submitDate, size: 22, font: FONT })] }),
    new Paragraph({
      spacing: { before: 1600 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.companyName || "회사명(로고)", bold: true, size: 24, font: FONT })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    // 2페이지: 제출문
    new Paragraph({
      spacing: { after: 700 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "제 출 문", bold: true, size: 32, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 700 },
      children: [
        new TextRun({
          text: `귀사의 ${project} 수행을 위해 아래와 같이 안전보건관리계획서를 제출합니다.`,
          size: 22,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 800, after: 500 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: cover.submitDate, size: 22, font: FONT })] }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: `업 체 명 : ${cover.companyName || "(미입력)"}`, size: 22, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 900 },
      children: [
        new TextRun({ text: `대표이사 : ${cover.writerName || ""}`, size: 22, font: FONT }),
        new TextRun({ text: "                    (서명 또는 인)", size: 22, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { before: 500 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${cover.agency || "발주기관"} 귀하`, bold: true, size: 26, font: FONT })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

const COVER_RENDERERS: Record<CoverStyle, (cover: CoverPageData) => (Paragraph | Table)[]> = {
  lh_standard: buildLhStandardCover,
  kwater_standard: buildKwaterStandardCover,
  generic: buildGenericCover,
};

// LH가 실제로 요구하는 "Ⅰ.안전보건관리체계 / 1.사업개요" 정형 페이지를 그대로
// 재현한다: 대제목-소제목, □ 체크박스 불릿, 라벨 뒤 콜론 정렬, 주요내용 하위
// "-." 불릿까지 실제 서식과 동일한 글꼴 크기/들여쓰기로 맞춘다.
function overviewBulletParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    indent: { left: 720, hanging: 720 },
    children: [
      new TextRun({ text: "□ ", bold: true, size: 22, font: FONT }),
      new TextRun({ text: `${label} : `, bold: true, size: 22, font: FONT }),
      new TextRun({ text: value || "(미입력)", size: 22, font: FONT }),
    ],
  });
}

function buildLhOverviewPage(data: OverviewPageData): Paragraph[] {
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: data.chapterTitle, bold: true, size: 32, font: FONT })],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 300 },
      children: [new TextRun({ text: "1. 사업개요", bold: true, size: 26, font: FONT })],
    }),
    overviewBulletParagraph("사 업 명", data.projectName),
    overviewBulletParagraph("사업기간", data.period),
    overviewBulletParagraph("사업금액", data.contractAmount),
    overviewBulletParagraph("위    치", data.location),
    new Paragraph({
      spacing: { after: data.mainContentLines.length ? 100 : 200 },
      indent: { left: 720, hanging: 720 },
      children: [new TextRun({ text: "□ 주요내용 :", bold: true, size: 22, font: FONT })],
    }),
  ];

  if (data.mainContentLines.length) {
    for (const line of data.mainContentLines) {
      children.push(
        new Paragraph({
          indent: { left: 1080 },
          spacing: { after: 100 },
          children: [new TextRun({ text: `-. ${line}`, size: 22, font: FONT })],
        })
      );
    }
  } else {
    children.push(
      new Paragraph({
        indent: { left: 1080 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "-. (미입력)", size: 22, font: FONT })],
      })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

const OVERVIEW_PAGE_RENDERERS: Record<string, (data: OverviewPageData) => Paragraph[]> = {
  lh_standard: buildLhOverviewPage,
};

// "안전보건 경영방침 및 목표": 회사가 자체 이미지를 첨부했으면 그 이미지를 한
// 페이지 가득 그대로 삽입하고(원본 비율 유지, 페이지 폭에 맞춰 축소), 아니면
// 실제 LH 표준 문구 서식(음영 박스 2곳만 회사가 입력한 값, 나머지는 고정 문구 +
// 회사명 자동 치환)을 그대로 재현한다.
function buildManagementPolicyImagePage(imageBuffer: Buffer): (Paragraph | Table)[] {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return [
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "첨부된 안전보건경영방침 이미지 형식을 지원하지 않아 표시할 수 없습니다. PNG 또는 JPEG로 다시 업로드해 주세요.",
            font: FONT,
            size: 22,
          }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ];
  }

  // A4 본문 폭(여백 제외 약 9,000 twips)에 맞춰 원본 비율을 유지한 채 축소한다.
  const maxWidthPx = 620;
  const scale = Math.min(1, maxWidthPx / dims.width);
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: isPng ? "png" : "jpg",
          data: imageBuffer,
          transformation: { width, height },
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// "재해발생 수준" 증빙자료(산재요양승인확인서/산업재해율 조회결과/안전보건경영
// 시스템 인증서) 첨부 이미지를 제목 + 이미지 그대로 한 페이지에 넣는다.
// buildManagementPolicyImagePage와 로직은 같지만 재사용 시 관리방침 전용 안내
// 문구가 섞이지 않도록 별도 함수로 둔다.
function buildLabeledImagePage(imageBuffer: Buffer, label: string): (Paragraph | Table)[] {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return [
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `첨부된 "${label}" 이미지 형식을 지원하지 않아 표시할 수 없습니다. PNG 또는 JPEG로 다시 업로드해 주세요.`,
            font: FONT,
            size: 22,
          }),
        ],
      }),
    ];
  }

  const maxWidthPx = 620;
  const scale = Math.min(1, maxWidthPx / dims.width);
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);

  return [
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: label, bold: true, size: 24, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: isPng ? "png" : "jpg",
          data: imageBuffer,
          transformation: { width, height },
        }),
      ],
    }),
  ];
}

function buildManagementPolicyStandardPage(data: ManagementPolicyData): (Paragraph | Table)[] {
  const shadedBox = (text: string): Table =>
    new Table({
      width: { size: 90, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "F3F4F6" },
              borders: CELL_BORDERS,
              margins: { top: 150, bottom: 150 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text, bold: true, underline: {}, size: 22, font: FONT })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "안전보건 경영방침 및 목표", bold: true, underline: {}, size: 28, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "가. 안전보건 경영방침", bold: true, underline: {}, size: 22, font: FONT })],
    }),
    shadedBox(data.slogan || "(미입력)"),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: data.bodyParagraph, size: 20, font: FONT })] }),
    ...data.bullets.map(
      (b) =>
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `- ${b}`, size: 20, font: FONT })],
        })
    ),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: "나. 안전보건 목표", bold: true, underline: {}, size: 22, font: FONT })],
    }),
    shadedBox(data.goal || "(미입력)"),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// "안전보건관리 조직구성"을 실제 조직도 다이어그램으로 그린다. docx 라이브러리는
// 임의의 도형·연결선을 지원하지 않으므로, 테두리 있는 표 칸을 박스처럼 쓰고
// 그 사이에 화살표 문단을 둬 위계(상급자 → 하급자)를 시각적으로 표현한다.
function orgChartBoxCell(node: OrgChartNode, columnSpan?: number): TableCell {
  return new TableCell({
    columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    margins: { top: 150, bottom: 150 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: node.role, bold: true, size: 18, font: FONT, color: "1e3a5f" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [new TextRun({ text: node.name || "(미입력)", size: 18, font: FONT })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: node.contact || "(미입력)", size: 16, font: FONT, color: "6b7280" })],
      }),
    ],
  });
}

function orgChartArrowRow(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: "↓", size: 22, font: FONT, color: "9ca3af" })],
  });
}

// 위저드 화면(WizardScreen)의 박스+연결선 다이어그램과 동일한 위계로 맞춘다 —
// 현장소장 → 안전관리자 → 관리감독자가 한 줄씩 순서대로 이어지고, 마지막에
// 작업 1·2팀장만 나란히 배치된다(예전에는 현장소장·안전관리자가 나란히 있고
// 관리감독자로 합쳐지는 다른 모양이라 화면과 다운로드 문서의 조직도가 서로
// 달랐다).
function buildOrgChartPage(data: OrgChartData): (Paragraph | Table)[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "안전보건관리 조직구성", bold: true, size: 28, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "나. 현장 사업소 조직도(임무 및 비상연락망 포함)", bold: true, size: 20, font: FONT }),
      ],
    }),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [orgChartBoxCell(data.siteManager)] })],
    }),
    orgChartArrowRow(),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [orgChartBoxCell(data.safetyManager)] })],
    }),
    orgChartArrowRow(),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [orgChartBoxCell(data.supervisor)] })],
    }),
    orgChartArrowRow(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [orgChartBoxCell(data.team1), orgChartBoxCell(data.team2)] })],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "※ 위 선임 기술인력은 변경될 수 있습니다.", size: 16, font: FONT, color: "9ca3af" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// "중대산업재해 등 비상 상황시 조치계획"의 "1. 비상 대책반 구성"을 조직도와
// 동일한 박스+연결선(화살표) 방식으로 그린다. 조직도(2분기)와 달리 안전관리자
// 아래에서 3개 팀(통제반/구조·후송·복구반/지원반)으로 갈라지고, 맨 아래에
// 협력업체·근로자로 이어지는 안내문이 하나 더 붙는다. 페이지 안(섹션 본문 중간)
// 에 들어가야 하므로 buildOrgChartPage와 달리 페이지나눔(PageBreak)은 넣지 않는다.
function buildEmergencyTeamDiagram(data: EmergencyTeamData): (Paragraph | Table)[] {
  return [
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [orgChartBoxCell(data.chief)] })],
    }),
    orgChartArrowRow(),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [orgChartBoxCell(data.safetyManager)] })],
    }),
    orgChartArrowRow(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            orgChartBoxCell(data.controlTeam),
            orgChartBoxCell(data.rescueTeam),
            orgChartBoxCell(data.supportTeam),
          ],
        }),
      ],
    }),
    orgChartArrowRow(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "협력업체, 근로자", bold: true, size: 20, font: FONT, color: "6b7280" })],
    }),
  ];
}

export async function generateWizardDocx(
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
  const children: (Paragraph | Table)[] = [];

  if (cover) {
    const render = COVER_RENDERERS[coverStyle] ?? buildGenericCover;
    children.push(...render(cover));
  }

  if (overviewPage && overviewPageStyle) {
    const render = OVERVIEW_PAGE_RENDERERS[overviewPageStyle];
    if (render) children.push(...render(overviewPage));
  }

  if (managementPolicy) {
    if (managementPolicy.mode === "image" && managementPolicyImage) {
      children.push(...buildManagementPolicyImagePage(managementPolicyImage));
    } else {
      children.push(...buildManagementPolicyStandardPage(managementPolicy));
    }
  }

  if (orgChart) {
    children.push(...buildOrgChartPage(orgChart));
  }

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        children: [new TextRun({ text: section.heading, bold: true, size: 28, font: FONT })],
      })
    );

    if (section.emergencyTeam) {
      children.push(...buildEmergencyTeamDiagram(section.emergencyTeam));
    }

    if (section.accidentImages?.length) {
      section.accidentImages.forEach((img, i) => {
        children.push(...buildLabeledImagePage(img.buffer, img.label));
        if (i < section.accidentImages!.length - 1) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
      });
    }

    for (const field of section.fields) {
      // field.value에 개행이 있으면(위험성평가 실시규정처럼 여러 문단짜리 긴 텍스트)
      // TextRun 하나에 몰아넣지 않고 줄마다 별도 Paragraph로 나눠야 실제로 줄바꿈이
      // 보인다 — TextRun.text 안의 "\n"은 Word가 줄바꿈으로 렌더링하지 않는다.
      const lines = (field.value || "(미입력)").split("\n");
      children.push(
        new Paragraph({
          spacing: { after: lines.length > 1 ? 40 : 120 },
          children: [
            new TextRun({ text: `${field.label}: `, bold: true, size: 22, font: FONT }),
            new TextRun({ text: lines[0], size: 22, font: FONT }),
          ],
        })
      );
      lines.slice(1).forEach((line, i, arr) => {
        children.push(
          new Paragraph({
            spacing: { after: i === arr.length - 1 ? 120 : 40 },
            children: [new TextRun({ text: line, size: 22, font: FONT })],
          })
        );
      });
    }

    for (const t of section.tables) {
      if (t.rows.length === 0) continue;
      const { headers, rows } = t;
      const columnCount = headers.length || rows[0]?.length || 1;
      const widths = computeColumnWidths(headers.length ? headers : rows[0] ?? [], columnCount);
      const tableRows: TableRow[] = [];

      if (headers.length > 0) {
        tableRows.push(
          new TableRow({
            tableHeader: true,
            children: headers.map(
              (h: string, i: number) =>
                new TableCell({
                  width: { size: widths[i] ?? widths[widths.length - 1], type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: "F3F4F6" },
                  borders: CELL_BORDERS,
                  margins: CELL_MARGINS,
                  children: [
                    new Paragraph({
                      alignment: isNarrowColumn(h) ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: [new TextRun({ text: h, bold: true, size: 18, font: FONT })],
                    }),
                  ],
                })
            ),
          })
        );
      }

      for (const row of rows) {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell: string, i: number) =>
                new TableCell({
                  width: { size: widths[i] ?? widths[widths.length - 1], type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: CELL_BORDERS,
                  margins: CELL_MARGINS,
                  children: [
                    new Paragraph({
                      alignment: isNarrowColumn(headers[i] ?? "") ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: [new TextRun({ text: cell, size: 18, font: FONT })],
                    }),
                  ],
                })
            ),
          })
        );
      }

      children.push(
        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED })
      );
      children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    }

    if (section.hazardDetailGroups?.length) {
      children.push(...buildHazardDetailGroupsBlocks(section.hazardDetailGroups));
    }
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
