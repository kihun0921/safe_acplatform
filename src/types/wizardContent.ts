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

// 산업재해예방활동 이행계획 — 실무에서 흔히 쓰이는 표준 세부추진계획 (전사목표: 산재사고 Zero)
const PREVENTION_PLAN_TEMPLATE: Omit<PreventionRow, 'id'>[] = [
  { goal: '산재사고 Zero', task: '수시 위험성평가', scheduleH1: '수시', scheduleH2: '수시', kpi: '수시', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '아차사고 수집', scheduleH1: '', scheduleH2: '', kpi: '1건/월/안당', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(정기)', scheduleH1: '', scheduleH2: '', kpi: '12시간/반기', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(관리감독자)', scheduleH1: '', scheduleH2: '', kpi: '16시간/년간', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(특별안전보건교육)', scheduleH1: '', scheduleH2: '', kpi: '16시간/년간(크레인,유해물질취급자)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(신규채용시)', scheduleH1: '', scheduleH2: '', kpi: '8시간/년간(채용시)', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '안전보건교육(MSDS)', scheduleH1: '', scheduleH2: '', kpi: '2시간/년간(유해물질취급자)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '산업안전보건위원회', scheduleH1: '', scheduleH2: '', kpi: '1회/분기', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '소방시설 정기점검', scheduleH1: '', scheduleH2: '', kpi: '1회/월', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '합동안전점검', scheduleH1: '', scheduleH2: '', kpi: '1회/월', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '일반 건강검진', scheduleH1: '', scheduleH2: '', kpi: '관리직 1회/2년, 현장직 1회/1년', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '특수 건강검진', scheduleH1: '', scheduleH2: '', kpi: '1회/년(현장직 1회/1년)', dept: '안전', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '비상조치훈련', scheduleH1: '', scheduleH2: '', kpi: '1회/분기(화재,누출,대피,구조)', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: '작업허가서 발부', scheduleH1: '', scheduleH2: '', kpi: '단위 작업별', dept: '전부서', achievementRate: '', note: '' },
  { goal: '산재사고 Zero', task: 'TBM 실시', scheduleH1: '', scheduleH2: '', kpi: '단위 작업별', dept: '전부서', achievementRate: '', note: '' },
]

export function buildInitialPreventionRows(): PreventionRow[] {
  return PREVENTION_PLAN_TEMPLATE.map((row) => ({ ...row, id: newRowId() }))
}

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

export interface WizardContent {
  cover: {
    projectName: string
    // 발주기관명: 국방부/군부대 공사는 부대명, 일반 나라장터 공고는 발주처명 —
    // 공통 필드로 통일해서 사용한다.
    orgName: string
    companyName: string
    ceoName: string
    docDate: string
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
  }
  safetyPolicy: {
    goalText: string
  }
  preventionPlan: {
    rows: PreventionRow[]
  }
  safetyOrg: {
    roles: SafetyOrgRole[]
  }
  ppe: {
    rows: PpeRow[]
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
  }
  incidentHistory: {
    yearlyStats: YearlyStat[]
    workplaceManagementNumber: string
    noAccidentConfirm: boolean
    accidentReportFile: UploadedFile | null
    insuranceMemberFile: UploadedFile | null
  }
}

export function createEmptyWizardContent(): WizardContent {
  return {
    cover: {
      projectName: '',
      orgName: '',
      companyName: '',
      ceoName: '',
      docDate: new Date().toISOString().slice(0, 10),
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
    businessOverview: { period: '', location: '', mainContent: '' },
    safetyPolicy: { goalText: '중대재해 ZERO, 일반재해 0건' },
    preventionPlan: { rows: buildInitialPreventionRows() },
    safetyOrg: { roles: buildInitialSafetyOrgRoles() },
    ppe: { rows: [] },
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
    education: { note: '', rows: buildInitialEducationRows() },
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
        },
      ],
      materialRows: [
        {
          id: newRowId(),
          name: '페인트',
          controlMeasure: '국소배기장치 설치, 보호구 지급, 안전교육, 표지부착',
          checkItem: '',
          manager: '현장소장',
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
    },
    incidentHistory: {
      yearlyStats: buildInitialYearlyStats(),
      workplaceManagementNumber: '',
      noAccidentConfirm: false,
      accidentReportFile: null,
      insuranceMemberFile: null,
    },
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
    ...content.checklist.workerPhotos,
    ...content.checklist.sitePhotos,
    ...content.checklist.improvementPhotos,
    content.incidentHistory.accidentReportFile,
    content.incidentHistory.insuranceMemberFile,
  ]
  return files.filter((f): f is UploadedFile => Boolean(f)).map((f) => f.path)
}
