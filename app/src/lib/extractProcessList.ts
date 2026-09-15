// See extractBusinessOverview.ts for why lib/pdf-parse.js (not the package entry) is used.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;

import { classifyConstructionType, RISK_TEMPLATES, type ConstructionType } from "./riskTemplates";

// 회원이 첨부한 현장설명서·공사개요 PDF에서 "공정 및 세부단위작업" 후보 목록을
// 뽑아낸다. 실제 PDF를 텍스트로 뽑아보면(표·2단 레이아웃 등 때문에) 줄바꿈이
// 뒤섞여 "N. 공정명" 같은 깔끔한 목차 줄 패턴으로는 거의 못 잡아낸다는 것이
// 실측으로 확인됐다 — 그래서 구조(줄 모양)로 "제목"을 추측하는 대신, 이미
// RISK_TEMPLATES에 있는 실제 건설 공종·공정 어휘 자체를 사전으로 삼아 문서
// 안에서 그 단어가 실제로 등장하는지 찾는 방식을 쓴다. AI 호출 없이도 알려진
// 공종 이름과 정확히 일치하는 부분만 뽑으므로, 완벽한 문서 이해는 아니지만
// 엉뚱한 문장 조각을 공정명으로 잘못 집어오는 사고를 피할 수 있다.

export interface ExtractedProcess {
  process: string;
  hazard?: string;
  countermeasure?: string;
}

// RISK_TEMPLATES의 process 필드("골조공사 / 고소작업", "거푸집·동바리 설치" 등)를
// "/", "·", "," 기준으로 쪼개 개별 공정 키워드 사전을 만들고, 실제 LH 위험성평가서
// 샘플(화성동탄(2))에 등장하는 공종명 중 위 사전에 없는 것들을 보태 보강한다.
function buildProcessKeywordDictionary(): string[] {
  const fromTemplates = (Object.keys(RISK_TEMPLATES) as ConstructionType[]).flatMap((type) =>
    RISK_TEMPLATES[type].flatMap((item) =>
      item.process
        .split(/[/·,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
  const extra = [
    "가설공사",
    "토공사",
    "흙막이가시설공사",
    "흙막이가시설",
    "관공사",
    "지장물이설",
    "지하보도공사",
    "철근콘크리트공사",
    "철근가공",
    "철근가공·조립",
    "콘크리트타설",
    "방수공사",
    "마감공사",
    "전기·기계설비공사",
    "전기설비공사",
    "기계설비공사",
    "포장공사",
    "조경복구공사",
    "운반",
    "보건",
  ];
  return Array.from(new Set([...fromTemplates, ...extra])).filter((k) => k.length >= 2 && k.length <= 15);
}

const PROCESS_KEYWORDS = buildProcessKeywordDictionary();
// 사전에 포함된 짧은 일반명사(예: "운반", "보건")가 본문의 아무 문장에서나
// 우연히 매칭되는 걸 막기 위해, 그 줄 전체 길이가 이 값 이하일 때만(=목차·표
// 항목처럼 그 단어가 사실상 줄 전체를 차지할 때만) 매칭을 인정한다.
const MAX_LINE_LENGTH_FOR_MATCH = 14;

export function extractProcessCandidates(text: string, max = 30): ExtractedProcess[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, ""))
    .filter((l) => l.length > 0 && l.length <= MAX_LINE_LENGTH_FOR_MATCH);

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const line of lines) {
    const keyword = PROCESS_KEYWORDS.find((k) => line === k || line.startsWith(k) || line.endsWith(k));
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    candidates.push(keyword);
    if (candidates.length >= max) break;
  }

  return candidates.map((process) => {
    const type = classifyConstructionType(process);
    // "일반공사"로만 분류되면 특정 공종을 확신할 수 없다는 뜻이라, 잘못된
    // 유해·위험요인을 끼워맞추는 대신 공정명만 채우고 나머지는 사용자가
    // 직접 채우게 둔다 — 없는 데이터를 지어내지 않기 위함.
    if (type === "일반공사") return { process };
    const template = pickClosestTemplateItem(type, process);
    return { process, hazard: template?.hazard, countermeasure: template?.countermeasure };
  });
}

// 같은 공종(ConstructionType) 안에도 여러 표준 항목이 있어(예: 토목공사 =
// 굴착·건설기계·포장), 무조건 첫 항목을 쓰면 "포장공사"에 굴착 관련 유해·위험요인이
// 붙는 등 엉뚱한 매칭이 생긴다 — "공사/작업" 접미사를 뗀 어근이 겹치는 항목을
// 우선 찾고, 없으면 그 공종의 첫 항목으로 대체한다.
function stripSuffix(s: string): string {
  return s.replace(/(공사|작업)$/, "").trim();
}

function pickClosestTemplateItem(type: ConstructionType, process: string) {
  const items = RISK_TEMPLATES[type];
  const base = stripSuffix(process);
  const direct = items.find((item) =>
    item.process
      .split(/[/·,]/)
      .map((p) => stripSuffix(p.trim()))
      .some((p) => p && base && (p.includes(base) || base.includes(p)))
  );
  return direct ?? items[0];
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function extractProcessListFromPdf(buf: Buffer): Promise<ExtractedProcess[]> {
  if (buf.byteLength === 0 || buf.byteLength > MAX_PDF_BYTES) return [];
  let text: string;
  try {
    const parsed = await pdfParse(buf);
    text = parsed.text || "";
  } catch (err) {
    console.error("[extractProcessListFromPdf] pdf-parse failed:", err);
    return [];
  }
  return extractProcessCandidates(text);
}
