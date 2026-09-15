// 공고 제목 기반 공사 종류(공종) 자동 분류 + 표준 위험성평가 항목 추천.
// 이전 레거시 구현(src/types/constructionTemplates.ts)의 규칙을 그대로 포팅했다 —
// LLM 없이 키워드 매칭만으로 동작하는 규칙 기반 1차 분류이며, 사용자가 위험성평가
// 항목을 언제든 직접 추가/수정하는 것을 전제로 한 출발점 데이터다.

export type ConstructionType =
  | "종합건축공사"
  | "실내건축공사"
  | "토목공사"
  | "철거공사"
  | "강구조물공사"
  | "도장·방수공사"
  | "전기공사"
  | "정보통신공사"
  | "소방시설공사"
  | "기계설비공사"
  | "조경공사"
  | "일반공사";

interface ClassificationRule {
  type: ConstructionType;
  keywords: string[];
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  { type: "철거공사", keywords: ["철거", "해체", "석면"] },
  { type: "소방시설공사", keywords: ["소방", "스프링클러", "옥내소화전", "제연설비", "소화설비"] },
  { type: "정보통신공사", keywords: ["정보통신", "통신구", "통신선로", "CCTV", "방송설비", "네트워크"] },
  { type: "전기공사", keywords: ["전기", "변전", "수배전", "태양광", "전력", "배전반"] },
  { type: "기계설비공사", keywords: ["기계설비", "배관", "냉난방", "공조", "급배수", "승강기", "엘리베이터", "리프트", "펌프", "밸브"] },
  { type: "조경공사", keywords: ["조경", "식재", "녹지", "공원", "숲"] },
  { type: "도장·방수공사", keywords: ["도장", "방수", "도색"] },
  { type: "강구조물공사", keywords: ["강구조", "철골"] },
  { type: "실내건축공사", keywords: ["실내", "리모델링", "인테리어", "내부", "환경개선", "도배", "장판", "칸막이", "개보수"] },
  { type: "토목공사", keywords: ["토목", "도로", "하천", "옹벽", "포장", "아스콘", "상하수도", "준설", "터널", "교량", "제방", "배수로"] },
  { type: "종합건축공사", keywords: ["신축", "증축", "건축물", "청사", "학교", "아파트", "건립", "개축"] },
];

// 제목에 "건축·토목·조경·기계"처럼 여러 공종이 나열된 경우, 철거처럼 명백히 우선해야
// 할 위험 요인이 없다면 특정 전문공종(예: 조경) 하나로 단정 짓지 않고 종합건축공사로
// 분류한다 — 그렇지 않으면 규칙 순서상 우연히 먼저 매칭된 공종(정원 손질 등)이 대형
// 복합 건립사업 전체를 대표해버려 실제 위험요인과 동떨어진 추천이 나온다.
const TRADE_ENUM_KEYWORDS = ["건축", "토목", "조경", "기계", "전기", "통신", "설비", "소방"];
function isMultiTradeEnumeration(title: string): boolean {
  const matches = title.match(/[가-힣]+(?:[·,][가-힣]+){2,}/g) ?? [];
  return matches.some((group) => {
    const parts = group.split(/[·,]/);
    const tradeHits = parts.filter((p) => TRADE_ENUM_KEYWORDS.some((kw) => p.includes(kw)));
    return tradeHits.length >= 2;
  });
}

// "연면적 / 건물 층수"는 건축 공사에만 맞는 규모 항목이다 — 토목/조경/전기/소방
// 등은 물리적 층수 개념이 아예 없으므로, 공종에 맞는 규모 항목 라벨로 바꿔준다.
const SCALE_FIELD_BY_TYPE: Record<ConstructionType, { label: string; placeholder: string }> = {
  종합건축공사: { label: "연면적 / 건물 층수", placeholder: "연면적 / 건물 층수를 입력하세요" },
  실내건축공사: { label: "리모델링 면적 / 층수", placeholder: "리모델링 면적 / 층수를 입력하세요" },
  강구조물공사: { label: "연면적 / 건물 층수", placeholder: "연면적 / 건물 층수를 입력하세요" },
  철거공사: { label: "철거 면적 / 층수", placeholder: "철거 면적 / 층수를 입력하세요" },
  토목공사: { label: "공사연장 / 구간", placeholder: "공사연장(구간 길이) / 구간을 입력하세요" },
  조경공사: { label: "조경면적 / 식재수량", placeholder: "조경면적 / 식재수량을 입력하세요" },
  "도장·방수공사": { label: "시공면적", placeholder: "시공면적을 입력하세요" },
  전기공사: { label: "설비용량 / 규모", placeholder: "설비용량(kW 등) / 규모를 입력하세요" },
  정보통신공사: { label: "설비용량 / 규모", placeholder: "설비 규모(회선·구간 수 등)를 입력하세요" },
  소방시설공사: { label: "설비용량 / 규모", placeholder: "설비 규모(방호구역 수 등)를 입력하세요" },
  기계설비공사: { label: "설비용량 / 규모", placeholder: "설비용량 / 규모를 입력하세요" },
  일반공사: { label: "공사 규모", placeholder: "공사 규모를 입력하세요" },
};

export function scaleFieldFor(type: ConstructionType): { label: string; placeholder: string } {
  return SCALE_FIELD_BY_TYPE[type] ?? SCALE_FIELD_BY_TYPE["일반공사"];
}

export function classifyConstructionType(title: string): ConstructionType {
  const highPriorityHazard = CLASSIFICATION_RULES.slice(0, 1); // 철거(석면 등)는 나열 여부와 무관하게 항상 우선.
  for (const rule of highPriorityHazard) {
    if (rule.keywords.some((kw) => title.includes(kw))) return rule.type;
  }
  if (isMultiTradeEnumeration(title)) return "종합건축공사";
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.keywords.some((kw) => title.includes(kw))) return rule.type;
  }
  return "일반공사";
}

interface RiskTemplateItem {
  process: string;
  hazard: string;
  countermeasure: string;
}

export const RISK_TEMPLATES: Record<ConstructionType, RiskTemplateItem[]> = {
  종합건축공사: [
    { process: "골조공사 / 고소작업", hazard: "안전대 미착용 또는 안전난간 미설치 상태에서 이동 중 추락(떨어짐) 위험", countermeasure: "안전대 착용 및 안전난간 설치, 개구부 덮개 설치" },
    { process: "양중작업 / 자재 인양", hazard: "슬링벨트 결속 불량 및 강풍으로 인한 인양물 낙하 위험", countermeasure: "인양구간 출입통제, 신호수 배치, 와이어로프 점검" },
    { process: "거푸집·동바리 설치", hazard: "구조검토 미비로 인한 거푸집·동바리 붕괴 위험", countermeasure: "구조검토 후 설치, 콘크리트 타설 전 안전점검 실시" },
  ],
  실내건축공사: [
    { process: "철거 및 마감작업", hazard: "철거 구간 낙하물에 의한 부상 위험", countermeasure: "철거 구간 출입통제, 낙하물 방지망 설치" },
    { process: "마감재 시공", hazard: "분진·유해가스 흡입으로 인한 건강장해", countermeasure: "국소배기장치 설치, 방진마스크 지급" },
    { process: "전기 배선작업", hazard: "전동공구 사용 중 감전 위험", countermeasure: "접지 및 누전차단기 설치, 정기 절연점검" },
  ],
  토목공사: [
    { process: "굴착 및 흙막이", hazard: "구배기준 미준수로 인한 굴착사면 및 흙막이 붕괴 위험", countermeasure: "구배기준 준수, 흙막이 지보공 설치, 계측관리" },
    { process: "건설기계 작업", hazard: "건설기계(굴착기·덤프트럭 등)와 근로자 협착·전도 위험", countermeasure: "유도자 배치, 후진경보장치 확인" },
    { process: "포장작업", hazard: "포장장비(롤러·피니셔) 접촉으로 인한 화상·협착 위험", countermeasure: "접근금지구역 설정, 신호체계 확립" },
  ],
  철거공사: [
    { process: "구조물 해체", hazard: "해체계획 미준수로 인한 구조물 붕괴 및 낙하물 위험", countermeasure: "해체계획서에 따른 순서 준수, 지지대 확인" },
    { process: "유해물질 제거", hazard: "석면 등 유해물질 노출 위험", countermeasure: "사전조사 및 안전한 제거작업, 방진마스크·보호복 착용" },
    { process: "중장비 해체작업", hazard: "중장비(브레이커 등) 협착 위험", countermeasure: "작업반경 출입통제, 신호수 배치" },
  ],
  강구조물공사: [
    { process: "철골 조립작업", hazard: "고소 철골작업 중 추락 위험", countermeasure: "안전대 부착설비 설치, 안전난간·수평보호망 설치" },
    { process: "강재 인양작업", hazard: "인양로프·샤클 불량으로 인한 강재 낙하 위험", countermeasure: "인양로프·샤클 점검, 낙하위험구간 통제" },
    { process: "용접·용단 작업", hazard: "용접·용단 작업 중 화재·화상 위험", countermeasure: "불티비산방지막 설치, 소화기 비치" },
  ],
  "도장·방수공사": [
    { process: "도장작업", hazard: "유기용제 흡입으로 인한 중독 위험", countermeasure: "환기설비 설치, 방독마스크 지급" },
    { process: "고소 도장작업", hazard: "고소 도장작업 중 추락 위험", countermeasure: "이동식비계·안전대 사용, 안전난간 설치" },
    { process: "옥상 방수작업", hazard: "옥상방수 작업 중 열탕(아스팔트) 화상 위험", countermeasure: "보호장갑·보호복 착용" },
  ],
  전기공사: [
    { process: "활선 근접작업", hazard: "활선 작업 중 감전 위험", countermeasure: "정전작업 원칙, 절연용 보호구 착용" },
    { process: "고소 배전작업", hazard: "고소 전주·배전작업 중 추락 위험", countermeasure: "안전대 착용, 승주용 발판 확인" },
    { process: "케이블 포설", hazard: "케이블 포설 중 협착 위험", countermeasure: "견인장비 정격하중 준수" },
  ],
  정보통신공사: [
    { process: "고소 설치작업", hazard: "고소 안테나·중계기 설치작업 중 추락 위험", countermeasure: "안전대 착용, 작업발판 확인" },
    { process: "케이블 포설", hazard: "케이블 포설 중 협착 위험", countermeasure: "견인기 정격하중 준수, 신호체계 확립" },
    { process: "맨홀·핸드홀 작업", hazard: "맨홀·핸드홀 내 작업 중 질식 위험", countermeasure: "유해가스 측정, 환기 실시" },
  ],
  소방시설공사: [
    { process: "배관 용접작업", hazard: "배관 용접작업 중 화재 위험", countermeasure: "화기작업 허가제, 불티받이 설치" },
    { process: "고소 스프링클러 설치", hazard: "고소 스프링클러 설치작업 중 추락 위험", countermeasure: "이동식비계·안전대 사용" },
    { process: "소방수조 작업", hazard: "소방수조 내 작업 중 익수·질식 위험", countermeasure: "산소농도 측정, 구명줄 사용" },
  ],
  기계설비공사: [
    { process: "배관 설치작업", hazard: "배관 설치 중 고소 추락 위험", countermeasure: "안전대·안전난간 설치" },
    { process: "중량물 인양작업", hazard: "중량물(펌프·탱크 등) 인양 중 낙하·협착 위험", countermeasure: "인양장비 정격하중 준수, 신호수 배치" },
    { process: "밀폐공간 작업", hazard: "밀폐공간(기계실·피트) 작업 중 질식 위험", countermeasure: "환기 실시, 산소농도 측정" },
  ],
  조경공사: [
    { process: "수목 식재작업", hazard: "중량물 취급으로 인한 요통 등 근골격계질환", countermeasure: "중량물 취급요령 교육, 보조기구 사용" },
    { process: "굴착기 작업", hazard: "굴착기 등 장비 협착 위험", countermeasure: "작업반경 출입통제, 유도자 배치" },
    { process: "수목 전정작업", hazard: "고소(수목전정) 작업 중 추락 위험", countermeasure: "안전대 착용, 사다리 전도방지 조치" },
  ],
  일반공사: [
    { process: "고소작업", hazard: "고소작업 중 추락 위험", countermeasure: "안전대 착용, 안전난간 설치" },
    { process: "건설기계 작업", hazard: "건설기계와 근로자 충돌 위험", countermeasure: "유도자 배치, 작업반경 출입통제" },
    { process: "자재 취급작업", hazard: "중량물 취급 중 협착·요통 위험", countermeasure: "운반기구 활용, 2인1조 작업" },
  ],
};

// 실제 LH 샘플(화성동탄(2), 붙임2 "최초위험성평가서" 146~154p)의 빈도×강도법을
// 그대로 따른다 — 빈도 1~3, 강도 1~3을 곱해 위험성(1~9)을 산출.
const HIGH_RISK_KEYWORDS = ["추락", "붕괴", "감전", "질식", "폭발", "화재", "매몰", "무너짐"];
const MID_RISK_KEYWORDS = ["협착", "충돌", "낙하", "화상", "베임", "전도", "끼임"];

export function suggestFrequencySeverity(hazard: string): { frequency: number; severity: number } {
  if (HIGH_RISK_KEYWORDS.some((kw) => hazard.includes(kw))) return { frequency: 3, severity: 3 };
  if (MID_RISK_KEYWORDS.some((kw) => hazard.includes(kw))) return { frequency: 2, severity: 3 };
  return { frequency: 1, severity: 2 };
}

// "위험분류" — 실제 샘플의 관리적/인적/물리적/기계적/화학적요인 5분류를 그대로 쓴다.
export type HazardType = "관리적요인" | "인적요인" | "물리적요인" | "기계적요인" | "화학적요인";
export const HAZARD_TYPE_OPTIONS: HazardType[] = ["관리적요인", "인적요인", "물리적요인", "기계적요인", "화학적요인"];

const HAZARD_TYPE_RULES: { type: HazardType; keywords: string[] }[] = [
  { type: "화학적요인", keywords: ["화재", "중독", "MSDS", "유해물질", "석면", "분진", "유기용제", "가스", "폭발", "질식", "화상", "화학"] },
  { type: "기계적요인", keywords: ["협착", "전도", "크레인", "건설기계", "지게차", "굴착기", "베임", "끼임", "말림", "장비"] },
  { type: "물리적요인", keywords: ["소음", "진동", "붕괴", "매몰", "낙하", "추락", "감전", "무너짐", "침수"] },
  { type: "인적요인", keywords: ["부주의", "실족", "걸려", "무리한", "근골격계", "무단출입", "충돌"] },
];

export function classifyHazardType(hazard: string): HazardType {
  for (const rule of HAZARD_TYPE_RULES) {
    if (rule.keywords.some((kw) => hazard.includes(kw))) return rule.type;
  }
  return "관리적요인";
}

// 실제로 편집·추가·삭제 가능한 위험성평가 행 하나의 구조 — 경쟁사 서식이 아니라
// 실제 LH "최초위험성평가서" 샘플 컬럼(세부공정명/위험분류/유해위험요인/현재의
// 안전보건조치/빈도·강도·위험성/위험성 감소대책/개선후 위험성/개선예정일/
// 개선완료일/개선여부확인)을 그대로 반영한다. 문서마다 몇 개가 있을지 알 수
// 없는 가변 길이 데이터라서, WizardScreen의 DOM 순서 기반 field-N 자동저장
// 체계에 태우지 않고 documents.content.riskRows에 배열 그대로 저장한다(행
// 추가/삭제 시 뒤에 나오는 다른 필드들의 인덱스가 밀려서 엉뚱한 값이 저장되는
// 사고를 원천 차단하기 위함).
export type RiskRow = {
  id: string;
  process: string;
  hazardType: HazardType;
  hazard: string;
  currentAction: string;
  frequency: number;
  severity: number;
  countermeasure: string;
  afterRisk: number;
  dueDate: string;
  completeDate: string;
  confirmedBy: string;
};

function makeRiskRowId(): string {
  return `risk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 문서를 처음 열었을 때(아직 riskRows가 저장되어 있지 않을 때) 보여줄 출발점
// 데이터 — 공고 제목 기반 자동분류 공종의 표준 항목 3개를 실제 편집 가능한
// 행으로 변환한다. 개선예정일/완료일/확인자는 실제 샘플에서 거의 모든 행에
// 공통으로 쓰인 "착공전"/"공사시"/"현장대리인, 근로자"를 기본값으로 둔다.
export function buildInitialRiskRows(type: ConstructionType): RiskRow[] {
  const items = RISK_TEMPLATES[type] ?? RISK_TEMPLATES["일반공사"];
  return items.map((item) => {
    const { frequency, severity } = suggestFrequencySeverity(item.hazard);
    return {
      id: makeRiskRowId(),
      process: item.process,
      hazardType: classifyHazardType(item.hazard),
      hazard: item.hazard,
      currentAction: "",
      frequency,
      severity,
      countermeasure: item.countermeasure,
      afterRisk: 1,
      dueDate: "착공전",
      completeDate: "공사시",
      confirmedBy: "현장대리인, 근로자",
    };
  });
}

export function newBlankRiskRow(): RiskRow {
  return {
    id: makeRiskRowId(),
    process: "",
    hazardType: "관리적요인",
    hazard: "",
    currentAction: "",
    frequency: 1,
    severity: 2,
    countermeasure: "",
    afterRisk: 1,
    dueDate: "",
    completeDate: "",
    confirmedBy: "",
  };
}

// 상단 "집중관리 대상공종" 필터 탭에 쓰일, 공정명 텍스트 기반의 간단한 분류.
// 실제 데이터(공정명)에 어떤 키워드가 있는지로 판정하므로 발주처·공종과
// 무관하게 항상 정직하게 동작한다 — 해당 안 되면 전부 "일반공사"로 묶인다.
const RISK_CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "가설비계 및 흙막이", keywords: ["비계", "흙막이", "거푸집", "동바리", "가설"] },
  { category: "타워크레인 양중", keywords: ["타워크레인", "크레인", "양중", "인양"] },
  { category: "굴착 및 토공사", keywords: ["굴착", "토공", "흙", "터파기"] },
];

export function categorizeRiskProcess(process: string): string {
  for (const rule of RISK_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => process.includes(kw))) return rule.category;
  }
  return "일반공사";
}

// "공공 표준 위험요인 DB 불러오기" 드롭다운에 채울 전체 목록 — 공종 구분 없이
// RISK_TEMPLATES 전체를 평탄화한다(실제 발주처는 여러 공종이 혼재된 복합
// 공사가 많아, 자동분류된 공종 하나의 항목만으로는 부족한 경우가 많다).
export type RiskLibraryItem = { type: ConstructionType; process: string; hazard: string; countermeasure: string };

export function buildRiskLibrary(): RiskLibraryItem[] {
  return (Object.keys(RISK_TEMPLATES) as ConstructionType[]).flatMap((type) =>
    RISK_TEMPLATES[type].map((item) => ({ type, ...item }))
  );
}

const riskEscapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function hazardTypeSelectHtml(current: HazardType): string {
  const options = HAZARD_TYPE_OPTIONS.map(
    (t) => `<option value="${t}"${t === current ? " selected" : ""}>${t}</option>`
  ).join("");
  return `<select class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-1.5 py-1.5" data-risk-field="hazardType">${options}</select>`;
}

// row.frequency/severity/afterRisk는 TS 타입상 number지만, 실제로는 브라우저의
// serializeRiskRows()가 <select>.value(항상 문자열)를 그대로 documents.content.
// riskRows에 저장하므로 런타임에는 문자열("3")로 들어온다. 여기서 Number()로
// 강제 변환하지 않고 "===" 로 비교하면(예: 1 === "3") 항상 false가 되어 저장된
// 값과 무관하게 매번 첫 옵션이 선택된 것처럼 보이는(그러나 실제로는 아무 옵션도
// selected가 안 붙는) 사고가 실측으로 확인됐다.
function scoreSelectHtml(field: "frequency" | "severity", current: number): string {
  const cur = Number(current) || 1;
  const options = [1, 2, 3]
    .map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v}</option>`)
    .join("");
  return `<select class="w-full text-xs text-center bg-white border border-neutral-300 rounded-lg px-1 py-1.5" data-risk-field="${field}">${options}</select>`;
}

function afterRiskSelectHtml(current: number): string {
  const cur = Number(current) || 1;
  const options = Array.from({ length: 9 }, (_, i) => i + 1)
    .map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v}</option>`)
    .join("");
  return `<select class="w-full text-xs text-center bg-white border border-neutral-300 rounded-lg px-1 py-1.5" data-risk-field="afterRisk">${options}</select>`;
}

// 실제 편집 가능한 <tr> 하나를 만든다. rowIndex가 없으면(신규 행 템플릿용)
// 번호란은 JS가 매 렌더 후 다시 매겨준다(data-risk-no). "위험성"(빈도×강도)
// 칸은 사용자가 직접 고르는 값이 아니라 두 값의 곱을 그대로 보여주는 읽기전용
// 칸이라, WizardScreen이 frequency/severity 변경 시마다 다시 계산해 넣는다.
function buildRiskRowHtml(row: RiskRow, rowIndex: number | null): string {
  const no = rowIndex === null ? "--" : String(rowIndex + 1).padStart(2, "0");
  const category = riskEscapeHtml(categorizeRiskProcess(row.process));
  const riskScore = row.frequency * row.severity;
  return `<tr class="hover:bg-neutral-50/80 transition" data-risk-id="${riskEscapeHtml(row.id)}" data-risk-category="${category}">
<td class="p-3 text-center font-mono text-neutral-500" data-risk-no>${no}</td>
<td class="p-3">
<input class="w-full text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-risk-field="process" placeholder="세부공정명" type="text" value="${riskEscapeHtml(row.process)}"/>
</td>
<td class="p-3">${hazardTypeSelectHtml(row.hazardType)}</td>
<td class="p-3">
<textarea class="w-full text-xs text-neutral-700 bg-white border border-neutral-300 rounded-lg px-2 py-1.5 leading-relaxed" data-risk-field="hazard" placeholder="유해·위험요인" rows="2">${riskEscapeHtml(row.hazard)}</textarea>
</td>
<td class="p-3">
<textarea class="w-full text-xs text-neutral-700 bg-white border border-neutral-300 rounded-lg px-2 py-1.5 leading-relaxed" data-risk-field="currentAction" placeholder="현재의 안전보건조치" rows="2">${riskEscapeHtml(row.currentAction)}</textarea>
</td>
<td class="p-3 text-center">${scoreSelectHtml("frequency", row.frequency)}</td>
<td class="p-3 text-center">${scoreSelectHtml("severity", row.severity)}</td>
<td class="p-3 text-center">
<input class="w-full text-xs text-center font-bold bg-neutral-100 border border-neutral-200 rounded-lg px-1 py-1.5 text-neutral-700" data-risk-field="riskScore" readonly type="text" value="${riskScore}"/>
</td>
<td class="p-3">
<textarea class="w-full text-xs text-neutral-700 bg-white border border-neutral-300 rounded-lg px-2 py-1.5 leading-relaxed" data-risk-field="countermeasure" placeholder="위험성 감소대책" rows="2">${riskEscapeHtml(row.countermeasure)}</textarea>
</td>
<td class="p-3 text-center">${afterRiskSelectHtml(row.afterRisk)}</td>
<td class="p-3">
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-risk-field="dueDate" placeholder="개선예정일" type="text" value="${riskEscapeHtml(row.dueDate)}"/>
</td>
<td class="p-3">
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-risk-field="completeDate" placeholder="개선완료일" type="text" value="${riskEscapeHtml(row.completeDate)}"/>
</td>
<td class="p-3">
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-risk-field="confirmedBy" placeholder="현장대리인, 근로자" type="text" value="${riskEscapeHtml(row.confirmedBy)}"/>
</td>
<td class="p-3 text-center">
<button class="text-neutral-400 hover:text-status-danger transition" data-risk-delete type="button" title="행 삭제">
<span class="material-symbols-outlined text-lg">delete</span>
</button>
</td>
</tr>`;
}

// 기존(예전 컬럼: level/afterLevel/status)에 저장된 문서를 열면 hazardType/
// currentAction/frequency/severity/afterRisk/dueDate/completeDate/confirmedBy가
// 전부 undefined라 riskEscapeHtml(undefined)에서 그대로 죽는 사고가 실제로
// 발생했다 — 새 컬럼으로 서식을 바꾸기 전에 저장된 문서도 깨지지 않고 열리도록,
// 렌더링 직전에 항상 이 함수를 거쳐 누락된 필드를 안전한 기본값(가능하면 예전
// level/afterLevel 값을 재활용)으로 채운다.
const LEGACY_LEVEL_TO_FREQ_SEVERITY: Record<string, { frequency: number; severity: number }> = {
  상: { frequency: 3, severity: 3 },
  중: { frequency: 2, severity: 3 },
  하: { frequency: 1, severity: 2 },
};
const LEGACY_LEVEL_TO_AFTER_RISK: Record<string, number> = { 상: 6, 중: 4, 하: 1 };

export function normalizeRiskRow(row: Partial<RiskRow> & { id: string; process?: string }): RiskRow {
  const legacy = row as Partial<RiskRow> & { level?: string; afterLevel?: string };
  const legacyFreqSeverity = legacy.level ? LEGACY_LEVEL_TO_FREQ_SEVERITY[legacy.level] : undefined;
  return {
    id: row.id,
    process: row.process ?? "",
    hazardType: row.hazardType ?? classifyHazardType(row.hazard ?? ""),
    hazard: row.hazard ?? "",
    currentAction: row.currentAction ?? "",
    frequency: row.frequency ?? legacyFreqSeverity?.frequency ?? 1,
    severity: row.severity ?? legacyFreqSeverity?.severity ?? 2,
    countermeasure: row.countermeasure ?? "",
    afterRisk: row.afterRisk ?? (legacy.afterLevel ? LEGACY_LEVEL_TO_AFTER_RISK[legacy.afterLevel] : undefined) ?? 1,
    dueDate: row.dueDate ?? "",
    completeDate: row.completeDate ?? "",
    confirmedBy: row.confirmedBy ?? "",
  };
}

export function buildRiskRowsHtml(rows: RiskRow[]): string {
  return rows.map((row, i) => buildRiskRowHtml(normalizeRiskRow(row), i)).join("\n");
}

// WizardScreen이 "행 추가" 클릭 시 그대로 복제해 새 행을 만들 수 있도록,
// 빈 행 템플릿 하나를 <template> 태그로 감싸 심어둔다. rowIndex=null이라
// 번호란에는 "--"가 들어가고, WizardScreen이 삽입 직후 실제 위치에 맞게
// 번호를 다시 매긴다.
export function buildRiskRowTemplateHtml(): string {
  const blank = newBlankRiskRow();
  return `<template id="risk-row-template">${buildRiskRowHtml(blank, null)}</template>`;
}

// "공공 표준 위험요인 DB 불러오기" 드롭다운 — 선택한 항목의 실제 데이터를
// data-* 속성에 그대로 실어 보내서, 클라이언트 JS가 별도 데이터 없이도
// DOM만 읽어 새 행을 만들 수 있게 한다.
export function buildRiskLibrarySelectHtml(): string {
  const byType = new Map<ConstructionType, RiskLibraryItem[]>();
  for (const item of buildRiskLibrary()) {
    const list = byType.get(item.type) ?? [];
    list.push(item);
    byType.set(item.type, list);
  }
  const optgroups = Array.from(byType.entries())
    .map(([type, items]) => {
      const options = items
        .map(
          (item) =>
            `<option data-process="${riskEscapeHtml(item.process)}" data-hazard="${riskEscapeHtml(item.hazard)}" data-countermeasure="${riskEscapeHtml(item.countermeasure)}" value="${riskEscapeHtml(item.process)}">${riskEscapeHtml(item.process)}</option>`
        )
        .join("");
      return `<optgroup label="${riskEscapeHtml(type)}">${options}</optgroup>`;
    })
    .join("");
  return `<select class="text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2 py-1.5 rounded-lg transition border-none" data-risk-db-select>
<option value="">+ 공공 표준 위험요인 DB 불러오기</option>
${optgroups}
</select>`;
}

// 상단 "집중관리 대상공종" 필터 탭 — 실제로 이 문서의 행들에 존재하는 분류만
// 탭으로 보여준다(존재하지도 않는 공종 탭을 항상 고정으로 띄우지 않기 위함).
const CATEGORY_ORDER = ["가설비계 및 흙막이", "타워크레인 양중", "굴착 및 토공사", "일반공사"];

export function buildRiskFilterTabsHtml(rows: RiskRow[]): string {
  const present = new Set(rows.map((r) => categorizeRiskProcess(r.process)));
  const categories = CATEGORY_ORDER.filter((c) => present.has(c));
  if (categories.length === 0) categories.push("일반공사");
  const tabs = categories
    .map(
      (c, i) =>
        `<button class="${i === 0 ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600 hover:text-neutral-900"} px-3 py-1 rounded" data-risk-tab="${riskEscapeHtml(c)}" type="button">${riskEscapeHtml(c)}</button>`
    )
    .join("\n");
  return `${tabs}
<button class="text-neutral-600 hover:text-neutral-900 px-3 py-1 rounded" data-risk-tab="전체보기" type="button">전체보기</button>`;
}
