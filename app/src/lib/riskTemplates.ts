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

const HIGH_RISK_KEYWORDS = ["추락", "붕괴", "감전", "질식", "폭발", "화재", "매몰", "무너짐"];
const MID_RISK_KEYWORDS = ["협착", "충돌", "낙하", "화상", "베임", "전도", "끼임"];

export function suggestRiskLevel(hazard: string): "상" | "중" | "하" {
  if (HIGH_RISK_KEYWORDS.some((kw) => hazard.includes(kw))) return "상";
  if (MID_RISK_KEYWORDS.some((kw) => hazard.includes(kw))) return "중";
  return "하";
}

export function buildRiskRowsHtml(type: ConstructionType): string {
  const items = RISK_TEMPLATES[type] ?? RISK_TEMPLATES["일반공사"];
  const LEVEL_STYLE: Record<"상" | "중" | "하", { cls: string; score: string }> = {
    상: { cls: "bg-status-dangerSoft text-status-danger border border-status-danger/30", score: "4×4=16" },
    중: { cls: "bg-status-warnSoft text-status-warn border border-status-warn/30", score: "3×3=9" },
    하: { cls: "bg-status-successSoft text-status-success border border-status-success/30", score: "2×2=4" },
  };
  return items
    .map((item, i) => {
      const level = suggestRiskLevel(item.hazard);
      const style = LEVEL_STYLE[level];
      const no = String(i + 1).padStart(2, "0");
      return `<tr class="hover:bg-neutral-50/80 transition">
<td class="p-3 text-center font-mono text-neutral-500">${no}</td>
<td class="p-3 font-semibold text-neutral-900">${item.process}</td>
<td class="p-3 text-neutral-700 leading-relaxed">${item.hazard}</td>
<td class="p-3 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${style.cls}">${level} (${style.score})</span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">${item.countermeasure}</td>
<td class="p-3 text-center font-semibold text-neutral-600">
<span class="px-2 py-0.5 rounded-full text-[11px] bg-status-successSoft text-status-success">하 (2×2=4)</span>
</td>
<td class="p-3 text-center">
<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-800">계획반영</span>
</td>
</tr>`;
    })
    .join("\n");
}
