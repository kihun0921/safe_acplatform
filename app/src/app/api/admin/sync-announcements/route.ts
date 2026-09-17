import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import iconv from "iconv-lite";

// Ported from the legacy Supabase Edge Function `supabase/functions/sync-announcements/index.ts`.
// Same working fetch/paging/parsing logic — only the target schema's column
// names changed (organization -> agency, estimated_price -> base_amount, etc).

const NARA_SERVICE_KEY = process.env.NARA_SERVICE_KEY;
const KEPCO_API_KEY = process.env.KEPCO_API_KEY;
const EX_API_KEY = process.env.EX_API_KEY;

interface NormalizedAnnouncement {
  title: string;
  agency: string;
  deadline: string; // YYYY-MM-DD
  category: string;
  trade_type?: string | null;
  site_region?: string | null;
  attachments?: { name: string; url: string }[];
  api_source: "pps" | "dapa" | "kepco" | "ex" | "lh";
  external_no: string;
  base_amount: number | null;
  source_url: string;
  awarded?: boolean;
  winner_name?: string;
  winner_amount?: number | null;
}

// 공종 분류: PPS 공사입찰 응답의 mainCnsttyNm(주 공사업종 면허명, 예: "일반건축공사업",
// "지반조성ㆍ포장공사업")을 큰 범주(건축/토목/전기/설비)로 매핑한다. 실측 확인된 실제
// 필드값 기준 키워드 매칭이며, 매칭 실패 시 "기타"로 분류한다.
const TRADE_TYPE_RULES: [string, string[]][] = [
  ["전기", ["전기", "정보통신", "소방시설"]],
  ["설비", ["기계설비", "가스시설", "냉난방", "관공사", "산업설비", "기계가스설비"]],
  ["토목", ["토목", "지반", "포장", "조경", "상하수도", "수중", "준설"]],
  ["건축", ["건축", "실내건축", "철근콘크리트", "철골", "조적", "미장", "방수", "지붕판금", "석공사", "도장"]],
];
function classifyTradeType(mainCnsttyNm: string): string {
  for (const [bucket, keywords] of TRADE_TYPE_RULES) {
    if (keywords.some((k) => mainCnsttyNm.includes(k))) return bucket;
  }
  return "기타";
}

interface NormalizedAward {
  external_no: string;
  title: string;
  winner_name: string;
  winner_amount: number | null;
  award_date: string;
}

function toDateOnly(raw: string | undefined): string {
  if (!raw) return "";
  const m = raw.match(/(\d{4})-?(\d{2})-?(\d{2})/);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function toAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// PPS 공고 첨부파일: ntceSpecDocUrl1..10 / ntceSpecFileNm1..10 쌍으로 최대 10개 온다.
function extractAttachments(item: Record<string, string>): { name: string; url: string }[] {
  const attachments: { name: string; url: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const url = item[`ntceSpecDocUrl${i}`];
    const name = item[`ntceSpecFileNm${i}`];
    if (url && name) attachments.push({ name, url });
  }
  return attachments;
}

function fmt(d: Date, time: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${time}`;
}

async function fetchWindowedPPS<T>(
  buildUrl: (begin: string, end: string, pageNo: number, pageSize: number) => string,
  extractItems: (json: Record<string, unknown>) => Record<string, string>[],
  extractTotalCount: (json: Record<string, unknown>) => number,
  isOk: (json: Record<string, unknown>) => boolean,
  mapItem: (item: Record<string, string>) => T,
  label: string,
  options?: { maxWindows?: number; globalCap?: number }
): Promise<T[]> {
  const WINDOW_DAYS = 15;
  const PAGE_SIZE = 999;
  const MAX_PAGES_PER_WINDOW = 10;
  const GLOBAL_CAP = options?.globalCap ?? 2000;
  const MAX_WINDOWS = options?.maxWindows ?? 8;

  const results: T[] = [];
  let windowEnd = new Date();

  for (let w = 0; w < MAX_WINDOWS && results.length < GLOBAL_CAP; w++) {
    const windowBegin = new Date(windowEnd);
    windowBegin.setDate(windowBegin.getDate() - (WINDOW_DAYS - 1));
    const begin = fmt(windowBegin, "0000");
    const end = fmt(windowEnd, "2359");

    for (let pageNo = 1; pageNo <= MAX_PAGES_PER_WINDOW; pageNo++) {
      if (results.length >= GLOBAL_CAP) break;
      try {
        const res = await fetch(buildUrl(begin, end, pageNo, PAGE_SIZE));
        const json = await res.json();
        if (!isOk(json)) {
          console.error(`[${label}] API error:`, (json as { response?: { header?: unknown } })?.response?.header);
          break;
        }
        const items = extractItems(json);
        const totalCount = extractTotalCount(json);
        if (items.length === 0) break;
        for (const item of items) {
          if (results.length >= GLOBAL_CAP) break;
          results.push(mapItem(item));
        }
        if (pageNo * PAGE_SIZE >= totalCount) break;
      } catch (err) {
        console.error(`[${label}] fetch failed:`, err);
        break;
      }
    }
    windowEnd = new Date(windowBegin);
    windowEnd.setDate(windowEnd.getDate() - 1);
  }
  return results;
}

async function fetchPPS(): Promise<NormalizedAnnouncement[]> {
  if (!NARA_SERVICE_KEY) return [];
  return fetchWindowedPPS<NormalizedAnnouncement>(
    (begin, end, pageNo, pageSize) =>
      `https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk` +
      `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${pageSize}&pageNo=${pageNo}&inqryDiv=1` +
      `&inqryBgnDt=${begin}&inqryEndDt=${end}&type=json`,
    (json) => ((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.items as Record<string, string>[] ?? [],
    (json) => Number(((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.totalCount ?? 0),
    (json) => ((json?.response as Record<string, unknown>)?.header as Record<string, unknown>)?.resultCode === "00",
    (item) => ({
      title: item.bidNtceNm ?? "",
      agency: item.ntceInsttNm ?? "",
      deadline: toDateOnly(item.bidClseDt),
      category: item.ntceKindNm || "건설공사",
      trade_type: item.mainCnsttyNm ? classifyTradeType(item.mainCnsttyNm) : null,
      site_region: item.cnstrtsiteRgnNm || null,
      attachments: extractAttachments(item),
      api_source: "pps" as const,
      external_no: item.bidNtceNo ?? "",
      base_amount: toAmount(item.presmptPrce),
      source_url: item.bidNtceDtlUrl ?? "",
    }),
    "PPS"
  );
}

async function fetchPPSAward(): Promise<NormalizedAward[]> {
  if (!NARA_SERVICE_KEY) return [];
  return fetchWindowedPPS<NormalizedAward>(
    (begin, end, pageNo, pageSize) =>
      `https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusCnstwk` +
      `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${pageSize}&pageNo=${pageNo}&inqryDiv=1` +
      `&inqryBgnDt=${begin}&inqryEndDt=${end}&type=json`,
    (json) => ((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.items as Record<string, string>[] ?? [],
    (json) => Number(((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.totalCount ?? 0),
    (json) => ((json?.response as Record<string, unknown>)?.header as Record<string, unknown>)?.resultCode === "00",
    (item) => ({
      external_no: item.bidNtceNo ?? "",
      title: item.bidNtceNm ?? "",
      winner_name: item.bidwinnrNm ?? "",
      winner_amount: toAmount(item.sucsfbidAmt),
      award_date: toDateOnly(item.fnlSucsfDate),
    }),
    "PPS-Award"
  );
}

interface NormalizedOpeningResult {
  external_no: string;
  title: string;
  rank1_name: string;
  rank1_amount: number | null;
}

// 개찰결과 API: 최종 낙찰자 확정(며칠 더 걸릴 수 있음)보다 먼저, 개찰 직후 1순위(최저가)
// 투찰업체를 알려준다. opengCorpInfo 필드는 "회사명^사업자번호^대표자^투찰금액^투찰율"
// 형식의 캐럿(^) 구분 문자열로 온다 — 첫 번째(회사명)와 네 번째(투찰금액)만 사용한다.
// 최종 낙찰 확정 정보(fetchPPSAward)가 있으면 항상 그쪽이 우선하고, 이건 그게 아직
// 없을 때의 참고용(provisional) 정보다.
async function fetchPPSOpeningResult(): Promise<NormalizedOpeningResult[]> {
  if (!NARA_SERVICE_KEY) return [];
  return fetchWindowedPPS<NormalizedOpeningResult>(
    (begin, end, pageNo, pageSize) =>
      `https://apis.data.go.kr/1230000/as/ScsbidInfoService/getOpengResultListInfoCnstwkPPSSrch` +
      `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${pageSize}&pageNo=${pageNo}&inqryDiv=1` +
      `&inqryBgnDt=${begin}&inqryEndDt=${end}&type=json`,
    (json) => ((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.items as Record<string, string>[] ?? [],
    (json) => Number(((json?.response as Record<string, unknown>)?.body as Record<string, unknown>)?.totalCount ?? 0),
    (json) => ((json?.response as Record<string, unknown>)?.header as Record<string, unknown>)?.resultCode === "00",
    (item) => {
      const parts = (item.opengCorpInfo ?? "").split("^");
      return {
        external_no: item.bidNtceNo ?? "",
        title: item.bidNtceNm ?? "",
        rank1_name: parts[0] ?? "",
        rank1_amount: toAmount(parts[3]),
      };
    },
    "PPS-OpeningResult",
    // 1순위 업체 정보는 "개찰 직후 아직 최종 확정 전"인 최근 공고에만 의미가 있고,
    // 오래된 건은 이미 fetchPPSAward로 확정 여부가 갱신됐을 것이므로 조회 기간을
    // 짧게 잡아 동기화 소요 시간을 크게 줄인다(전체 8윈도우 대신 최근 30일=2윈도우).
    { maxWindows: 2, globalCap: 1000 }
  ).then((items) => items.filter((i) => i.rank1_name));
}

// [^<]* 만으로는 "<tag>\n<![CDATA[ 값 ]]>\n</tag>" 형태(LH API 응답)를 못 읽는다 —
// CDATA 시작 마커 자체가 "<"라서 [^<]*가 그 앞에서 멈춰버림. CDATA 유무 둘 다 매칭.
function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of itemBlocks) {
    const fields: Record<string, string> = {};
    for (const m of block.matchAll(/<(\w+)>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))\s*<\/\1>/g)) {
      fields[m[1]] = (m[2] ?? m[3] ?? "").trim();
    }
    items.push(fields);
  }
  return items;
}

const DAPA_EXCLUDED_CATEGORIES = ["용역", "물품", "구매"];
function isDapaConstruction(category: string): boolean {
  return !DAPA_EXCLUDED_CATEGORIES.some((kw) => category.includes(kw));
}

async function fetchDapa(): Promise<NormalizedAnnouncement[]> {
  if (!NARA_SERVICE_KEY) return [];
  const MAX_ROWS = 100;
  const url =
    `https://apis.data.go.kr/1690000/BidPblancInfoService/getDmstcCmpetBidPblancList` +
    `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${MAX_ROWS}&pageNo=1`;

  try {
    const res = await fetch(url);
    const xml = await res.text();
    if (!xml.includes("<resultCode>00</resultCode>")) {
      console.error("[DAPA] API error, raw response head:", xml.slice(0, 300));
      return [];
    }
    const items = parseXmlItems(xml);
    return items
      .map((item) => ({
        title: item.bidNm ?? "",
        agency: item.ornt ?? "",
        deadline: toDateOnly(item.biddocPresentnClosDt || item.bidPartcptRegistClosDt),
        category: item.busiDivs ?? "",
        api_source: "dapa" as const,
        external_no: item.g2bPblancNo ?? "",
        base_amount: toAmount(item.presmptPrce),
        source_url: item.bidNtceDtlUrl ?? "",
      }))
      .filter((ann) => isDapaConstruction(ann.category) && ann.title && ann.external_no && ann.deadline);
  } catch (err) {
    console.error("[DAPA] fetch failed:", err);
    return [];
  }
}

// 한국전력공사(KEPCO): 전자입찰계약정보 (전력데이터개방포털, 건설용역)
// - numOfRows/pageNo 무시, 페이징 미지원 (항상 전체 결과 반환)
// - 조회 기간 90일 제한, progressState=Final만 서버에서 실제 필터링됨
// - purchaseType은 서버에서 필터링되지 않아 클라이언트에서 재필터링 필요
// - 게시 후 90~180일 지난 구간을 조회 (최근 공고는 아직 Final 건이 거의 없음)
async function fetchKepco(): Promise<NormalizedAnnouncement[]> {
  if (!KEPCO_API_KEY) return [];

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() - 90);
  const windowBegin = new Date(windowEnd);
  windowBegin.setDate(windowBegin.getDate() - 90);

  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const url =
    `https://bigdata.kepco.co.kr/openapi/v1/electContract.do` +
    `?apiKey=${KEPCO_API_KEY}&companyId=COM01` +
    `&noticeBeginDate=${ymd(windowBegin)}&noticeEndDate=${ymd(windowEnd)}` +
    `&progressState=Final`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!Array.isArray(json?.data)) {
      console.error("[KEPCO] unexpected response:", json?.errMsg ?? json);
      return [];
    }

    const GLOBAL_CAP = 500;

    return (json.data as Record<string, unknown>[])
      .filter((item) => item.purchaseType === "ConstructionService")
      .map((item) => ({
        title: String(item.name ?? ""),
        agency: `한국전력공사 ${item.placeName ?? ""}`.trim(),
        deadline: toDateOnly(String(item.endDatetime ?? "")),
        category: "건설용역",
        api_source: "kepco" as const,
        external_no: String(item.no ?? ""),
        base_amount: null,
        source_url: "",
        awarded: true,
      }))
      .filter((a) => a.title && a.external_no && a.deadline)
      .sort((a, b) => (a.deadline < b.deadline ? 1 : -1))
      .slice(0, GLOBAL_CAP);
  } catch (err) {
    console.error("[KEPCO] fetch failed:", err);
    return [];
  }
}

// 한국토지주택공사(LH) 개찰정보(개찰결과정보) — data.go.kr 공공데이터포털의 계정별
// 일반 인증키(NARA_SERVICE_KEY)를 그대로 재사용한다(API별로 별도 발급되는 키가 아님).
// 이 API는 "새 공고 목록"이 아니라 특정 공고(bidNum)에 대해 참여 업체별 개찰 결과를
// 한 행씩 반환한다(같은 bidNum이 여러 item으로 반복). 아직 낙찰자 확정 전 상태가
// 섞여 있고(vndrSccfBidStatusNm이 "낙찰하한율미만"/"미심사" 등) 실제 "낙찰" 상태
// 문자열은 확인되지 않았으므로, group 안에서 투찰금액(decTndrAmt)이 가장 낮은 업체를
// 잠정 낙찰자로 본다(국내 공공 건설입찰의 통상적인 최저가 낙찰 관행 기준).
// KEPCO와 마찬가지로 자체 발주기관 API이므로 PPS 공고와 별개의 api_source="lh"
// 행으로 직접 생성하고 awarded:true로 저장한다(마감 전 신규공고 목록이 아니라 이미
// 개찰이 끝난 결과 데이터이므로).
function parseLHOpenDate(raw: string): string {
  const m = raw.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

async function fetchLH(): Promise<NormalizedAnnouncement[]> {
  if (!NARA_SERVICE_KEY) return [];

  const today = new Date();
  const windowEnd = new Date(today);
  const windowBegin = new Date(today);
  windowBegin.setDate(windowBegin.getDate() - 30);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const PAGE_SIZE = 999;
  const MAX_PAGES = 10;
  const items: Record<string, string>[] = [];

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const url =
      `https://apis.data.go.kr/B552555/OpenTenderopenList/getOpenTenderopenList` +
      `?serviceKey=${NARA_SERVICE_KEY}&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}` +
      `&openDtmStart=${ymd(windowBegin)}&openDtmEnd=${ymd(windowEnd)}`;
    try {
      const res = await fetch(url);
      // 응답 XML이 encoding="EUC-KR"로 선언되어 있고 실제 바이트도 EUC-KR이라
      // res.text()(UTF-8 디코딩)로 읽으면 한글이 모두 깨진다.
      const buf = Buffer.from(await res.arrayBuffer());
      const xml = iconv.decode(buf, "euc-kr");
      if (!xml.includes("<resultCode>00</resultCode>")) {
        console.error("[LH] API error, raw response head:", xml.slice(0, 300));
        break;
      }
      const parsed = parseXmlItems(xml);
      if (parsed.length === 0) break;
      items.push(...parsed);
      const totalCountMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/);
      const totalCount = totalCountMatch ? Number(totalCountMatch[1]) : 0;
      if (pageNo * PAGE_SIZE >= totalCount) break;
    } catch (err) {
      console.error("[LH] fetch failed:", err);
      break;
    }
  }

  const groups = new Map<string, Record<string, string>[]>();
  for (const item of items) {
    const key = `${item.bidNum ?? ""}:${item.bidDegree ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const results: NormalizedAnnouncement[] = [];
  for (const [key, group] of groups) {
    if (!key || key === ":") continue;
    // "낙찰하한율미만"(낙찰하한율 미달로 이미 탈락 확정)인 업체는 최저가여도 후보에서
    // 제외한다 — 실제 "낙찰" 성공 상태 문자열 표본은 아직 확보하지 못했으므로, 확인된
    // 탈락 상태만 배제하고 나머지 중 최저가를 잠정 1순위로 추정한다.
    const eligible = group.filter(
      (i) => toAmount(i.decTndrAmt) !== null && i.vndrSccfBidStatusNm?.trim() !== "낙찰하한율미만"
    );
    const candidates = eligible.length > 0 ? eligible : group.filter((i) => toAmount(i.decTndrAmt) !== null);
    const winner = candidates.sort((a, b) => Number(a.decTndrAmt) - Number(b.decTndrAmt))[0];
    if (!winner) continue;
    const first = group[0];
    results.push({
      title: first.bidnmKor ?? "",
      agency: "한국토지주택공사",
      deadline: parseLHOpenDate(first.openDtm ?? ""),
      category: first.cstrtnJobGbNm || "건설공사",
      api_source: "lh" as const,
      external_no: key,
      base_amount: toAmount(first.expectPrc || first.fdmtlAmt),
      source_url: "",
      awarded: true,
      winner_name: winner.tndrVndrNm ?? "",
      winner_amount: toAmount(winner.decTndrAmt),
    });
  }
  return results.filter((a) => a.title && a.external_no && a.deadline);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const syncSecret = request.headers.get("x-sync-secret");
  const isCron = syncSecret && syncSecret === process.env.SYNC_TRIGGER_SECRET;

  if (!isCron) {
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { data: member } = await supabase.from("members").select("role").eq("id", user.id).single();
    if (member?.role !== "admin") {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
    }
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [pps, dapa, ppsAward, ppsOpeningResult, kepco, lh] = await Promise.all([
    fetchPPS(),
    fetchDapa(),
    fetchPPSAward(),
    fetchPPSOpeningResult(),
    fetchKepco(),
    fetchLH(),
  ]);
  const all = [...pps, ...dapa, ...kepco, ...lh].filter((a) => a.title && a.external_no && a.deadline);

  const dedup = new Map<string, NormalizedAnnouncement>();
  for (const a of all) dedup.set(`${a.external_no}:${a.api_source}`, a);
  const rows = [...dedup.values()].map((a) => ({
    title: a.title,
    agency: a.agency,
    announcement_number: a.external_no,
    category: a.category,
    trade_type: a.trade_type ?? null,
    site_region: a.site_region ?? null,
    attachments: a.attachments ?? [],
    deadline: a.deadline,
    base_amount: a.base_amount,
    has_safety_form: true,
    api_source: a.api_source,
    external_no: a.external_no,
    source_url: a.source_url,
    last_synced_at: new Date().toISOString(),
    ...(a.awarded ? { awarded: true, award_status: "confirmed" } : {}),
  }));

  const BATCH_SIZE = 500;
  let upserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, count } = await service
      .from("announcements")
      .upsert(batch, { onConflict: "external_no,api_source", count: "exact" });
    if (error) errors.push(error.message);
    else upserted += count ?? batch.length;
  }

  // Award matching (PPS only) — bidNtceNo(=external_no) already exists as pps rows.
  const awardDedup = new Map<string, NormalizedAward>();
  for (const a of ppsAward) if (a.external_no && a.title) awardDedup.set(a.external_no, a);
  // Only update rows that already exist from the PPS fetch above — do NOT
  // upsert-insert here, since that would require placeholder agency/deadline/
  // category values that could clobber good data if this ever hit an UPDATE
  // path for a row synced with real data by a previous run.
  const existingExternalNos = new Set(rows.filter((r) => r.api_source === "pps").map((r) => r.external_no));
  const awardRows = [...awardDedup.values()]
    .filter((a) => existingExternalNos.has(a.external_no))
    .map((a) => ({
      external_no: a.external_no,
      api_source: "pps",
      awarded: true,
      winner_name: a.winner_name,
      winner_amount: a.winner_amount,
    }));

  let awardMatched = 0;
  const awardErrors: string[] = [];
  const confirmedExternalNos = new Set<string>();
  for (const row of awardRows) {
    const { error } = await service
      .from("announcements")
      .update({ awarded: row.awarded, winner_name: row.winner_name, winner_amount: row.winner_amount, award_status: "confirmed" })
      .eq("external_no", row.external_no)
      .eq("api_source", row.api_source);
    if (error) awardErrors.push(error.message);
    else {
      awardMatched += 1;
      confirmedExternalNos.add(row.external_no);
    }
  }

  // 개찰결과 1순위(참고용) 매칭 — 최종 낙찰 확정 정보가 아직 없는 공고에 한해서만
  // 적용한다. DB에 이미 award_status='confirmed'로 저장된 행은 .not("award_status",
  // "eq", "confirmed")로 걸러 절대 덮어쓰지 않는다(이번 실행에서 방금 확정된 것도
  // confirmedExternalNos로 제외).
  const openingDedup = new Map<string, NormalizedOpeningResult>();
  for (const o of ppsOpeningResult) if (o.external_no && o.title) openingDedup.set(o.external_no, o);
  const openingRows = [...openingDedup.values()].filter(
    (o) => existingExternalNos.has(o.external_no) && !confirmedExternalNos.has(o.external_no)
  );

  let openingMatched = 0;
  const openingErrors: string[] = [];
  for (const row of openingRows) {
    const { error } = await service
      .from("announcements")
      .update({ awarded: true, winner_name: row.rank1_name, winner_amount: row.rank1_amount, award_status: "provisional" })
      .eq("external_no", row.external_no)
      .eq("api_source", "pps")
      // award_status is NULL for most not-yet-matched rows, and PostgREST's neq
      // (SQL <>) excludes NULLs entirely, so it must be spelled out explicitly —
      // otherwise this update would silently no-op for every row that has never
      // been touched by either award path yet.
      .or("award_status.is.null,award_status.neq.confirmed");
    if (error) openingErrors.push(error.message);
    else openingMatched += 1;
  }

  const result = {
    ok: true,
    fetched: {
      pps: pps.length,
      dapa: dapa.length,
      ppsAward: ppsAward.length,
      ppsOpeningResult: ppsOpeningResult.length,
      kepco: kepco.length,
      lh: lh.length,
    },
    upserted,
    awardMatched,
    openingMatched,
    errors: errors.slice(0, 5),
    awardErrors: awardErrors.slice(0, 5),
    openingErrors: openingErrors.slice(0, 5),
    ranBy: isCron ? "cron" : user?.email,
  };

  await service.from("sync_log").insert({ result });

  return NextResponse.json(result);
}
