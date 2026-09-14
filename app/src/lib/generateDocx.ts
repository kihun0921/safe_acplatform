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
import type { WizardSection, CoverPageData } from "./wizardExport";

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

// LH 등 공공발주처가 실제로 요구하는 표준 표지(제목 박스, 공사명/공사기간/도급금액/
// 계상 안전관리비 표, 제출문, 작성·검토·승인 결재란)를 첫 페이지로 렌더링한다.
function buildCoverPageChildren(cover: CoverPageData): (Paragraph | Table)[] {
  const spacedTitle = "안 전 보 건 관 리 계 획 서";
  return [
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    new Table({
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
                  children: [new TextRun({ text: spacedTitle, bold: true, size: 34, font: FONT })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
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
    new Table({
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
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

export async function generateWizardDocx(
  title: string,
  sections: WizardSection[],
  cover?: CoverPageData
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  if (cover) {
    children.push(...buildCoverPageChildren(cover));
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
