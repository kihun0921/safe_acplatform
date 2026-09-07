import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  ImageRun,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TableOfContents,
} from 'docx'
import type {
  WizardContent,
  RiskRow,
  RiskMethod,
  PpeRow,
  PpeIndividualIssuanceRow,
  EducationRow,
  PreventionRow,
  MachineryPreventionRow,
  HazardPreventionRow,
  PreventionExecutionRow,
  SafetyOrgRole,
  WorkPermitRow,
  ContactRow,
  SignalRow,
  HazardousItemRow,
  ProcedureRow,
  EmergencyTeamRow,
  YearlyStat,
  ChecklistCategoryResult,
  UploadedFile,
  SafetyEquipmentRow,
  InspectionPlanRow,
  MeetingPlanRow,
  ApprovalEntry,
  AgencyType,
  VulnerableWorkerRow,
  FireWatchAssignmentRow,
  TwoPersonTeamRow,
} from '../types/wizardContent'
import {
  LOTO_PROCEDURE_STEPS,
  SAFETY_INSPECTION_CYCLE_TABLE,
  EVALUATION_CRITERIA_TABLE,
  ACCIDENT_TYPE_TABLE,
  PPE_MANAGEMENT_RULES,
  PPE_VALIDITY_TABLE,
  isSectionIncluded,
} from '../types/wizardContent'

// Windows/Mac 파일시스템에서 사용할 수 없는 문자를 제거해 다운로드 파일명으로 안전하게 만든다.
// (실제 나라장터/국방부 공고명에는 슬래시·콜론·괄호 등이 흔히 포함되어 있어, 그대로 쓰면
// 브라우저가 다운로드를 조용히 실패시킬 수 있다.)
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || 'document'
}

export interface DocumentTable {
  headers: string[]
  rows: string[][]
}

export interface DocumentImage {
  url: string
  caption?: string
}

export interface DocumentSection {
  heading: string
  content?: string
  table?: DocumentTable
  images?: DocumentImage[]
  // 표 아래에 붙는 작은 안내문(※ 재평가 안내 등) — content와 달리 표 다음에 렌더링된다.
  footnote?: string
}

export interface DocumentContent {
  title: string
  sections: DocumentSection[]
  metadata?: {
    author?: string
    company?: string
    date?: string
  }
}

// ============================================================================
// WizardContent → DocumentContent 매퍼
// ============================================================================

function riskTable(rows: RiskRow[], method: RiskMethod): DocumentTable {
  const isLevel3 = method === '위험성수준 3단계(상·중·하) 판단법'
  const isFreqSeverity = method === '빈도·강도법'
  const isChecklist = method === '체크리스트법'

  // 체크리스트법은 "해당하는 항목만" 남기는 것이 방법의 핵심이라, 체크 해제(미해당)한 행은
  // 최종 문서에서 제외한다 (화면에서는 삭제하지 않고 흐리게 표시만 해둔 것과의 차이).
  const exportRows = isChecklist ? rows.filter((r) => (r.checked ?? true)) : rows

  // "상세페이지" 팝업 필드(세부공정명/위험분류/현재의 안전보건조치/개선후 위험성/확인자)는
  // 하나도 채우지 않았다면 칼럼 자체를 추가하지 않는다 — 기존에 작성해둔 단순한 문서의
  // 내보내기 결과가 이번 기능 추가로 넓어지지 않도록 하기 위함.
  const hasDetail = exportRows.some(
    (r) => r.processName || r.hazardCategory || r.currentMeasures || r.residualRisk || r.confirmer,
  )

  const headers = [
    '번호',
    ...(hasDetail ? ['세부공정명', '위험분류'] : []),
    '유해·위험요인',
    ...(hasDetail ? ['현재의 안전보건조치'] : []),
    ...(isLevel3 ? ['위험성수준'] : []),
    ...(isFreqSeverity ? ['빈도', '강도', '위험성(빈도×강도)'] : []),
    '개선대책',
    ...(hasDetail ? ['개선후 위험성'] : []),
    '개선예정일',
    '개선완료일',
    '담당자',
    ...(hasDetail ? ['확인자'] : []),
  ]

  return {
    headers,
    rows: exportRows.map((r, i) => [
      String(i + 1),
      ...(hasDetail ? [r.processName ?? '', r.hazardCategory ?? ''] : []),
      r.hazard,
      ...(hasDetail ? [r.currentMeasures ?? ''] : []),
      ...(isLevel3 ? [r.level] : []),
      ...(isFreqSeverity
        ? [r.frequency ?? '', r.severity ?? '', String((Number(r.frequency) || 0) * (Number(r.severity) || 0))]
        : []),
      r.countermeasure,
      ...(hasDetail ? [r.residualRisk ?? ''] : []),
      r.plannedDate,
      r.completedDate,
      r.manager,
      ...(hasDetail ? [r.confirmer ?? ''] : []),
    ]),
  }
}

function ppeTable(rows: PpeRow[]): DocumentTable {
  return {
    headers: ['품명', '수량', '지급대상', '관리계획'],
    rows: rows.map((r) => [r.name, r.qty, r.target, r.managementPlan]),
  }
}

function ppeIndividualIssuanceTable(rows: PpeIndividualIssuanceRow[]): DocumentTable {
  return {
    headers: ['구분', '직종', '근로자명', '보호구명', '지급수량', '지급서명(또는 지급시기)', '안전인증 여부'],
    rows: rows.map((r) => [
      r.category,
      r.jobType,
      r.workerName,
      r.itemName,
      r.qty,
      r.issuedSignature,
      r.certified ? 'O' : 'X',
    ]),
  }
}

function checklistTable(categories: ChecklistCategoryResult[]): DocumentTable {
  const rows: string[][] = []
  categories.forEach((cat) => {
    cat.items.forEach((item, idx) => {
      rows.push([idx === 0 ? cat.category : '', item.label, item.result || '-'])
    })
  })
  return { headers: ['구분', '점검항목', '결과'], rows }
}

function educationTable(rows: EducationRow[]): DocumentTable {
  return {
    headers: ['교육종류', '대상', '시간', '이수일', '차기이수일', '교육기관', '주기'],
    rows: rows.map((r) => [
      r.type,
      r.target,
      r.hours,
      r.completedDate,
      r.nextDueDate,
      r.institution,
      r.cycle,
    ]),
  }
}

function preventionTable(rows: PreventionRow[]): DocumentTable {
  return {
    headers: ['전사목표', '세부추진계획', '상반기', '하반기', '성과지표', '담당부서', '달성율', '기타'],
    rows: rows.map((r) => [r.goal, r.task, r.scheduleH1, r.scheduleH2, r.kpi, r.dept, r.achievementRate, r.note]),
  }
}

const CHECK_MARK = 'O'

function machineryPreventionTable(rows: MachineryPreventionRow[]): DocumentTable {
  return {
    headers: ['기계·기구·설비 등', '방호장치 설치', '보호구 지급·착용', '안전보건교육', '표지부착/안전수칙', '기타 대책'],
    rows: rows.map((r) => [
      r.item,
      r.guardInstall ? CHECK_MARK : '',
      r.ppeProvision ? CHECK_MARK : '',
      r.safetyEducation ? CHECK_MARK : '',
      r.signagePost ? CHECK_MARK : '',
      r.otherMeasure,
    ]),
  }
}

function hazardPreventionTable(rows: HazardPreventionRow[]): DocumentTable {
  return {
    headers: ['유해·위험물질 등', '국소배기장치 설치', '보호구 지급·착용', '안전보건교육', '표지부착/안전수칙', '기타 대책'],
    rows: rows.map((r) => [
      r.item,
      r.localExhaust ? CHECK_MARK : '',
      r.ppeProvision ? CHECK_MARK : '',
      r.safetyEducation ? CHECK_MARK : '',
      r.signagePost ? CHECK_MARK : '',
      r.otherMeasure,
    ]),
  }
}

function preventionExecutionTable(rows: PreventionExecutionRow[]): DocumentTable {
  return {
    headers: ['취약한 부분', '산재예방대책', '실행 계획', '비고'],
    rows: rows.map((r) => [r.weakPoint, r.measure, r.executionPlan, r.note]),
  }
}

function safetyInspectionCycleTable(): DocumentTable {
  return {
    headers: ['기계·장비', '점검사항', '검사주기'],
    rows: SAFETY_INSPECTION_CYCLE_TABLE.map((r) => [r.equipment, r.checkItems, r.cycle]),
  }
}

function evaluationCriteriaTable(): DocumentTable {
  return {
    headers: ['구분', '평가항목', '배점'],
    rows: EVALUATION_CRITERIA_TABLE.map((r) => [r.category, r.item, String(r.score)]),
  }
}

function accidentTypeTable(): DocumentTable {
  return {
    headers: ['구분', '사고유형', '상세내용'],
    rows: ACCIDENT_TYPE_TABLE.map((r) => [r.category, r.type, r.detail]),
  }
}

function ppeValidityTable(): DocumentTable {
  return {
    headers: ['구분', '유효기간', '점검대상'],
    rows: PPE_VALIDITY_TABLE.map((r) => [r.category, r.validity, r.items]),
  }
}

function safetyOrgTable(roles: SafetyOrgRole[]): DocumentTable {
  return {
    headers: ['구분', '담당자명'],
    rows: roles.map((r) => [r.role, r.name]),
  }
}

function workPermitTable(rows: WorkPermitRow[]): DocumentTable {
  return {
    headers: ['대상작업', '작성자', '검토자', '감시자', '확인자', '비고'],
    rows: rows.map((r) => [r.task, r.writer, r.reviewer, r.watcher, r.confirmer, r.note]),
  }
}

function contactTable(rows: ContactRow[]): DocumentTable {
  return {
    headers: ['기관/업체명', '연락처'],
    rows: rows.map((r) => [r.name, r.phone]),
  }
}

function signalTable(rows: SignalRow[]): DocumentTable {
  return {
    headers: ['작업명', '신호방법', '세부절차', '비고'],
    rows: rows.map((r) => [r.work, r.method, r.procedure, r.note]),
  }
}

function hazardousItemTable(rows: HazardousItemRow[], nameLabel: string): DocumentTable {
  return {
    headers: [nameLabel, '주요 방호조치(관리대책)', '점검항목', '관리책임자', '증빙서류', '비고(관계법령 등)'],
    rows: rows.map((r) => [r.name, r.controlMeasure, r.checkItem, r.manager, r.evidenceDoc, r.note]),
  }
}

function safetyEquipmentTable(rows: SafetyEquipmentRow[]): DocumentTable {
  return {
    headers: ['품명 및 규격', '수량', '개소/설치장소', '검교정 및 인증여부'],
    rows: rows.map((r) => [r.name, r.qty, r.location, r.certStatus]),
  }
}

function inspectionPlanTable(rows: InspectionPlanRow[]): DocumentTable {
  return {
    headers: ['점검 종류', '점검자', '점검주기', '점검지역/대상', '비고'],
    rows: rows.map((r) => [r.kind, r.inspector, r.cycle, r.target, r.note]),
  }
}

function meetingPlanTable(rows: MeetingPlanRow[]): DocumentTable {
  return {
    headers: ['회의명', '회의주관', '회의시기', '회의참석자', '비고'],
    rows: rows.map((r) => [r.name, r.host, r.timing, r.attendees, r.note]),
  }
}

function approvalLineTable(entries: ApprovalEntry[]): DocumentTable {
  return {
    headers: ['구분', ...entries.map((e) => e.role)],
    rows: [
      ['직책', ...entries.map((e) => e.title)],
      ['성명', ...entries.map((e) => e.name)],
    ],
  }
}

function procedureTable(rows: ProcedureRow[]): DocumentTable {
  return {
    headers: ['구분', '작업절차 및 안전수칙', '비고'],
    rows: rows.map((r) => [r.work, r.procedure, r.note]),
  }
}

function emergencyTeamTable(rows: EmergencyTeamRow[]): DocumentTable {
  return {
    headers: ['구분', '구성원', '주요역할', '비고'],
    rows: rows.map((r) => [r.role, r.member, r.mainDuty, r.note]),
  }
}

function vulnerableWorkerTable(rows: VulnerableWorkerRow[]): DocumentTable {
  return {
    headers: ['성명', '소속(업체명)', '구분', '세부사항', '담당 세부공정', '배치 시 안전조치사항'],
    rows: rows.map((r) => [r.name, r.company, r.category, r.detail, r.assignedProcess, r.safetyMeasure]),
  }
}

function fireWatchAssignmentTable(rows: FireWatchAssignmentRow[]): DocumentTable {
  return {
    headers: ['지정구분', '성명', '소속(업체명)', '담당 작업(장소)', '지정일', '교육이수사항'],
    rows: rows.map((r) => [r.role, r.name, r.company, r.workAssigned, r.designatedDate, r.trainingNote]),
  }
}

function twoPersonTeamTable(rows: TwoPersonTeamRow[]): DocumentTable {
  return {
    headers: ['작업내용(세부공정)', '작업일자', '1조 성명', '2조 성명', '소속(업체명)', '비상연락처'],
    rows: rows.map((r) => [r.workContent, r.workDate, r.member1, r.member2, r.company, r.contact]),
  }
}

function yearlyStatsTable(stats: YearlyStat[]): DocumentTable {
  return {
    headers: stats.map((s) => s.year),
    rows: [stats.map((s) => s.count || '0')],
  }
}

async function resolveImages(
  files: UploadedFile[],
  resolveFileUrl: (path: string) => Promise<string | null>,
): Promise<DocumentImage[]> {
  const results: DocumentImage[] = []
  for (const f of files) {
    const url = await resolveFileUrl(f.path)
    if (url) results.push({ url, caption: f.name })
  }
  return results
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * 재해현황 첨부서류(산재요양확인서/4대사회보험명부)는 이미지(사진·스캔본)인 경우에만
 * 실제로 삽입할 수 있다. PDF/HWP/엑셀 등 비-이미지 파일은 문서 안에 그림으로 넣을 수
 * 없으므로 파일명만 텍스트로 표기한다.
 */
async function resolveIncidentAttachment(
  file: UploadedFile | null,
  label: string,
  resolveFileUrl: (path: string) => Promise<string | null>,
): Promise<{ image: DocumentImage | null; name: string | null }> {
  if (!file) return { image: null, name: null }
  const name = `${label}: ${file.name}`
  if (!isImageFile(file.name)) return { image: null, name }

  const url = await resolveFileUrl(file.path)
  if (!url) return { image: null, name }
  return { image: { url, caption: name }, name: null }
}

// 발주처별 장(章) 제목 매핑 — 입력 화면(DOM) 순서는 발주처와 무관하게 동일하게 유지하고,
// 다운로드 문서에 찍히는 장 번호·그룹 제목만 선택한 발주처의 실제 제출 서식에 맞게
// 바꾼다("일반"은 지금까지의 기본 구성 그대로). 새 발주처를 지원할 때는 이 타입에 키를
// 추가할 필요 없이, 아래 두 맵에 발주처별 엔트리만 추가하면 된다.
type ChapterKey =
  | 'overview'
  | 'risk'
  | 'policy'
  | 'prevention'
  | 'org'
  | 'safetyEquipment'
  | 'inspectionPlan'
  | 'checklist'
  | 'education'
  | 'permit'
  | 'signalContact'
  | 'signalSignal'
  | 'ppe'
  | 'ppeIndividual'
  | 'hazardEquipment'
  | 'hazardMaterial'
  | 'hazardProcedure'
  | 'emergencyTeam'
  | 'emergencyContact'
  | 'emergencyPlan'
  | 'meetingPlan'
  | 'miscItems'
  | 'incident'
  | 'workerAssignment'

const DEFAULT_CHAPTER_HEADINGS: Record<ChapterKey, string> = {
  overview: 'Ⅰ-2. 사업개요',
  risk: 'Ⅱ-1. 위험성평가',
  policy: 'Ⅱ-2. 안전보건방침',
  prevention: 'Ⅱ-3. 산업재해예방활동 이행계획',
  org: 'Ⅱ-4. 안전보건관리조직',
  safetyEquipment: 'Ⅲ-1. 안전보건 장비(물품) 및 시설 운용',
  inspectionPlan: 'Ⅲ-1. 안전 순회점검·자체점검·합동점검 계획',
  checklist: 'Ⅲ-1. 안전점검 및 조치계획',
  education: 'Ⅲ-2. 안전보건교육계획',
  permit: 'Ⅲ-3. 안전작업제도',
  signalContact: 'Ⅳ-1. 신호 및 연락체계 - 연락체계',
  signalSignal: 'Ⅳ-1. 신호 및 연락체계 - 신호체계',
  ppe: 'Ⅳ-2. 개인보호구 지급계획',
  ppeIndividual: 'Ⅳ-2. 개인보호구 지급계획 - 개인별 지급기록',
  hazardEquipment: 'Ⅳ-3. 위험물질 및 설비관리계획 - 유해위험 기계·기구·설비',
  hazardMaterial: 'Ⅳ-3. 위험물질 및 설비관리계획 - 유해위험물질',
  hazardProcedure: 'Ⅳ-3. 위험물질 및 설비관리계획 - 작업절차 및 안전수칙',
  emergencyTeam: 'Ⅳ-4. 비상대책 - 대책반 구성',
  emergencyContact: 'Ⅳ-4. 비상대책 - 비상연락체계',
  emergencyPlan: 'Ⅳ-4. 비상대책 - 중대산업재해 조치계획 및 모의훈련',
  meetingPlan: 'Ⅵ-1. 기타사항 - 안전보건 협의체 회의 계획',
  miscItems: 'Ⅵ-1. 기타사항 - 청렴서약서·적격업체 선정기준',
  incident: 'Ⅴ-1. 산업재해 발생현황',
  workerAssignment: 'Ⅷ. 작업투입 인력 인적사항',
}

// LH(한국토지주택공사) 실제 제출 서식(설계안전보건대장/안전보건관리계획서 샘플) 분석
// 결과에 따른 Ⅰ~Ⅷ장 번호 — 위험성평가·산재예방대책 등은 LH 서식에서 다른 장에 속한다.
const LH_CHAPTER_HEADINGS: Record<ChapterKey, string> = {
  overview: 'Ⅰ-1. 사업개요',
  risk: 'Ⅱ-3. 위험성평가 (붙임1·2 참조)',
  policy: 'Ⅰ-2. 안전보건 경영방침 및 목표',
  prevention: 'Ⅱ-4. 산업재해예방활동 이행계획',
  org: 'Ⅰ-4. 안전보건관리 역할',
  safetyEquipment: 'Ⅲ-2. 재해예방을 위한 시설 및 장비',
  inspectionPlan: 'Ⅱ-5. 안전점검·순찰·검사 등 안전보건활동 계획',
  checklist: 'Ⅱ-5. 안전점검 및 조치계획',
  education: 'Ⅱ-1. 안전보건교육 실시계획',
  permit: 'Ⅱ-2. 안전작업에 관한 작업계획',
  signalContact: 'Ⅲ-1. 신호 및 연락체계 - 연락체계',
  signalSignal: 'Ⅲ-1. 신호 및 연락체계 - 신호체계',
  ppe: 'Ⅲ-2. 재해예방을 위한 시설 및 장비 - 개인보호구 지급계획',
  ppeIndividual: 'Ⅲ-2. 재해예방을 위한 시설 및 장비 - 개인보호구 개인별 지급기록',
  hazardEquipment: 'Ⅱ-4. 산업재해예방활동 이행계획 - 위험기계·기구·설비',
  hazardMaterial: 'Ⅱ-4. 산업재해예방활동 이행계획 - 유해·위험물질',
  hazardProcedure: 'Ⅱ-4. 산업재해예방활동 이행계획 - 작업절차 및 안전수칙',
  emergencyTeam: 'Ⅳ. 중대산업재해 등 비상 상황시 조치계획 - 대책반 구성',
  emergencyContact: 'Ⅳ. 중대산업재해 등 비상 상황시 조치계획 - 비상연락체계',
  emergencyPlan: 'Ⅳ. 중대산업재해 등 비상 상황시 조치계획 - 조치계획 및 모의훈련',
  meetingPlan: 'Ⅴ. 기타사항 - 안전보건 협의체 회의계획',
  miscItems: 'Ⅴ. 기타사항 - 청렴서약서·적격업체 선정기준·정기위험성평가계획·안전보건관리비용기준',
  incident: 'Ⅵ. 재해발생 수준',
  workerAssignment: 'Ⅷ. 작업투입 인력 인적사항',
}

function chapterHeading(agency: AgencyType | undefined, key: ChapterKey): string {
  const map = agency === 'LH' ? LH_CHAPTER_HEADINGS : DEFAULT_CHAPTER_HEADINGS
  return map[key]
}

/**
 * 마법사 입력 내용(WizardContent)을 실제 문서 순서(표지→Ⅰ.실행수준→Ⅱ.재해발생수준)대로
 * PDF/DOCX 출력용 DocumentContent로 변환한다. 첨부파일은 signed URL이 필요하므로
 * resolveFileUrl(path)를 통해 비동기로 해석한다. 장(章) 제목은 cover.agency에 따라
 * chapterHeading()이 골라주므로, 발주처가 바뀌어도 이 함수의 섹션 순서·개수는 그대로다.
 */
export async function buildExportContent(
  content: WizardContent,
  resolveFileUrl: (path: string) => Promise<string | null>,
): Promise<DocumentContent> {
  const {
    cover,
    businessOverview,
    safetyPolicy,
    preventionPlan,
    safetyOrg,
    riskAssessment,
    ppe,
    checklist,
    workPermitSystem,
    education,
    signalContact,
    hazardousMgmt,
    emergencyPlan,
    incidentHistory,
    inspectionPlan,
    meetingPlan,
    miscItems,
    workerAssignment,
  } = content

  const [
    workerPhotos,
    sitePhotos,
    improvementPhotos,
    accidentReport,
    insuranceMember,
    accidentRate,
    otherAttachment,
    policyDoc,
  ] = await Promise.all([
    resolveImages(checklist.workerPhotos, resolveFileUrl),
    resolveImages(checklist.sitePhotos, resolveFileUrl),
    resolveImages(checklist.improvementPhotos, resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.accidentReportFile, '산재요양(반려)확인서', resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.insuranceMemberFile, '4대사회보험 가입자명부', resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.accidentRateFile, '산업재해율 조회결과', resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.otherAttachmentFile, '기타서류', resolveFileUrl),
    resolveIncidentAttachment(safetyPolicy.policyDocFile, '안전보건방침 증빙자료', resolveFileUrl),
  ])

  const attachmentNames = [accidentReport.name, insuranceMember.name, accidentRate.name, otherAttachment.name].filter(
    (v): v is string => Boolean(v),
  )
  const attachmentImages = [
    accidentReport.image,
    insuranceMember.image,
    accidentRate.image,
    otherAttachment.image,
  ].filter((v): v is DocumentImage => Boolean(v))

  const sections: DocumentSection[] = [
    {
      heading: '수급업체 안전·보건 관리계획서 (표지)',
      content:
        `사업(공사)명: ${cover.projectName}\n` +
        `발주기관명: ${cover.orgName}\n` +
        `업체명: ${cover.companyName}\n` +
        `대표이사: ${cover.ceoName}\n` +
        `작성일자: ${cover.docDate}` +
        (cover.contractPeriod ? `\n도급기간: ${cover.contractPeriod}` : '') +
        (cover.contractAmount ? `\n도급금액(부가세 포함): ${cover.contractAmount}` : '') +
        (cover.safetyManagementBudget ? `\n계상된 안전관리비: ${cover.safetyManagementBudget}` : ''),
    },
    ...(cover.approvalLine.some((e) => e.title || e.name)
      ? [{ heading: '표지 - 결재란(수급사)', table: approvalLineTable(cover.approvalLine) }]
      : []),
    {
      heading: chapterHeading(cover.agency, 'overview'),
      content:
        `1. 과업 목적\n` +
        `□ 산업재해 예방을 위한 조직구성, 점검 및 안전보건조치에 대한 사전 계획수립으로 ` +
        `안전한 근로환경 마련 및 산업재해 예방 노력\n\n` +
        `2. 사업 개요\n` +
        `□ 사 업 명 : ${cover.projectName || '-'}\n` +
        `□ 사업기간 : ${businessOverview.period || '-'}\n` +
        `□ 위    치 : ${businessOverview.location || '-'}\n` +
        `□ 사 업 비 : ${businessOverview.budget || '-'}\n` +
        `□ 주요내용 : ${businessOverview.mainContent || '-'}`,
    },
    {
      heading: chapterHeading(cover.agency, 'risk'),
      content:
        `평가방법: ${riskAssessment.method}\n` +
        `평가자: ${riskAssessment.assessor}\n` +
        `평가시기: ${riskAssessment.assessedAt}` +
        (riskAssessment.constructionType ? `\n공사 종류: ${riskAssessment.constructionType}` : '') +
        (riskAssessment.overview ? `\n개요: ${riskAssessment.overview}` : ''),
      table: riskTable(riskAssessment.rows, riskAssessment.method),
      footnote:
        '※ 상기 평가표는 착공 전 사전평가 결과이며, 착공 후 현장여건 변화 시 재평가를 실시하고 ' +
        '결과를 반영하여 지속 관리합니다.',
    },
    {
      heading: chapterHeading(cover.agency, 'policy'),
      content:
        `${cover.companyName || '회사'} 안전보건 경영방침 및 목표\n\n` +
        `[방침]\n${safetyPolicy.principles.map((p, i) => `${i + 1}. ${p}`).join('\n') || '-'}\n\n` +
        `[목표]\n${safetyPolicy.goals.map((g, i) => `${i + 1}. ${g}`).join('\n') || '-'}\n\n` +
        `${safetyPolicy.announceDate || cover.docDate} · ${cover.companyName} 대표이사 ${cover.ceoName}` +
        (policyDoc.name ? `\n첨부파일(비이미지 - 파일명만 표기): ${policyDoc.name}` : ''),
    },
    {
      heading: chapterHeading(cover.agency, 'prevention'),
      table: preventionTable(preventionPlan.rows),
    },
    ...(preventionPlan.machineryRows.length && isSectionIncluded(content, 'machineryMatrix')
      ? [
          {
            heading: `${chapterHeading(cover.agency, 'prevention')} - 기계·기구·설비별 예방대책`,
            table: machineryPreventionTable(preventionPlan.machineryRows),
          },
        ]
      : []),
    ...(preventionPlan.hazardRows.length && isSectionIncluded(content, 'hazardMatrix')
      ? [
          {
            heading: `${chapterHeading(cover.agency, 'prevention')} - 유해·위험물질별 예방대책`,
            table: hazardPreventionTable(preventionPlan.hazardRows),
          },
        ]
      : []),
    ...(preventionPlan.executionRows.length && isSectionIncluded(content, 'executionPlan')
      ? [
          {
            heading: `${chapterHeading(cover.agency, 'prevention')} - 실행계획`,
            table: preventionExecutionTable(preventionPlan.executionRows),
          },
        ]
      : []),
    {
      heading: chapterHeading(cover.agency, 'org'),
      table: safetyOrgTable(safetyOrg.roles),
    },
    ...(ppe.equipmentRows.length && isSectionIncluded(content, 'safetyEquipment')
      ? [{ heading: chapterHeading(cover.agency, 'safetyEquipment'), table: safetyEquipmentTable(ppe.equipmentRows) }]
      : []),
    ...(inspectionPlan.rows.length && isSectionIncluded(content, 'inspectionPlan')
      ? [{ heading: chapterHeading(cover.agency, 'inspectionPlan'), table: inspectionPlanTable(inspectionPlan.rows) }]
      : []),
    {
      heading: chapterHeading(cover.agency, 'checklist'),
      content:
        `점검일자: ${checklist.inspectionDate}\n` +
        `점검현장: ${checklist.inspectionSite}\n` +
        `관리감독자: ${checklist.supervisorName}` +
        (checklist.otherNotes ? `\n기타사항: ${checklist.otherNotes}` : ''),
      table: checklistTable(checklist.categories),
    },
  ]

  if (policyDoc.image) {
    sections.push({ heading: `${chapterHeading(cover.agency, 'policy')} - 증빙자료`, images: [policyDoc.image] })
  }

  if (workerPhotos.length) {
    sections.push({ heading: '현장점검 사진 - 작업자 점검', images: workerPhotos })
  }
  if (sitePhotos.length) {
    sections.push({ heading: '현장점검 사진 - 현장 점검', images: sitePhotos })
  }
  if (improvementPhotos.length) {
    sections.push({ heading: '현장점검 사진 - 기타 개선사항', images: improvementPhotos })
  }

  sections.push(
    {
      heading: chapterHeading(cover.agency, 'education'),
      content: education.note || undefined,
      table: educationTable(education.rows),
    },
    ...(isSectionIncluded(content, 'workPermitSystem')
      ? [{ heading: chapterHeading(cover.agency, 'permit'), table: workPermitTable(workPermitSystem.rows) }]
      : []),
    ...(isSectionIncluded(content, 'signalContacts')
      ? [{ heading: chapterHeading(cover.agency, 'signalContact'), table: contactTable(signalContact.contacts) }]
      : []),
    ...(isSectionIncluded(content, 'signalSignals')
      ? [{ heading: chapterHeading(cover.agency, 'signalSignal'), table: signalTable(signalContact.signals) }]
      : []),
    {
      heading: chapterHeading(cover.agency, 'ppe'),
      table: ppeTable(ppe.rows),
    },
    ...(ppe.individualIssuanceRows.length && isSectionIncluded(content, 'ppeIndividualIssuance')
      ? [
          {
            heading: chapterHeading(cover.agency, 'ppeIndividual'),
            table: ppeIndividualIssuanceTable(ppe.individualIssuanceRows),
          },
        ]
      : []),
    {
      heading: chapterHeading(cover.agency, 'hazardEquipment'),
      table: hazardousItemTable(hazardousMgmt.equipmentRows, '장비명'),
    },
    {
      heading: chapterHeading(cover.agency, 'hazardMaterial'),
      table: hazardousItemTable(hazardousMgmt.materialRows, '물질명'),
    },
    {
      heading: chapterHeading(cover.agency, 'hazardProcedure'),
      table: procedureTable(hazardousMgmt.procedureRows),
    },
    {
      heading: chapterHeading(cover.agency, 'emergencyTeam'),
      table: emergencyTeamTable(emergencyPlan.teamRows),
    },
    {
      heading: chapterHeading(cover.agency, 'emergencyContact'),
      table: contactTable(emergencyPlan.contactRows),
    },
    {
      heading: chapterHeading(cover.agency, 'emergencyPlan'),
      content:
        `[조치계획 요약]\n${emergencyPlan.responseSummary || '-'}\n\n` +
        `모의훈련 주기: ${emergencyPlan.drillCycle || '-'}\n` +
        `모의훈련 시간: ${emergencyPlan.drillHours || '-'}`,
    },
    ...(meetingPlan.rows.length && isSectionIncluded(content, 'meetingPlan')
      ? [{ heading: chapterHeading(cover.agency, 'meetingPlan'), table: meetingPlanTable(meetingPlan.rows) }]
      : []),
    ...(isSectionIncluded(content, 'miscItems')
      ? [
          {
            heading: chapterHeading(cover.agency, 'miscItems'),
            content:
              `안전·보건관리비 집행 청렴서약서 제출: ${miscItems.integrityPledgeConfirm ? '제출함' : '미제출'}\n\n` +
              `[적격업체(관계수급인) 선정 평가기준]\n${miscItems.contractorSelectionCriteria || '-'}\n\n` +
              `[정기 위험성평가 실시계획(도급기간 1년 이상인 경우)]\n${miscItems.periodicRiskAssessmentPlan || '-'}\n\n` +
              `[종사자(관계수급인) 안전·보건 관리비용 기준]\n${miscItems.subcontractorSafetyCostStandard || '-'}`,
          },
        ]
      : []),
    {
      heading: chapterHeading(cover.agency, 'incident'),
      content:
        `사업장관리번호: ${incidentHistory.workplaceManagementNumber}\n` +
        `무재해 확인: ${incidentHistory.noAccidentConfirm ? '확인함' : '미확인'}` +
        (attachmentNames.length ? `\n첨부파일(비이미지 - 파일명만 표기): ${attachmentNames.join(', ')}` : ''),
      table: yearlyStatsTable(incidentHistory.yearlyStats),
    },
  )

  if (attachmentImages.length) {
    sections.push({ heading: `${chapterHeading(cover.agency, 'incident')} - 첨부서류`, images: attachmentImages })
  }

  if (isSectionIncluded(content, 'appendixLoto')) {
    sections.push({
      heading: '붙임1. LOTO(Lock Out, Tag Out) 절차',
      content: LOTO_PROCEDURE_STEPS.map((s) => `${s.label}: ${s.text}`).join('\n'),
    })
  }
  if (isSectionIncluded(content, 'appendixInspectionCycle')) {
    sections.push({
      heading: '붙임2. 법정 안전검사 주기',
      table: safetyInspectionCycleTable(),
    })
  }
  if (isSectionIncluded(content, 'appendixEvaluationCriteria')) {
    sections.push({
      heading: '붙임3. 발주기관 평가기준표',
      table: evaluationCriteriaTable(),
    })
  }
  if (isSectionIncluded(content, 'appendixPpeManagement')) {
    sections.push({
      heading: '붙임4. 개인보호구 관리계획',
      content: PPE_MANAGEMENT_RULES.map((rule, i) => `${i + 1}) ${rule}`).join('\n'),
      table: ppeValidityTable(),
    })
  }
  if (isSectionIncluded(content, 'appendixAccidentTypes')) {
    sections.push({
      heading: '붙임5. 사고유형 분류표',
      table: accidentTypeTable(),
    })
  }

  if (isSectionIncluded(content, 'workerAssignmentLH')) {
    if (workerAssignment.vulnerableWorkers.length) {
      sections.push({
        heading: `${chapterHeading(cover.agency, 'workerAssignment')} - 안전취약근로자 식별 및 관리대장`,
        table: vulnerableWorkerTable(workerAssignment.vulnerableWorkers),
      })
    }
    if (workerAssignment.fireWatchAssignments.length) {
      sections.push({
        heading: `${chapterHeading(cover.agency, 'workerAssignment')} - 화재감시자·작업지휘자·감시자 지정`,
        table: fireWatchAssignmentTable(workerAssignment.fireWatchAssignments),
      })
    }
    if (workerAssignment.twoPersonTeams.length) {
      sections.push({
        heading: `${chapterHeading(cover.agency, 'workerAssignment')} - 위험작업 시 2인1조 편성표`,
        table: twoPersonTeamTable(workerAssignment.twoPersonTeams),
      })
    }
  }

  return {
    title: cover.projectName ? `${cover.projectName} 안전보건관리계획서` : '안전보건관리계획서',
    sections,
    metadata: { company: cover.companyName, date: cover.docDate },
  }
}

// ============================================================================
// PDF export (html2canvas-pro + jsPDF — 직접 조립)
// ============================================================================
// html2pdf.js가 내부에서 쓰는 구버전 html2canvas는 oklch() 같은 최신 CSS 색상 함수를
// 만나면 "Attempting to parse an unsupported color function" 오류로 죽는다. 이 앱의
// 디자인 토큰이 전부 oklch() 기반이라 텍스트/표를 캡처할 때마다 실패했다. html2canvas-pro는
// oklch/lab/lch/color-mix까지 지원하므로 이 문제가 없다. 또한 jsPDF를 직접 다뤄서
// 첨부 이미지 하나당 페이지 하나씩 배치하는 것도 가능해졌다.

const PDF_PAGE_WIDTH_MM = 210
const PDF_PAGE_HEIGHT_MM = 297
const PDF_MARGIN_MM = 10
const PDF_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2
const PDF_CONTENT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2
const OFFSCREEN_WIDTH_PX = 794 // A4 폭(210mm)을 96dpi 기준 픽셀로 환산한 값

function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'))
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  ).then(() => undefined)
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Error fetching image for PDF export:', err)
    return null
  }
}

function createOffscreenContainer(heightPx?: number): HTMLElement {
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  el.style.width = `${OFFSCREEN_WIDTH_PX}px`
  el.style.backgroundColor = '#ffffff'
  el.style.boxSizing = 'border-box'
  if (heightPx) el.style.height = `${heightPx}px`
  document.body.appendChild(el)
  return el
}

async function renderElementToCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForImages(el)
  return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
}

interface PdfCursor {
  usedPage: boolean
}

function nextPage(pdf: jsPDF, cursor: PdfCursor): void {
  if (cursor.usedPage) pdf.addPage()
  cursor.usedPage = true
}

// 텍스트/표 콘텐츠를 캡처한 캔버스는 페이지 높이보다 길 수 있으므로 페이지 높이만큼씩
// 잘라 여러 페이지에 나눠 붙인다 (html2pdf.js가 내부적으로 하던 것과 동일한 방식).
function addCanvasAsPages(pdf: jsPDF, canvas: HTMLCanvasElement, cursor: PdfCursor): void {
  const pxPerMm = canvas.width / PDF_CONTENT_WIDTH_MM
  const pageHeightPx = Math.max(1, Math.floor(PDF_CONTENT_HEIGHT_MM * pxPerMm))

  let offset = 0
  while (offset < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offset)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceHeight
    const ctx = slice.getContext('2d')
    if (!ctx) break
    ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    nextPage(pdf, cursor)
    const sliceHeightMm = sliceHeight / pxPerMm
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      PDF_CONTENT_WIDTH_MM,
      sliceHeightMm,
    )

    offset += sliceHeight
  }
}

// 첨부 이미지 1장 = PDF 1페이지. 페이지 인쇄 영역에 맞춰 비율을 유지한 채 표시하고,
// 아래에 원본 파일명을 캡션으로 붙인다 (한글은 jsPDF 기본 폰트로 못 그리므로 이 캡션도
// html2canvas-pro로 함께 캡처한다).
async function addImagePage(pdf: jsPDF, image: DocumentImage, cursor: PdfCursor): Promise<void> {
  const dataUrl = image.url.startsWith('data:') ? image.url : await fetchAsDataUrl(image.url)
  if (!dataUrl) return

  const pageAspect = PDF_CONTENT_HEIGHT_MM / PDF_CONTENT_WIDTH_MM
  const container = createOffscreenContainer(Math.round(OFFSCREEN_WIDTH_PX * pageAspect))
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'
  container.style.gap = '18px'
  container.style.padding = '32px'

  const img = document.createElement('img')
  img.src = dataUrl
  img.style.maxWidth = '100%'
  img.style.maxHeight = image.caption ? '82%' : '92%'
  img.style.objectFit = 'contain'
  container.appendChild(img)

  if (image.caption) {
    const cap = document.createElement('div')
    cap.textContent = image.caption
    cap.style.fontSize = '16px'
    cap.style.color = '#333333'
    cap.style.textAlign = 'center'
    cap.style.fontFamily = "'Noto Sans KR', sans-serif"
    container.appendChild(cap)
  }

  try {
    const canvas = await renderElementToCanvas(container)
    nextPage(pdf, cursor)
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      PDF_CONTENT_WIDTH_MM,
      PDF_CONTENT_HEIGHT_MM,
    )
  } finally {
    document.body.removeChild(container)
  }
}

function createContentWrapper(): HTMLElement {
  const div = document.createElement('div')
  div.style.padding = '20px'
  div.style.fontFamily = "'Noto Sans KR', sans-serif"
  return div
}

function appendSectionBody(wrapper: HTMLElement, section: DocumentSection): void {
  const heading = document.createElement('h2')
  heading.textContent = section.heading
  heading.style.marginTop = '0'
  heading.style.marginBottom = '10px'
  wrapper.appendChild(heading)

  if (section.content) {
    const text = document.createElement('p')
    text.textContent = section.content
    text.style.lineHeight = '1.6'
    text.style.whiteSpace = 'pre-wrap'
    wrapper.appendChild(text)
  }

  if (section.table && section.table.rows.length > 0) {
    const table = document.createElement('table')
    table.style.width = '100%'
    table.style.borderCollapse = 'collapse'
    table.style.marginTop = '10px'
    table.style.marginBottom = '10px'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    section.table.headers.forEach((h) => {
      const th = document.createElement('th')
      th.textContent = h
      th.style.border = '1px solid #999'
      th.style.padding = '6px 8px'
      th.style.backgroundColor = '#f0f0f0'
      th.style.fontSize = '12px'
      headRow.appendChild(th)
    })
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    section.table.rows.forEach((row) => {
      const tr = document.createElement('tr')
      row.forEach((cell) => {
        const td = document.createElement('td')
        td.textContent = cell || '-'
        td.style.border = '1px solid #ccc'
        td.style.padding = '6px 8px'
        td.style.fontSize = '12px'
        td.style.whiteSpace = 'pre-wrap'
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    wrapper.appendChild(table)
  }

  if (section.footnote) {
    const note = document.createElement('p')
    note.textContent = section.footnote
    note.style.fontSize = '11px'
    note.style.color = '#666'
    note.style.marginTop = '4px'
    wrapper.appendChild(note)
  }
}

function buildSectionBody(section: DocumentSection): HTMLElement {
  const wrapper = createContentWrapper()
  appendSectionBody(wrapper, section)
  return wrapper
}

// 표지 페이지 - 첨부 예시양식(붙임2)처럼 제목을 박스로 가운데 배치하고, 그 아래에
// 사업명/발주기관명/업체명/대표이사/작성일자 등 표지 정보를 나열한다.
function buildCoverBody(content: DocumentContent, coverSection: DocumentSection): HTMLElement {
  const wrapper = createContentWrapper()
  wrapper.style.textAlign = 'center'
  wrapper.style.padding = '60px 30px'

  const titleBox = document.createElement('div')
  titleBox.style.border = '2px solid #333'
  titleBox.style.backgroundColor = '#eef2ec'
  titleBox.style.padding = '48px 24px'
  titleBox.style.margin = '60px 10px 50px'

  const titleMain = document.createElement('div')
  titleMain.textContent = content.title
  titleMain.style.fontSize = '28px'
  titleMain.style.fontWeight = '800'
  titleMain.style.lineHeight = '1.5'
  titleBox.appendChild(titleMain)
  wrapper.appendChild(titleBox)

  if (coverSection.content) {
    const infoBlock = document.createElement('div')
    infoBlock.style.fontSize = '15px'
    infoBlock.style.lineHeight = '2.1'
    infoBlock.style.marginBottom = '70px'
    coverSection.content.split('\n').forEach((line) => {
      const row = document.createElement('div')
      row.textContent = line
      infoBlock.appendChild(row)
    })
    wrapper.appendChild(infoBlock)
  }

  if (content.metadata?.company) {
    const companyEl = document.createElement('div')
    companyEl.textContent = content.metadata.company
    companyEl.style.fontSize = '18px'
    companyEl.style.fontWeight = '700'
    companyEl.style.borderTop = '2px solid #333'
    companyEl.style.display = 'inline-block'
    companyEl.style.padding = '14px 50px 0'
    wrapper.appendChild(companyEl)
  }

  return wrapper
}

interface TocEntry {
  heading: string
  page: number
}

function buildTocBody(entries: TocEntry[]): HTMLElement {
  const wrapper = createContentWrapper()

  const title = document.createElement('h1')
  title.textContent = '목차'
  title.style.textAlign = 'center'
  title.style.marginBottom = '24px'
  wrapper.appendChild(title)

  const box = document.createElement('div')
  box.style.border = '1px solid #999'
  box.style.padding = '20px 24px'

  entries.forEach((entry) => {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.justifyContent = 'space-between'
    row.style.gap = '12px'
    row.style.padding = '7px 0'
    row.style.fontSize = '13px'
    row.style.borderBottom = '1px dotted #ccc'

    const label = document.createElement('span')
    label.textContent = entry.heading
    row.appendChild(label)

    const page = document.createElement('span')
    page.textContent = String(entry.page)
    page.style.flexShrink = '0'
    row.appendChild(page)

    box.appendChild(row)
  })

  wrapper.appendChild(box)
  return wrapper
}

export async function exportToPDF(
  documentContent: DocumentContent,
  filename: string = 'document.pdf',
): Promise<void> {
  const textSections = documentContent.sections.filter((s) => s.content || s.table)
  const images = documentContent.sections.flatMap((s) => s.images ?? [])
  const [coverSection, ...bodySections] = textSections

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cursor: PdfCursor = { usedPage: false }

  const pageCountOf = (canvas: HTMLCanvasElement): number => {
    const pxPerMm = canvas.width / PDF_CONTENT_WIDTH_MM
    const pageHeightPx = Math.max(1, Math.floor(PDF_CONTENT_HEIGHT_MM * pxPerMm))
    return Math.max(1, Math.ceil(canvas.height / pageHeightPx))
  }

  const renderOffscreen = async (build: () => HTMLElement): Promise<HTMLCanvasElement> => {
    const container = createOffscreenContainer()
    container.appendChild(build())
    try {
      return await renderElementToCanvas(container)
    } finally {
      document.body.removeChild(container)
    }
  }

  // 1) 표지 - 다른 섹션과 섞이지 않는 독립된 페이지(내용이 길면 자동으로 다음 페이지까지 이어짐)
  let coverPageCount = 0
  if (coverSection) {
    const canvas = await renderOffscreen(() => buildCoverBody(documentContent, coverSection))
    coverPageCount = pageCountOf(canvas)
    addCanvasAsPages(pdf, canvas, cursor)
  }

  // 2) 본문 섹션들을 각각 별도 캔버스로 미리 렌더링 - 이렇게 섹션 단위로 캔버스를 나눠 두면
  // 아래에서 섹션마다 새 페이지를 강제할 수 있고(사업개요/위험성평가 등이 이전 섹션과 한
  // 페이지에 섞이지 않는다), 목차의 쪽수 계산에도 그대로 재사용할 수 있다.
  const rendered: { heading: string; canvas: HTMLCanvasElement; pageCount: number }[] = []
  for (const section of bodySections) {
    const canvas = await renderOffscreen(() => buildSectionBody(section))
    rendered.push({ heading: section.heading, canvas, pageCount: pageCountOf(canvas) })
  }

  // 3) 목차 - 표지/본문 각 섹션의 실제 페이지 수를 반영해 쪽수를 계산한다. 목차 자체가
  // 항목이 많아 여러 페이지가 될 수도 있으므로, 먼저 1페이지로 가정해 실제 쪽수를 측정하고
  // 다르면 그 쪽수로 한 번 더 계산해 다시 그린다.
  if (rendered.length) {
    const buildEntries = (tocPageCount: number): TocEntry[] => {
      let page = coverPageCount + tocPageCount + 1
      return rendered.map((r) => {
        const entry: TocEntry = { heading: r.heading, page }
        page += r.pageCount
        return entry
      })
    }
    const measureCanvas = await renderOffscreen(() => buildTocBody(buildEntries(1)))
    const tocPageCount = pageCountOf(measureCanvas)
    const finalCanvas =
      tocPageCount === 1 ? measureCanvas : await renderOffscreen(() => buildTocBody(buildEntries(tocPageCount)))
    addCanvasAsPages(pdf, finalCanvas, cursor)
  }

  // 4) 본문 섹션 - 섹션마다 새 페이지에서 시작
  for (const { canvas } of rendered) {
    addCanvasAsPages(pdf, canvas, cursor)
  }

  // 5) 첨부 이미지(사진 등) - 기존과 동일하게 사진 1장당 새 페이지
  for (const image of images) {
    try {
      await addImagePage(pdf, image, cursor)
    } catch (err) {
      console.error('첨부 이미지 페이지 생성 실패:', err)
    }
  }

  pdf.save(filename)
}

// ============================================================================
// DOCX export (docx)
// ============================================================================

function docxImageType(fileName: string): 'jpg' | 'png' | 'gif' | 'bmp' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'gif') return 'gif'
  if (ext === 'bmp') return 'bmp'
  return 'png'
}

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch (err) {
    console.error('Error fetching image for DOCX export:', err)
    return null
  }
}

function mimeForDocxType(type: 'jpg' | 'png' | 'gif' | 'bmp'): string {
  if (type === 'jpg') return 'image/jpeg'
  if (type === 'gif') return 'image/gif'
  if (type === 'bmp') return 'image/bmp'
  return 'image/png'
}

async function getImageDimensions(
  buffer: ArrayBuffer,
  mime: string,
): Promise<{ width: number; height: number } | null> {
  const blob = new Blob([buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('이미지 크기를 확인할 수 없습니다.'))
      img.src = url
    })
  } catch (err) {
    console.error(err)
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

// A4 문서 기준 인쇄 영역(약 6.5in x 9in)에 맞춰 원본 비율을 유지한 채 이미지를
// 최대한 크게 채운다 (사진 1장 = 페이지 1장이 되도록).
const DOCX_MAX_IMAGE_WIDTH_PX = 600
const DOCX_MAX_IMAGE_HEIGHT_PX = 760

function fitImageSize(
  width: number,
  height: number,
): { width: number; height: number } {
  const ratio = Math.min(DOCX_MAX_IMAGE_WIDTH_PX / width, DOCX_MAX_IMAGE_HEIGHT_PX / height)
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

function buildDocxTable(table: DocumentTable): Table {
  const columnWidth = Math.floor(100 / Math.max(table.headers.length, 1))

  const headerRow = new TableRow({
    tableHeader: true,
    children: table.headers.map(
      (h) =>
        new TableCell({
          width: { size: columnWidth, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        }),
    ),
  })

  const bodyRows = table.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: columnWidth, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: cell || '-' })],
            }),
        ),
      }),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })
}

// 표지에 넣을 제목 박스 테두리 (붙임2 예시양식처럼 제목을 상자로 감싼다)
const COVER_BOX_BORDER = { style: BorderStyle.SINGLE, size: 12, color: '333333' }

export async function exportToDOCX(
  documentContent: DocumentContent,
  filename: string = 'document.docx',
): Promise<void> {
  const [coverSection, ...bodySections] = documentContent.sections.filter((s) => s.content || s.table)
  const gallerySections = documentContent.sections.filter((s) => !s.content && !s.table && s.images?.length)

  const children: (Paragraph | Table | TableOfContents)[] = []

  // 1) 표지 - 제목을 박스로 감싸 가운데 배치하고 그 아래에 표지 정보를 나열
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 200 },
      border: { top: COVER_BOX_BORDER, bottom: COVER_BOX_BORDER, left: COVER_BOX_BORDER, right: COVER_BOX_BORDER },
      children: [new TextRun({ text: documentContent.title, bold: true, size: 36 })],
    }),
  )
  if (coverSection?.content) {
    coverSection.content.split('\n').forEach((line) => {
      children.push(
        new Paragraph({ text: line, alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
      )
    })
  }
  if (documentContent.metadata?.company) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        border: { top: { style: BorderStyle.SINGLE, size: 8, color: '333333' } },
        children: [new TextRun({ text: documentContent.metadata.company, bold: true, size: 26 })],
      }),
    )
  }

  // 2) 목차 - Word의 목차 필드를 삽입한다(열었을 때 자동으로 채워지지 않으면 우클릭 후
  // "필드 업데이트"로 갱신 가능 - 실제 인쇄 시 각 PC의 폰트/여백에 따라 페이지가 달라지므로
  // 고정된 쪽수를 미리 적어 넣는 대신 Word가 실제 쪽수를 계산하도록 한다).
  if (bodySections.length) {
    children.push(
      new Paragraph({
        text: '목차',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { after: 200 },
      }),
    )
    children.push(new TableOfContents('목차', { hyperlink: true, headingStyleRange: '2-2' }))
  }

  // 3) 본문 섹션 - 섹션마다 새 페이지에서 시작
  for (const section of bodySections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { before: 200, after: 150 },
      }),
    )

    if (section.content) {
      section.content.split('\n').forEach((line) => {
        children.push(new Paragraph({ text: line, spacing: { after: 100 } }))
      })
    }

    if (section.table && section.table.rows.length > 0) {
      children.push(buildDocxTable(section.table))
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }

    if (section.footnote) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.footnote, italics: true, size: 18, color: '666666' })],
          spacing: { after: 200 },
        }),
      )
    }
  }

  // 4) 사진 갤러리 섹션 - 사진 1장 = 페이지 1장
  for (const section of gallerySections) {
    if (!section.images?.length) continue
    for (const img of section.images) {
      const buffer = await fetchImageBuffer(img.url)
      if (!buffer) continue

      const type = docxImageType(img.caption ?? '')
      const dims = await getImageDimensions(buffer, mimeForDocxType(type))
      const size = dims
        ? fitImageSize(dims.width, dims.height)
        : { width: DOCX_MAX_IMAGE_WIDTH_PX, height: Math.round(DOCX_MAX_IMAGE_WIDTH_PX * 0.75) }

      // 사진 1장 = 페이지 1장: 이미지마다 새 페이지에서 시작하도록 강제 페이지 나눔
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: buffer, type, transformation: size })],
          spacing: { after: 120 },
        }),
      )
      if (img.caption) {
        children.push(
          new Paragraph({ text: img.caption, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        )
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })

  try {
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    // 클릭 직후 바로 revoke하면 일부 브라우저에서 다운로드가 시작되기 전에
    // blob URL이 무효화되어 아무 일도 일어나지 않은 것처럼 보일 수 있다.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('Error exporting to DOCX:', error)
    throw error
  }
}
