// Edge Function: sync-announcements
// 조달청(나라장터 입찰공고 + 낙찰정보) + 방위사업청 실 입찰공고를 가져와
// public.announcements에 upsert한다.
// 인증키는 이 함수의 Supabase secret(NARA_SERVICE_KEY)에서만 읽으며, 클라이언트 번들에는
// 절대 포함되지 않는다 (Constitution Principle V).
//
// 호출 인증 경로 2가지:
//   1) x-sync-secret 헤더 == SYNC_TRIGGER_SECRET (cron/서버간 호출용)
//   2) Authorization: Bearer <관리자 세션 JWT> (관리자 페이지 "지금 동기화" 버튼용,
//      members.role === 'admin' 인 경우만 허용)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NARA_SERVICE_KEY = Deno.env.get('NARA_SERVICE_KEY')!
const KEPCO_API_KEY = Deno.env.get('KEPCO_API_KEY')
const EX_API_KEY = Deno.env.get('EX_API_KEY')
const SYNC_TRIGGER_SECRET = Deno.env.get('SYNC_TRIGGER_SECRET')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface NormalizedAnnouncement {
  title: string
  organization: string
  deadline: string
  category: string
  status: string
  api_source: 'pps' | 'dapa' | 'kepco' | 'ex'
  external_no: string
  attachments: { name: string; url: string }[]
  // 추정가격/기초금액 (예정가격은 개찰 전까지 비공개인 경우가 많아 API에 따라 없을 수 있음)
  estimated_price: string
  // 아래 4개는 실제 필드명 확인 전 best-effort 매핑 (동기화 후 실측 검증 필요)
  industry_type: string
  contact_name: string
  contact_phone: string
  source_url: string
  // 한국도로공사(EX)는 "계약공개현황" API라 공고 단계 없이 이미 낙찰/계약 확정 정보가
  // 함께 내려온다 — PPS처럼 별도 낙찰정보 매칭 없이 이 자리에서 바로 채운다.
  winner_name?: string
  winner_amount?: string
  award_date?: string
}

interface NormalizedAward {
  external_no: string
  title: string
  winner_name: string
  winner_amount: string
  award_date: string
}

async function isAuthorized(req: Request): Promise<boolean> {
  const provided = req.headers.get('x-sync-secret')
  if (SYNC_TRIGGER_SECRET && provided === SYNC_TRIGGER_SECRET) return true

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt)
  if (userErr || !userData.user) return false

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  return member?.role === 'admin'
}

function fmt(d: Date, time: string) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${time}`
}

// 15일 구간 단위로 날짜 범위를 순회하며 콜백을 호출하는 공통 페이징 헬퍼.
// 구간당 999건 초과 시 다음 페이지를 이어받는다 (구간당 최대 9,990건 = 10페이지).
// 전체 결과는 최대 2,000건까지 수집.
async function fetchWindowedPPS<T>(
  buildUrl: (begin: string, end: string, pageNo: number, pageSize: number) => string,
  extractItems: (json: Record<string, unknown>) => Record<string, string>[],
  extractTotalCount: (json: Record<string, unknown>) => number,
  isOk: (json: Record<string, unknown>) => boolean,
  mapItem: (item: Record<string, string>) => T,
  label: string,
): Promise<T[]> {
  const WINDOW_DAYS = 15
  const PAGE_SIZE = 999
  const MAX_PAGES_PER_WINDOW = 10 // 999 * 10 = 9,990건/구간
  const GLOBAL_CAP = 2000
  const MAX_WINDOWS = 8 // 안전장치: 최대 120일치까지만 거슬러 올라감

  const results: T[] = []
  let windowEnd = new Date()

  for (let w = 0; w < MAX_WINDOWS && results.length < GLOBAL_CAP; w++) {
    const windowBegin = new Date(windowEnd)
    windowBegin.setDate(windowBegin.getDate() - (WINDOW_DAYS - 1))

    const begin = fmt(windowBegin, '0000')
    const end = fmt(windowEnd, '2359')

    for (let pageNo = 1; pageNo <= MAX_PAGES_PER_WINDOW; pageNo++) {
      if (results.length >= GLOBAL_CAP) break

      try {
        const res = await fetch(buildUrl(begin, end, pageNo, PAGE_SIZE))
        const json = await res.json()

        if (!isOk(json)) {
          console.error(`[${label}] API error:`, json?.response?.header)
          break
        }

        const items = extractItems(json)
        const totalCount = extractTotalCount(json)
        if (items.length === 0) break

        for (const item of items) {
          if (results.length >= GLOBAL_CAP) break
          results.push(mapItem(item))
        }

        if (pageNo * PAGE_SIZE >= totalCount) break
      } catch (err) {
        console.error(`[${label}] fetch failed:`, err)
        break
      }
    }

    windowEnd = new Date(windowBegin)
    windowEnd.setDate(windowEnd.getDate() - 1)
  }

  return results
}

// ── 조달청: 나라장터 입찰공고정보서비스 (건설공사) ──────────────────────────
async function fetchPPS(): Promise<NormalizedAnnouncement[]> {
  return fetchWindowedPPS<NormalizedAnnouncement>(
    (begin, end, pageNo, pageSize) =>
      `https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk` +
      `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${pageSize}&pageNo=${pageNo}&inqryDiv=1` +
      `&inqryBgnDt=${begin}&inqryEndDt=${end}&type=json`,
    (json) => (json?.response as any)?.body?.items ?? [],
    (json) => Number((json?.response as any)?.body?.totalCount ?? 0),
    (json) => (json?.response as any)?.header?.resultCode === '00',
    (item) => {
      const attachments: { name: string; url: string }[] = []
      for (let i = 1; i <= 10; i++) {
        const docUrl = item[`ntceSpecDocUrl${i}`]
        const docName = item[`ntceSpecFileNm${i}`]
        if (docUrl && docName) attachments.push({ name: docName, url: docUrl })
      }
      return {
        title: item.bidNtceNm ?? '',
        organization: item.ntceInsttNm ?? '',
        deadline: item.bidClseDt ?? '',
        category: item.ntceKindNm || '건설공사',
        status: 'open',
        api_source: 'pps' as const,
        external_no: item.bidNtceNo ?? '',
        attachments,
        // presmptPrce(추정가격) — 나라장터 입찰공고정보서비스 표준 필드명. 실제 값이
        // 비어 오는 공고도 있을 수 있음 (예정가격은 개찰 전 비공개인 경우가 많음).
        estimated_price: item.presmptPrce ?? '',
        // 아래 4개는 실제 필드명 미확인 상태의 best-effort 매핑 (동기화 후 실측 검증 필요)
        industry_type: item.bidprcPsblIndstrytyNm ?? '',
        contact_name: item.ntceInsttOfclNm ?? '',
        contact_phone: item.ntceInsttOfclTelNo ?? '',
        source_url: item.bidNtceDtlUrl ?? '',
      }
    },
    'PPS',
  )
}

// ── 조달청: 나라장터 낙찰정보서비스 (건설공사) ──────────────────────────────
// bidNtceNo(=announcements.external_no)로 기존 공고 행에 낙찰 결과를 매칭한다.
async function fetchPPSAward(): Promise<NormalizedAward[]> {
  return fetchWindowedPPS<NormalizedAward>(
    (begin, end, pageNo, pageSize) =>
      `https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusCnstwk` +
      `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${pageSize}&pageNo=${pageNo}&inqryDiv=1` +
      `&inqryBgnDt=${begin}&inqryEndDt=${end}&type=json`,
    (json) => (json?.response as any)?.body?.items ?? [],
    (json) => Number((json?.response as any)?.body?.totalCount ?? 0),
    (json) => (json?.response as any)?.header?.resultCode === '00',
    (item) => ({
      external_no: item.bidNtceNo ?? '',
      title: item.bidNtceNm ?? '',
      winner_name: item.bidwinnrNm ?? '',
      winner_amount: item.sucsfbidAmt ?? '',
      award_date: item.fnlSucsfDate ?? '',
    }),
    'PPS-Award',
  )
}

// ── 방위사업청: 입찰공고정보서비스 (국내경쟁, XML, 최대 100건) ──────────────
function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = []
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []
  for (const block of itemBlocks) {
    const fields: Record<string, string> = {}
    for (const m of block.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
      fields[m[1]] = m[2]
    }
    items.push(fields)
  }
  return items
}

function normalizeDapaDate(raw: string | undefined): string {
  if (!raw || raw.length < 8) return raw ?? ''
  const y = raw.slice(0, 4)
  const mo = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  const hh = raw.slice(8, 10) || '00'
  const mm = raw.slice(10, 12) || '00'
  return `${y}-${mo}-${d} ${hh}:${mm}`
}

// 안전보건관리계획서는 "공사"에만 의무이며 용역/물품(구매)에는 요구되지 않는다.
// 방위사업청 국내경쟁입찰공고 API(getDmstcCmpetBidPblancList)는 조달청 PPS(건설공사
// 전용 엔드포인트)나 KEPCO(purchaseType=ConstructionService 필터)와 달리 공사/용역/
// 물품이 섞여서 내려오므로, busiDivs(업무구분)로 용역·물품(구매)만 걸러낸다.
const DAPA_EXCLUDED_CATEGORIES = ['용역', '물품', '구매']

function isDapaConstruction(category: string): boolean {
  return !DAPA_EXCLUDED_CATEGORIES.some((kw) => category.includes(kw))
}

async function fetchDapa(): Promise<NormalizedAnnouncement[]> {
  const MAX_ROWS = 100 // 방위사업청 API 최대 허용치

  // 참고: inqryBgnDt/inqryEndDt/inqryDiv 파라미터를 바꿔도 결과가 동일해
  // (totalCount 고정) 서버에서 실제로는 날짜 필터가 적용되지 않는 것으로 확인됨.
  // 이 API는 개찰 예정(미확정) 공고 위주로만 반환하는 것으로 보이며, 별도의
  // 낙찰/결과 실시간 API도 없어(파일 다운로드만 제공) 조달청처럼 "확정 종료"
  // 여부를 정확히 판별할 수 없다. 차선책으로 제출마감일을 기준일로 사용한다
  // (응답에 이미 마감이 지난 항목도 일부 섞여 있어 완전히 무의미하진 않음).
  const url =
    `https://apis.data.go.kr/1690000/BidPblancInfoService/getDmstcCmpetBidPblancList` +
    `?serviceKey=${NARA_SERVICE_KEY}&numOfRows=${MAX_ROWS}&pageNo=1`

  try {
    const res = await fetch(url)
    const xml = await res.text()

    if (!xml.includes('<resultCode>00</resultCode>')) {
      console.error('[DAPA] API error, raw response head:', xml.slice(0, 300))
      return []
    }

    const items = parseXmlItems(xml)
    return items
      .map((item) => ({
        title: item.bidNm ?? '',
        organization: item.ornt ?? '',
        deadline: normalizeDapaDate(item.biddocPresentnClosDt || item.bidPartcptRegistClosDt),
        category: item.busiDivs ?? '',
        status: item.pblancSe === '취소공고' ? 'cancelled' : 'open',
        api_source: 'dapa' as const,
        external_no: item.g2bPblancNo ?? '',
        attachments: [],
        // 방위사업청도 나라장터(G2B) 플랫폼 기반이라 PPS와 동일한 필드명을 쓸 가능성이 높음.
        // 실제 값이 비어 오면 다른 필드명일 수 있으니 다음 동기화 결과로 확인 필요.
        estimated_price: item.presmptPrce ?? '',
        industry_type: item.bidprcPsblIndstrytyNm ?? '',
        contact_name: item.ntceInsttOfclNm ?? '',
        contact_phone: item.ntceInsttOfclTelNo ?? '',
        source_url: item.bidNtceDtlUrl ?? '',
      }))
      .filter((ann) => isDapaConstruction(ann.category))
  } catch (err) {
    console.error('[DAPA] fetch failed:', err)
    return []
  }
}

// ── 한국전력공사(KEPCO): 전자입찰계약정보 (전력데이터개방포털, 건설용역) ──────
// 참고 사항 (실제 호출로 확인됨):
//   - numOfRows/pageNo는 무시되고 항상 전체 결과가 반환됨 (페이징 미지원)
//   - 조회 기간은 90일을 넘길 수 없음
//   - progressState 파라미터는 서버에서 실제로 필터링됨 (Final=낙찰/계약 확정)
//   - purchaseType 파라미터는 서버에서 필터링되지 않아 클라이언트에서 걸러야 함
//   - 최근 공고(최근 90일 이내 게시)는 아직 진행 중이라 Final 건이 사실상 없음
//     (입찰→계약 확정까지 통상 90일 이상 소요). 그래서 게시일 기준 최근이 아니라
//     "게시 후 90~180일 지난 구간"을 조회해 이미 확정된 건을 찾는다.
async function fetchKepco(): Promise<NormalizedAnnouncement[]> {
  if (!KEPCO_API_KEY) return []

  const today = new Date()
  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() - 90)
  const windowBegin = new Date(windowEnd)
  windowBegin.setDate(windowBegin.getDate() - 90)

  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

  const url =
    `https://bigdata.kepco.co.kr/openapi/v1/electContract.do` +
    `?apiKey=${KEPCO_API_KEY}&companyId=COM01` +
    `&noticeBeginDate=${ymd(windowBegin)}&noticeEndDate=${ymd(windowEnd)}` +
    `&progressState=Final`

  try {
    const res = await fetch(url)
    const json = await res.json()

    if (!Array.isArray(json?.data)) {
      console.error('[KEPCO] unexpected response:', json?.errMsg ?? json)
      return []
    }

    const GLOBAL_CAP = 500

    const results = (json.data as Record<string, unknown>[])
      .filter((item) => item.purchaseType === 'ConstructionService')
      .map((item) => {
        const attachments: { name: string; url: string }[] = []
        for (let i = 1; i <= 5; i++) {
          const docUrl = item[`filenlink${i}`] as string | undefined
          const docName = item[`filename${i}`] as string | undefined
          if (docUrl && docName) attachments.push({ name: docName, url: docUrl })
        }
        return {
          title: String(item.name ?? ''),
          organization: `한국전력공사 ${item.placeName ?? ''}`.trim(),
          deadline: String(item.endDatetime ?? ''),
          category: '건설용역',
          status: 'awarded',
          api_source: 'kepco' as const,
          external_no: String(item.no ?? ''),
          attachments,
          // KEPCO 응답에서 확인된 금액/업종/담당자 필드가 없어 우선 비워둠.
          estimated_price: '',
          industry_type: '',
          contact_name: '',
          contact_phone: '',
          source_url: '',
        }
      })
      // 가장 최근에 종료된 것부터 정렬 후 상한 적용
      .sort((a, b) => (a.deadline < b.deadline ? 1 : -1))
      .slice(0, GLOBAL_CAP)

    return results
  } catch (err) {
    console.error('[KEPCO] fetch failed:', err)
    return []
  }
}

// ── 한국도로공사(EX): 전자조달 계약공개현황 (고속도로 공공데이터포털 data.ex.co.kr) ──
// 요청/응답 스펙은 사용자가 직접 확인한 상세페이지 캡처로 확정됨 (2026-08-30):
//   GET https://data.ex.co.kr/openapi/elctPrcmInfo/elctPrcmCntrtOppubPrss
//   요청: key, type(json/xml), sCntrtCntgDates/eCntrtCntgDates(계약체결일자 범위, 선택),
//        pbanClssCd(공고구분코드: CT=공사 등, 선택), pageNo, numOfRows
//   응답 필드: code, message, count, pageNo, numOfRows, pbanClssCd, pbanClssNm,
//        scbdPbanNo(공고번호), cntrtNm(계약명), cmpttMthd(계약방법), crno(사업자등록번호),
//        cntrtCrprNm(계약업체명), cntrtAmt(계약금액), cntrtDptnm(계약부서명),
//        sprvDptnm(주관부서명), cntrtCntgDates(계약체결일자)
// 단, 응답의 최상위 배열 래핑 키(items/list/data 등)와 날짜 파라미터 포맷(YYYYMMDD 가정)은
// 문서에 명시되지 않아 best-effort로 처리 — 최초 동기화 결과로 실측 검증 필요.
// 이미 "체결된 계약"만 제공하는 계약공개현황 API라(입찰 마감 전 공고 목록이 아님)
// KEPCO와 동일하게 곧바로 확정(awarded) 건으로 처리한다.
function extractExItems(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[]
  const obj = json as Record<string, unknown> | null
  for (const key of ['items', 'list', 'data', 'result', 'response']) {
    const val = obj?.[key]
    if (Array.isArray(val)) return val as Record<string, unknown>[]
  }
  return []
}

// Deno의 기본 fetch에는 타임아웃이 없어, 낯선(첫 연동) 외부 API가 응답을 안 주면
// 이 함수 하나가 전체 sync-announcements 실행을 무한정 붙잡아 "Failed to send a
// request to the Edge Function"(호출 자체가 응답을 못 받음) 상태로 이어질 수 있다.
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // 일부 기관 자체 포털(WAF)은 User-Agent가 없거나 봇처럼 보이는 요청을 차단해
    // 진짜 오류 대신 커스텀 에러 페이지(404 등)를 돌려주는 경우가 있어 방어적으로 붙인다.
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchEx(): Promise<{ items: NormalizedAnnouncement[]; debugSample?: string }> {
  if (!EX_API_KEY) return { items: [] }

  const today = new Date()
  const windowBegin = new Date(today)
  windowBegin.setDate(windowBegin.getDate() - 30)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

  const PAGE_SIZE = 100
  const GLOBAL_CAP = 300
  const MAX_PAGES = 3 // 최초 연동 검증 단계라 우선 보수적으로 제한 (필드 확인되면 상향)
  const results: NormalizedAnnouncement[] = []
  let debugSample: string | undefined

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    if (results.length >= GLOBAL_CAP) break

    const url =
      `https://data.ex.co.kr/openapi/elctPrcmInfo/elctPrcmCntrtOppubPrss` +
      `?key=${EX_API_KEY}&type=json&pbanClssCd=CT` +
      `&sCntrtCntgDates=${ymd(windowBegin)}&eCntrtCntgDates=${ymd(today)}` +
      `&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}`

    let rawText: string
    let status: number
    try {
      const res = await fetchWithTimeout(url, 8000)
      status = res.status
      rawText = await res.text()
    } catch (fetchErr) {
      if (pageNo === 1) debugSample = `FETCH_ERROR: ${String(fetchErr)}`
      break
    }

    if (pageNo === 1) debugSample = `HTTP ${status}: ${rawText.slice(0, 700)}`

    let json: unknown
    try {
      json = JSON.parse(rawText)
    } catch {
      // 응답이 JSON이 아님(XML 에러 페이지 등) — 위에서 이미 debugSample에 원문을 남겨뒀다.
      break
    }

    const items = extractExItems(json)
    if (items.length === 0) break

    for (const raw of items) {
      if (results.length >= GLOBAL_CAP) break
      const item = raw as Record<string, string>
      // pbanClssCd 서버 필터가 실제로 적용되는지 불확실해(KEPCO의 purchaseType 필터가
      // 서버에서 무시됐던 전례가 있음) 클라이언트에서도 한 번 더 공사(CT)만 걸러낸다.
      if (item.pbanClssCd && item.pbanClssCd !== 'CT') continue
      results.push({
        title: item.cntrtNm ?? '',
        organization: `한국도로공사 ${item.cntrtDptnm || item.sprvDptnm || ''}`.trim(),
        deadline: item.cntrtCntgDates ?? '',
        category: item.pbanClssNm || '공사',
        status: 'awarded',
        api_source: 'ex' as const,
        external_no: item.scbdPbanNo ?? '',
        attachments: [],
        estimated_price: '',
        industry_type: '',
        contact_name: '',
        contact_phone: '',
        source_url: '',
        winner_name: item.cntrtCrprNm ?? '',
        winner_amount: item.cntrtAmt ?? '',
        award_date: item.cntrtCntgDates ?? '',
      })
    }

    if (items.length < PAGE_SIZE) break
  }

  return { items: results, debugSample }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const [pps, dapa, ppsAward, kepco, exResult] = await Promise.all([
      fetchPPS(),
      fetchDapa(),
      fetchPPSAward(),
      fetchKepco(),
      fetchEx(),
    ])
    const ex = exResult.items
    const all = [...pps, ...dapa, ...kepco, ...ex].filter((a) => a.title && a.external_no)

    // external_no 중복 제거 (같은 배치 내 동일 행을 upsert 하면 Postgres가 거부하므로 안전장치)
    const dedupMap = new Map<string, NormalizedAnnouncement>()
    for (const ann of all) dedupMap.set(ann.external_no, ann)
    const deduped = [...dedupMap.values()]

    const rows = deduped.map((ann) => ({
      title: ann.title,
      organization: ann.organization,
      deadline: ann.deadline,
      category: ann.category,
      status: ann.status,
      // KEPCO/EX는 이미 확정된 계약만 내려주는 API라 곧바로 awarded 처리
      awarded: ann.api_source === 'kepco' || ann.api_source === 'ex' ? true : undefined,
      external_no: ann.external_no,
      api_source: ann.api_source,
      attachments: ann.attachments,
      estimated_price: ann.estimated_price,
      industry_type: ann.industry_type,
      contact_name: ann.contact_name,
      contact_phone: ann.contact_phone,
      source_url: ann.source_url,
      winner_name: ann.winner_name,
      winner_amount: ann.winner_amount,
      award_date: ann.award_date,
    }))

    // 한 번에 너무 큰 payload를 보내지 않도록 500건 단위로 나눠서 upsert
    const BATCH_SIZE = 500
    let upserted = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { error, count } = await supabase
        .from('announcements')
        .upsert(batch, { onConflict: 'external_no', count: 'exact' })
      if (error) errors.push(error.message)
      else upserted += count ?? batch.length
    }

    // 낙찰정보 매칭: bidNtceNo(external_no)로 기존 공고 행에 결과를 반영한다.
    // title도 함께 보내는 이유는 announcements.title이 NOT NULL이라, 혹시 매칭되는
    // 공고 행이 아직 없는 경우(동기화 구간 차이 등) upsert의 INSERT 경로가 실패하지
    // 않도록 하기 위함 — 이미 존재하는 행이면 ON CONFLICT UPDATE로 값만 갱신된다.
    const awardDedup = new Map<string, NormalizedAward>()
    for (const a of ppsAward) if (a.external_no && a.title) awardDedup.set(a.external_no, a)
    const awardRows = [...awardDedup.values()].map((a) => ({
      external_no: a.external_no,
      title: a.title,
      awarded: true,
      winner_name: a.winner_name,
      winner_amount: a.winner_amount,
      award_date: a.award_date,
      api_source: 'pps',
    }))

    let awardMatched = 0
    const awardErrors: string[] = []
    for (let i = 0; i < awardRows.length; i += BATCH_SIZE) {
      const batch = awardRows.slice(i, i + BATCH_SIZE)
      const { error, count } = await supabase
        .from('announcements')
        .upsert(batch, { onConflict: 'external_no', count: 'exact' })
      if (error) awardErrors.push(error.message)
      else awardMatched += count ?? batch.length
    }

    const result = {
      ok: true,
      fetched: {
        pps: pps.length,
        dapa: dapa.length,
        ppsAward: ppsAward.length,
        kepco: kepco.length,
        ex: ex.length,
      },
      upserted,
      awardMatched,
      errors: errors.slice(0, 5),
      awardErrors: awardErrors.slice(0, 5),
      // EX 응답 스키마(최상위 배열 래핑 키, 날짜 포맷)가 문서만으로는 확정이 안 돼
      // 최초 동기화 결과로 실측 검증하기 위한 임시 디버그 필드 — ex.length가 0인데
      // exDebugSample에 실제 데이터가 보이면 extractExItems()의 래핑 키를 조정해야 함.
      exDebugSample: exResult.debugSample,
    }

    // 관리자 페이지 "마지막 동기화" 표시용 실행 이력 기록 (실패해도 본 응답에는 영향 없음)
    await supabase.from('sync_log').insert({ result })

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
