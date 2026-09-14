import path from "path";
import type { ReactElement } from "react";
import { renderToBuffer, Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { WizardSection, CoverPageData } from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";

// Noto Sans KR (SIL Open Font License — free to embed/redistribute), downloaded once
// from Google Fonts' static TTF endpoint. @react-pdf/renderer's default fonts
// (Helvetica 등) have no Hangul glyphs, so without this every 한글 character in the
// generated PDF would render as blank boxes.
let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  const fontsDir = path.join(process.cwd(), "src", "assets", "fonts");
  Font.register({
    family: "NotoSansKR",
    fonts: [
      { src: path.join(fontsDir, "NotoSansKR-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontsDir, "NotoSansKR-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSansKR", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  heading: { fontSize: 14, fontWeight: "bold", marginBottom: 14, borderBottom: "2pt solid #1e3a5f", paddingBottom: 6 },
  fieldRow: { flexDirection: "row", marginBottom: 6 },
  fieldLabel: { fontWeight: "bold", width: 140 },
  fieldValue: { flex: 1 },
  table: { marginTop: 12, border: "1pt solid #ccc" },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #ccc" },
  tableHeaderCell: { flex: 1, padding: 5, fontWeight: "bold", backgroundColor: "#f3f4f6", fontSize: 9 },
  tableCell: { flex: 1, padding: 5, fontSize: 9 },
  // 표지(cover page) 전용 스타일 — LH 등 공공발주처 표준 표지 양식 재현.
  coverPage: { padding: 60, fontFamily: "NotoSansKR", fontSize: 11, justifyContent: "center" },
  coverTitleBox: {
    border: "1.5pt solid #1e3a5f",
    paddingVertical: 24,
    marginBottom: 32,
    alignSelf: "center",
    paddingHorizontal: 40,
  },
  coverTitleText: { fontSize: 22, fontWeight: "bold", textAlign: "center", letterSpacing: 4 },
  coverTable: { border: "1pt solid #999", marginBottom: 60 },
  coverTableRow: { flexDirection: "row", borderBottom: "1pt solid #999" },
  coverLabelCell: {
    width: "30%",
    padding: 8,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    textAlign: "center",
    borderRight: "1pt solid #999",
  },
  coverValueCell: { width: "70%", padding: 8, textAlign: "center" },
  coverDate: { textAlign: "center", fontSize: 12, marginBottom: 24 },
  coverAgency: { textAlign: "center", fontSize: 15, fontWeight: "bold", marginBottom: 24 },
  coverCompany: { textAlign: "center", fontSize: 13, fontWeight: "bold", marginBottom: 32 },
  approvalTable: { border: "1pt solid #999", alignSelf: "center", width: "80%" },
  approvalRow: { flexDirection: "row", borderBottom: "1pt solid #999" },
  approvalHeaderCell: {
    flex: 1,
    padding: 8,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    textAlign: "center",
    borderRight: "1pt solid #999",
  },
  approvalCell: { flex: 1, padding: 8, textAlign: "center", borderRight: "1pt solid #999", minHeight: 26 },
  genericTitle: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 40 },
  genericInfoLine: { textAlign: "center", marginBottom: 10 },
});

// 결재란(작성/검토/승인)은 발주처와 무관하게 공공 제출서식 어디서나 쓰이는
// 공통 요소라 스타일 구분 없이 재사용한다.
function ApprovalTable({ cover }: { cover: CoverPageData }) {
  return (
    <View style={styles.approvalTable}>
      <View style={styles.approvalRow}>
        <Text style={styles.approvalHeaderCell}>구 분</Text>
        <Text style={styles.approvalHeaderCell}>작성자</Text>
        <Text style={styles.approvalHeaderCell}>검토자</Text>
        <Text style={[styles.approvalHeaderCell, { borderRight: "none" }]}>승인자</Text>
      </View>
      <View style={styles.approvalRow}>
        <Text style={styles.approvalHeaderCell}>직 책</Text>
        <Text style={styles.approvalCell}></Text>
        <Text style={styles.approvalCell}></Text>
        <Text style={[styles.approvalCell, { borderRight: "none" }]}></Text>
      </View>
      <View style={styles.approvalRow}>
        <Text style={styles.approvalHeaderCell}>성 명</Text>
        <Text style={styles.approvalCell}>{cover.writerName}</Text>
        <Text style={styles.approvalCell}></Text>
        <Text style={[styles.approvalCell, { borderRight: "none" }]}></Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Text style={styles.approvalHeaderCell}>서 명</Text>
        <Text style={styles.approvalCell}></Text>
        <Text style={styles.approvalCell}></Text>
        <Text style={[styles.approvalCell, { borderRight: "none" }]}></Text>
      </View>
    </View>
  );
}

// LH가 실제로 요구하는 표준 표지. 다른 발주처의 실제 표지 샘플이 확보되면
// 이 컴포넌트 옆에 XxxCoverPage를 추가하고 COVER_PAGE_COMPONENTS에 등록한다.
function LhStandardCoverPage({ cover }: { cover: CoverPageData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverTitleBox}>
        <Text style={styles.coverTitleText}>안 전 보 건 관 리 계 획 서</Text>
      </View>
      <View style={styles.coverTable}>
        <View style={styles.coverTableRow}>
          <Text style={styles.coverLabelCell}>공 사(용 역) 명</Text>
          <Text style={styles.coverValueCell}>{cover.projectName || "(미입력)"}</Text>
        </View>
        <View style={styles.coverTableRow}>
          <Text style={styles.coverLabelCell}>공 사 기 간</Text>
          <Text style={styles.coverValueCell}>{cover.period || "(미입력)"}</Text>
        </View>
        <View style={styles.coverTableRow}>
          <Text style={styles.coverLabelCell}>도 급 금 액</Text>
          <Text style={styles.coverValueCell}>
            {cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : "(미입력)"}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.coverLabelCell}>계상된 안전관리비</Text>
          <Text style={styles.coverValueCell}>{cover.safetyBudget || "(미입력)"}</Text>
        </View>
      </View>
      <Text style={styles.coverDate}>{cover.submitDate}</Text>
      <Text style={styles.coverAgency}>{cover.agency || "발주기관"} 귀하</Text>
      <Text style={styles.coverCompany}>{cover.companyName || "(미입력)"}</Text>
      <ApprovalTable cover={cover} />
    </Page>
  );
}

// 아직 실제 표지 샘플을 확보하지 못한 발주처를 위한 범용 표지. 제목 박스나
// 표 테두리 같은 발주처 고유 장식 없이, 표지에 반드시 있어야 하는 정보만
// 담백하게 배치한다.
function GenericCoverPage({ cover }: { cover: CoverPageData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.genericTitle}>안전보건관리계획서</Text>
      <Text style={styles.genericInfoLine}>공사(용역)명 : {cover.projectName || "(미입력)"}</Text>
      <Text style={styles.genericInfoLine}>공사기간 : {cover.period || "(미입력)"}</Text>
      <Text style={styles.genericInfoLine}>
        도급금액 : {cover.contractAmount ? `${cover.contractAmount} (부가세 포함)` : "(미입력)"}
      </Text>
      <Text style={[styles.genericInfoLine, { marginBottom: 40 }]}>계상된 안전관리비 : {cover.safetyBudget || "(미입력)"}</Text>
      <Text style={styles.coverDate}>{cover.submitDate}</Text>
      <Text style={styles.coverAgency}>{cover.agency || "발주기관"} 귀하</Text>
      <Text style={styles.coverCompany}>{cover.companyName || "(미입력)"}</Text>
      <ApprovalTable cover={cover} />
    </Page>
  );
}

const COVER_PAGE_COMPONENTS: Record<CoverStyle, (props: { cover: CoverPageData }) => ReactElement> = {
  lh_standard: LhStandardCoverPage,
  generic: GenericCoverPage,
};

export async function generateWizardPdf(
  title: string,
  sections: WizardSection[],
  cover?: CoverPageData,
  coverStyle: CoverStyle = "generic"
): Promise<Buffer> {
  ensureFontsRegistered();

  const CoverPageComponent = COVER_PAGE_COMPONENTS[coverStyle] ?? GenericCoverPage;

  const doc = (
    <Document>
      {cover && <CoverPageComponent cover={cover} />}
      {sections.map((section, i) => (
        <Page key={section.id} size="A4" style={styles.page}>
          {i === 0 && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.heading}>{section.heading}</Text>
          {section.fields.map((f, idx) => (
            <View key={idx} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>{f.value || "(미입력)"}</Text>
            </View>
          ))}
          {section.table && section.table.rows.length > 0 && (
            <View style={styles.table}>
              {section.table.headers.length > 0 && (
                <View style={styles.tableRow}>
                  {section.table.headers.map((h, idx) => (
                    <Text key={idx} style={styles.tableHeaderCell}>
                      {h}
                    </Text>
                  ))}
                </View>
              )}
              {section.table.rows.map((row, rIdx) => (
                <View key={rIdx} style={styles.tableRow}>
                  {row.map((cell, cIdx) => (
                    <Text key={cIdx} style={styles.tableCell}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Page>
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
