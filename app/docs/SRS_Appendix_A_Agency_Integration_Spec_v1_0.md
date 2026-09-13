# Appendix A — 발주처별 오픈API 연동 상세 스펙 v1.0

> 본 문서는 SRS 6.2절(발주처 공고 조회 및 API 연동, FR-005~FR-007, FR-021, FR-023~FR-025)의 상세 부속서이다.
> 근거: `supabase/functions/sync-announcements/index.ts`(2026-09-12 기준 코드), `src/pages/AdminApiSyncPage.tsx`의 `SOURCES` 정의, `constitution.md` Principle V.
>
> 표기 규칙: 코드에 이미 반영된 사실은 `(코드)`로, 코드 주석에 남아있는 미검증/추정 사항은 `[실측 필요]`로 표시한다.

---

## 1. 공통 원칙

### 1.1 인증키 관리

- 모든 발주처 인증키는 Supabase Edge Function의 환경변수(Secret)로만 주입한다: `NARA_SERVICE_KEY`(조달청·방위사업청 공용), `KEPCO_API_KEY`, `EX_API_KEY` (코드, constitution.md Principle V).
- 신규 발주처 추가 시 동일한 패턴(발주처 전용 환경변수 1개, 클라이언트 번들 미노출)을 따른다.
- Edge Function 호출 인증은 2가지 경로를 허용한다(코드):
  1. `x-sync-secret` 헤더가 `SYNC_TRIGGER_SECRET`과 일치 (cron/서버간 자동 호출용)
  2. `Authorization: Bearer <관리자 세션 JWT>`이며 `members.role === 'admin'` (관리자 페이지 "지금 동기화" 버튼)

### 1.2 낙찰/진행상태 판단 폴백 체인 (constitution.md Principle V)

| 단계 | 정의 | 적용 발주처 |
|---|---|---|
| ① 최종 낙찰자 확정 정보 | 낙찰자명·낙찰금액·낙찰(확정)일자 제공 API | PPS(낙찰정보서비스), KEPCO(`progressState=Final`), EX(계약공개현황 — 이미 체결된 계약만 제공) |
| ② 개찰결과 1순위 업체 정보 | 낙찰자 확정 API가 없을 때 차선책 | LH(예정, 개찰결과정보) |
| ③ 입찰공고 마감일 기준 | 위 두 경로가 모두 없을 때 | DAPA(방위사업청) |

### 1.3 안전보건관리계획서 대상 범위 필터링

안전보건관리계획서는 "공사"에만 의무이며 용역·물품(구매)에는 요구되지 않는다(코드 주석, `sync-announcements`). 발주처별 API가 공사/용역/물품을 함께 반환하는 경우, 각 fetch 함수 내에서 카테고리 필터를 적용해야 한다(예: DAPA의 `isDapaConstruction()`, EX의 `pbanClssCd=CT` 필터).

### 1.4 공통 방어 로직

- **페이징/기간 분할**: 조회 기간 제한이 있는 API(예: KEPCO 90일 제한)는 구간을 나눠 순회한다.
- **타임아웃**: Deno 기본 fetch는 타임아웃이 없어, 응답 없는 외부 API가 `sync-announcements` 전체를 무한 대기시킬 수 있다. 신규 발주처는 `fetchWithTimeout()`(8초) 패턴을 재사용해야 한다(코드, EX 연동에 이미 적용).
- **User-Agent 위장**: 일부 기관 포털(WAF)이 User-Agent 없는 요청을 봇으로 간주해 404 등 커스텀 에러 페이지를 반환할 수 있어, 실제 브라우저 User-Agent를 명시한다(코드, EX 연동 사례).
- **중복 제거**: 여러 발주처 API 결과를 합칠 때 `external_no` 기준으로 dedup 후 500건 단위 batch upsert(`onConflict: 'external_no'`) 한다.
- **실행 이력 기록**: 매 동기화 실행 결과(발주처별 조회 건수, 저장 건수, 오류 목록)를 `public.sync_log`(JSONB) 테이블에 기록하여 `AdminApiSyncPage`의 "마지막 동기화" 표시에 사용한다(FR-025).

---

## 2. 발주처별 연동 스펙

### 2.1 조달청(PPS, 나라장터) — 연동 완료 `(코드)`

| 항목 | 내용 |
|---|---|
| api_source 키 | `pps` |
| 범위 | 건설공사 |
| 공고 API | `GET https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk` |
| 낙찰정보 API | `GET https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusCnstwk` |
| 응답 형식 | JSON |
| 페이징 | 15일 구간(window) × 최대 10페이지(999건/페이지) = 구간당 최대 9,990건, 전체 상한 2,000건, 최대 8구간(약 120일) 소급 |
| 성공 판정 | `response.header.resultCode === '00'` |
| 매칭 키 | `bidNtceNo`(=`external_no`) — 공고와 낙찰정보를 같은 키로 upsert하여 병합 |
| 낙찰 판단 단계 | ①(최종 낙찰자 확정) |
| 첨부파일 | `ntceSpecDocUrl{1..10}` / `ntceSpecFileNm{1..10}` 페어를 최대 10개까지 attachments 배열로 변환 |
| 필드 매핑(확정) | `bidNtceNm`→title, `ntceInsttNm`→organization, `bidClseDt`→deadline, `ntceKindNm`→category(기본값 '건설공사') |
| 필드 매핑(미검증) `[실측 필요]` | `presmptPrce`(추정가격), `bidprcPsblIndstrytyNm`(업종), `ntceInsttOfclNm`/`ntceInsttOfclTelNo`(담당자), `bidNtceDtlUrl`(원문 링크) — 실제 값이 비어 오는 공고가 있을 수 있어(예정가격은 개찰 전 비공개) 동기화 결과로 지속 검증 필요 |

### 2.2 방위사업청(DAPA) — 연동 완료 `(코드)`

| 항목 | 내용 |
|---|---|
| api_source 키 | `dapa` |
| 범위 | 국내경쟁입찰 (공사만 필터링, 용역/물품 제외) |
| API | `GET https://apis.data.go.kr/1690000/BidPblancInfoService/getDmstcCmpetBidPblancList` |
| 응답 형식 | XML (정규식 기반 파싱, `parseXmlItems()`) |
| 페이징 | 없음 — 1회 조회 최대 100건(API 자체 상한) |
| 성공 판정 | 응답 문자열에 `<resultCode>00</resultCode>` 포함 여부 |
| 알려진 제약 `[실측 필요→확정됨]` | `inqryBgnDt`/`inqryEndDt`/`inqryDiv` 파라미터를 바꿔도 `totalCount`가 동일하여 서버에서 날짜 필터가 실제로 적용되지 않는 것으로 확인됨. 개찰 예정(미확정) 공고 위주로만 반환되며 별도 낙찰/결과 API가 없음(파일 다운로드만 제공) |
| 낙찰 판단 단계 | ③(마감일 기준) — 확정 여부를 정확히 판별할 API가 없어 제출마감일을 기준으로 사용 |
| 공사 필터 | `busiDivs`(업무구분)에 '용역'/'물품'/'구매' 키워드가 포함되면 제외 (`isDapaConstruction()`) |
| 취소 처리 | `pblancSe === '취소공고'` → `status: 'cancelled'` |
| 필드 매핑(미검증) `[실측 필요]` | PPS와 동일한 G2B(나라장터) 플랫폼 기반이라 필드명이 같을 가능성이 높다고 가정하고 매핑했으나(`presmptPrce`, `bidprcPsblIndstrytyNm` 등) 실제 값이 비어 오면 다른 필드명일 수 있음 |

### 2.3 한국전력공사(KEPCO) — 연동 완료 `(코드)`

| 항목 | 내용 |
|---|---|
| api_source 키 | `kepco` |
| 범위 | 건설용역 (`purchaseType=ConstructionService`로 클라이언트 측 필터) |
| API | `GET https://bigdata.kepco.co.kr/openapi/v1/electContract.do` (전력데이터개방포털) |
| 인증 | `apiKey` 쿼리파라미터, `companyId=COM01` |
| 응답 형식 | JSON (`data` 배열) |
| 페이징 | 미지원 — `numOfRows`/`pageNo` 파라미터가 있어도 항상 전체 결과 반환(코드 주석, 실측 확인됨) |
| 조회 기간 제한 | 90일 초과 조회 불가 |
| 서버 필터 동작 확인 | `progressState`는 실제 필터링됨(`Final`=낙찰/계약 확정만 조회), `purchaseType`은 서버에서 무시되어 클라이언트에서 재필터링 필요 |
| 조회 구간 전략 | 게시 후 90~180일 지난 구간을 조회 — 최근(90일 이내) 게시 공고는 입찰→계약 확정까지 통상 90일 이상 걸려 Final 건이 사실상 없기 때문 |
| 낙찰 판단 단계 | ①(최종 낙찰자 확정, `progressState=Final`) |
| 상한 | 500건, 마감일(deadline) 내림차순 정렬 후 slice |
| 첨부파일 | `filenlink{1..5}` / `filename{1..5}` |
| 미확보 필드 | 금액/업종/담당자 필드는 KEPCO 응답에서 확인되지 않아 빈 값으로 처리 |
| 즉시 확정 처리 | KEPCO는 이미 확정된 계약만 반환하는 API이므로 upsert 시 `awarded: true`로 즉시 표시 |

### 2.4 한국도로공사(EX) — 코드 배포, API 404(활성화 대기 추정) `(코드 + project memory)`

| 항목 | 내용 |
|---|---|
| api_source 키 | `ex` |
| 범위 | 공사 (`pbanClssCd=CT` 필터) |
| API | `GET https://data.ex.co.kr/openapi/elctPrcmInfo/elctPrcmCntrtOppubPrss` (전자조달 계약공개현황, 고속도로 공공데이터포털 data.ex.co.kr) |
| 요청 파라미터(확정, 2026-08-30 상세페이지 캡처 근거) | `key`, `type`(json/xml), `sCntrtCntgDates`/`eCntrtCntgDates`(계약체결일자 범위, 선택), `pbanClssCd`(공고구분코드: CT=공사 등, 선택), `pageNo`, `numOfRows` |
| 응답 필드(확정) | `code`, `message`, `count`, `pageNo`, `numOfRows`, `pbanClssCd`, `pbanClssNm`, `scbdPbanNo`(공고번호), `cntrtNm`(계약명), `cmpttMthd`(계약방법), `crno`(사업자등록번호), `cntrtCrprNm`(계약업체명), `cntrtAmt`(계약금액), `cntrtDptnm`(계약부서명), `sprvDptnm`(주관부서명), `cntrtCntgDates`(계약체결일자) |
| 응답 래핑 키 `[실측 필요]` | 최상위 배열이 `items`/`list`/`data`/`result`/`response` 중 무엇으로 오는지 문서에 명시되지 않아 `extractExItems()`가 5개 키를 모두 시도하도록 방어적으로 구현됨 |
| 날짜 파라미터 포맷 `[실측 필요]` | YYYYMMDD로 가정하고 구현했으나 실제 동기화 결과로 검증 필요 |
| 낙찰 판단 단계 | ①(계약공개현황 자체가 이미 체결된 계약만 제공하므로 즉시 `awarded: true`) |
| 조회 구간 | 최근 30일 계약체결 기준, 페이지당 100건 × 최대 3페이지 = 최대 300건(최초 연동 검증 단계라 보수적으로 제한) |
| 현재 상태 | 코드는 배포되어 있으나 실제 호출 시 404 응답. `debugSample` 필드(HTTP status + 응답 본문 앞 700자)를 `sync-announcements` 응답에 포함시켜 관리자 페이지에서 원인 파악 가능하도록 함 |
| **Open Issue** `[결정 필요]` | 404 원인이 (a) 발주처 측 키 미활성화, (b) 엔드포인트 경로 오류, (c) WAF 차단 중 무엇인지 확인 필요. `AdminApiSyncPage` 재동기화 실행 후 `exDebugSample` 필드로 1차 진단 가능 |

### 2.5 LH(한국토지주택공사) — 코드 미작성, 연동 계획 확정 `(AdminApiSyncPage SOURCES 정의 근거)`

| 항목 | 내용 |
|---|---|
| api_source 키(예정) | `lh` |
| 범위 | 예정(공사) |
| 연동 예정 API | 입찰공고정보 + 개찰결과정보(1순위 투찰업체) |
| 낙찰 판단 단계(예정) | ②(개찰결과 1순위 업체 정보) — constitution.md Principle V 예시 발주처 |
| 현재 상태 | 인증키 발급 완료, 자체 서버(LH) 활성화 대기 중 (`AdminApiSyncPage` status: `pending`, statusLabel: "키 활성화 대기") |
| 구현 대기 항목 | `sync-announcements`에 `fetchLh()` 함수 및 `LH_API_KEY` 환경변수 추가, `NormalizedAnnouncement.api_source`에 `'lh'` 추가 |

### 2.6 K-water(한국수자원공사) — 코드 미작성, 연동 계획 확정 `(AdminApiSyncPage SOURCES 정의 근거)`

| 항목 | 내용 |
|---|---|
| api_source 키(예정) | `kwater` |
| 범위 | 예정 |
| 연동 예정 API | 전자조달 입찰공고(`tndr3`) + 계약정보공개(`cntrct3`) |
| 현재 상태 | 오늘(문서 작성 시점 기준) 승인, 게이트웨이 전파 대기 중 (status: `pending`, statusLabel: "전파 대기") |
| 낙찰 판단 단계(예정) | `[결정 필요]` — `cntrct3`(계약정보공개)가 최종 낙찰자 확정 정보를 제공하는지 확인 후 ① 또는 ② 단계로 분류 |

### 2.7 한국가스공사 — 코드 미작성, 연동 계획 확정 `(AdminApiSyncPage SOURCES 정의 근거)`

| 항목 | 내용 |
|---|---|
| api_source 키(예정) | `kogas` |
| 범위 | 예정 |
| 연동 예정 API | 입찰정보(`bidInfoList`) + 계약정보(`contractInfoList4`) |
| 현재 상태 | 오늘 승인, 게이트웨이 전파 대기 중 (status: `pending`, statusLabel: "전파 대기") |
| 낙찰 판단 단계(예정) | `[결정 필요]` — `contractInfoList4`가 최종 낙찰자 확정 정보를 제공하는지 확인 필요 |

---

## 3. 관리자 화면 표시 요구사항 (FR-023, FR-025 관련, `AdminApiSyncPage.tsx` 근거)

- 발주처 목록 테이블은 다음 컬럼을 표시한다: **발주처명 / 범위 / 설명(연동 방식 요약) / 보유 건수(`announcements` 테이블의 `api_source` 별 count) / 상태 뱃지**(연동됨=success, 대기=warn).
- "지금 동기화" 버튼 클릭 시 `sync-announcements` Edge Function을 즉시 호출하고, 결과(발주처별 조회 건수, 저장 건수, 낙찰매칭 건수, 오류 목록, EX 디버그 샘플)를 화면에 표시한다.
- 마지막 동기화 시각은 `sync_log` 테이블의 최신 1건(`ran_at` 내림차순)을 조회하여 표시한다.

---

## 4. 신규 발주처 추가 시 체크리스트 (project memory: 신규 발주처 API 추가 절차 기반)

1. 발주처 오픈API 인증키 발급 확인, Supabase Edge Function Secret으로 등록(`<AGENCY>_API_KEY`)
2. `sync-announcements/index.ts`에 `fetchXxx()` 함수 추가:
   - 공고 목록 조회 + (있다면) 낙찰정보 조회를 분리
   - §1.3의 안전보건관리계획서 대상(공사) 필터 적용
   - §1.4의 공통 방어 로직(타임아웃, User-Agent, dedup) 재사용
   - 낙찰/진행상태 판단 단계(①/②/③ 중 어디에 해당하는지)를 코드 주석에 명시 (constitution.md Principle V 검토 기준)
3. `NormalizedAnnouncement.api_source` 유니온 타입에 신규 키 추가
4. `Deno.serve` 핸들러의 `Promise.all([...])` 목록에 fetch 함수 추가, 결과 합산 로직(`fetched`, `upserted`) 갱신
5. `AdminApiSyncPage.tsx`의 `SOURCES` 배열에서 해당 발주처 status를 `pending` → `live`로 변경
6. 실제 인증키로 1회 동기화 실행 → `sync_log` 결과와 `announcements` 테이블 upsert 건수로 배포 검증
7. 본 부속서(Appendix A)의 해당 발주처 표를 "코드 미작성" → "연동 완료"로 갱신

---

## Version History

### v1.0 (2026-09-12)
- 최초 작성. `sync-announcements/index.ts` 코드 및 `AdminApiSyncPage.tsx` SOURCES 정의를 근거로 PPS/DAPA/KEPCO/EX 4개 발주처 상세 스펙과 LH/K-water/가스공사 3개 발주처 연동 계획을 문서화.
