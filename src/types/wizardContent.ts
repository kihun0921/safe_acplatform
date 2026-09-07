// 안전보건관리계획서(국방부/군부대 - 수의계약) 작성 마법사 데이터 모델
// 실제 HWP 샘플 3종(빈 양식/평가기준/작성예시) 분석 결과를 기준으로 설계됨.

export interface RiskRow {
  id: string
  no: number
  hazard: string
  level: '상' | '중' | '하' | ''
  countermeasure: string
  plannedDate: string
  completedDate: string
  manager: string
  frequency: string // 빈도·강도법 전용 (1~5), 다른 방법에서는 빈 문자열
  severity: string // 빈도·강도법 전용 (1~5)
  checked: boolean // 체크리스트법 전용 (해당여부), 기본 true
  // 아래 5개는 "상세보기" 팝업에서만 편집하는 확장 필드 — 실제 발주기관 설계안전보건대장
  // 및 시공사 최초위험성평가서 서식의 "세부공정명/위험분류/현재의 안전보건조치/개선후
  // 위험성/확인자" 항목에 대응한다. 전부 선택 입력(빈 문자열 허용)이며, 하나도 채우지
  // 않으면 표/내보내기에 추가 칼럼이 늘어나지 않는다.
  processName: string // 세부공정명(공종·세부공정) — 예: "토공(터파기 등)"
  hazardCategory: string // 위험분류 — 예: 인적요인/물적요인/기계적요인/화학적요인/작업환경요인
  currentMeasures: string // 현재의 안전보건조치(감소대책 적용 전, 이미 시행 중인 조치)
  residualRisk: string // 감소대책 적용 후(개선후) 위험성
  confirmer: string // 개선여부 확인자 — 예: 현장대리인, 안전관리자
}

export interface PpeRow {
  id: string
  name: string
  qty: string
  target: string
  managementPlan: string
}

export interface EducationRow {
  id: string
  type: string
  target: string
  hours: string
  completedDate: string
  nextDueDate: string
  institution: string
  cycle: string
}

export type ChecklistResult = '양호' | '불량' | '해당없음' | ''

export interface ChecklistItemResult {
  label: string
  result: ChecklistResult
}

export interface ChecklistCategoryResult {
  category: string
  items: ChecklistItemResult[]
}

export interface UploadedFile {
  path: string
  name: string
}

// ── Ⅱ~Ⅳ 신규 섹션용 행 타입 (경쟁사 수준 15섹션 확장) ──────────────────────
export interface PreventionRow {
  id: string
  goal: string
  task: string
  scheduleH1: string
  scheduleH2: string
  kpi: string
  dept: string
  achievementRate: string
  note: string
}

// 작업 중 사용하는 기계·기구·설비별 산재예방대책 체크매트릭스 (발주기관 표준양식 기준)
export interface MachineryPreventionRow {
  id: string
  item: string
  guardInstall: boolean // 방호장치 설치
  ppeProvision: boolean // 보호구 지급·착용
  safetyEducation: boolean // 안전보건교육
  signagePost: boolean // 안전보건표지부착/안전수칙게시
  otherMeasure: string // 기타 대책
}

// 작업 중 사용/발생하는 유해·위험물질별 산재예방대책 체크매트릭스
export interface HazardPreventionRow {
  id: string
  item: string
  localExhaust: boolean // 국소배기장치 설치
  ppeProvision: boolean // 보호구 지급·착용
  safetyEducation: boolean // 안전보건교육
  signagePost: boolean // 안전보건표지부착/안전수칙게시
  otherMeasure: string // 기타 대책(설비교체 등)
}

// 위 두 매트릭스에서 체크한 항목을 "취약한 부분/산재예방대책/실행계획"으로 구체화하는 표
export interface PreventionExecutionRow {
  id: string
  weakPoint: string
  measure: string
  executionPlan: string
  note: string
}

export interface SafetyOrgRole {
  role: string
  name: string
}

export interface WorkPermitRow {
  id: string
  task: string
  writer: string
  reviewer: string
  watcher: string
  confirmer: string
  note: string
}

export interface ContactRow {
  id: string
  name: string
  phone: string
}

export interface SignalRow {
  id: string
  work: string
  method: string
  procedure: string
  note: string
}

export interface HazardousItemRow {
  id: string
  name: string
  controlMeasure: string
  checkItem: string
  manager: string
  // 발주기관(LH 등) 붙임8 서식이 요구하는 "증빙서류" 열 — 인증서, MSDS, 점검표 등.
  evidenceDoc: string
  // 붙임8 서식의 "비고(관계법령 등)" 열 — 근거 법령·규칙 등.
  note: string
}

// 재해예방을 위한 안전보건 장비(물품) 및 시설 운용 현황 (유해가스누출측정기, 비산불티방지포 등)
export interface SafetyEquipmentRow {
  id: string
  name: string // 품명 및 규격
  qty: string // 수량
  location: string // 개소 / 설치장소
  certStatus: string // 검교정 및 인증여부
}

// 개인보호구 "개인별 지급기록" — 붙임8 서식이 요구하는, 품목이 아니라 근로자 1인 단위로
// 지급 이력을 남기는 표(기존 품명 단위의 PpeRow와는 별개로 관리한다).
export interface PpeIndividualIssuanceRow {
  id: string
  category: string // 구분: 개인보호구 / 공용보호구
  jobType: string // 직종
  workerName: string // 근로자명
  itemName: string // 보호구명
  qty: string // 지급수량
  issuedSignature: string // 지급서명(또는 지급시기)
  certified: boolean // 안전인증 여부(O/X)
}

// 안전 순회점검·자체점검·합동점검 등 "점검계획"(누가·언제·어디를) — 이미 실시한 결과를 담는
// checklist(체크리스트)와 달리, 계획 단계에서 점검 종류별 주기와 담당자를 정해두는 표.
export interface InspectionPlanRow {
  id: string
  kind: string // 점검 종류 (자체점검/순회점검/합동점검 등)
  inspector: string // 점검자
  cycle: string // 점검주기
  target: string // 점검지역/대상
  note: string
}

// 안전보건 협의체 등 회의 계획
export interface MeetingPlanRow {
  id: string
  name: string // 회의명
  host: string // 회의주관
  timing: string // 회의시기
  attendees: string // 회의참석자
  note: string
}

export interface ApprovalEntry {
  role: string // 작성자/검토자/승인자 등 (고정 라벨)
  title: string // 직책
  name: string // 성명
}

export interface ProcedureRow {
  id: string
  work: string
  procedure: string
  note: string
}

export interface EmergencyTeamRow {
  id: string
  role: string
  member: string
  mainDuty: string
  note: string
}

export interface YearlyStat {
  year: string
  count: string
}

// ── Ⅷ. 작업투입 인력 인적사항 (LH 등 일부 발주기관이 작업개시 전까지 별도 제출을
// 요구하는 근로자 단위 명단) — 발주처 프로파일에서 토글로 켜는 선택 항목이다. ──
export interface VulnerableWorkerRow {
  id: string
  name: string
  company: string // 소속(업체명)
  category: string // 구분 — 예: 고령자(55세 이상), 여성근로자, 외국인노동자
  detail: string // 세부사항 — 예: 연령, 국적·체류자격 등
  assignedProcess: string // 담당 세부공정
  safetyMeasure: string // 배치 시 안전조치사항
}

export interface FireWatchAssignmentRow {
  id: string
  role: string // 지정구분 — 화재감시자/작업지휘자/감시자(신호수 등)
  name: string
  company: string
  workAssigned: string // 담당 작업(장소)
  designatedDate: string // 지정일
  trainingNote: string // 교육이수사항
}

export interface TwoPersonTeamRow {
  id: string
  workContent: string // 작업내용(세부공정)
  workDate: string // 작업일자
  member1: string // 1조 성명(주작업자)
  member2: string // 2조 성명(보조·감시자)
  company: string // 소속(업체명)
  contact: string // 비상연락처
}

export const RISK_METHODS = [
  '위험성수준 3단계(상·중·하) 판단법',
  '빈도·강도법',
  '체크리스트법',
  '핵심요인 기술법',
] as const

export const RISK_METHOD_DESCRIPTIONS: Record<(typeof RISK_METHODS)[number], string> = {
  '위험성수준 3단계(상·중·하) 판단법': '유해·위험요인별로 위험성수준을 상/중/하 3단계로 직접 판단합니다.',
  '빈도·강도법': '빈도(발생 가능성)와 강도(피해 정도)를 각각 1~5점으로 평가해, 곱한 값(1~25)으로 위험성을 산정합니다.',
  '체크리스트법': '표준 위험요인 항목 중 현장에 해당하는 것만 체크해서 위험성평가표를 구성합니다.',
  '핵심요인 기술법': '소규모 현장에 적합한 약식 기법으로, 위험성수준 평가 없이 핵심 유해·위험요인과 개선대책만 기술합니다.',
}

export type RiskMethod = (typeof RISK_METHODS)[number]

// 발주기관 유형 — 발주처마다 실제 제출 서식의 목차 구성·장(Ⅰ~Ⅷ) 번호가 달라, 선택한
// 발주처에 맞춰 좌측 목차 라벨과 다운로드 문서의 장(章) 번호를 바꿔 보여준다("일반"은
// 지금까지의 기본 구성 그대로). 발주처별 세부 항목(목차·서식)은 순차적으로 추가한다 —
// 현재는 LH만 전용 목차를 지원하고, 나머지는 "일반" 구성으로 작성한다.
export const AGENCY_TYPES = ['일반', 'LH', '국방부', '한전', '도로공사', '수자원공사'] as const

export type AgencyType = (typeof AGENCY_TYPES)[number]

// 공고 제목 기반 공사 성질 자동 분류에 사용하는 공종 구분.
// 표준 위험성평가 항목 라이브러리(constructionTemplates.ts)의 키와 1:1 대응한다.
export const CONSTRUCTION_TYPES = [
  '종합건축공사',
  '실내건축공사',
  '토목공사',
  '철거공사',
  '강구조물공사',
  '도장·방수공사',
  '전기공사',
  '정보통신공사',
  '소방시설공사',
  '기계설비공사',
  '조경공사',
  '일반공사',
] as const

export type ConstructionType = (typeof CONSTRUCTION_TYPES)[number]

// 현장 점검 체크리스트 고정 문항 (실제 샘플 문서 기준, 9개 카테고리 총 46문항)
export const CHECKLIST_TEMPLATE: { category: string; items: string[] }[] = [
  {
    category: '일반사항',
    items: [
      '위험성평가 실시 및 근로자 숙지 상태',
      '적합한 개인보호구 지급 및 착용 여부',
      '작업장 정리정돈 및 안전통로 확보 상태',
      '추락방지를 위한 안전시설물(난간대 등) 설치 상태',
      '적합한 안전경고표지판 등의 설치 및 게시 여부',
      '적절한 채광 및 조명 등 작업장 조도 확보 상태',
      '적법한 휴게시설 및 휴식시간 제공 여부',
      '작업장 소음관리 상태(50dB 이하 권장)',
    ],
  },
  {
    category: '화재 및 폭발 예방',
    items: [
      '가연성 및 인화성 물질 관리상태',
      '화재감지기 설치 및 작동 이상 유무',
      '소화시설 설치 또는 소화기 배치 상태',
      '가스용단 작업 시 역화방지기 설치 상태',
      '가스실린더 전도방지 조치 및 캡 설치 여부',
    ],
  },
  {
    category: '작업발판',
    items: [
      '인증제품 등 적격품 사용 여부',
      '말비계 설치 지면의 수평도 확보 상태',
      '2m 초과 말비계 작업발판 40cm 이상 여부',
      '틀비계 안전난간대, 전도방지대 설치 여부',
      '틀비계 수직6m, 수평8m 기준 벽이음 설치 여부',
    ],
  },
  {
    category: '사다리',
    items: [
      '사다리 상단 내민길이(60cm) 이상 확보 여부',
      '(작업발판으로 사용 시) A형 사다리 사용 여부',
      '(작업발판으로 사용 시) 작업높이 3.5m 초과 여부',
      '(작업발판으로 사용 시) 전도방지대 설치 상태',
      '(작업발판으로 사용 시) 2인1조 작업 여부',
    ],
  },
  {
    category: '붕괴예방',
    items: [
      '절토 및 성토 사면의 기울기 구배 준수 여부',
      '법정 기울기 확보 불가 시 흙막이 설치 상태',
      '절토 및 성토 사면 상부 장비 위치 시 지반의 안전성',
    ],
  },
  {
    category: '감전예방',
    items: [
      '전선 피복 벗겨짐 등 이상 유무',
      '충전부, 콘센트 등 수분 접촉 여부',
      '누전차단기 설치 여부 및 작동 상태',
      '외함접지 상태 및 접지선 단락 여부',
      '정전작업 시 잔류전하 방전 확인 여부',
      '절연용 보호구 지급 및 착용 상태',
    ],
  },
  {
    category: '물질안전보건자료(MSDS)',
    items: [
      '물질안전·보건자료(MSDS) 현장 비치 또는 게시 상태',
      '작업공정별 관리요령 작성 및 게시 상태',
      '경고표시 작성 및 게시 상태',
      '근로자 물질안전·보건자료(MSDS) 교육 여부',
    ],
  },
  {
    category: '밀폐공간 작업관리',
    items: [
      '밀폐공간작업프로그램 수립 여부 및 시행 상태',
      '산소 및 유해가스 농도의 측정 상태',
      '밀폐공간 내 적정 공기상태 유지를 위한 환기 여부',
      '밀폐공간 출입금지 조치 및 인원점검 관리 상태',
      '공기호흡기, 송기마스크, 대피용 기구 등 준비 상태',
    ],
  },
  {
    category: '특별조치사항',
    items: [
      '스마트 안전장비 사용 여부(중장비 접근알림, 전자호루라기 등)',
      '장비운전원이 유도자 위치 확인 후 운전하는지, 유도자 유도에 따라 운전하도록 TBM 교육 실시 여부',
      'TBM 시 위험성평가 교육여부(교통신호수, 장비유도자 포함)',
      '위험성평가 시 건설기계 부딪힘 예방대책으로 스마트 안전장비 활용 내용 반영 여부',
      '교통신호수 및 장비유도자에 대한 안전수칙, 스마트 안전장비 사용교육 등 실시 여부',
    ],
  },
]

export function buildInitialChecklist(): ChecklistCategoryResult[] {
  return CHECKLIST_TEMPLATE.map((c) => ({
    category: c.category,
    items: c.items.map((label) => ({ label, result: '' as ChecklistResult })),
  }))
}

// 개인보호구 지급계획 — 대부분의 건설현장에서 공통으로 쓰이는 품목 (수량은 현장별로 달라
// 사용자가 직접 채우도록 비워둔다). 현장에 더 필요한 보호구가 있으면 행을 추가하면 된다.
const PPE_TEMPLATE: Omit<PpeRow, 'id' | 'qty'>[] = [
  { name: '안전모', target: '전 근로자', managementPlan: '매일 작업 전 균열·파손 여부 확인, 파손 시 즉시 교체' },
  { name: '안전화', target: '전 근로자', managementPlan: '매일 작업 전 상태 확인, 3년 주기 교체' },
  { name: '안전대', target: '고소 작업자', managementPlan: '사용 전 벨트·로프 손상 여부 점검, 3년 주기 교체' },
  { name: '방진마스크', target: '분진발생관련 작업자', managementPlan: '1회용 소모품, 오염·손상 시 즉시 교체' },
  { name: '안전장갑', target: '전기 및 용접관련 작업자', managementPlan: '절연성능 확인 후 지급, 손상 시 교체' },
  { name: '보안경', target: '그라인딩·절단 작업자', managementPlan: '매 사용 전 렌즈 손상 여부 확인' },
]

export function buildInitialPpeRows(): PpeRow[] {
  return PPE_TEMPLATE.map((row) => ({ ...row, id: newRowId(), qty: '' }))
}

// 산업재해예방활동 이행계획 — 실무에서 흔히 쓰이는 표준 세부추진계획 (전사목표: 산재사고 Zero)
// 상반기/하반기는 "성과지표(kpi)"의 주기를 절반 기간에 맞게 환산한 계획값이다 — 반기 단위
// KPI는 그대로 반복, 연간 KPI는 절반으로 분할, 분기 단위는 반기당 2회, 월 단위는 반기당
// 6회로 계산했다. 채용시/단위작업별처럼 발생 시점이 고정되지 않는 항목과, 대상자 주기가
// 섞여 있는 건강검진류는 숫자 분할이 무의미하므로 실시 방식을 서술하는 문구로 채웠다.
// 달성율은 계획 수립 시점이 아니라 실제 이행 후 산정하는 값이라 항상 빈칸으로 시작한다.
export const PREVENTION_PLAN_TEMPLATE: Omit<PreventionRow, 'id'>[] = [
  { goal: '산재사고 Zero', task: '수시 위험성평가', scheduleH1: '수시', scheduleH2: '수시', kpi: '수시', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '아차사고 수집', scheduleH1: '매월 수집', scheduleH2: '매월 수집', kpi: '1건/월/안당', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(정기)', scheduleH1: '12시간', scheduleH2: '12시간', kpi: '12시간/반기', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(관리감독자)', scheduleH1: '8시간', scheduleH2: '8시간', kpi: '16시간/년간', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(특별안전보건교육)', scheduleH1: '8시간', scheduleH2: '8시간', kpi: '16시간/년간(크레인,유해물질취급자)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(신규채용시)', scheduleH1: '신규채용 시마다 실시', scheduleH2: '신규채용 시마다 실시', kpi: '8시간/년간(채용시)', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(MSDS)', scheduleH1: '1시간', scheduleH2: '1시간', kpi: '2시간/년간(유해물질취급자)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '산업안전보건위원회', scheduleH1: '2회', scheduleH2: '2회', kpi: '1회/분기', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '소방시설 정기점검', scheduleH1: '6회', scheduleH2: '6회', kpi: '1회/월', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '합동안전점검', scheduleH1: '6회', scheduleH2: '6회', kpi: '1회/월', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '일반 건강검진', scheduleH1: '대상자별 계획에 따라 실시', scheduleH2: '대상자별 계획에 따라 실시', kpi: '관리직 1회/2년, 현장직 1회/1년', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '특수 건강검진', scheduleH1: '대상자별 계획에 따라 실시', scheduleH2: '대상자별 계획에 따라 실시', kpi: '1회/년(현장직 1회/1년)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '비상조치훈련', scheduleH1: '2회', scheduleH2: '2회', kpi: '1회/분기(화재,누출,대피,구조)', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '작업허가서 발부', scheduleH1: '단위 작업 시마다 발부', scheduleH2: '단위 작업 시마다 발부', kpi: '단위 작업별', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: 'TBM 실시', scheduleH1: '작업 전 매일 실시', scheduleH2: '작업 전 매일 실시', kpi: '단위 작업별', dept: '전부서', achievementRate: '', note: '' },
]

export function buildInitialPreventionRows(): PreventionRow[] {
  return PREVENTION_PLAN_TEMPLATE.map((row) => ({ ...row, id: newRowId() }))
}

// LOTO(Lock Out, Tag Out) — 정비·점검 등 비정형작업 시 타 근로자의 오작동 운전을 막기 위한
// 표준 절차 (발주기관 표준양식 기준 고정 안내문).
export const LOTO_PROCEDURE_STEPS = [
  { label: '대상', text: '정비, 점검, 수리 등 정상적인 생산활동을 위한 준비작업(비정형작업)' },
  { label: '목적', text: '기계설비의 정비·청소·수리 등의 작업을 위해 운전을 정지한 후, 타 근로자가 그 기계설비를 운전하는 것을 방지' },
  { label: '방법', text: '① 작업 전 전원부 등에 잠금장치 및 표지판을 설치 → ② 작업 완료 후 직접 잠금장치 및 표지판 해제 → ③ 위 ①·② 내용을 관련 작업자에게 공지' },
]

// 산업안전보건법상 법정 안전검사 대상 기계·기구의 검사주기 (고정 참고표 — 최초 검사는 설치
// 후 3년 이내, 이후 표기된 주기마다 반복).
export const SAFETY_INSPECTION_CYCLE_TABLE: { equipment: string; checkItems: string; cycle: string }[] = [
  { equipment: '크레인', checkItems: '과부하방지장치, 권과방지장치, 안전장치, 훅해지장치 등', cycle: '2년에 1회' },
  { equipment: '압력용기', checkItems: '압력방출장치(안전밸브), 압력계 등', cycle: '2년에 1회' },
  { equipment: '리프트', checkItems: '과부하방지장치, 권과방지장치, 낙하방지장치, 비상정지장치 등', cycle: '2년에 1회' },
  { equipment: '프레스', checkItems: '방호장치, 비상정지장치 등', cycle: '2년에 1회' },
  { equipment: '전단기', checkItems: '방호장치(가드식, 광전자식), 비상정지장치 등', cycle: '2년에 1회' },
  { equipment: '곤돌라', checkItems: '비상정지장치, 권과방지장치, 과부하방지장치, 낙하방지장치, 수평조절장치 등', cycle: '2년에 1회' },
  { equipment: '국소배기장치', checkItems: '흡인성능(제어풍속), 댐퍼, 배풍기의 작동상태 등', cycle: '2년에 1회' },
  { equipment: '고소작업대', checkItems: '안전장치 부착 및 작동 유무, 작업대 고정볼트 체결 및 안전난간 설치 상태, 아웃트리거 설치 상태 등', cycle: '2년에 1회' },
  { equipment: '컨베이어', checkItems: '원동기 및 풀리 기능 이상 유무, 이탈 등의 방지장치 기능 이상 유무, 비상정지장치의 기능 이상 유무 등', cycle: '2년에 1회' },
]

// 붙임3: 발주기관이 수급업체 안전보건계획서를 채점하는 배점 기준 (참고용 — 실제 채점은
// 발주기관이 수행하며, 여기서는 어느 항목의 배점이 큰지 참고해 빠짐없이 작성하도록 안내).
export const EVALUATION_CRITERIA_TABLE: { category: string; item: string; score: number }[] = [
  { category: '안전보건관리체제 (20점)', item: '일반원칙 — 안전보건방침 적정 여부', score: 5 },
  { category: '안전보건관리체제 (20점)', item: '계획수립 — 산업재해예방 이행계획 적정 여부', score: 10 },
  { category: '안전보건관리체제 (20점)', item: '역할 및 책임 — 구성원 역할 분담(본사, 현장)', score: 5 },
  { category: '실행수준 (40점)', item: '위험성평가 이해수준 및 자체 평가 수준', score: 5 },
  { category: '실행수준 (40점)', item: '안전점검 및 모니터링(보호구 착용 확인 포함)', score: 10 },
  { category: '실행수준 (40점)', item: '이행확인(도급인 지도조언 이행 포함)', score: 10 },
  { category: '실행수준 (40점)', item: '안전보건교육 계획 및 기록관리', score: 5 },
  { category: '실행수준 (40점)', item: '안전작업허가 이행 수준', score: 10 },
  { category: '운영관리 (20점)', item: '신호 및 연락체계', score: 5 },
  { category: '운영관리 (20점)', item: '유해·위험물질 및 기계·기구·설비 안전성 확인', score: 10 },
  { category: '운영관리 (20점)', item: '비상대책(대피·피해최소화, 고용부·소방서·병원 포함)', score: 5 },
  { category: '재해발생 수준 (20점)', item: '최근 3년간 산업재해 발생현황', score: 20 },
]

// 붙임5: 사고유형 분류표 — 위험성평가에서 유해·위험요인을 "사고유형" 관점으로 빠짐없이
// 검토할 수 있도록 돕는 참고표(LH 등 발주기관 설계안전보건대장 서식 기준). 물적피해와
// 인적피해로 나뉘며, 실제 위험성평가표의 유해·위험요인 문구는 사용자가 직접 작성한다.
export const ACCIDENT_TYPE_TABLE: { category: string; type: string; detail: string }[] = [
  { category: '물적피해유형', type: '무너짐', detail: '도랑의 굴착사면 무너짐, 적재물 등의 무너짐, 건설 중 또는 인접 건축물·구조물의 무너짐, 가설구조물의 무너짐, 절취 사면 등의 사면 무너짐' },
  { category: '물적피해유형', type: '넘어짐', detail: '운송 수단, 건설기계 또는 설비가 넘어짐' },
  { category: '물적피해유형', type: '화재·폭발·파열', detail: '화재, 기계·설비의 폭발, 캔·드럼 폭발, 파열' },
  { category: '물적피해유형', type: '화학물질 누출', detail: '화학물질 누출' },
  { category: '인적피해유형', type: '떨어짐', detail: '계단·사다리·개구부·재료더미·비계 등 가설구조물, 구조물, 운송수단 또는 기계 등 설비에서 떨어짐' },
  { category: '인적피해유형', type: '넘어짐', detail: '계단·바닥의 돌출물·운송수단 또는 설비에서 미끄러지거나 걸려 넘어짐' },
  { category: '인적피해유형', type: '깔림', detail: '쓰러지는 물체에 깔림, 운송 수단 등의 뒤집힘' },
  { category: '인적피해유형', type: '부딪힘', detail: '사람에 의한 부딪힘, 바닥에서 구르는 물체에 부딪힘, 차량 또는 건설장비 등과의 부딪힘' },
  { category: '인적피해유형', type: '맞음', detail: '떨어지는 물체에 맞음, 날아온 물체에 맞음' },
  { category: '인적피해유형', type: '끼임', detail: '직선 운동 중인 설비 또는 기계 사이에 끼임, 회전부와 고정체 사이의 끼임, 회전체 및 돌기부에 감김, 인력운반 취급 중인 물체에 끼임' },
  { category: '인적피해유형', type: '절단·베임', detail: '회전날 등에 의한 절단 및 베임, 취급물체에 의한 절단' },
  { category: '인적피해유형', type: '감전', detail: '충전부에 감전, 누설전류에 감전, 아크 감전(접촉)' },
  { category: '인적피해유형', type: '교통사고', detail: '사업장 내 교통사고, 사업장 외 교통사고' },
  { category: '인적피해유형', type: '화학물질 접촉·산소결핍', detail: '화학물질 접촉, 산소결핍(질식)' },
  { category: '인적피해유형', type: '기타', detail: '빠짐·익사, 이상온도 접촉 등' },
]

// 개인보호구 관리계획 — 지급 후 실제 착용·성능을 유지관리하는 일반원칙 (고정 안내문).
export const PPE_MANAGEMENT_RULES = [
  '보호구 구입 시 기능점검 실시',
  '매일 아침 조회 시간(TBM 시간)을 이용하여 안전모·안전화 등 점검',
  '일일 점검 및 합동안전점검 시 수시 기능·성능점검 실시',
  '보호구 착용을 하는 당해 현장 실제 근로자가 근무하고 있는 모든 장소 점검',
  '불량으로 판정된 제품은 즉시 수거 조치 및 납품 금지 조치하여 근로자 피해방지',
  '점검대상: 안전모, 안전화 등 보호구 11종',
]

// 보호구 종류별 유효기간(교체주기) — 산업안전보건법령상 보호구 성능검정·사용기한 통상
// 기준(고정 참고표).
export const PPE_VALIDITY_TABLE: { category: string; validity: string; items: string }[] = [
  { category: '보호구(11종)', validity: '5년(2종)', items: '방음보호구(귀마개, 귀덮개), 송기마스크' },
  {
    category: '보호구(11종)',
    validity: '3년(9종)',
    items: '안전모, 안전대, 안전화, 안전장갑, 보호복, 방진마스크, 방독마스크, 보안경, 보안면',
  },
]

// 안전보건관리조직 — 산업안전보건법상 고정 4개 역할 (담당자명만 입력)
export function buildInitialSafetyOrgRoles(): SafetyOrgRole[] {
  return [
    { role: '안전보건관리책임자', name: '' },
    { role: '관리감독자', name: '' },
    { role: '안전관리자(안전담당자)', name: '' },
    { role: '안전보건담당자', name: '' },
  ]
}

// 안전보건교육계획 — 산업안전보건법 시행규칙상 법정 교육 9종 (교육시간은 법정 기준 참고값)
const EDUCATION_TEMPLATE: Omit<EducationRow, 'id' | 'completedDate' | 'nextDueDate'>[] = [
  { type: '일상교육(TBM)', target: '당일 작업 근로자', hours: '10분', institution: '자체', cycle: '매일' },
  { type: '정기교육', target: '전 근로자', hours: '2시간', institution: '자체', cycle: '1회/월' },
  { type: '관리감독자교육', target: '분야별 안전관리책임자·안전관리담당자(협력업체 포함)', hours: '16시간', institution: '자체/위탁', cycle: '연중' },
  { type: '채용시교육', target: '신규채용자', hours: '1~8시간', institution: '자체', cycle: '신규 채용 시' },
  { type: '작업내용 변경시교육', target: '해당작업자', hours: '1~2시간', institution: '자체', cycle: '작업내용 변경 시' },
  { type: '특별안전보건교육', target: '유해위험 해당작업자', hours: '2시간', institution: '자체/위탁', cycle: '유해위험작업 전' },
  { type: '물질안전보건자료(MSDS) 교육', target: '근로자', hours: '20분', institution: '자체', cycle: '물질안전보건자료 대상물질 취급 전' },
  { type: '특수형태 종사자 교육', target: '굴삭기, 지게차 등', hours: '2시간(최초), 1시간(간헐적작업)', institution: '자체/위탁', cycle: '최초 작업 전' },
  { type: '기초안전보건교육', target: '일용직 근로자', hours: '4시간', institution: '위탁', cycle: '일용직 근로자 채용 시(이수증 확인)' },
]

export function buildInitialEducationRows(): EducationRow[] {
  return EDUCATION_TEMPLATE.map((row) => ({ ...row, id: newRowId(), completedDate: '', nextDueDate: '' }))
}

export function buildInitialYearlyStats(): YearlyStat[] {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear].map((year) => ({ year: String(year), count: '' }))
}

// 발주처마다 요구 여부가 갈리는 항목들 — 사용자가 문서별로 켜고 끌 수 있다(기본은 전부 포함).
// 표지/사업개요/위험성평가/안전보건방침처럼 사실상 모든 발주처가 요구하는 핵심 항목은
// 토글 대상에서 제외한다.
export const OPTIONAL_SECTION_LABELS = {
  machineryMatrix: '기계·기구·설비별 산재예방대책 매트릭스',
  hazardMatrix: '유해·위험물질별 산재예방대책 매트릭스',
  executionPlan: '산재예방대책 실행계획표',
  appendixLoto: '붙임1. LOTO(Lock Out, Tag Out) 절차',
  appendixInspectionCycle: '붙임2. 법정 안전검사 주기',
  appendixEvaluationCriteria: '붙임3. 발주기관 평가기준표',
  appendixPpeManagement: '붙임4. 개인보호구 관리계획',
  appendixAccidentTypes: '붙임5. 사고유형 분류표',
  workPermitSystem: '안전작업제도',
  signalContacts: '신호 및 연락체계 - 연락체계',
  signalSignals: '신호 및 연락체계 - 신호체계',
  safetyEquipment: '안전보건 장비(물품) 및 시설 운용',
  inspectionPlan: '안전 순회점검·자체점검·합동점검 계획',
  meetingPlan: '안전보건 협의체 회의 계획',
  miscItems: '기타사항(청렴서약서·적격업체 선정기준)',
  ppeIndividualIssuance: '개인보호구 개인별 지급기록',
  workerAssignmentLH: 'Ⅷ. 작업투입 인력 인적사항(안전취약근로자·화재감시자 등 지정·2인1조 편성표)',
} as const

export type OptionalSectionKey = keyof typeof OPTIONAL_SECTION_LABELS

export function createDefaultIncludedSections(): Record<OptionalSectionKey, boolean> {
  const keys = Object.keys(OPTIONAL_SECTION_LABELS) as OptionalSectionKey[]
  return keys.reduce(
    (acc, key) => {
      acc[key] = true
      return acc
    },
    {} as Record<OptionalSectionKey, boolean>,
  )
}

/** 저장된 문서에 값이 없는(예전 문서, 또는 나중에 추가된 토글 키) 항목은 기본값(포함)으로 본다. */
export function isSectionIncluded(content: WizardContent, key: OptionalSectionKey): boolean {
  return content.includedSections[key] ?? true
}

export interface WizardContent {
  cover: {
    projectName: string
    // 발주기관 유형 — 선택한 발주처에 맞춰 좌측 목차·다운로드 문서의 장 번호 구성이
    // 달라진다("일반"은 기존 기본 구성). orgName(발주기관명, 자유텍스트)과 별개다.
    agency: AgencyType
    // 발주기관명: 국방부/군부대 공사는 부대명, 일반 나라장터 공고는 발주처명 —
    // 공통 필드로 통일해서 사용한다.
    orgName: string
    companyName: string
    ceoName: string
    docDate: string
    // LH 등 붙임8(안전·보건수준평가자료) 표지가 요구하는 항목 — 공고문/현장설명서의
    // 도급기간·도급금액·계상된 안전관리비를 그대로 옮겨 적으면 된다.
    contractPeriod: string
    contractAmount: string
    safetyManagementBudget: string
    // 수급사 결재란(작성자/검토자/검토자/승인자) — 서명은 웹에서 받지 않고 직책·성명만 기록.
    approvalLine: ApprovalEntry[]
  }
  riskAssessment: {
    method: RiskMethod
    assessor: string
    assessedAt: string
    overview: string
    // 공고 제목 기반으로 자동 분류(또는 사용자가 수동 선택)된 공사 종류.
    // 표준 위험성평가 항목 라이브러리(constructionTemplates.ts)를 불러올 때 사용한다.
    constructionType: ConstructionType | ''
    // 회사가 이미 가진 안전관리계획서(예시파일) — AI 추출의 근거가 된 원본 파일.
    referenceFile: UploadedFile | null
    rows: RiskRow[]
  }
  businessOverview: {
    period: string
    location: string
    mainContent: string
    budget: string
  }
  safetyPolicy: {
    goalText: string
    policyDocFile: UploadedFile | null
    // 방침 조항(회사가 지킬 원칙)과 목표(측정가능한 수치목표)를 분리해 문서화한다 —
    // LH 등 발주기관은 "조직 규모에 적합한 방침"과 "측정가능한 목표"를 별도로 심사한다.
    principles: string[]
    goals: string[]
    announceDate: string
  }
  preventionPlan: {
    rows: PreventionRow[]
    machineryRows: MachineryPreventionRow[]
    hazardRows: HazardPreventionRow[]
    executionRows: PreventionExecutionRow[]
  }
  safetyOrg: {
    roles: SafetyOrgRole[]
  }
  ppe: {
    rows: PpeRow[]
    // 재해예방을 위한 안전보건 장비(물품) 및 시설 운용 현황 — 붙임8 "1. 재해예방을 위한
    // 시설 및 장비" 중 보호구 외 항목(계측장비, 방폭장비 등).
    equipmentRows: SafetyEquipmentRow[]
    // 개인보호구 "개인별 지급기록"(구분/직종/근로자명/보호구명/지급수량/지급서명/안전인증여부) —
    // 발주처에 따라 요구 여부가 갈려 토글 대상(OptionalSectionKey: ppeIndividualIssuance).
    individualIssuanceRows: PpeIndividualIssuanceRow[]
  }
  inspectionPlan: {
    rows: InspectionPlanRow[]
  }
  meetingPlan: {
    rows: MeetingPlanRow[]
  }
  miscItems: {
    integrityPledgeConfirm: boolean
    contractorSelectionCriteria: string
    // 도급기간 1년 이상인 경우 발주처(LH 등)가 요구하는 정기(연간) 위험성평가 실시계획.
    periodicRiskAssessmentPlan: string
    // 관계수급인(협력업체) 종사자의 안전·보건을 위한 관리비용 산정·집행 기준.
    subcontractorSafetyCostStandard: string
  }
  checklist: {
    categories: ChecklistCategoryResult[]
    inspectionDate: string
    inspectionSite: string
    supervisorName: string
    otherNotes: string
    workerPhotos: UploadedFile[]
    sitePhotos: UploadedFile[]
    improvementPhotos: UploadedFile[]
  }
  workPermitSystem: {
    rows: WorkPermitRow[]
  }
  education: {
    note: string
    rows: EducationRow[]
  }
  signalContact: {
    contacts: ContactRow[]
    signals: SignalRow[]
  }
  hazardousMgmt: {
    equipmentRows: HazardousItemRow[]
    materialRows: HazardousItemRow[]
    procedureRows: ProcedureRow[]
  }
  emergencyPlan: {
    teamRows: EmergencyTeamRow[]
    contactRows: ContactRow[]
    // 중대산업재해 등 비상사태 발생 시 조치계획(요약) 및 정기 모의훈련 계획.
    responseSummary: string
    drillCycle: string
    drillHours: string
  }
  incidentHistory: {
    yearlyStats: YearlyStat[]
    workplaceManagementNumber: string
    noAccidentConfirm: boolean
    accidentReportFile: UploadedFile | null
    insuranceMemberFile: UploadedFile | null
    accidentRateFile: UploadedFile | null
    otherAttachmentFile: UploadedFile | null
  }
  // Ⅷ. 작업투입 인력 인적사항 — LH 등 일부 발주기관이 작업개시 전까지 별도 제출을
  // 요구하는 근로자 단위 명단(OptionalSectionKey: workerAssignmentLH).
  workerAssignment: {
    vulnerableWorkers: VulnerableWorkerRow[]
    fireWatchAssignments: FireWatchAssignmentRow[]
    twoPersonTeams: TwoPersonTeamRow[]
  }
  // 발주처가 요구하지 않는 항목을 문서 작성/다운로드에서 제외하기 위한 토글.
  includedSections: Record<OptionalSectionKey, boolean>
}

export function createEmptyWizardContent(): WizardContent {
  return {
    cover: {
      projectName: '',
      agency: '일반',
      orgName: '',
      companyName: '',
      ceoName: '',
      docDate: new Date().toISOString().slice(0, 10),
      contractPeriod: '',
      contractAmount: '',
      safetyManagementBudget: '',
      approvalLine: ['작성자', '검토자', '검토자', '승인자'].map((role) => ({ role, title: '', name: '' })),
    },
    riskAssessment: {
      method: RISK_METHODS[0],
      assessor: '',
      assessedAt: '착공 전 1회 실시, 공정 변경 또는 위험요인 추가 발생 시 재평가',
      overview: '',
      constructionType: '',
      referenceFile: null,
      rows: [],
    },
    businessOverview: { period: '', location: '', mainContent: '', budget: '' },
    safetyPolicy: {
      goalText: '중대재해 ZERO, 일반재해 0건',
      policyDocFile: null,
      principles: [
        '조직의 목적, 규모 및 상황에 맞는 안전보건경영 체계를 구축한다.',
        '안전보건 법규를 준수하고, 이해관계자의 요구사항을 수렴하여 안전보건경영 체계에 반영·실행한다.',
        '업무를 수행함에 있어 철저한 사전준비로 안전사고를 예방하며 안전수칙과 절차를 생략하지 않는다.',
        '유해·위험 요소를 지속 개선하여, 협력사를 포함한 모든 임직원의 안전과 건강을 지킨다.',
      ],
      goals: [
        '산업재해 ZERO 유지 및 목표 재해율 ZERO',
        '전 근로자 관련 산업안전보건교육 100% 이수',
        '신규작업 및 기계위험기구 관련 위험성평가 개선 100% 달성',
        '중대재해예방 매뉴얼 작성 및 반기 1회 점검 실시',
      ],
      announceDate: new Date().toISOString().slice(0, 10),
    },
    preventionPlan: {
      rows: buildInitialPreventionRows(),
      // 공사종류를 아직 모르는 시점(문서 생성 직후)이라 빈 배열로 시작 — 공고 연결 시
      // 자동으로, 또는 위저드에서 "표준 항목 불러오기"로 공종별 후보를 채운다.
      machineryRows: [],
      hazardRows: [],
      executionRows: [],
    },
    safetyOrg: { roles: buildInitialSafetyOrgRoles() },
    ppe: { rows: buildInitialPpeRows(), equipmentRows: [], individualIssuanceRows: [] },
    inspectionPlan: {
      rows: [
        { id: newRowId(), kind: '자체 안전점검(TBM 포함)', inspector: '관리감독자', cycle: '매일', target: '전 작업구간', note: '' },
        { id: newRowId(), kind: '순회점검', inspector: '안전관리자, 관리감독자', cycle: '2일에 1회 이상', target: '전 작업구간', note: '산업안전보건법 시행규칙 제80조' },
        { id: newRowId(), kind: '합동 안전·보건점검(노사)', inspector: '원·하청 현장소장 및 근로자 대표', cycle: '2개월에 1회 이상', target: '전 작업구간', note: '산업안전보건법 시행규칙 제82조' },
      ],
    },
    meetingPlan: {
      rows: [
        { id: newRowId(), name: '안전보건협의체 회의', host: '현장소장', timing: '매월 1회 이상', attendees: '현장소장, 관리감독자, 협력업체 현장대리인, 근로자대표', note: '산업안전보건법 제64조' },
      ],
    },
    miscItems: {
      integrityPledgeConfirm: false,
      contractorSelectionCriteria:
        '시공능력, 안전보건관리체계(안전관리자 선임 여부 등), 최근 3년간 산업재해 발생률, 부적격업체 여부 등을 기준으로 협력업체를 평가·선정한다.',
      periodicRiskAssessmentPlan:
        '도급기간이 1년 이상인 경우, 최초 위험성평가 이후 매년 1회 이상 정기 위험성평가를 실시하여 신규·변경된 유해·위험요인을 재평가하고 개선대책을 수립·이행한다. (도급기간이 1년 미만인 경우 해당 없음)',
      subcontractorSafetyCostStandard:
        '관계수급인(협력업체) 종사자의 안전보건관리비는 산업안전보건관리비 사용기준에 따라 계상하며, 관계수급인별 작업내용·위험도를 고려하여 안전관리자 배치, 보호구 지급, 안전교육 등에 필요한 비용을 공정하게 배분·집행한다.',
    },
    checklist: {
      categories: buildInitialChecklist(),
      inspectionDate: '',
      inspectionSite: '',
      supervisorName: '',
      otherNotes: '',
      workerPhotos: [],
      sitePhotos: [],
      improvementPhotos: [],
    },
    workPermitSystem: {
      rows: [
        {
          id: newRowId(),
          task: '고소작업',
          writer: '작업반장',
          reviewer: '현장소장',
          watcher: '별도지정',
          confirmer: '감독자',
          note: '',
        },
      ],
    },
    education: {
      note:
        '현장 근로자의 안전의식 제고와 산업재해 예방을 위해 산업안전보건법령에서 정한 정기교육, ' +
        '관리감독자교육, 특별안전보건교육, 신규채용 시 교육 등을 아래 계획에 따라 실시하고, 교육일지 및 ' +
        '이수증을 통해 이수 여부를 기록·관리한다. 미이수 근로자는 해당 위험작업에 투입하지 않는 것을 원칙으로 한다.',
      rows: buildInitialEducationRows(),
    },
    signalContact: {
      contacts: ['소방서', '경찰서', '고용노동부', '안전보건공단', '병원'].map((name) => ({
        id: newRowId(),
        name,
        phone: '',
      })),
      signals: [
        { id: newRowId(), work: '밀폐공간작업', method: '감시인 배치, 무전기', procedure: '', note: '' },
        { id: newRowId(), work: '중량물 취급작업', method: '신호수 배치, 깃발', procedure: '', note: '' },
        { id: newRowId(), work: '기계정비작업', method: 'Lock-out / Tag-out', procedure: '', note: '' },
        { id: newRowId(), work: '타워크레인 작업', method: '신호수 배치, 수신호', procedure: '', note: '' },
      ],
    },
    hazardousMgmt: {
      equipmentRows: [
        {
          id: newRowId(),
          name: '연삭기',
          controlMeasure: '방호장치(덮개) 설치, 보호구 지급, 안전교육, 표지부착',
          checkItem: '',
          manager: '현장소장',
          evidenceDoc: '안전인증서',
          note: '',
        },
      ],
      materialRows: [
        {
          id: newRowId(),
          name: '페인트',
          controlMeasure: '국소배기장치 설치, 보호구 지급, 안전교육, 표지부착',
          checkItem: '',
          manager: '현장소장',
          evidenceDoc: '물질안전보건자료(MSDS)',
          note: '',
        },
      ],
      procedureRows: [
        {
          id: newRowId(),
          work: '연삭작업',
          procedure: '① 연삭기의 안전덮개와 비산방지판의 부착상태를 확인한다\n② 연삭기의 외함 접지 및 접지선 상태를 점검한다',
          note: '',
        },
      ],
    },
    emergencyPlan: {
      teamRows: [
        { id: newRowId(), role: '대책반장', member: '현장소장', mainDuty: '비상상황 시 대책반 총괄 관리', note: '' },
      ],
      contactRows: [
        '수급업체',
        '감리업체',
        '하도급업체',
        '협력업체',
        '소방서',
        '경찰서',
        '병원',
        '안전보건공단',
        '지방고용노동청',
      ].map((name) => ({ id: newRowId(), name, phone: '' })),
      responseSummary:
        '중대재해 및 급박한 위험상황 발생 시 즉시 작업을 중지하고 근로자를 안전한 장소로 대피시킨 후, ' +
        '119 신고 및 구호조치, 위험요인 제거, 관계기관(발주처·지방고용노동관서 등) 신고, 원인분석 및 ' +
        '재발방지대책 수립 순으로 대응한다.',
      drillCycle: '반기 1회 이상',
      drillHours: '4시간 이상',
    },
    incidentHistory: {
      yearlyStats: buildInitialYearlyStats(),
      workplaceManagementNumber: '',
      noAccidentConfirm: false,
      accidentReportFile: null,
      insuranceMemberFile: null,
      accidentRateFile: null,
      otherAttachmentFile: null,
    },
    workerAssignment: {
      vulnerableWorkers: [],
      fireWatchAssignments: [],
      twoPersonTeams: [],
    },
    includedSections: createDefaultIncludedSections(),
  }
}

/**
 * 예전에 저장된 문서(JSONB)에는 새로 추가된 최상위 섹션이 없을 수 있다.
 * 기본값(createEmptyWizardContent)과 섹션 단위로 병합해, 누락된 신규 섹션은
 * 기본값으로 채우고 이미 저장된 섹션은 그대로 유지한다.
 */
export function mergeWizardContent(saved: Partial<WizardContent> | null | undefined): WizardContent {
  const defaults = createEmptyWizardContent()
  if (!saved) return defaults

  const merged: WizardContent = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof WizardContent)[]) {
    const savedSection = saved[key]
    if (savedSection && typeof savedSection === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      merged[key] = { ...(defaults[key] as any), ...(savedSection as any) } as any
    }
  }
  return merged
}

export function newRowId(): string {
  return crypto.randomUUID()
}

/** 문서에 첨부된 모든 파일의 Storage 경로를 모은다 (문서 삭제 시 함께 정리하거나, 개수 표시에 사용). */
export function collectAttachmentPaths(content: WizardContent): string[] {
  const files: (UploadedFile | null)[] = [
    content.riskAssessment.referenceFile,
    content.safetyPolicy.policyDocFile,
    ...content.checklist.workerPhotos,
    ...content.checklist.sitePhotos,
    ...content.checklist.improvementPhotos,
    content.incidentHistory.accidentReportFile,
    content.incidentHistory.insuranceMemberFile,
    content.incidentHistory.accidentRateFile,
    content.incidentHistory.otherAttachmentFile,
  ]
  return files.filter((f): f is UploadedFile => Boolean(f)).map((f) => f.path)
}
