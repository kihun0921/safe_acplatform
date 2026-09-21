import path from "path";
import { Fragment } from "react";
import type { ReactElement } from "react";
import { renderToBuffer, Document, Page, View, Text, Image, Svg, Rect, Line, StyleSheet, Font } from "@react-pdf/renderer";
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

// 임베드한 NotoSansKR TTF는 한글/기본 라틴 글리프는 갖고 있지만, 위저드 곳곳의
// 고정 문구가 실제로 쓰는 로마숫자(Ⅰ~Ⅹ)·※·○·℃·→·①~⑩ 등 여러 기호 글리프를
// 포함하지 않는다(fontkit으로 직접 확인함 — 전부 glyphId 0/.notdef). 이 글자가
// 문서에 그대로 들어가면 폭이 0인 미지원 글리프가 바로 다음 글자와 겹쳐 보이는
// 버그가 실제로 있었다(예: "○ 굴착작업 시"가 "危착작업 시"처럼 깨져 보임 —
// DOCX/HWPX는 워드/한글 프로그램 자체 폰트가 이 글자들을 지원해 문제없다). PDF
// 전용으로만 안전한 대체 문자로 바꿔준다.
const PDF_UNSAFE_CHAR_MAP: Record<string, string> = {
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
  "○": "•",
  "※": "*",
  "℃": "°C",
  "→": "->",
  "①": "(1)",
  "②": "(2)",
  "③": "(3)",
  "④": "(4)",
  "⑤": "(5)",
  "⑥": "(6)",
  "⑦": "(7)",
  "⑧": "(8)",
  "⑨": "(9)",
  "⑩": "(10)",
  "「": "[",
  "」": "]",
  "【": "[",
  "】": "]",
  "㎡": "m²",
  有: "",
};
const PDF_UNSAFE_CHAR_PATTERN = new RegExp(`[${Object.keys(PDF_UNSAFE_CHAR_MAP).join("")}]`, "g");
function pdfSafeText(s: string): string {
  return s.replace(PDF_UNSAFE_CHAR_PATTERN, (m) => PDF_UNSAFE_CHAR_MAP[m] ?? m);
}

// 위 치환을 <Text>가 나오는 자리마다 일일이 손으로 감싸면 언젠가 빠뜨리기
// 쉬우므로(실제로 이 버그가 그렇게 새어나갔다), sections/cover/overview/
// managementPolicy/orgChart/title을 렌더링 직전에 한 번에 깊이 순회해서 모든
// 문자열 값을 통째로 치환한다. accidentImages[].buffer 같은 이진 데이터는
// Buffer 그대로 두고 재귀하지 않는다.
function sanitizeForPdf<T>(value: T): T {
  if (typeof value === "string") return pdfSafeText(value) as unknown as T;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeForPdf(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForPdf(v);
    }
    return out as T;
  }
  return value;
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
  // 유해·위험 기계/차량/물질 관리계획: 항목(장비명·물질명)별 소표.
  hazardGroupName: { fontSize: 11, fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  hazardCategoryHeaderCell: {
    flex: 0.4,
    padding: 5,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    fontSize: 9,
    textAlign: "center",
  },
  hazardDetailHeaderCell: { flex: 1.6, padding: 5, fontWeight: "bold", backgroundColor: "#f3f4f6", fontSize: 9 },
  hazardCategoryCell: { flex: 0.4, padding: 5, fontSize: 9, fontWeight: "bold", textAlign: "center" },
  hazardDetailCell: { flex: 1.6, padding: 5, fontSize: 9 },
  hazardNote: { fontSize: 8, color: "#6b7280", marginTop: 4, marginBottom: 8 },
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
      <Text style={styles.overviewChapterTitle}>{data.chapterTitle}</Text>
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

// "재해발생 수준" 증빙자료(산재요양승인확인서/산업재해율 조회결과/안전보건경영
// 시스템 인증서) 첨부 이미지를 제목 + 이미지 그대로 한 페이지에 넣는다.
// ManagementPolicyImagePage와 로직은 같지만 여러 장이 나올 수 있고 각각 제목이
// 다르므로 별도 컴포넌트로 둔다.
function LabeledImagePage({ imageBuffer, label }: { imageBuffer: Buffer; label: string }) {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return (
      <Page size="A4" style={styles.policyPage}>
        <Text style={styles.policyTitle}>{label}</Text>
        <Text>첨부된 이미지 형식을 지원하지 않아 표시할 수 없습니다. PNG 또는 JPEG로 다시 업로드해 주세요.</Text>
      </Page>
    );
  }
  const mime = isPng ? "image/png" : "image/jpeg";
  const dataUri = `data:${mime};base64,${imageBuffer.toString("base64")}`;
  const maxWidth = 500;
  const maxHeight = 650;
  const scale = Math.min(1, maxWidth / dims.width, maxHeight / dims.height);
  return (
    <Page size="A4" style={styles.policyPage}>
      <Text style={[styles.policyTitle, { marginBottom: 16 }]}>{label}</Text>
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
function OrgChartBox({ x, y, node, width = ORG_BOX_W }: { x: number; y: number; node: OrgChartNode; width?: number }) {
  const cx = x + width / 2;
  return (
    <>
      <Rect x={x} y={y} width={width} height={ORG_BOX_H} fill="#ffffff" stroke="#1e3a5f" strokeWidth={1.2} rx={4} />
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

// 위저드 화면(WizardScreen)의 박스+연결선 다이어그램과 동일한 위계로 맞춘다 —
// 현장소장 → 안전관리자 → 관리감독자가 한 줄로 곧게 이어지고, 마지막에 작업
// 1·2팀장만 나란히 갈라진다(예전에는 현장소장·안전관리자가 나란히 있고
// 관리감독자로 합쳐지는 Y자 모양이라 화면과 다운로드 문서의 조직도가 서로
// 달랐다).
function OrgChartPage({ data }: { data: OrgChartData }) {
  const row1Y = 20;
  const row2Y = 96;
  const row3Y = 172;
  const row4Y = 258;
  const branchY = row3Y + ORG_BOX_H + (row4Y - (row3Y + ORG_BOX_H)) / 2;
  const centerX = 165;
  const leftX = 60;
  const rightX = 270;
  const centerCx = centerX + ORG_BOX_W / 2;
  const leftCx = leftX + ORG_BOX_W / 2;
  const rightCx = rightX + ORG_BOX_W / 2;

  return (
    <Page size="A4" style={styles.policyPage}>
      <Text style={styles.policyTitle}>안전보건관리 조직구성</Text>
      <Text style={[styles.policySubTitle, { marginBottom: 16 }]}>나. 현장 사업소 조직도(임무 및 비상연락망 포함)</Text>
      <Svg width="100%" height={320} viewBox="0 0 500 320">
        <Line x1={centerCx} y1={row1Y + ORG_BOX_H} x2={centerCx} y2={row2Y} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={centerCx} y1={row2Y + ORG_BOX_H} x2={centerCx} y2={row3Y} stroke="#9ca3af" strokeWidth={1} />
        {/* 관리감독자 → 작업 1·2팀장: 사선 대신 직각 꺾쇠(트렁크 → 가로 분기선 →
            좌우로 곧게 내려감) 형태로 그린다. */}
        <Line x1={centerCx} y1={row3Y + ORG_BOX_H} x2={centerCx} y2={branchY} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={leftCx} y1={branchY} x2={rightCx} y2={branchY} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={leftCx} y1={branchY} x2={leftCx} y2={row4Y} stroke="#9ca3af" strokeWidth={1} />
        <Line x1={rightCx} y1={branchY} x2={rightCx} y2={row4Y} stroke="#9ca3af" strokeWidth={1} />
        <OrgChartBox x={centerX} y={row1Y} node={data.siteManager} />
        <OrgChartBox x={centerX} y={row2Y} node={data.safetyManager} />
        <OrgChartBox x={centerX} y={row3Y} node={data.supervisor} />
        <OrgChartBox x={leftX} y={row4Y} node={data.team1} />
        <OrgChartBox x={rightX} y={row4Y} node={data.team2} />
      </Svg>
      <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 12 }}>* 위 선임 기술인력은 변경될 수 있습니다.</Text>
    </Page>
  );
}

// "중대산업재해 등 비상 상황시 조치계획"의 "1. 비상 대책반 구성"을 조직도와
// 동일한 박스+연결선 방식으로 그린다. OrgChartPage와 달리 안전관리자 아래에서
// 3개 팀으로 갈라지므로(트렁크 → 가로 분기선 → 3개 수직선) 박스 폭을 좁혀 한
// 줄에 배치하고, 맨 아래에 협력업체·근로자로 내려가는 선을 하나 더 그린다.
// 섹션 본문 중간(다른 표들과 같은 Page)에 들어가야 하므로 별도 <Page>가 아니라
// <Svg>만 반환한다.
const EMTEAM_BOX_W3 = 145;
// 유해·위험 기계/차량/물질 관리계획: 항목(장비명·물질명)별로 "관리계획/세부실행
// 계획" 표를 하나씩 둔다(실제 LH 샘플 서식과 동일). 예전엔 팝업의 세부실행계획
// textarea들이 일반 라벨+값 필드로 잡혀 어떤 장비·물질에 대한 내용인지 알 수
// 없는 서술형 텍스트가 항목 수만큼 나열되는 버그가 있었다.
function HazardDetailGroupsBlock({ groups }: { groups: HazardDetailGroup[] }) {
  return (
    <>
      {groups.map((group, gIdx) => (
        <View key={gIdx} wrap={false}>
          <Text style={styles.hazardGroupName}>{group.name}</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.hazardCategoryHeaderCell}>관리계획</Text>
              <Text style={styles.hazardDetailHeaderCell}>세부실행 계획</Text>
            </View>
            {group.entries.map((entry, eIdx) => (
              <View key={eIdx} style={styles.tableRow}>
                <Text style={styles.hazardCategoryCell}>{entry.category}</Text>
                <Text style={styles.hazardDetailCell}>{entry.detail}</Text>
              </View>
            ))}
          </View>
          {group.note && <Text style={styles.hazardNote}>비고(관계법령): {group.note}</Text>}
        </View>
      ))}
    </>
  );
}

function EmergencyTeamDiagram({ data }: { data: EmergencyTeamData }) {
  const row1Y = 10;
  const row2Y = 86;
  const branchY = 147;
  const row3Y = 162;
  const mergeY = 226;
  const noteY = 240;
  const centerX = 165;
  const centerCx = centerX + ORG_BOX_W / 2;
  const gap3 = 15;
  const totalW3 = EMTEAM_BOX_W3 * 3 + gap3 * 2;
  const x1 = (500 - totalW3) / 2;
  const x2 = x1 + EMTEAM_BOX_W3 + gap3;
  const x3 = x2 + EMTEAM_BOX_W3 + gap3;
  const cx1 = x1 + EMTEAM_BOX_W3 / 2;
  const cx2 = x2 + EMTEAM_BOX_W3 / 2;
  const cx3 = x3 + EMTEAM_BOX_W3 / 2;

  return (
    <Svg width="100%" height={260} viewBox="0 0 500 260">
      <Line x1={centerCx} y1={row1Y + ORG_BOX_H} x2={centerCx} y2={row2Y} stroke="#9ca3af" strokeWidth={1} />
      {/* 안전관리자 → 통제반/구조·후송·복구반/지원반: 사선이 아니라 트렁크(수직) →
          가로 분기선 → 좌우로 곧게 내려가는 직각 꺾쇠로 그린다. */}
      <Line x1={centerCx} y1={row2Y + ORG_BOX_H} x2={centerCx} y2={branchY} stroke="#9ca3af" strokeWidth={1} />
      <Line x1={cx1} y1={branchY} x2={cx3} y2={branchY} stroke="#9ca3af" strokeWidth={1} />
      <Line x1={cx1} y1={branchY} x2={cx1} y2={row3Y} stroke="#9ca3af" strokeWidth={1} />
      <Line x1={cx2} y1={branchY} x2={cx2} y2={row3Y} stroke="#9ca3af" strokeWidth={1} />
      <Line x1={cx3} y1={branchY} x2={cx3} y2={row3Y} stroke="#9ca3af" strokeWidth={1} />
      <Line x1={cx2} y1={row3Y + ORG_BOX_H} x2={cx2} y2={mergeY} stroke="#9ca3af" strokeWidth={1} />
      <OrgChartBox x={centerX} y={row1Y} node={data.chief} />
      <OrgChartBox x={centerX} y={row2Y} node={data.safetyManager} />
      <OrgChartBox x={x1} y={row3Y} node={data.controlTeam} width={EMTEAM_BOX_W3} />
      <OrgChartBox x={x2} y={row3Y} node={data.rescueTeam} width={EMTEAM_BOX_W3} />
      <OrgChartBox x={x3} y={row3Y} node={data.supportTeam} width={EMTEAM_BOX_W3} />
      <Text x={cx2} y={noteY} textAnchor="middle" style={{ fontSize: 8, fontFamily: "NotoSansKR" } as never} fill="#6b7280">
        협력업체, 근로자
      </Text>
    </Svg>
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

  title = pdfSafeText(title);
  sections = sanitizeForPdf(sections);
  cover = cover && sanitizeForPdf(cover);
  overviewPage = overviewPage && sanitizeForPdf(overviewPage);
  managementPolicy = managementPolicy && sanitizeForPdf(managementPolicy);
  orgChart = orgChart && sanitizeForPdf(orgChart);

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
        <Fragment key={section.id}>
          <Page size="A4" style={styles.page}>
            {i === 0 && <Text style={styles.title}>{title}</Text>}
            <Text style={styles.heading}>{section.heading}</Text>
            {section.emergencyTeam && <EmergencyTeamDiagram data={section.emergencyTeam} />}
            {section.fields.map((f, idx) => (
              <View key={idx} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{f.value || "(미입력)"}</Text>
              </View>
            ))}
            {section.tables.map(
              (t, tIdx) =>
                t.rows.length > 0 && (
                  <View key={tIdx} style={styles.table}>
                    {t.headers.length > 0 && (
                      <View style={styles.tableRow}>
                        {t.headers.map((h, idx) => (
                          <Text key={idx} style={styles.tableHeaderCell}>
                            {h}
                          </Text>
                        ))}
                      </View>
                    )}
                    {t.rows.map((row, rIdx) => (
                      <View key={rIdx} style={styles.tableRow}>
                        {row.map((cell, cIdx) => (
                          <Text key={cIdx} style={styles.tableCell}>
                            {cell}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )
            )}
            {section.hazardDetailGroups?.length ? (
              <HazardDetailGroupsBlock groups={section.hazardDetailGroups} />
            ) : null}
          </Page>
          {section.accidentImages?.map((img, idx) => (
            <LabeledImagePage key={idx} imageBuffer={img.buffer} label={img.label} />
          ))}
        </Fragment>
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
