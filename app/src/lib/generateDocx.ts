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
  VerticalMergeType,
  TableLayoutType,
} from "docx";
import {
  RISK_ASSESSMENT_FORM_1_CONTENT_TEXT,
  RISK_ASSESSMENT_FORM_2_CONTENT_TEXT,
  type WizardSection,
  type CoverPageData,
  type OverviewPageData,
  type ManagementPolicyData,
  type OrgChartData,
  type OrgChartNode,
  type EmergencyTeamData,
  type HazardDetailGroup,
  type WorkforcePlanGroup,
  type ExecutionOptionsData,
  type RiskAssessmentFormFieldsData,
} from "./wizardExport";
import { computeSectionOrderChapters, type CoverStyle, type SectionOrderGroup } from "./agencyTemplates";
import { readImageDimensions } from "./imageDimensions";

const FONT = "맑은 고딕";

// LH 실제 표지 뒤에 붙는 "제출문"은 제출일자를 submitDate 전체("2026. 9. 25.")가
// 아니라 "년/월"까지만("2026년 09월") 쓴다 — 실제 LH 샘플(화성동탄(2))의 제출문
// 캡처를 그대로 따른 것. submitDate는 extractCoverPageData()에서 항상
// "YYYY. M. D." 형식으로만 만들어지므로 정규식으로 안전하게 뽑아낸다.
function formatSubmitYearMonth(submitDate: string): string {
  const m = submitDate.match(/^(\d{4})\.\s*(\d{1,2})\./);
  if (!m) return submitDate;
  return `${m[1]}년 ${m[2].padStart(2, "0")}월`;
}

// 소제목(1.사업개요/2.안전보건 경영방침 및 목표/3.안전보건관리 조직구성/일반
// 섹션들)을 전부 왼쪽 정렬·같은 크기(size 26)·같은 굵기로 통일해서 쓰는 공통
// 헬퍼. 예전엔 안전보건 경영방침·조직구성 제목만 가운데 정렬+밑줄이라 번호를
// 붙여도 다른 소제목들과 정렬·스타일이 달라 보였다.
function numberedSectionHeading(number: number, text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 300 },
    children: [new TextRun({ text: `${number}. ${text}`, bold: true, size: 26, font: FONT })],
  });
}

// 장(章) 대제목("Ⅱ. 실행계획")을 그 장의 첫 절 바로 위에 한 번 보여준다. LH
// 정형 사업개요 페이지의 chapterTitle과 동일한 크기(size 32)로 맞춰, "Ⅰ.안전
// 보건관리 체계"(정형 페이지가 이미 보여줌)와 시각적으로 같은 급의 제목처럼
// 보이게 한다.
function chapterHeading(roman: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({ text: `${roman}. ${title}`, bold: true, size: 32, font: FONT })],
  });
}

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

// section.tables 렌더링(위 sections.forEach 안)과 buildWorkforcePlanGroupsBlocks가
// 똑같은 표 스타일(좁은 컬럼 가운데 정렬, 넓은 서술형 컬럼 왼쪽 정렬)을 공유해야
// 해서 함수로 뺐다.
function buildGenericTable(headers: string[], rows: string[][]): Table {
  const columnCount = headers.length || rows[0]?.length || 1;
  const widths = computeColumnWidths(headers.length ? headers : rows[0] ?? [], columnCount);
  const tableRows: TableRow[] = [];

  if (headers.length > 0) {
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (h, i) =>
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
          (cell, i) =>
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

  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED });
}

// "위험성평가 실시규정"의 서식1(교육일지)·서식2(회의록) — 실제 LH 샘플(143~145p)의
// 담당/결재/소장 서명란 + 현장명·장소·일시 등 라벨/값 병합표를 그대로 재현한다.
// docx.js는 세로 병합(rowSpan)을 "위 칸 verticalMerge:RESTART + 아래 칸
// verticalMerge:CONTINUE" 조합으로 표현하므로, 결재란 아래 칸에도(내용은 비지만)
// 반드시 실제 TableCell을 둬야 한다 — 생략하면 열 개수가 안 맞아 표가 깨진다.
function riskFormLabelCell(text: string): TableCell {
  return new TableCell({
    width: { size: 15, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: "F3F4F6" },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, font: FONT })] }),
    ],
  });
}

function riskFormValueCell(lines: string[], opts: { columnSpan?: number; small?: boolean } = {}): TableCell {
  const size = opts.small ? 16 : 18;
  // columnSpan:3(안건/교육내용/협의사항 행)은 라벨 1칸을 제외한 나머지 전체
  // (값 35% + 라벨 15% + 값 35% = 85%)를 차지해야 한다 — 항상 35%로 고정하면
  // 그 행만 폭 합이 100%에 못 미쳐(15+35=50%) 다른 행과 어긋나 보인다.
  const width = opts.columnSpan === 3 ? 85 : 35;
  return new TableCell({
    columnSpan: opts.columnSpan,
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    children: lines.map(
      (line, i) =>
        new Paragraph({
          spacing: { after: i === lines.length - 1 ? 0 : 40 },
          children: [new TextRun({ text: line || "(미입력)", size, font: FONT })],
        })
    ),
  });
}

// 담당/결재/소장 서명란(5열: 제목 2열 병합+결재 1열 병합+담당 1열+소장 1열)과
// 아래 현장명·장소·일시 등 라벨/값 표(4열: 라벨/값/라벨/값)는 열 구성 자체가
// 다르다(5열 vs 4열) — docx.js Table 하나 안에서 행마다 columnSpan 합이 다르면
// (예전엔 5열 행에 너비를 안 줘서) Word가 그리드를 못 맞춰 마지막 칸(담당·소장)이
// 표 밖으로 밀려나는 실제 버그가 있었다. 표를 아예 2개로 나누고 각각 자기
// 그리드에 맞는 너비를 명시해 이 문제를 없앤다.
function buildRiskFormApprovalTable(title: string): Table {
  const headerCell = (text: string, columnSpan: number | undefined, width: number, verticalMerge?: "restart" | "continue") =>
    new TableCell({
      columnSpan,
      verticalMerge: verticalMerge ? (verticalMerge === "restart" ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE) : undefined,
      width: { size: width, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: "F3F4F6" },
      borders: CELL_BORDERS,
      margins: CELL_MARGINS,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: text ? [new TextRun({ text, bold: true, size: text === title ? 22 : 18, font: FONT })] : [],
        }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          headerCell(title, 2, 44, "restart"),
          headerCell("결재", undefined, 12, "restart"),
          headerCell("담당", undefined, 22),
          headerCell("소장", undefined, 22),
        ],
      }),
      new TableRow({
        children: [
          headerCell("", 2, 44, "continue"),
          headerCell("", undefined, 12, "continue"),
          headerCell("", undefined, 22),
          headerCell("", undefined, 22),
        ],
      }),
    ],
  });
}

function buildRiskFormInfoTable(
  rows: [string, string, string, string][],
  contentLabel: string,
  contentText: string
): Table {
  const tableRows: TableRow[] = [];

  for (const [label1, value1, label2, value2] of rows) {
    if (label2 === "") {
      // 안건/교육내용/협의사항처럼 값 칸이 나머지 3칸을 다 차지하는 행.
      tableRows.push(
        new TableRow({
          children: [riskFormLabelCell(label1), riskFormValueCell(value1.split("\n"), { columnSpan: 3 })],
        })
      );
    } else {
      tableRows.push(
        new TableRow({
          children: [
            riskFormLabelCell(label1),
            riskFormValueCell(value1.split("\n")),
            riskFormLabelCell(label2),
            riskFormValueCell(value2.split("\n")),
          ],
        })
      );
    }
  }

  tableRows.push(
    new TableRow({
      children: [riskFormLabelCell(contentLabel), riskFormValueCell(contentText.split("\n"), { columnSpan: 3, small: true })],
    })
  );

  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED });
}

// 서식1·2의 참여자 명단 표(직책/성명/서명/사진)는 section.tables[0]/[1]로 이미
// 추출돼 있으므로(wizardExport.ts, data-workforce-table 기반) buildGenericTable로
// 그대로 그린다 — "서명"·"사진" 칸은 빈 문자열로 와서 인쇄용 빈 칸이 된다.
function buildRiskAssessmentFormsBlocks(
  formFields: RiskAssessmentFormFieldsData,
  projectTitle: string,
  eduParticipants: { headers: string[]; rows: string[][] } | undefined,
  meetingParticipants: { headers: string[]; rows: string[][] } | undefined
): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  blocks.push(
    new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: "서식 1. 위험성평가 교육일지", bold: true, size: 22, font: FONT })],
    })
  );
  blocks.push(buildRiskFormApprovalTable("위험성평가 교육일지"));
  blocks.push(
    buildRiskFormInfoTable(
      [
        ["현장명", projectTitle, "교육장소", formFields.eduLocation],
        ["교육일시", formFields.eduDatetime, "교육종류", formFields.eduType || "위험성 평가교육"],
        ["교육대상", "위험성평가 참여자\n(현장소장, 관리감독자, 근로자 등)", "교육강사", formFields.eduInstructor],
      ],
      "교육내용",
      RISK_ASSESSMENT_FORM_1_CONTENT_TEXT
    )
  );
  blocks.push(new Paragraph({ spacing: { before: 160, after: 200 }, children: [] }));
  if (eduParticipants?.rows.length) {
    blocks.push(buildGenericTable(eduParticipants.headers, eduParticipants.rows));
  }

  blocks.push(
    new Paragraph({
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: "서식 2. 위험성평가 회의록", bold: true, size: 22, font: FONT })],
    })
  );
  blocks.push(buildRiskFormApprovalTable("위험성평가 회의록"));
  blocks.push(
    buildRiskFormInfoTable(
      [
        ["현장명", projectTitle, "회의장소", formFields.meetingLocation],
        ["회의일시", formFields.meetingDatetime, "평가종류", formFields.meetingType || "최초위험성평가"],
        ["안건", formFields.meetingAgenda || "위험성평가 실시규정 및 최초위험성평가서 작성 등", "", ""],
      ],
      "협의사항",
      RISK_ASSESSMENT_FORM_2_CONTENT_TEXT
    )
  );
  blocks.push(new Paragraph({ spacing: { before: 160, after: 200 }, children: [] }));
  if (meetingParticipants?.rows.length) {
    blocks.push(buildGenericTable(meetingParticipants.headers, meetingParticipants.rows));
  }

  return blocks;
}

// "작업투입 인력 인적사항"의 3개 소서식(안전취약근로자 식별/화재감시자 등 지정/
// 2인1조 편성표)을 각각 번호("1.","2.","3.")·목적(대상) 안내문·기준표(있으면)·
// 관리대장(명단/편성표)을 순서대로 보여준다. 이 절 전체의 바깥 소제목(예: "1.
// 작업투입 인력 인적사항")과는 별개로, 소서식 자체의 번호는 항상 1부터 다시
// 매긴다(section_order와 무관하게 이 절 안에서만 의미 있는 하위 번호).
function buildWorkforcePlanGroupsBlocks(groups: WorkforcePlanGroup[]): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  groups.forEach((group, i) => {
    blocks.push(
      new Paragraph({
        spacing: { before: i === 0 ? 0 : 300, after: 120 },
        children: [new TextRun({ text: `${i + 1}. ${group.title}`, bold: true, size: 22, font: FONT })],
      })
    );
    if (group.intro) {
      blocks.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: group.intro, size: 18, font: FONT })],
        })
      );
    }
    if (group.criteriaTable) {
      blocks.push(buildGenericTable(group.criteriaTable.headers, group.criteriaTable.rows));
      blocks.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }));
    }
    blocks.push(buildGenericTable(group.table.headers, group.table.rows));
  });
  return blocks;
}

// "현장 안전보건 실행계획"(sec-execution)의 2개 선택항목을 토글이 켜진 것만
// 순서대로 보여준다(발주처 특기시방서에 없는 조항은 위저드 화면에서 토글을
// 꺼서 출력물에서 통째로 제외할 수 있다는 안내와 일치시킨 동작).
function buildExecutionOptionsBlocks(data: ExecutionOptionsData): Paragraph[] {
  const blocks: Paragraph[] = [];
  let n = 0;
  if (data.machineryEnabled) {
    n += 1;
    blocks.push(
      new Paragraph({
        spacing: { before: n === 1 ? 0 : 300, after: 120 },
        children: [new TextRun({ text: `${n}. 건설기계·장비 안전검사 관리`, bold: true, size: 22, font: FONT })],
      })
    );
    if (data.machineryIntro) {
      blocks.push(
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: data.machineryIntro, size: 18, font: FONT })] })
      );
    }
    blocks.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: `등록 장비 ${data.machineryCount || "(미입력)"} 등록 완료 · 검사증 ${data.machineryCertAttached ? "첨부확인" : "미첨부"}`,
            size: 18,
            font: FONT,
          }),
        ],
      })
    );
  }
  if (data.councilEnabled) {
    n += 1;
    blocks.push(
      new Paragraph({
        spacing: { before: n === 1 ? 0 : 300, after: 120 },
        children: [new TextRun({ text: `${n}. 하도급 협력업체 협의체 운영`, bold: true, size: 22, font: FONT })],
      })
    );
    if (data.councilText) {
      blocks.push(
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: data.councilText, size: 18, font: FONT })] })
      );
    }
    blocks.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "※ 월 1회 정기회의록을 작성·보관한다.", size: 16, font: FONT, color: "6b7280" })],
      })
    );
  }
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
    ...buildLhSubmissionLetter(cover),
  ];
}

// 실제 LH 표지 샘플(화성동탄(2))의 표지 다음 장에 그대로 나오는 "제출문" 페이지.
// 정보 표(공사명/기간/금액 등)를 나열하는 위 표지와 달리, 문장형 수신문으로
// "귀사 발주공사인 "OOO" 수행을 위해..."라고 쓰고 발주처를 "OO 사장 귀하"로
// 부른다(K-water의 "OO 귀하"와 다른 LH만의 문구 — kwater_standard와 별도 함수).
function buildLhSubmissionLetter(cover: CoverPageData): Paragraph[] {
  return [
    new Paragraph({ spacing: { after: 900 }, children: [] }),
    new Paragraph({
      spacing: { after: 900 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "제 출 문", bold: true, size: 32, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 900, line: 360 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `귀사 발주공사인 "${cover.projectName || "(미입력)"}" 수행을 위해 아래와 같이 안전보건관리계획서를 제출합니다.`,
          size: 22,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 500, after: 900 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: formatSubmitYearMonth(cover.submitDate), size: 22, font: FONT })],
    }),
    new Paragraph({
      indent: { left: 1800 },
      spacing: { after: 300 },
      children: [new TextRun({ text: `업 체 명 : ${cover.companyName || "(미입력)"}`, size: 22, font: FONT })],
    }),
    new Paragraph({
      indent: { left: 1800 },
      spacing: { after: 900 },
      children: [new TextRun({ text: `대표이사 : ${cover.writerName || ""}`, size: 22, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${cover.agency || "발주기관"} 사장 귀하`, bold: true, size: 24, font: FONT })],
    }),
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
function buildManagementPolicyImagePage(imageBuffer: Buffer, number: number): (Paragraph | Table)[] {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return [
      numberedSectionHeading(number, "안전보건 경영방침 및 목표"),
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
    numberedSectionHeading(number, "안전보건 경영방침 및 목표"),
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

function buildManagementPolicyStandardPage(data: ManagementPolicyData, number: number): (Paragraph | Table)[] {
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
    numberedSectionHeading(number, "안전보건 경영방침 및 목표"),
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
function buildOrgChartPage(data: OrgChartData, number: number): (Paragraph | Table)[] {
  return [
    numberedSectionHeading(number, "안전보건관리 조직구성"),
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
  orgChart?: OrgChartData,
  // section_order 기준 장(章) 내 순번(agencyTemplates.computeSectionOrderNumbers).
  // 없으면(공통 6대 목차만 쓰는 일반 문서) 문서 전체를 훑는 연속 번호로 대체한다.
  managementPolicyNumber?: number,
  orgChartNumber?: number,
  sectionOrder: SectionOrderGroup[] = []
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  const chapters = computeSectionOrderChapters(sectionOrder);
  // 장(章)이 바뀔 때마다 "Ⅱ. 실행계획" 같은 대제목을 한 번씩 보여준다. Ⅰ장은
  // 정형 사업개요 페이지가 이미 자기 chapterTitle로 보여주므로(overviewPage가
  // 있을 때만), lastChapterRoman을 미리 그 장의 로마숫자로 초기화해 같은 대제목이
  // 안전보건 경영방침/조직구성 앞에 또 나오지 않게 한다.
  let lastChapterRoman: string | undefined = overviewPage ? chapters["overview"]?.roman : undefined;

  if (cover) {
    const render = COVER_RENDERERS[coverStyle] ?? buildGenericCover;
    children.push(...render(cover));
  }

  if (overviewPage && overviewPageStyle) {
    const render = OVERVIEW_PAGE_RENDERERS[overviewPageStyle];
    if (render) children.push(...render(overviewPage));
  }

  let nextHeadingNumber = overviewPage ? 2 : 1;
  if (managementPolicy) {
    const chapter = chapters["management-policy"];
    if (chapter && chapter.roman !== lastChapterRoman) {
      children.push(chapterHeading(chapter.roman, chapter.title));
      lastChapterRoman = chapter.roman;
    }
    const number = managementPolicyNumber ?? nextHeadingNumber;
    if (managementPolicy.mode === "image" && managementPolicyImage) {
      children.push(...buildManagementPolicyImagePage(managementPolicyImage, number));
    } else {
      children.push(...buildManagementPolicyStandardPage(managementPolicy, number));
    }
    nextHeadingNumber += 1;
  }

  if (orgChart) {
    const chapter = chapters["org_chart"];
    if (chapter && chapter.roman !== lastChapterRoman) {
      children.push(chapterHeading(chapter.roman, chapter.title));
      lastChapterRoman = chapter.roman;
    }
    children.push(...buildOrgChartPage(orgChart, orgChartNumber ?? nextHeadingNumber));
    nextHeadingNumber += 1;
  }

  // 소제목 번호는 각 절의 headingNumber(section_order 기준 장 내 순번, 예: Ⅱ장
  // "안전보건교육 계획"은 그 장의 첫 절이라 "1."로 다시 시작)를 우선 쓰고, 값이
  // 없으면(공통 6대 목차만 쓰는 일반 문서) nextHeadingNumber를 이어서 매긴다.
  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (section.chapterRoman && section.chapterRoman !== lastChapterRoman) {
      children.push(chapterHeading(section.chapterRoman, section.chapterTitle ?? ""));
      lastChapterRoman = section.chapterRoman;
    }

    const headingNumber = section.headingNumber ?? nextHeadingNumber;
    // "작업투입 인력 인적사항"은 이 절 하나가 소서식 3개(안전취약근로자 식별/
    // 화재감시자 등 지정/2인1조 편성표)를 묶은 것이라, 이 절 자체의 번호 소제목을
    // 또 찍으면 바로 뒤에 "1. 안전취약근로자..."가 이어져 번호가 1,1,2,3처럼
    // 겹쳐 보인다 — workforcePlanGroups가 있으면 이 절의 소제목은 생략하고
    // (章 대제목만으로 어느 절인지 알 수 있음) 소서식 번호(1,2,3)만 보여준다.
    if (!section.workforcePlanGroups?.length) {
      children.push(numberedSectionHeading(headingNumber, section.heading));
    }
    nextHeadingNumber = headingNumber + 1;

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
      // "위험성평가 실시규정"의 "4. 조직의 구성"은 실제 샘플처럼 박스+화살표
      // 다이어그램으로 그린다 — "3. 용어의 정의" 바로 뒤(실제 문서와 같은 위치)에
      // 끼워 넣는다.
      if (field.label === "3. 용어의 정의" && section.riskAssessmentOrgChart) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: "4. 조직의 구성", bold: true, size: 22, font: FONT })],
          })
        );
        children.push(...buildEmergencyTeamDiagram(section.riskAssessmentOrgChart));
      }
    }

    if (section.riskAssessmentFormFields) {
      // 서식1·2 참여자 명단 표(section.tables[0]/[1])는 아래 buildRiskAssessmentFormsBlocks가
      // 정보 병합표와 함께 순서대로 직접 그리므로, 여기서는 일반 표로 중복 출력하지 않는다.
      children.push(
        ...buildRiskAssessmentFormsBlocks(
          section.riskAssessmentFormFields,
          cover?.projectName || title,
          section.tables[0],
          section.tables[1]
        )
      );
    } else {
      for (const t of section.tables) {
        if (t.rows.length === 0) continue;
        children.push(buildGenericTable(t.headers, t.rows));
        children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
      }
    }

    if (section.hazardDetailGroups?.length) {
      children.push(...buildHazardDetailGroupsBlocks(section.hazardDetailGroups));
    }

    if (section.workforcePlanGroups?.length) {
      children.push(...buildWorkforcePlanGroupsBlocks(section.workforcePlanGroups));
    }

    if (section.executionOptions) {
      children.push(...buildExecutionOptionsBlocks(section.executionOptions));
    }
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
