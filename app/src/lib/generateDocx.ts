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
} from "docx";
import type { WizardSection } from "./wizardExport";

const FONT = "맑은 고딕";

export async function generateWizardDocx(title: string, sections: WizardSection[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

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
