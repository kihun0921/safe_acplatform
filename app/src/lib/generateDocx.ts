import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
} from "docx";
import type { WizardSection, CoverPageData, OverviewPageData } from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";

const FONT = "맑은 고딕";

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" } as const;
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

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

const COVER_RENDERERS: Record<CoverStyle, (cover: CoverPageData) => (Paragraph | Table)[]> = {
  lh_standard: buildLhStandardCover,
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

export async function generateWizardDocx(
  title: string,
  sections: WizardSection[],
  cover?: CoverPageData,
  coverStyle: CoverStyle = "generic",
  overviewPage?: OverviewPageData,
  overviewPageStyle?: string | null
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

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: title, bold: true, size: 36, font: FONT })],
    })
  );

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

    for (const field of section.fields) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${field.label}: `, bold: true, size: 22, font: FONT }),
            new TextRun({ text: field.value || "(미입력)", size: 22, font: FONT }),
          ],
        })
      );
    }

    if (section.table && section.table.rows.length > 0) {
      const { headers, rows } = section.table;
      const tableRows: TableRow[] = [];

      if (headers.length > 0) {
        tableRows.push(
          new TableRow({
            children: headers.map(
              (h) =>
                new TableCell({
                  width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: FONT })] }),
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
              (cell) =>
                new TableCell({
                  width: { size: 100 / (headers.length || row.length), type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, font: FONT })] })],
                })
            ),
          })
        );
      }

      children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    }
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
