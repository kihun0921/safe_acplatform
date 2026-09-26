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
  WorkforcePlanGroup,
  ExecutionOptionsData,
} from "./wizardExport";
import { computeSectionOrderChapters, type CoverStyle, type SectionOrderGroup } from "./agencyTemplates";
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
  // react-pdf(@react-pdf/textkit)의 기본 줄바꿈은 공백 위치 기준이라, 한글처럼
  // 공백 없이 죽 이어지는 긴 복합어(예: "안전보건표지부착·안전수칙게시")가 좁은
  // 표 칸(유해·위험 기계/차량/물질 관리계획 상세 표의 "관리계획" 칸 등)에 들어가면
  // 줄바꿈 없이 그대로 넘쳐흘러 옆 칸 글자와 겹쳐 보이는 버그가 실제로 있었다
  // (텍스트에 U+200B 같은 폭 0 공백을 끼워 넣는 방법은 이 폰트에 그 글리프
  // 자체가 없어 더 큰 깨짐을 만들어 시도했다가 되돌림 — fontkit으로 직접 확인).
  // react-pdf가 제공하는 하이픈 콜백을 글자 단위로 등록하면 텍스트 내용은 그대로
  // 두고 "필요할 때만" 아무 글자 사이에서나 줄바꿈할 수 있게 된다 — 이미 한 줄에
  // 들어가는 글은 전혀 영향받지 않고, 정말 넘칠 때만 그 지점에 작은 하이픈이
  // 붙어 다음 줄로 넘어간다(완전 무해하진 않지만 겹쳐 보이는 것보다 훨씬 낫다).
  Font.registerHyphenationCallback((word) => word.split(""));
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

// DOCX(generateDocx.ts)·HWPX(generateHwpx.ts)와 같은 기준: "연번"·"구분"처럼
// 원래 짧은 값만 들어가는 컬럼은 폭을 줄이고 가운데 정렬, 번호 목록
// ("1. ... 2. ...")이 들어가는 서술형 긴 설명 컬럼은 왼쪽 정렬한다 — 예전엔
// 모든 컬럼이 균등폭·정렬 지정 없음이라 표가 밋밋하고 컬럼 성격이 안 보였다.
const NARROW_COLUMN_PATTERN =
  /^(연번|번호|no\.?|구분|분류|확인|서명|지정일|지정구분|작업일자|성명|소속|담당|비고|등급|점수|위험성|빈도|강도|관리계획)/i;

function isNarrowColumn(header: string): boolean {
  return NARROW_COLUMN_PATTERN.test(header.trim());
}

function columnFlex(header: string): number {
  return isNarrowColumn(header) ? 0.5 : 1.5;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSansKR", fontSize: 10 },
  // "1.사업개요" 정형 페이지 소제목(overviewSubTitle, fontSize 13)과 같은 크기로
  // 맞췄다 — 예전엔 14라 정형 페이지 소제목보다 한 단계 커 보였다.
  heading: { fontSize: 13, fontWeight: "bold", marginBottom: 14, borderBottom: "2pt solid #1e3a5f", paddingBottom: 6 },
  fieldRow: { flexDirection: "row", marginBottom: 6 },
  fieldLabel: { fontWeight: "bold", width: 140 },
  fieldValue: { flex: 1 },
  table: { marginTop: 12, border: "1pt solid #ccc" },
  // 행 안에서 칸이 늘어나도(옆 칸의 긴 서술형 텍스트 때문에) 세로 구분선이
  // 끊어지지 않으려면, 셀 "칸"(테두리·배경, 항상 행 전체 높이로 늘어남)과
  // 그 안의 "글자"(justifyContent: center로만 세로 가운데 배치)를 분리해야
  // 한다 — Text 하나에 border+정렬을 같이 주면 짧은 칸이 실제 글자 높이만큼만
  // 줄어들면서 그 칸의 세로 구분선도 같이 짧아져 표가 끊어져 보이는 문제가
  // 있었다. tableRow는 기본값(stretch)을 그대로 둬 칸 높이가 항상 행 전체와
  // 같게 하고, 칸(View)에서 justifyContent: center로 안의 글자만 가운데
  // 놓는다 — DOCX(VerticalAlign.CENTER)·HWPX(vertAlign="CENTER")와 동일한
  // 결과다.
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #ccc" },
  // 예전엔 표 바깥 테두리와 행 사이 구분선만 있고 칸(열)과 칸 사이엔 세로
  // 구분선이 전혀 없어서, 컬럼 경계가 안 보이는 표가 됐다 — 표지·결재란 표
  // (coverTable/approvalTable, 이미 borderRight 적용돼 있었음)와 똑같이 셀마다
  // 오른쪽 테두리를 주고, 각 행의 마지막 칸만 렌더링 시 "none"으로 지워 표
  // 바깥 테두리와 겹치지 않게 한다.
  tableHeaderCellBox: { flex: 1, backgroundColor: "#f3f4f6", borderRight: "1pt solid #ccc", justifyContent: "center" },
  tableHeaderCellText: { padding: 5, fontWeight: "bold", fontSize: 9 },
  tableCellBox: { flex: 1, borderRight: "1pt solid #ccc", justifyContent: "center" },
  tableCellText: { padding: 5, fontSize: 9 },
  // 유해·위험 기계/차량/물질 관리계획: 항목(장비명·물질명)별 소표.
  hazardGroupName: { fontSize: 11, fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  hazardCategoryHeaderBox: {
    flex: 0.4,
    backgroundColor: "#f3f4f6",
    borderRight: "1pt solid #ccc",
    justifyContent: "center",
  },
  hazardCategoryHeaderText: { padding: 5, fontWeight: "bold", fontSize: 9, textAlign: "center" },
  hazardDetailHeaderBox: { flex: 1.6, backgroundColor: "#f3f4f6", justifyContent: "center" },
  hazardDetailHeaderText: { padding: 5, fontWeight: "bold", fontSize: 9 },
  hazardCategoryBox: { flex: 0.4, borderRight: "1pt solid #ccc", justifyContent: "center" },
  hazardCategoryText: { padding: 5, fontSize: 9, fontWeight: "bold", textAlign: "center" },
  hazardDetailBox: { flex: 1.6, justifyContent: "center" },
  hazardDetailText: { padding: 5, fontSize: 9 },
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

// LH 실제 표지 뒤에 붙는 "제출문"은 제출일자를 submitDate 전체("2026. 9. 25.")가
// 아니라 "년/월"까지만("2026년 09월") 쓴다 — 실제 LH 샘플(화성동탄(2))의 제출문
// 캡처를 그대로 따른 것. submitDate는 extractCoverPageData()에서 항상
// "YYYY. M. D." 형식으로만 만들어지므로 정규식으로 안전하게 뽑아낸다.
function formatSubmitYearMonth(submitDate: string): string {
  const m = submitDate.match(/^(\d{4})\.\s*(\d{1,2})\./);
  if (!m) return submitDate;
  return `${m[1]}년 ${m[2].padStart(2, "0")}월`;
}

// 실제 LH 표지 샘플(화성동탄(2))의 표지 다음 장에 그대로 나오는 "제출문"
// 페이지. 정보 표를 나열하는 위 표지와 달리 문장형 수신문으로 "귀사 발주공사인
// "OOO" 수행을 위해..."라고 쓰고 발주처를 "OO 사장 귀하"로 부른다(K-water의
// "OO 귀하"와 다른 LH만의 문구 — KwaterStandardCoverPage와 별도 컴포넌트).
function LhSubmissionLetterPage({ cover }: { cover: CoverPageData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={{ fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 60, letterSpacing: 8 }}>
        제 출 문
      </Text>
      <Text style={{ fontSize: 11, lineHeight: 1.8, textAlign: "center", marginBottom: 60 }}>
        귀사 발주공사인 &quot;{cover.projectName || "(미입력)"}&quot; 수행을 위해 아래와 같이 안전보건관리계획서를
        제출합니다.
      </Text>
      <Text style={[styles.coverDate, { marginBottom: 60 }]}>{formatSubmitYearMonth(cover.submitDate)}</Text>
      <Text style={{ fontSize: 11, marginLeft: 90, marginBottom: 16 }}>업 체 명 : {cover.companyName || "(미입력)"}</Text>
      <Text style={{ fontSize: 11, marginLeft: 90, marginBottom: 60 }}>대표이사 : {cover.writerName || ""}</Text>
      <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "right" }}>{cover.agency || "발주기관"} 사장 귀하</Text>
    </Page>
  );
}

// LH가 실제로 요구하는 표준 표지. 다른 발주처의 실제 표지 샘플이 확보되면
// 이 컴포넌트 옆에 XxxCoverPage를 추가하고 COVER_PAGE_COMPONENTS에 등록한다.
function LhStandardCoverPage({ cover }: { cover: CoverPageData }) {
  return (
    <Fragment>
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
      <LhSubmissionLetterPage cover={cover} />
    </Fragment>
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

// 실제 K-water 붙임2 서식 1~2p를 그대로 재현한다: 1p 표지(공사명 부제+제목
// 박스+제출일자+회사명), 2p 별도 페이지의 제출문(수신문+제출일자+업체명·
// 대표이사+발주처 귀하). LH·범용 표지처럼 정보를 표/결재란으로 나열하지 않고
// 실제 샘플처럼 문장형 제출문을 그대로 쓰는 것이 K-water 서식의 특징이다.
function KwaterStandardCoverPage({ cover }: { cover: CoverPageData }) {
  const project = cover.projectName || "OOOOO";
  return (
    <Fragment>
      <Page size="A4" style={styles.coverPage}>
        <Text style={[styles.coverAgency, { marginBottom: 8 }]}>{project} 공사(용역)</Text>
        <TitleBox text="안전보건관리계획서" />
        <Text style={[styles.coverDate, { marginTop: 60 }]}>{cover.submitDate}</Text>
        <Text style={[styles.coverCompany, { marginTop: 60 }]}>{cover.companyName || "회사명(로고)"}</Text>
      </Page>
      <Page size="A4" style={styles.coverPage}>
        <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 40, letterSpacing: 8 }}>
          제 출 문
        </Text>
        <Text style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 40 }}>
          귀사의 {project} 수행을 위해 아래와 같이 안전보건관리계획서를 제출합니다.
        </Text>
        <Text style={[styles.coverDate, { marginBottom: 32 }]}>{cover.submitDate}</Text>
        <Text style={{ fontSize: 11, marginBottom: 16 }}>업 체 명 : {cover.companyName || "(미입력)"}</Text>
        <Text style={{ fontSize: 11, marginBottom: 56 }}>
          대표이사 : {cover.writerName || ""}                    (서명 또는 인)
        </Text>
        <Text style={styles.coverAgency}>{cover.agency || "발주기관"} 귀하</Text>
      </Page>
    </Fragment>
  );
}

const COVER_PAGE_COMPONENTS: Record<CoverStyle, (props: { cover: CoverPageData }) => ReactElement> = {
  lh_standard: LhStandardCoverPage,
  kwater_standard: KwaterStandardCoverPage,
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
type ChapterHeadingInfo = { roman: string; title: string };

function ManagementPolicyImagePage({
  imageBuffer,
  number,
  chapter,
}: {
  imageBuffer: Buffer;
  number: number;
  chapter?: ChapterHeadingInfo;
}) {
  const dims = readImageDimensions(imageBuffer);
  const isPng = imageBuffer.length >= 8 && imageBuffer.readUInt32BE(0) === 0x89504e47;
  const isJpg = imageBuffer.length >= 2 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  if (!dims || (!isPng && !isJpg)) {
    return (
      <Page size="A4" style={styles.policyPage}>
        {chapter && (
          <Text style={styles.overviewChapterTitle}>
            {chapter.roman}. {chapter.title}
          </Text>
        )}
        <Text style={styles.heading}>{number}. 안전보건 경영방침 및 목표</Text>
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
  const maxHeight = 640;
  const scale = Math.min(1, maxWidth / dims.width, maxHeight / dims.height);
  return (
    <Page size="A4" style={styles.policyImagePage}>
      {chapter && (
        <Text style={[styles.overviewChapterTitle, { alignSelf: "stretch" }]}>
          {chapter.roman}. {chapter.title}
        </Text>
      )}
      <Text style={[styles.heading, { alignSelf: "stretch" }]}>{number}. 안전보건 경영방침 및 목표</Text>
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

function ManagementPolicyStandardPage({
  data,
  number,
  chapter,
}: {
  data: ManagementPolicyData;
  number: number;
  chapter?: ChapterHeadingInfo;
}) {
  return (
    <Page size="A4" style={styles.policyPage}>
      {chapter && (
        <Text style={styles.overviewChapterTitle}>
          {chapter.roman}. {chapter.title}
        </Text>
      )}
      <Text style={[styles.heading, { marginBottom: 20 }]}>{number}. 안전보건 경영방침 및 목표</Text>
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
function OrgChartPage({ data, number, chapter }: { data: OrgChartData; number: number; chapter?: ChapterHeadingInfo }) {
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
      {chapter && (
        <Text style={styles.overviewChapterTitle}>
          {chapter.roman}. {chapter.title}
        </Text>
      )}
      <Text style={[styles.heading, { marginBottom: 20 }]}>{number}. 안전보건관리 조직구성</Text>
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
              <View style={styles.hazardCategoryHeaderBox}>
                <Text style={styles.hazardCategoryHeaderText}>관리계획</Text>
              </View>
              <View style={styles.hazardDetailHeaderBox}>
                <Text style={styles.hazardDetailHeaderText}>세부실행 계획</Text>
              </View>
            </View>
            {group.entries.map((entry, eIdx) => (
              <View key={eIdx} style={styles.tableRow}>
                <View style={styles.hazardCategoryBox}>
                  <Text style={styles.hazardCategoryText}>{entry.category}</Text>
                </View>
                <View style={styles.hazardDetailBox}>
                  <Text style={styles.hazardDetailText}>{entry.detail}</Text>
                </View>
              </View>
            ))}
          </View>
          {group.note && <Text style={styles.hazardNote}>비고(관계법령): {group.note}</Text>}
        </View>
      ))}
    </>
  );
}

// section.tables 렌더링(아래 numberedSections.map 안)과 WorkforcePlanGroupsBlock이
// 똑같은 표 스타일(좁은 컬럼 가운데 정렬, 넓은 서술형 컬럼 왼쪽 정렬)을 공유해야
// 해서 컴포넌트로 뺐다.
function GenericTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return null;
  const headerLikeRow = headers.length ? headers : rows[0] ?? [];
  return (
    <View style={styles.table}>
      {headers.length > 0 && (
        <View style={styles.tableRow}>
          {headers.map((h, idx) => (
            <View
              key={idx}
              style={[
                styles.tableHeaderCellBox,
                { flex: columnFlex(headerLikeRow[idx] ?? "") },
                idx === headers.length - 1 ? { borderRight: "none" } : undefined,
              ]}
            >
              <Text
                style={[styles.tableHeaderCellText, { textAlign: isNarrowColumn(headerLikeRow[idx] ?? "") ? "center" : "left" }]}
              >
                {h}
              </Text>
            </View>
          ))}
        </View>
      )}
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.tableRow}>
          {row.map((cell, cIdx) => (
            <View
              key={cIdx}
              style={[
                styles.tableCellBox,
                { flex: columnFlex(headerLikeRow[cIdx] ?? "") },
                cIdx === row.length - 1 ? { borderRight: "none" } : undefined,
              ]}
            >
              <Text style={[styles.tableCellText, { textAlign: isNarrowColumn(headerLikeRow[cIdx] ?? "") ? "center" : "left" }]}>
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// "작업투입 인력 인적사항"의 3개 소서식(안전취약근로자 식별/화재감시자 등 지정/
// 2인1조 편성표)을 각각 번호("1.","2.","3.")·목적(대상) 안내문·기준표(있으면)·
// 관리대장(명단/편성표)을 순서대로 보여준다. 이 절 전체의 바깥 소제목과는 별개로,
// 소서식 자체의 번호는 항상 1부터 다시 매긴다(이 절 안에서만 의미 있는 하위 번호).
function WorkforcePlanGroupsBlock({ groups }: { groups: WorkforcePlanGroup[] }) {
  return (
    <>
      {groups.map((group, i) => (
        <View key={i} wrap={false} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8 }}>
            {i + 1}. {group.title}
          </Text>
          {group.intro && <Text style={{ fontSize: 9, marginBottom: 8, lineHeight: 1.5 }}>{group.intro}</Text>}
          {group.criteriaTable && (
            <View style={{ marginBottom: 8 }}>
              <GenericTable headers={group.criteriaTable.headers} rows={group.criteriaTable.rows} />
            </View>
          )}
          <GenericTable headers={group.table.headers} rows={group.table.rows} />
        </View>
      ))}
    </>
  );
}

// "현장 안전보건 실행계획"(sec-execution)의 2개 선택항목을 토글이 켜진 것만
// 순서대로 보여준다(발주처 특기시방서에 없는 조항은 위저드 화면에서 토글을
// 꺼서 출력물에서 통째로 제외할 수 있다는 안내와 일치시킨 동작).
function ExecutionOptionsBlock({ data }: { data: ExecutionOptionsData }) {
  let n = 0;
  const machineryNumber = data.machineryEnabled ? ++n : 0;
  const councilNumber = data.councilEnabled ? ++n : 0;
  return (
    <>
      {data.machineryEnabled && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8 }}>{machineryNumber}. 건설기계·장비 안전검사 관리</Text>
          {data.machineryIntro && <Text style={{ fontSize: 9, marginBottom: 6, lineHeight: 1.5 }}>{data.machineryIntro}</Text>}
          <Text style={{ fontSize: 9 }}>
            등록 장비 {data.machineryCount || "(미입력)"} 등록 완료 · 검사증 {data.machineryCertAttached ? "첨부확인" : "미첨부"}
          </Text>
        </View>
      )}
      {data.councilEnabled && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8 }}>{councilNumber}. 하도급 협력업체 협의체 운영</Text>
          {data.councilText && <Text style={{ fontSize: 9, marginBottom: 6, lineHeight: 1.5 }}>{data.councilText}</Text>}
          <Text style={{ fontSize: 8, color: "#6b7280" }}>※ 월 1회 정기회의록을 작성·보관한다.</Text>
        </View>
      )}
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
  orgChart?: OrgChartData,
  // section_order 기준 장(章) 내 순번(agencyTemplates.computeSectionOrderNumbers).
  // 없으면(공통 6대 목차만 쓰는 일반 문서) 문서 전체를 훑는 연속 번호로 대체한다.
  managementPolicyNumberOverride?: number,
  orgChartNumberOverride?: number,
  sectionOrder: SectionOrderGroup[] = []
): Promise<Buffer> {
  ensureFontsRegistered();

  sections = sanitizeForPdf(sections);
  cover = cover && sanitizeForPdf(cover);
  overviewPage = overviewPage && sanitizeForPdf(overviewPage);
  managementPolicy = managementPolicy && sanitizeForPdf(managementPolicy);
  orgChart = orgChart && sanitizeForPdf(orgChart);

  const CoverPageComponent = COVER_PAGE_COMPONENTS[coverStyle] ?? GenericCoverPage;
  const OverviewPageComponent = overviewPageStyle ? OVERVIEW_PAGE_COMPONENTS[overviewPageStyle] : undefined;
  // section.chapterRoman은 sanitizeForPdf(sections)를 거치며 로마숫자 글리프가
  // 폰트에 없어 "Ⅰ"→"I"로 치환되므로(PDF_UNSAFE_CHAR_MAP), 여기서도 같은 치환을
  // 거친 값으로 비교해야 한다 — 안 그러면 "Ⅰ" !== "I"로 취급돼 Ⅰ장 안에서도
  // 매 절마다 대제목이 다시 나오는 오류가 있었다.
  const chapters = sanitizeForPdf(computeSectionOrderChapters(sectionOrder));
  // 장(章)이 바뀔 때마다 "Ⅱ. 실행계획" 같은 대제목을 한 번씩 보여준다. Ⅰ장은
  // 정형 사업개요 페이지가 이미 자기 chapterTitle로 보여주므로(overviewPage가
  // 있을 때만), lastChapterRoman을 미리 그 장의 로마숫자로 초기화해 같은 대제목이
  // 안전보건 경영방침/조직구성 앞에 또 나오지 않게 한다.
  let lastChapterRoman: string | undefined = overviewPage ? chapters["overview"]?.roman : undefined;
  const nextChapterHeading = (id: string): { roman: string; title: string } | undefined => {
    const chapter = chapters[id];
    if (!chapter || chapter.roman === lastChapterRoman) return undefined;
    lastChapterRoman = chapter.roman;
    return chapter;
  };

  // 소제목 번호는 section_order 기준 장(章) 내 순번(managementPolicyNumberOverride/
  // orgChartNumberOverride/section.headingNumber)을 우선 쓰고, 없으면(공통 6대
  // 목차만 쓰는 일반 문서) 문서 전체를 훑는 연속 번호로 대체한다.
  let nextHeadingNumber = overviewPage ? 2 : 1;
  const managementPolicyChapter = nextChapterHeading("management-policy");
  const managementPolicyNumber = managementPolicyNumberOverride ?? nextHeadingNumber;
  if (managementPolicy) nextHeadingNumber = managementPolicyNumber + 1;
  const orgChartChapter = nextChapterHeading("org_chart");
  const orgChartNumber = orgChartNumberOverride ?? nextHeadingNumber;
  if (orgChart) nextHeadingNumber = orgChartNumber + 1;
  const numberedSections = sections.map((section) => {
    const number = section.headingNumber ?? nextHeadingNumber;
    nextHeadingNumber = number + 1;
    const chapter =
      section.chapterRoman && section.chapterRoman !== lastChapterRoman
        ? { roman: section.chapterRoman, title: section.chapterTitle ?? "" }
        : undefined;
    if (chapter) lastChapterRoman = chapter.roman;
    return { section, number, chapter };
  });

  const doc = (
    <Document>
      {cover && <CoverPageComponent cover={cover} />}
      {overviewPage && OverviewPageComponent && <OverviewPageComponent data={overviewPage} />}
      {managementPolicy && managementPolicy.mode === "image" && managementPolicyImage && (
        <ManagementPolicyImagePage imageBuffer={managementPolicyImage} number={managementPolicyNumber} chapter={managementPolicyChapter} />
      )}
      {managementPolicy && !(managementPolicy.mode === "image" && managementPolicyImage) && (
        <ManagementPolicyStandardPage data={managementPolicy} number={managementPolicyNumber} chapter={managementPolicyChapter} />
      )}
      {orgChart && <OrgChartPage data={orgChart} number={orgChartNumber} chapter={orgChartChapter} />}
      {numberedSections.map(({ section, number, chapter }) => (
        <Fragment key={section.id}>
          <Page size="A4" style={styles.page}>
            {chapter && (
              <Text style={styles.overviewChapterTitle}>
                {chapter.roman}. {chapter.title}
              </Text>
            )}
            {!section.workforcePlanGroups?.length && (
              <Text style={styles.heading}>
                {number}. {section.heading}
              </Text>
            )}
            {section.emergencyTeam && <EmergencyTeamDiagram data={section.emergencyTeam} />}
            {section.fields.map((f, idx) => (
              <View key={idx} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{f.value || "(미입력)"}</Text>
              </View>
            ))}
            {section.tables.map((t, tIdx) => (
              <GenericTable key={tIdx} headers={t.headers} rows={t.rows} />
            ))}
            {section.hazardDetailGroups?.length ? (
              <HazardDetailGroupsBlock groups={section.hazardDetailGroups} />
            ) : null}
            {section.workforcePlanGroups?.length ? (
              <WorkforcePlanGroupsBlock groups={section.workforcePlanGroups} />
            ) : null}
            {section.executionOptions && <ExecutionOptionsBlock data={section.executionOptions} />}
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
