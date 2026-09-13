// Import the internal lib directly, not the package's `index.js` entry point:
// pdf-parse@1.1.1's index.js has a `!module.parent` debug-mode check meant to
// only run when the package is executed directly, but it misfires under ESM
// interop and tries to read a bundled test fixture file that doesn't exist in
// production, crashing with ENOENT. lib/pdf-parse.js is the actual parser with
// none of that debug wrapper.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;

// 공고에 첨부된 공고문 PDF에서 "사업개요"(공사기간/위치/내용)를 자동으로 뽑아낸다.
// AI 호출 없이 PDF 텍스트 레이어를 라벨 기반 정규식으로 파싱한다 (레거시 구현
// supabase/functions/extract-business-overview/index.ts 포팅). 조달청(PPS) 표준
// 공고문 양식은 "공사개요" 표에 구분/유형/기간/위치/내용이 고정 라벨로 나오므로
// 정규식으로도 꽤 안정적으로 뽑을 수 있다. 라벨을 못 찾으면 빈 문자열로 남긴다 —
// 없는 데이터를 지어내지 않기 위함.

export interface ExtractedBusinessOverview {
  period: string;
  location: string;
  mainContent: string;
}

interface AnnouncementAttachment {
  name: string;
  url: string;
}

// 공고에는 원본(.hwp/.hwpx)과 변환된 PDF가 같이 첨부되는 경우가 대부분이라 PDF만
// 골라 쓴다 — 이름에 "공고문"이 들어간 것을 우선하고, 없으면 첫 번째 PDF를 사용한다.
export function pickAnnouncementPdf(attachments: AnnouncementAttachment[] | null | undefined): string | null {
  if (!attachments || attachments.length === 0) return null;
  const pdfs = attachments.filter((a) => a.name?.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 0) return null;
  const preferred = pdfs.find((a) => a.name.includes("공고문")) ?? pdfs[0];
  return preferred ? preferred.url : null;
}

function looseLabelPattern(label: string): string {
  return label.split("").join("\\s*");
}

const STOP_LABELS = [
  "구분",
  "유형",
  "기간",
  "위치",
  "내용",
  "공사추정금액",
  "추정금액",
  "기초금액",
  "추정가격",
  "부가가치세",
  "입찰개시일시",
  "입찰마감일시",
  "개찰일시",
  "비고",
  "도급액",
];

// 실제 PPS 표준양식은 "1.공고에 부치는 사항"류의 사업개요가 문서 맨 앞부분에 나오고,
// 그 뒤로는 수십 페이지짜리 계약조건·서식 같은 상관없는 내용이 이어진다. 그 뒷부분에서
// "위치"/"내용"처럼 흔한 글자가 엉뚱하게 먼저 매칭되는 걸 막기 위해 검색 범위를 앞부분
// 일부로 제한한다 (실측 결과 개요는 보통 이 범위 안에 들어있음).
const OVERVIEW_SEARCH_WINDOW = 6000;

function extractLabeledValue(text: string, labelCandidates: string[]): string {
  const searchText = text.slice(0, OVERVIEW_SEARCH_WINDOW);
  for (const label of labelCandidates) {
    // 라벨은 반드시 줄의 맨 앞(번호 매김 "1.2." "가." 등은 허용)에서 시작해야 매칭한다.
    // 이 제약이 없으면 "…공사현장 안전관리에 대한 확인 후 입찰…"처럼 문장 중간에
    // 우연히 등장하는 같은 글자를 실제 항목 라벨로 착각해 뒤에 이어지는 아무 문장이나
    // 값으로 잘못 집어오는 오탐이 실측에서 확인됐다.
    const re = new RegExp(
      "(?:^|\\n)[ \\t]*(?:[0-9]+[.)][ \\t]*)*(?:[가-힣][.)][ \\t]*)?" +
        looseLabelPattern(label) +
        "\\s*[:：]?\\s*(.+)",
      "s"
    );
    const match = searchText.match(re);
    if (!match) continue;
    const rest = match[1];

    let cutIndex = Math.min(rest.length, 300);
    for (const stop of STOP_LABELS) {
      if (label.includes(stop) || stop.includes(label)) continue;
      const stopRe = new RegExp(looseLabelPattern(stop));
      const stopMatch = rest.match(stopRe);
      if (stopMatch?.index !== undefined && stopMatch.index < cutIndex) {
        cutIndex = stopMatch.index;
      }
    }
    // 라벨의 값은 거의 항상 한 줄 안에 들어있고, 그다음 줄부터는 다음 항목(번호매김
    // 목록 등)이 이어지는 경우가 많다 — 첫 줄바꿈에서 한 번 더 잘라 과도한 텍스트가
    // 값에 섞여 들어오는 것을 막는다.
    const newlineIndex = rest.slice(0, cutIndex).indexOf("\n");
    if (newlineIndex !== -1) cutIndex = newlineIndex;

    const value = rest
      .slice(0, cutIndex)
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[:：]\s*/, "")
      // 다음 항목의 "가./나./다." 같은 번호 매김 표기가 값 끝에 붙어 나오는 경우 제거.
      .replace(/\s*[가-힣]\.$/, "")
      .trim();
    if (!value) continue;
    // 서명란/연락처처럼 명백히 다른 종류의 텍스트를 잘못 집었을 때는 그냥 못 찾은
    // 것으로 처리한다 — 틀린 값을 보여주는 것보다 빈칸이 낫다.
    if (/☎|\d{2,4}-\d{3,4}-\d{4}|\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\./.test(value)) continue;
    return value;
  }
  return "";
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function extractBusinessOverviewFromPdf(pdfUrl: string): Promise<ExtractedBusinessOverview> {
  const empty = { period: "", location: "", mainContent: "" };

  let res: Response;
  try {
    res = await fetch(pdfUrl);
  } catch {
    return empty;
  }
  if (!res.ok) return empty;

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_PDF_BYTES) return empty;

  let text: string;
  try {
    const parsed = await pdfParse(Buffer.from(buf));
    text = parsed.text || "";
  } catch (err) {
    console.error("[extractBusinessOverviewFromPdf] pdf-parse failed:", err);
    return empty;
  }

  return {
    period: extractLabeledValue(text, ["공사기간", "사업기간", "기간"]),
    location: extractLabeledValue(text, ["공사현장", "공사위치", "사업위치", "현장위치", "위치"]),
    // "내용"은 문서 어디서나 흔히 등장하는 일반 단어라(예: "약관 내용", "첨부서류
    // 내용") 이것만으로 값을 찾으면 실제로는 무관한 문장을 잘못 집는 경우가 실측상
    // 잦았다. 구체적인 라벨이 명시된 경우에만 채우고, 없으면 빈 칸으로 남긴다.
    mainContent: extractLabeledValue(text, ["공사내용", "사업내용", "주요내용"]),
  };
}
