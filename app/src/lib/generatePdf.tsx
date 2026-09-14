import path from "path";
import type { ReactElement } from "react";
import { renderToBuffer, Document, Page, View, Text, Image, Svg, Rect, Line, StyleSheet, Font } from "@react-pdf/renderer";
import type { WizardSection, CoverPageData, OverviewPageData, ManagementPolicyData, OrgChartData, OrgChartNode } from "./wizardExport";
import type { CoverStyle } from "./agencyTemplates";
import { readImageDimensions } from "./imageDimensions";

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

// 임베드한 NotoSansKR TTF는 한글/기본 라틴 글리프는 갖고 있지만 로마숫자 기호
// 블록(Ⅰ~Ⅹ, U+2160~)은 포함하지 않아, 그대로 렌더링하면 엉뚱한 글리프로 깨진다
// (DOCX/HWPX는 워드/한글 프로그램 자체 폰트가 이 글자를 지원해 문제없음). PDF
// 전용으로만 안전한 ASCII 대체 문자로 바꿔준다.
const ROMAN_TO_ASCII: Record<string, string> = {
  Ⅰ: "I",
  Ⅱ: "II",
  Ⅲ: "III",
  Ⅳ: "IV",
  Ⅴ: "V",
  Ⅵ: "VI",
  Ⅶ: "VII",
  Ⅷ: "VIII",
  Ⅸ: "IX",
  Ⅹ: "X",
};
function pdfSafeText(s: string): string {
  return s.replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/g, (m) => ROMAN_TO_ASCII[m] ?? m);
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
  genericInfoLine: { textAlign: "center", marginBottom: 10 },
  // "Ⅰ.안전보건관리체계 / 1.사업개요" 정형 페이지 전용 스타일.
  overviewPage: { padding: 50, fontFamily: "NotoSansKR", fontSize: 11 },
  overviewChapterTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  overviewSubTitle: { fontSize: 13, fontWeight: "bold", marginLeft: 18, marginBottom: 16 },
  overviewBulletRow: { marginBottom: 10, paddingLeft: 36 },
  overviewBulletLabel: { fontWeight: "bold" },
  overviewSubBullet: { marginLeft: 54, marginBottom: 6 },
  // "안전보건 경영방침 및 목표" 전용 스타일.
  policyPage: { padding: 50, fontFamily: "NotoSansKR", fontSize: 10 },
  policyTitle: { fontSize: 15, fontWeight: "bold", textAlign: "center", textDecoration: "underline", marginBottom: 20 },
  policySubTitle: { fontSize: 12, fontWeight: "bold", textDecoration: "underline", marginBottom: 10 },
  policyShadedBox: {
    backgroundColor: "#f3f4f6",
    border: "1pt solid #d4d4d4",
    borderRadius: 4,
    paddingVertical: 10,
    marginBottom: 14,
  },
  policyShadedText: { textAlign: "center", fontWeight: "bold", textDecoration: "underline" },
  policyBody: { lineHeight: 1.6, marginBottom: 12 },
  policyBullet: { marginBottom: 6, lineHeight: 1.5 },
  policyImagePage: { padding: 20, alignItems: "center", justifyContent: "center" },
});

// 공공 제출서식 표지는 대부분 제목을 테두리 박스로 감싸서 강조한다 — 발주처
// 스타일과 무관하게 재사용하는 공통 요소.
function TitleBox({ text }: { text: string }) {
  return (
    <View style={styles.coverTitleBox}>
      <Text style={styles.coverTitleText}>{text}</Text>
    </View>
  );
}

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
      <TitleBox text="안 전 보 건 관 리 계 획 서" />
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

// 아직 실제 표지 샘플을 확보하지 못한 발주처를 위한 범용 표지. LH처럼 정보를
// 표(테두리 있는 라벨/값 칸)로 나누지는 않지만, 제목만큼은 공공 제출서식 표지의
// 관례대로 테두리 박스로 감싸 격식을 갖춘다.
function GenericCoverPage({ cover }: { cover: CoverPageData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <TitleBox text="안전보건관리계획서" />
      <View style={{ marginTop: 32 }} />
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

// LH가 실제로 요구하는 "Ⅰ.안전보건관리체계 / 1.사업개요" 정형 페이지를 그대로
// 재현한다: 대제목-소제목, □ 체크박스 불릿, 주요내용 하위 "-." 불릿까지 실제
// 서식과 동일한 배치로 맞춘다.
function LhOverviewPage({ data }: { data: OverviewPageData }) {
  return (
    <Page size="A4" style={styles.overviewPage}>
      <Text style={styles.overviewChapterTitle}>{pdfSafeText(data.chapterTitle)}</Text>
      <Text style={styles.overviewSubTitle}>1. 사업개요</Text>
      <Text style={styles.overviewBulletRow}>
        <Text style={styles.overviewBulletLabel}>- 사 업 명 : </Text>
        {data.projectName || "(미입력)"}
      </Text>
      <Text style={styles.overviewBulletRow}>
        <Text style={styles.overviewBulletLabel}>- 사업기간 : </Text>
        {data.period || "(미입력)"}
      </Text>
      <Text style={styles.overviewBulletRow}>
        <Text style={styles.overviewBulletLabel}>- 사업금액 : </Text>
        {data.contractAmount || "(미입력)"}
      </Text>
      <Text style={styles.overviewBulletRow}>
        <Text style={styles.overviewBulletLabel}>- 위    치 : </Text>
        {data.location || "(미입력)"}
      </Text>
      <Text style={styles.overviewBulletRow}>
        <Text style={styles.overviewBulletLabel}>- 주요내용 :</Text>
      </Text>
      {data.mainContentLines.length ? (
        data.mainContentLines.map((line, idx) => (
          <Text key={idx} style={styles.overviewSubBullet}>
            -. {line}
          </Text>
        ))
      ) : (
        <Text style={styles.overviewSubBullet}>-. (미입력)</Text>
      )}
    </Page>
  );
}

const OVERVIEW_PAGE_COMPONENTS: Record<string, (props: { data: OverviewPageData }) => ReactElement> = {
  lh_standard: LhOverviewPage,
};

// "안전보건 경영방침 및 목표": 회사가 자체 이미지를 첨부했으면 그 이미지를 페이지
// 폭에 맞춰 원본 비율대로 삽입하고, 아니면 실제 LH 표준 문구 서식(음영 박스
// 2곳만 회사 입력값, 나머지는 고정 문구 + 회사명 자동 치환)을 그대로 재현한다.
function ManagementPolicyImagePage({ imageBuffer }: { imageBuffer: Buffer }) {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return (
      <Page size="A4" style={styles.policyPage}>
        <Text>
          첨부된 안전보건경영방침 이미지 형식을 지원하지 않아 표시할 수 없습니다. PNG 또는 JPEG로 다시 업로드해
          주세요.
        </Text>
      </Page>
    );
  }
  const mime = isPng ? "image/png" : "image/jpeg";
  const dataUri = `data:${mime};base64,${imageBuffer.toString("base64")}`;
  const maxWidth = 500;
  const maxHeight = 700;
  const scale = Math.min(1, maxWidth / dims.width, maxHeight / dims.height);
  return (
    <Page size="A4" style={styles.policyImagePage}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is a PDF-embed primitive (no alt prop), not an HTML <img> */}
      <Image src={dataUri} style={{ width: dims.width * scale, height: dims.height * scale }} />
    </Page>
  );
}

function ManagementPolicyStandardPage({ data }: { data: ManagementPolicyData }) {
  return (
    <Page size="A4" style={styles.policyPage}>
      <Text style={styles.policyTitle}>안전보건 경영방침 및 목표</Text>
      <Text style={styles.policySubTitle}>가. 안전보건 경영방침</Text>
      <View style={styles.policyShadedBox}>
        <Text style={styles.policyShadedText}>{data.slogan || "(미입력)"}</Text>
      </View>
      <Text style={styles.policyBody}>{data.bodyParagraph}</Text>
      {data.bullets.map((b, idx) => (
        <Text key={idx} style={styles.policyBullet}>
          - {b}
        </Text>
      ))}
      <Text style={[styles.policySubTitle, { marginTop: 10 }]}>나. 안전보건 목표</Text>
      <View style={styles.policyShadedBox}>
        <Text style={styles.policyShadedText}>{data.goal || "(미입력)"}</Text>
      </View>
    </Page>
  );
}

// "안전보건관리 조직구성"을 실제 조직도 다이어그램(박스+연결선)으로 그린다.
// react-pdf의 Svg 프리미티브(Rect/Line/Text)로 직접 벡터 도형을 그리므로 별도
// 이미지 파일 없이도 항상 선명하게 출력된다.
const ORG_BOX_W = 170;
const ORG_BOX_H = 46;
function OrgChartBox({ x, y, node }: { x: number; y: number; node: OrgChartNode }) {
  const cx = x + ORG_BOX_W / 2;
  return (
    <>
      <Rect x={x} y={y} width={ORG_BOX_W} height={ORG_BOX_H} fill="#ffffff" stroke="#1e3a5f" strokeWidth={1.2} rx={4} />
      {/* react-pdf의 SVG Text는 Page에 지정한 fontFamily를 상속하지 않고 기본
          내장 폰트(한글 글리프 없음)로 떨어지므로, 매번 명시적으로 NotoSansKR을
          지정해야 한다(빠뜨리면 한글이 깨진 글리프로 출력됨 — 실제로 겪은 문제).
          fontSize/fontWeight/fontFamily는 공식 타입(SVGPresentationAttributes)에는
          없지만 런타임에서는 지원되는 값이라 캐스팅이 필요하다. */}
      <Text
        x={cx}
        y={y + 17}
        textAnchor="middle"
        style={{ fontSize: 9, fontWeight: "bold", fontFamily: "NotoSansKR" } as never}
        fill="#1e3a5f"
      >
        {node.role}
      </Text>
      <Text x={cx} y={y + 30} textAnchor="middle" style={{ fontSize: 8, fontFamily: "NotoSansKR" } as never} fill="#374151">
        {node.name || "(미입력)"}
      </Text>
      <Text x={cx} y={y + 41} textAnchor="middle" style={{ fontSize: 7, fontFamily: "NotoSansKR" } as never} fill="#6b7280">
        {node.contact || "(미입력)"}
      </Text>
    </>
  );
}

function OrgChartPage({ data }: { data: OrgChartData }) {
  const topY = 20;
  const midY = 110;
  const botY = 200;
  const leftX = 30;
  const rightX = 300;
  const centerX = 165;
  const topLeftCx = leftX + ORG_BOX_W / 2;
  const topRightCx = rightX + ORG_BOX_W / 2;
  const midCx = centerX + ORG_BOX_W / 2;
  const botLeftCx = leftX + ORG_BOX_W / 2;
  const botRightCx = rightX + ORG_BOX_W / 2;

  return (
    <Page size="A4" style={styles.policyPage}>
      <Text style={styles.policyTitle}>안전보건관리 조직구성</Text>
      <Text style={[styles.policySubTitle, { marginBottom: 16 }]}>나. 현장 사업소 조직도(임무 및 비상연락망 포함)</Text>
      <Svg width="100%" height={260} viewBox="0 0 500 260">
        <Line x1={topLeftCx} y1={topY + ORG_BOX_H} x2={midCx} y2={midY} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={topRightCx} y1={topY + ORG_BOX_H} x2={midCx} y2={midY} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={midCx} y1={midY + ORG_BOX_H} x2={botLeftCx} y2={botY} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={midCx} y1={midY + ORG_BOX_H} x2={botRightCx} y2={botY} stroke="#9ca3af" strokeWidth={1} />
        <OrgChartBox x={leftX} y={topY} node={data.siteManager} />
        <OrgChartBox x={rightX} y={topY} node={data.safetyManager} />
        <OrgChartBox x={centerX} y={midY} node={data.supervisor} />
        <OrgChartBox x={leftX} y={botY} node={data.team1} />
        <OrgChartBox x={rightX} y={botY} node={data.team2} />
      </Svg>
      <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 12 }}>※ 위 선임 기술인력은 변경될 수 있습니다.</Text>
    </Page>
  );
}

export async function generateWizardPdf(
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
  ensureFontsRegistered();

  const CoverPageComponent = COVER_PAGE_COMPONENTS[coverStyle] ?? GenericCoverPage;
  const OverviewPageComponent = overviewPageStyle ? OVERVIEW_PAGE_COMPONENTS[overviewPageStyle] : undefined;

  const doc = (
    <Document>
      {cover && <CoverPageComponent cover={cover} />}
      {overviewPage && OverviewPageComponent && <OverviewPageComponent data={overviewPage} />}
      {managementPolicy && managementPolicy.mode === "image" && managementPolicyImage && (
        <ManagementPolicyImagePage imageBuffer={managementPolicyImage} />
      )}
      {managementPolicy && !(managementPolicy.mode === "image" && managementPolicyImage) && (
        <ManagementPolicyStandardPage data={managementPolicy} />
      )}
      {orgChart && <OrgChartPage data={orgChart} />}
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
