import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button/Button'
import Input from '../components/common/Input/Input'
import Textarea from '../components/common/Textarea/Textarea'
import Spinner from '../components/common/Spinner/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess'
import TrialBanner from '../components/common/TrialBanner/TrialBanner'
import CouponRedeemModal from '../components/common/CouponRedeemModal/CouponRedeemModal'
import { getRedeemedCouponDocumentIds } from '../services/supabaseClient'
import { useDocumentWizard } from '../hooks/useDocumentWizard'
import { supabase } from '../services/supabaseClient'
import {
  WizardContent,
  RiskRow,
  PpeRow,
  EducationRow,
  PreventionRow,
  WorkPermitRow,
  ContactRow,
  SignalRow,
  HazardousItemRow,
  ProcedureRow,
  EmergencyTeamRow,
  ChecklistResult,
  ChecklistCategoryResult,
  UploadedFile,
  RiskMethod,
  RISK_METHODS,
  RISK_METHOD_DESCRIPTIONS,
  ConstructionType,
  newRowId,
} from '../types/wizardContent'
import {
  CONSTRUCTION_TYPES,
  classifyConstructionType,
  buildRiskRowsFromTemplate,
  buildRiskOverviewText,
} from '../types/constructionTemplates'
import { exportToPDF, exportToDOCX, buildExportContent, sanitizeFilename } from '../utils/documentExport'
import { extractRiskItemsFromFile, suggestRiskItems } from '../utils/aiRiskExtraction'
import { extractBusinessOverviewFromAnnouncement, pickAnnouncementPdf } from '../utils/aiBusinessOverviewExtraction'
import './DocumentWizardPage.css'

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function updateArrayItem<T extends { id: string }>(
  arr: T[],
  id: string,
  patch: Partial<Omit<T, 'id'>>,
): T[] {
  return arr.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

// ============================================================================
// 좌측 목차 구조 (경쟁사 "안전달인" 화면 구조 참고 — Ⅰ~Ⅴ 챕터, 15개 세부항목)
// ============================================================================
const TOC_CHAPTERS = [
  {
    title: 'Ⅰ. 사업개요',
    items: [
      { id: 'sec-cover', label: '표지' },
      { id: 'sec-overview', label: '사업개요' },
    ],
  },
  {
    title: 'Ⅱ. 안전보건관리체계',
    items: [
      { id: 'sec-risk', label: '위험성평가' },
      { id: 'sec-policy', label: '안전보건방침' },
      { id: 'sec-prevention', label: '산업재해예방활동 이행계획' },
      { id: 'sec-org', label: '안전보건관리조직' },
    ],
  },
  {
    title: 'Ⅲ. 실행계획',
    items: [
      { id: 'sec-checklist', label: '안전점검 및 조치계획' },
      { id: 'sec-education', label: '안전보건교육계획' },
      { id: 'sec-permit', label: '안전작업제도' },
    ],
  },
  {
    title: 'Ⅳ. 운영관리',
    items: [
      { id: 'sec-signal', label: '신호 및 연락체계' },
      { id: 'sec-ppe', label: '개인보호구 지급계획' },
      { id: 'sec-hazard', label: '위험물질 및 설비관리계획' },
      { id: 'sec-emergency', label: '비상대책' },
    ],
  },
  {
    title: 'Ⅴ. 재해발생수준',
    items: [{ id: 'sec-incident', label: '산업재해 발생현황' }],
  },
] as const

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 공종별 비상대응 사고유형 예시 매핑 (이미 만든 riskAssessment.constructionType 재사용)
type AccidentType = '추락' | '감전' | '질식' | '붕괴'

const ACCIDENT_TYPE_BY_CONSTRUCTION: Record<ConstructionType, AccidentType> = {
  종합건축공사: '추락',
  실내건축공사: '추락',
  강구조물공사: '추락',
  '도장·방수공사': '추락',
  조경공사: '추락',
  일반공사: '추락',
  전기공사: '감전',
  정보통신공사: '감전',
  기계설비공사: '질식',
  소방시설공사: '질식',
  토목공사: '붕괴',
  철거공사: '붕괴',
}

const EMERGENCY_EXAMPLES: Record<AccidentType, { step: string; action: string }[]> = {
  추락: [
    { step: '추락상황 발생', action: '작업자 추락 확인, 사내방송 또는 비상경보로 상황을 전파하고 지원 요청' },
    { step: '작업중지 및 대피 상황전파', action: '작업중지 및 대피 지시, 상황 전파(장소, 상황), 119 신고' },
    { step: '2차 사고 예방조치', action: '추가 추락 위험 시 출입금지·통제표지 설치, 신호수 배치 등 2차 재해 예방조치' },
    { step: '피해자구조 및 응급조치', action: '구조장비 투입하여 신속히 구조, 상태에 따라 응급처치(심폐소생술, 지혈 등)' },
    { step: '현장보존 및 사후조사', action: '작업장 통제, 사고조사 전까지 현장 보존, CCTV·사진 등 증거 확보 및 관계기관 신고' },
  ],
  감전: [
    { step: '감전상황 발생', action: '전원 즉시 차단, 감전자 확인, 사내방송으로 상황 전파' },
    { step: '작업중지 및 구조', action: '절연장비 착용 후 구조, 2차 감전 방지 조치, 119 신고' },
    { step: '응급조치', action: '심정지 여부 확인, 심폐소생술 실시, 화상 부위 응급처치' },
    { step: '현장보존 및 사후조사', action: '설비 잠금조치(Lock-out), 사고조사 전까지 현장 보존, 관계기관 신고' },
  ],
  질식: [
    { step: '질식상황 발생', action: '구조자의 무단 진입 금지, 즉시 환기 실시 및 119 신고' },
    { step: '작업중지 및 구조', action: '공기호흡기 등 장비 착용 후 구조대가 구조, 산소농도 측정' },
    { step: '응급조치', action: '호흡·의식 확인, 심폐소생술 실시, 신선한 공기가 있는 곳으로 이동' },
    { step: '현장보존 및 사후조사', action: '밀폐공간 출입통제, 사고조사 전까지 현장 보존, 관계기관 신고' },
  ],
  붕괴: [
    { step: '붕괴상황 발생', action: '작업중지 및 대피 지시, 매몰자 확인, 사내방송 전파' },
    { step: '2차 붕괴 예방조치', action: '추가 붕괴 위험 구간 출입통제, 지반 상태 확인 후 접근' },
    { step: '피해자구조 및 응급조치', action: '중장비 투입해 신속히 구조, 119 신고, 응급처치 실시' },
    { step: '현장보존 및 사후조사', action: '작업장 통제, 사고조사 전까지 현장 보존, 관계기관 신고' },
  ],
}

const RISK_REGULATION_ARTICLES = [
  '제1조(목적) 이 규정은 우리 회사 전체의 유해·위험요인을 파악하고 위험성을 추정·결정한 후, 위험성을 감소시키기 위한 조치를 시행함을 목적으로 한다.',
  '제2조(적용) 이 규정은 우리 회사에서 수행하는 모든 작업, 설비 및 공정의 위험성평가에 대한 범위, 절차, 책임과 권한에 대하여 적용한다.',
  '제3조(조직의 구성) 위험성평가 조직의 구성은 안전보건관리책임자를 총괄 관리자로, 관리감독자 및 근로자를 위험성평가담당자로 한다.',
  '제4조(평가대상) 근로자에게 안전·보건상 영향을 주는 유해·위험시설, 유해·위험요인, 정상적 및 비정상적 작업 등을 평가대상으로 한다.',
  '제5조(실시시기) 최초평가는 사업 개시 후 지체없이 실시하며, 수시평가는 재해 발생 또는 위험요인 추가 발생 시 실시한다.',
  '제6조(실시방법) 사업주가 주관하고 위험성평가를 위한 체계를 구축하며, 유해·위험요인을 파악하고 개선대책을 수립·시행한다.',
  '제7조(추진절차) 사전준비 → 유해·위험요인 파악 → 위험성 결정 → 위험성 감소대책 수립·실행 → 기록 및 공유 순으로 진행한다.',
  '제8조(근로자에 대한 공지) 위험성평가 결과를 근로자에게 게시·교육 등의 방법으로 공지한다.',
  '제9조(근로자의 참여) 위험성평가 실시 전 과정에 근로자를 참여시킨다.',
]

const SAFETY_ORG_DUTY_TEXT: Record<string, string> = {
  안전보건관리책임자:
    '사업장의 산업재해 예방계획 수립, 안전보건관리규정의 작성·변경, 안전보건교육 실시, 작업환경측정 등 안전·보건에 관한 사항을 총괄 관리한다.',
  관리감독자:
    '소속 작업자에 대한 안전·보건 점검 및 지도, 개인보호구 착용 확인, 위험성평가 참여, 이상 발생 시 보고 및 응급조치를 수행한다.',
  '안전관리자(안전담당자)':
    '안전에 관한 기술적 사항에 대해 사업주 또는 안전보건관리책임자를 보좌하고 지도·조언하며, 위험성평가 실시에 관한 사항을 관리한다.',
  안전보건담당자:
    '안전보건교육 실시, 위험성평가 보좌, 작업환경측정 및 근로자 건강진단에 관한 보좌 업무를 수행한다.',
}

const EMERGENCY_PROCEDURE_STEPS = [
  {
    label: '대응절차',
    text: '작업중지 → 근로자 대피 및 구호조치 → 추가 피해방지 조치 → 현장조사 및 관계기관 신고 → 위험요인 제거 → 확인 및 기록보관 → 발생 원인분석 및 대책수립 → 비상대응 모의훈련 실시',
  },
  { label: '작업중지', text: '중대재해 발생 시, 재해가 발생할 급박한 위험상황 발생 시, 근로자 등 종사자에 의한 작업중지 요청 시' },
  { label: '대피 및 구호조치', text: '비상사태 발생 시 확성기·수신호·전화·SNS 등으로 안전한 장소에 신속하게 대피하도록 조치' },
  { label: '추가피해 방지조치', text: '2차 재해가 발생할 위험이 있는 장소에 출입금지 조치 및 경고표지판 설치' },
  {
    label: '사후조사 및 신고',
    text: '사고의 개요, 종류, 발생 장소, 재해자 정보, 피해상황, 발생원인 및 대책 등을 조사하여 관계기관에 신고',
  },
  { label: '비상대응 모의훈련', text: '반기 1회 이상 주기적으로 실시하고 실시결과를 현장에 보관' },
]

function calcPercentComplete(content: WizardContent): number {
  const checks: boolean[] = [
    Boolean(content.cover.projectName),
    Boolean(content.cover.orgName),
    Boolean(content.cover.companyName),
    Boolean(content.cover.ceoName),
    Boolean(content.businessOverview.location),
    Boolean(content.businessOverview.period),
    content.safetyOrg.roles.every((r) => r.name),
    Boolean(content.riskAssessment.assessor),
    Boolean(content.riskAssessment.overview),
    content.riskAssessment.rows.length > 0,
    content.preventionPlan.rows.length > 0,
    content.ppe.rows.length > 0,
    Boolean(content.checklist.inspectionDate),
    Boolean(content.checklist.inspectionSite),
    Boolean(content.checklist.supervisorName),
    content.checklist.categories.every((c) => c.items.every((i) => i.result !== '')),
    content.education.rows.length > 0,
    content.workPermitSystem.rows.length > 0,
    content.signalContact.contacts.some((c) => c.phone),
    content.hazardousMgmt.equipmentRows.length > 0,
    content.emergencyPlan.teamRows.length > 0,
    content.incidentHistory.yearlyStats.every((s) => s.count !== ''),
    Boolean(content.incidentHistory.workplaceManagementNumber),
    content.incidentHistory.noAccidentConfirm,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

// ============================================================================
// 하위 컴포넌트 (모듈 스코프에 선언 — 렌더마다 재생성되면 입력창 포커스가 끊기므로 주의)
// ============================================================================

interface SimpleColumn<T> {
  key: keyof T
  label: string
  width?: 'narrow' | 'date' | 'no'
  placeholder?: string
}

function SimpleRowTable<T extends { id: string }>({
  rows,
  columns,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  emptyText,
}: {
  rows: T[]
  columns: SimpleColumn<T>[]
  onUpdateRow: (id: string, patch: Partial<Omit<T, 'id'>>) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  emptyText: string
}): JSX.Element {
  return (
    <div className="wizard-table-wrap">
      <table className="wizard-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={col.width ? `col-${col.width}` : undefined}>
                {col.label}
              </th>
            ))}
            <th className="col-action"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  <input
                    value={String(row[col.key] ?? '')}
                    placeholder={col.placeholder}
                    onChange={(e) =>
                      onUpdateRow(row.id, { [col.key]: e.target.value } as Partial<Omit<T, 'id'>>)
                    }
                  />
                </td>
              ))}
              <td className="col-action">
                <button
                  type="button"
                  className="row-remove-btn"
                  onClick={() => onRemoveRow(row.id)}
                  aria-label="행 삭제"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="empty-row">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Button variant="secondary" size="sm" type="button" onClick={onAddRow}>
        + 항목 추가
      </Button>
    </div>
  )
}

const PREVENTION_COLUMNS: SimpleColumn<PreventionRow>[] = [
  { key: 'goal', label: '전사목표' },
  { key: 'task', label: '세부추진계획' },
  { key: 'scheduleH1', label: '상반기', width: 'narrow' },
  { key: 'scheduleH2', label: '하반기', width: 'narrow' },
  { key: 'kpi', label: '성과지표' },
  { key: 'dept', label: '담당부서', width: 'narrow' },
  { key: 'achievementRate', label: '달성율', width: 'narrow', placeholder: '%' },
  { key: 'note', label: '기타' },
]

const WORK_PERMIT_COLUMNS: SimpleColumn<WorkPermitRow>[] = [
  { key: 'task', label: '대상작업' },
  { key: 'writer', label: '작성자', width: 'narrow' },
  { key: 'reviewer', label: '검토자', width: 'narrow' },
  { key: 'watcher', label: '감시자', width: 'narrow' },
  { key: 'confirmer', label: '확인자', width: 'narrow' },
  { key: 'note', label: '비고' },
]

const CONTACT_COLUMNS: SimpleColumn<ContactRow>[] = [
  { key: 'name', label: '기관/업체명' },
  { key: 'phone', label: '연락처', width: 'narrow' },
]

const SIGNAL_COLUMNS: SimpleColumn<SignalRow>[] = [
  { key: 'work', label: '작업명' },
  { key: 'method', label: '신호방법' },
  { key: 'procedure', label: '세부절차' },
  { key: 'note', label: '비고', width: 'narrow' },
]

function hazardousColumns(nameLabel: string): SimpleColumn<HazardousItemRow>[] {
  return [
    { key: 'name', label: nameLabel },
    { key: 'controlMeasure', label: '관리대책' },
    { key: 'checkItem', label: '점검항목' },
    { key: 'manager', label: '관리책임자', width: 'narrow' },
  ]
}

const PROCEDURE_COLUMNS: SimpleColumn<ProcedureRow>[] = [
  { key: 'work', label: '구분', width: 'narrow' },
  { key: 'procedure', label: '작업절차 및 안전수칙' },
  { key: 'note', label: '비고', width: 'narrow' },
]

const EMERGENCY_TEAM_COLUMNS: SimpleColumn<EmergencyTeamRow>[] = [
  { key: 'role', label: '구분', width: 'narrow' },
  { key: 'member', label: '구성원' },
  { key: 'mainDuty', label: '주요역할' },
  { key: 'note', label: '비고', width: 'narrow' },
]

function SafetyOrgTable({
  roles,
  onUpdateName,
}: {
  roles: { role: string; name: string }[]
  onUpdateName: (idx: number, name: string) => void
}): JSX.Element {
  return (
    <div className="wizard-table-wrap">
      <table className="wizard-table">
        <thead>
          <tr>
            <th className="col-narrow">구분</th>
            <th className="col-narrow">담당자명</th>
            <th>주요 역할·책임 (참고)</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r, idx) => (
            <tr key={r.role}>
              <td>{r.role}</td>
              <td>
                <input value={r.name} onChange={(e) => onUpdateName(idx, e.target.value)} placeholder="성명" />
              </td>
              <td className="static-guide-cell">{SAFETY_ORG_DUTY_TEXT[r.role]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RISK_SCORE_OPTIONS = [1, 2, 3, 4, 5]

// 개선예정일/개선완료일은 실제 서식에서 달력 날짜뿐 아니라 "착공즉시", "화기작업시"처럼
// 조건부 표현으로도 흔히 쓰여, 자유텍스트 입력 + 자주 쓰는 표현 추천(datalist)으로 처리한다.
const RISK_DATE_SUGGESTIONS = ['착공즉시', '상시', '해당 공정 착수시', '화기작업시', '작업 전', '수시']
const RISK_MANAGER_SUGGESTIONS = ['현장소장', '안전담당', '공사담당', '관리감독자', '안전관리자']

function riskScore(frequency: string, severity: string): { score: number; label: string; levelClass: string } | null {
  const f = Number(frequency)
  const s = Number(severity)
  if (!f || !s) return null
  const score = f * s
  if (score >= 16) return { score, label: '상', levelClass: 'risk-score-high' }
  if (score >= 9) return { score, label: '중', levelClass: 'risk-score-mid' }
  return { score, label: '하', levelClass: 'risk-score-low' }
}

function RiskAssessmentTable({
  rows,
  method,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  rows: RiskRow[]
  method: RiskMethod
  onUpdateRow: (id: string, patch: Partial<Omit<RiskRow, 'id' | 'no'>>) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
}): JSX.Element {
  const isLevel3 = method === '위험성수준 3단계(상·중·하) 판단법'
  const isFreqSeverity = method === '빈도·강도법'
  const isChecklist = method === '체크리스트법'
  const colCount = 7 + (isLevel3 ? 1 : 0) + (isFreqSeverity ? 3 : 0) + (isChecklist ? 1 : 0)

  return (
    <div className="wizard-table-wrap">
      <table className="wizard-table">
        <thead>
          <tr>
            <th className="col-no">번호</th>
            {isChecklist && <th className="col-narrow">해당</th>}
            <th>유해·위험요인</th>
            {isLevel3 && <th className="col-level">위험성수준</th>}
            {isFreqSeverity && (
              <>
                <th className="col-narrow">빈도</th>
                <th className="col-narrow">강도</th>
                <th className="col-narrow">위험성</th>
              </>
            )}
            <th>개선대책</th>
            <th className="col-date">개선예정일</th>
            <th className="col-date">개선완료일</th>
            <th className="col-manager">담당자</th>
            <th className="col-action">삭제</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const score = isFreqSeverity ? riskScore(row.frequency ?? '', row.severity ?? '') : null
            const checked = row.checked ?? true
            return (
              <tr key={row.id} className={isChecklist && !checked ? 'row-unchecked' : undefined}>
                <td className="col-no">{row.no}</td>
                {isChecklist && (
                  <td className="col-narrow">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onUpdateRow(row.id, { checked: e.target.checked })}
                    />
                  </td>
                )}
                <td>
                  <input
                    value={row.hazard}
                    onChange={(e) => onUpdateRow(row.id, { hazard: e.target.value })}
                    placeholder="예: 고소작업 중 추락"
                  />
                </td>
                {isLevel3 && (
                  <td>
                    <select
                      value={row.level}
                      onChange={(e) => onUpdateRow(row.id, { level: e.target.value as RiskRow['level'] })}
                    >
                      <option value="">-</option>
                      <option value="상">상</option>
                      <option value="중">중</option>
                      <option value="하">하</option>
                    </select>
                  </td>
                )}
                {isFreqSeverity && (
                  <>
                    <td>
                      <select
                        value={row.frequency ?? ''}
                        onChange={(e) => onUpdateRow(row.id, { frequency: e.target.value })}
                      >
                        <option value="">-</option>
                        {RISK_SCORE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.severity ?? ''}
                        onChange={(e) => onUpdateRow(row.id, { severity: e.target.value })}
                      >
                        <option value="">-</option>
                        {RISK_SCORE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="col-narrow">
                      {score ? (
                        <span className={`risk-score-badge ${score.levelClass}`}>
                          {score.score} ({score.label})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </>
                )}
                <td>
                  <input
                    value={row.countermeasure}
                    onChange={(e) => onUpdateRow(row.id, { countermeasure: e.target.value })}
                    placeholder="예: 안전난간 설치, 안전대 착용"
                  />
                </td>
                <td>
                  <input
                    value={row.plannedDate}
                    onChange={(e) => onUpdateRow(row.id, { plannedDate: e.target.value })}
                    list="risk-date-suggestions"
                    placeholder="예: 착공즉시, 2026-09-15"
                  />
                </td>
                <td>
                  <input
                    value={row.completedDate}
                    onChange={(e) => onUpdateRow(row.id, { completedDate: e.target.value })}
                    list="risk-date-suggestions"
                    placeholder="예: 상시, 2026-09-15"
                  />
                </td>
                <td>
                  <input
                    value={row.manager}
                    onChange={(e) => onUpdateRow(row.id, { manager: e.target.value })}
                    list="risk-manager-suggestions"
                    placeholder="예: 현장소장, 안전담당, 공사담당"
                  />
                </td>
                <td className="col-action">
                  <button
                    type="button"
                    className="row-remove-btn"
                    onClick={() => onRemoveRow(row.id)}
                    aria-label="행 삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="empty-row">
                등록된 위험성평가 항목이 없습니다. &apos;항목 추가&apos;로 입력을 시작하세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <datalist id="risk-date-suggestions">
        {RISK_DATE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="risk-manager-suggestions">
        {RISK_MANAGER_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Button variant="secondary" size="sm" type="button" onClick={onAddRow}>
        + 항목 추가
      </Button>
    </div>
  )
}

function PpeTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  rows: PpeRow[]
  onUpdateRow: (id: string, patch: Partial<Omit<PpeRow, 'id'>>) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
}): JSX.Element {
  return (
    <div className="wizard-table-wrap">
      <table className="wizard-table">
        <thead>
          <tr>
            <th>품명</th>
            <th className="col-narrow">수량</th>
            <th>지급대상</th>
            <th>관리계획</th>
            <th className="col-action"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  value={row.name}
                  onChange={(e) => onUpdateRow(row.id, { name: e.target.value })}
                  placeholder="예: 안전모"
                />
              </td>
              <td>
                <input value={row.qty} onChange={(e) => onUpdateRow(row.id, { qty: e.target.value })} placeholder="예: 20개" />
              </td>
              <td>
                <input
                  value={row.target}
                  onChange={(e) => onUpdateRow(row.id, { target: e.target.value })}
                  placeholder="예: 전 근로자"
                />
              </td>
              <td>
                <input
                  value={row.managementPlan}
                  onChange={(e) => onUpdateRow(row.id, { managementPlan: e.target.value })}
                  placeholder="예: 매일 착용상태 점검"
                />
              </td>
              <td className="col-action">
                <button
                  type="button"
                  className="row-remove-btn"
                  onClick={() => onRemoveRow(row.id)}
                  aria-label="행 삭제"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-row">
                등록된 보호구 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Button variant="secondary" size="sm" type="button" onClick={onAddRow}>
        + 항목 추가
      </Button>
    </div>
  )
}

function EducationTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  rows: EducationRow[]
  onUpdateRow: (id: string, patch: Partial<Omit<EducationRow, 'id'>>) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
}): JSX.Element {
  return (
    <div className="wizard-table-wrap">
      <table className="wizard-table">
        <thead>
          <tr>
            <th>교육종류</th>
            <th>대상</th>
            <th className="col-narrow">시간</th>
            <th className="col-date">이수일</th>
            <th className="col-date">차기이수일</th>
            <th>교육기관</th>
            <th className="col-narrow">주기</th>
            <th className="col-action"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  value={row.type}
                  onChange={(e) => onUpdateRow(row.id, { type: e.target.value })}
                  placeholder="예: 정기 안전보건교육"
                />
              </td>
              <td>
                <input
                  value={row.target}
                  onChange={(e) => onUpdateRow(row.id, { target: e.target.value })}
                  placeholder="예: 전 근로자"
                />
              </td>
              <td>
                <input value={row.hours} onChange={(e) => onUpdateRow(row.id, { hours: e.target.value })} placeholder="예: 2시간" />
              </td>
              <td>
                <input
                  type="date"
                  value={row.completedDate}
                  onChange={(e) => onUpdateRow(row.id, { completedDate: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={row.nextDueDate}
                  onChange={(e) => onUpdateRow(row.id, { nextDueDate: e.target.value })}
                />
              </td>
              <td>
                <input
                  value={row.institution}
                  onChange={(e) => onUpdateRow(row.id, { institution: e.target.value })}
                />
              </td>
              <td>
                <input value={row.cycle} onChange={(e) => onUpdateRow(row.id, { cycle: e.target.value })} placeholder="예: 분기 1회" />
              </td>
              <td className="col-action">
                <button
                  type="button"
                  className="row-remove-btn"
                  onClick={() => onRemoveRow(row.id)}
                  aria-label="행 삭제"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-row">
                등록된 교육계획 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Button variant="secondary" size="sm" type="button" onClick={onAddRow}>
        + 항목 추가
      </Button>
    </div>
  )
}

const CHECKLIST_RESULT_OPTIONS: ChecklistResult[] = ['양호', '불량', '해당없음']

function ChecklistSection({
  categories,
  onUpdateItem,
}: {
  categories: ChecklistCategoryResult[]
  onUpdateItem: (categoryIdx: number, itemIdx: number, result: ChecklistResult) => void
}): JSX.Element {
  return (
    <div className="checklist-section">
      {categories.map((cat, ci) => (
        <details key={cat.category} className="checklist-category" open={ci === 0}>
          <summary>
            <span>{cat.category}</span>
            <span className="checklist-progress">
              {cat.items.filter((i) => i.result !== '').length} / {cat.items.length}
            </span>
          </summary>
          <div className="checklist-items">
            {cat.items.map((item, ii) => (
              <div key={item.label} className="checklist-item">
                <span className="checklist-item-label">{item.label}</span>
                <div className="checklist-item-options">
                  {CHECKLIST_RESULT_OPTIONS.map((option) => (
                    <label key={option} className="radio-pill">
                      <input
                        type="radio"
                        name={`checklist-${ci}-${ii}`}
                        checked={item.result === option}
                        onChange={() => onUpdateItem(ci, ii, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function PhotoUploadGroup({
  label,
  files,
  uploading,
  onAdd,
  onRemove,
  onView,
}: {
  label: string
  files: UploadedFile[]
  uploading: boolean
  onAdd: (file: File) => void
  onRemove: (file: UploadedFile) => void
  onView: (path: string) => void
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="file-upload-group">
      <div className="file-upload-header">
        <span className="file-upload-label">{label}</span>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '업로드 중...' : '+ 사진 추가'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onAdd(file)
            e.target.value = ''
          }}
        />
      </div>
      <ul className="file-list">
        {files.map((f) => (
          <li key={f.path} className="file-list-item">
            <button type="button" className="file-name-btn" onClick={() => onView(f.path)}>
              {f.name}
            </button>
            <button type="button" className="file-remove-btn" onClick={() => onRemove(f)} aria-label="삭제">
              ✕
            </button>
          </li>
        ))}
        {files.length === 0 && <li className="file-list-empty">첨부된 사진이 없습니다.</li>}
      </ul>
    </div>
  )
}

function SingleFileUpload({
  label,
  file,
  uploading,
  onSet,
  onRemove,
  onView,
}: {
  label: string
  file: UploadedFile | null
  uploading: boolean
  onSet: (file: File) => void
  onRemove: () => void
  onView: (path: string) => void
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="file-upload-group">
      <div className="file-upload-header">
        <span className="file-upload-label">{label}</span>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '업로드 중...' : file ? '파일 교체' : '+ 파일 선택'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onSet(f)
            e.target.value = ''
          }}
        />
      </div>
      {file ? (
        <ul className="file-list">
          <li className="file-list-item">
            <button type="button" className="file-name-btn" onClick={() => onView(file.path)}>
              {file.name}
            </button>
            <button type="button" className="file-remove-btn" onClick={onRemove} aria-label="삭제">
              ✕
            </button>
          </li>
        </ul>
      ) : (
        <p className="file-list-empty">등록된 파일이 없습니다. (회사별로 별도 첨부)</p>
      )}
    </div>
  )
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function DocumentWizardPage(): JSX.Element {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { canDownload } = useSubscriptionAccess()
  const {
    document: doc,
    loading,
    error,
    saving,
    scheduleSave,
    saveContentNow,
    saveMeta,
    uploadFile,
    getFileUrl,
    deleteFile,
  } = useDocumentWizard(documentId)

  const [content, setContent] = useState<WizardContent | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [unlockedByCoupon, setUnlockedByCoupon] = useState(false)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const contentRef = useRef<WizardContent | null>(null)
  const autoFillAttempted = useRef(false)
  const announcementFillAttempted = useRef(false)

  useEffect(() => {
    if (doc && !initialized) {
      setContent(doc.content)
      contentRef.current = doc.content
      setInitialized(true)
    }
  }, [doc, initialized])

  useEffect(() => {
    if (!user || !doc) return
    getRedeemedCouponDocumentIds(user.id).then((ids) => setUnlockedByCoupon(ids.has(doc.id)))
  }, [user?.id, doc?.id])

  const applyUpdate = useCallback(
    (updater: (prev: WizardContent) => WizardContent, immediate: boolean) => {
      const prev = contentRef.current
      if (!prev) return
      const next = updater(prev)
      contentRef.current = next
      setContent(next)
      if (immediate) {
        saveContentNow(next)
      } else {
        scheduleSave(next)
      }
    },
    [saveContentNow, scheduleSave],
  )

  const updateContent = useCallback(
    (updater: (prev: WizardContent) => WizardContent) => applyUpdate(updater, false),
    [applyUpdate],
  )
  const updateContentImmediate = useCallback(
    (updater: (prev: WizardContent) => WizardContent) => applyUpdate(updater, true),
    [applyUpdate],
  )

  useEffect(() => {
    if (!user || !content || autoFillAttempted.current) return
    autoFillAttempted.current = true
    if (content.cover.companyName && content.cover.ceoName) return

    supabase
      .from('members')
      .select('company, ceo_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        updateContent((prev) => ({
          ...prev,
          cover: {
            ...prev.cover,
            companyName: prev.cover.companyName || data.company || '',
            ceoName: prev.cover.ceoName || data.ceo_name || '',
          },
        }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, content])

  // 공고 조회에서 특정 공고를 클릭해 문서를 생성한 경우, 그 공고의 사업명/발주기관명을
  // 자동으로 채워주고, 공고 제목으로 공사 종류를 추정해 표준 위험성평가 항목을 미리
  // 채워준다 (사용자가 위험성평가 항목을 처음부터 일일이 입력하지 않아도 되도록).
  useEffect(() => {
    if (!doc || !content || announcementFillAttempted.current) return
    announcementFillAttempted.current = true
    if (!doc.announcementId) return
    const coverFilled = Boolean(content.cover.projectName && content.cover.orgName)
    const riskFilled = content.riskAssessment.rows.length > 0
    const overviewFilled = Boolean(
      content.businessOverview.period ||
        content.businessOverview.location ||
        content.businessOverview.mainContent,
    )
    if (coverFilled && riskFilled && overviewFilled) return

    supabase
      .from('announcements')
      .select('title, organization, attachments')
      .eq('id', doc.announcementId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        updateContent((prev) => {
          const cover = {
            ...prev.cover,
            projectName: prev.cover.projectName || data.title || '',
            orgName: prev.cover.orgName || data.organization || '',
          }
          if (prev.riskAssessment.rows.length > 0) {
            return { ...prev, cover }
          }
          const constructionType = classifyConstructionType(data.title || '')
          return {
            ...prev,
            cover,
            riskAssessment: {
              ...prev.riskAssessment,
              constructionType,
              overview: prev.riskAssessment.overview || buildRiskOverviewText(cover.projectName, constructionType),
              rows: buildRiskRowsFromTemplate(constructionType),
            },
          }
        })

        // 사업개요(공사기간/위치/주요내용)가 비어있으면, 공고에 첨부된 공고문 PDF를
        // AI로 읽어 자동으로 채워본다 — 공고문을 못 불러오거나 항목이 없으면 그냥
        // 빈 값으로 남겨둔다(사용자가 직접 입력).
        const overviewEmpty =
          !contentRef.current?.businessOverview.period &&
          !contentRef.current?.businessOverview.location &&
          !contentRef.current?.businessOverview.mainContent
        const pdfUrl = pickAnnouncementPdf(data.attachments as { name: string; url: string }[] | null)
        if (overviewEmpty && pdfUrl) {
          extractBusinessOverviewFromAnnouncement(pdfUrl)
            .then((overview) => {
              console.log('사업개요 자동추출 결과:', overview)
              updateContent((prev) => ({
                ...prev,
                businessOverview: {
                  period: prev.businessOverview.period || overview.period,
                  location: prev.businessOverview.location || overview.location,
                  mainContent: prev.businessOverview.mainContent || overview.mainContent,
                },
              }))
            })
            .catch((err) => {
              console.error('사업개요 자동추출 실패:', err)
            })
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, content])

  // ---- 표지 ----
  const updateCoverField = (field: keyof WizardContent['cover'], value: string) =>
    updateContent((prev) => ({ ...prev, cover: { ...prev.cover, [field]: value } }))

  // ---- 사업개요 ----
  const updateOverviewField = (field: keyof WizardContent['businessOverview'], value: string) =>
    updateContent((prev) => ({ ...prev, businessOverview: { ...prev.businessOverview, [field]: value } }))

  // ---- 안전보건방침 ----
  const updatePolicyGoal = (value: string) =>
    updateContent((prev) => ({ ...prev, safetyPolicy: { goalText: value } }))

  // ---- 산업재해예방활동 이행계획 ----
  const updatePreventionRow = (id: string, patch: Partial<Omit<PreventionRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      preventionPlan: { rows: updateArrayItem(prev.preventionPlan.rows, id, patch) },
    }))
  const addPreventionRow = () =>
    updateContent((prev) => ({
      ...prev,
      preventionPlan: {
        rows: [
          ...prev.preventionPlan.rows,
          { id: newRowId(), goal: '', task: '', scheduleH1: '', scheduleH2: '', kpi: '', dept: '', achievementRate: '', note: '' },
        ],
      },
    }))
  const removePreventionRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      preventionPlan: { rows: prev.preventionPlan.rows.filter((r) => r.id !== id) },
    }))

  // ---- 안전보건관리조직 ----
  const updateSafetyOrgName = (idx: number, name: string) =>
    updateContent((prev) => ({
      ...prev,
      safetyOrg: { roles: prev.safetyOrg.roles.map((r, i) => (i === idx ? { ...r, name } : r)) },
    }))

  // ---- 위험성평가 ----
  const updateRiskMethod = (method: RiskMethod) =>
    updateContent((prev) => ({ ...prev, riskAssessment: { ...prev.riskAssessment, method } }))
  const updateRiskText = (field: 'assessor' | 'assessedAt' | 'overview', value: string) =>
    updateContent((prev) => ({ ...prev, riskAssessment: { ...prev.riskAssessment, [field]: value } }))
  const updateConstructionType = (constructionType: ConstructionType) =>
    updateContent((prev) => ({ ...prev, riskAssessment: { ...prev.riskAssessment, constructionType } }))
  // 표준 항목 "불러오기"는 현재 선택된 공종의 표준 항목으로 표를 교체한다 — 예전에는
  // 기존 행 뒤에 새 항목을 이어붙이기만 해서, 공종을 바꿔가며 여러 번 누르면 서로 다른
  // 공종의 항목이 계속 누적되는 문제가 있었다.
  const loadTemplateRows = () =>
    updateContent((prev) => {
      if (
        prev.riskAssessment.rows.length > 0 &&
        !window.confirm('현재 위험성평가표를 선택한 공종의 표준 항목으로 교체할까요?\n직접 추가/수정한 내용은 사라집니다.')
      ) {
        return prev
      }
      const type = prev.riskAssessment.constructionType || '일반공사'
      const rows = buildRiskRowsFromTemplate(type)
      return {
        ...prev,
        riskAssessment: {
          ...prev.riskAssessment,
          rows,
          overview: buildRiskOverviewText(prev.cover.projectName, type),
        },
      }
    })
  const updateRiskRow = (id: string, patch: Partial<Omit<RiskRow, 'id' | 'no'>>) =>
    updateContent((prev) => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        rows: prev.riskAssessment.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    }))
  const addRiskRow = () =>
    updateContent((prev) => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        rows: [
          ...prev.riskAssessment.rows,
          {
            id: newRowId(),
            no: prev.riskAssessment.rows.length + 1,
            hazard: '',
            level: '',
            countermeasure: '',
            plannedDate: '',
            completedDate: '',
            manager: '',
            frequency: '',
            severity: '',
            checked: true,
          },
        ],
      },
    }))
  const removeRiskRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        rows: prev.riskAssessment.rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, no: i + 1 })),
      },
    }))

  // ---- 보호구 ----
  const updatePpeRow = (id: string, patch: Partial<Omit<PpeRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      ppe: { rows: prev.ppe.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
    }))
  const addPpeRow = () =>
    updateContent((prev) => ({
      ...prev,
      ppe: { rows: [...prev.ppe.rows, { id: newRowId(), name: '', qty: '', target: '', managementPlan: '' }] },
    }))
  const removePpeRow = (id: string) =>
    updateContent((prev) => ({ ...prev, ppe: { rows: prev.ppe.rows.filter((r) => r.id !== id) } }))

  // ---- 체크리스트 ----
  const updateChecklistItem = (categoryIdx: number, itemIdx: number, result: ChecklistResult) =>
    updateContent((prev) => {
      const categories = prev.checklist.categories.map((cat, ci) =>
        ci === categoryIdx
          ? { ...cat, items: cat.items.map((item, ii) => (ii === itemIdx ? { ...item, result } : item)) }
          : cat,
      )
      return { ...prev, checklist: { ...prev.checklist, categories } }
    })
  const updateChecklistMeta = (
    field: 'inspectionDate' | 'inspectionSite' | 'supervisorName' | 'otherNotes',
    value: string,
  ) => updateContent((prev) => ({ ...prev, checklist: { ...prev.checklist, [field]: value } }))

  // ---- 안전작업제도 ----
  const updateWorkPermitRow = (id: string, patch: Partial<Omit<WorkPermitRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      workPermitSystem: { rows: updateArrayItem(prev.workPermitSystem.rows, id, patch) },
    }))
  const addWorkPermitRow = () =>
    updateContent((prev) => ({
      ...prev,
      workPermitSystem: {
        rows: [
          ...prev.workPermitSystem.rows,
          { id: newRowId(), task: '', writer: '', reviewer: '', watcher: '', confirmer: '', note: '' },
        ],
      },
    }))
  const removeWorkPermitRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      workPermitSystem: { rows: prev.workPermitSystem.rows.filter((r) => r.id !== id) },
    }))

  // ---- 안전보건교육 ----
  const updateEducationNote = (value: string) =>
    updateContent((prev) => ({ ...prev, education: { ...prev.education, note: value } }))
  const updateEducationRow = (id: string, patch: Partial<Omit<EducationRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      education: {
        ...prev.education,
        rows: prev.education.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    }))
  const addEducationRow = () =>
    updateContent((prev) => ({
      ...prev,
      education: {
        ...prev.education,
        rows: [
          ...prev.education.rows,
          { id: newRowId(), type: '', target: '', hours: '', completedDate: '', nextDueDate: '', institution: '', cycle: '' },
        ],
      },
    }))
  const removeEducationRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      education: { ...prev.education, rows: prev.education.rows.filter((r) => r.id !== id) },
    }))

  // ---- 신호 및 연락체계 ----
  const updateSignalContactRow = (id: string, patch: Partial<Omit<ContactRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      signalContact: { ...prev.signalContact, contacts: updateArrayItem(prev.signalContact.contacts, id, patch) },
    }))
  const addSignalContactRow = () =>
    updateContent((prev) => ({
      ...prev,
      signalContact: { ...prev.signalContact, contacts: [...prev.signalContact.contacts, { id: newRowId(), name: '', phone: '' }] },
    }))
  const removeSignalContactRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      signalContact: { ...prev.signalContact, contacts: prev.signalContact.contacts.filter((r) => r.id !== id) },
    }))
  const updateSignalRow = (id: string, patch: Partial<Omit<SignalRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      signalContact: { ...prev.signalContact, signals: updateArrayItem(prev.signalContact.signals, id, patch) },
    }))
  const addSignalRow = () =>
    updateContent((prev) => ({
      ...prev,
      signalContact: {
        ...prev.signalContact,
        signals: [...prev.signalContact.signals, { id: newRowId(), work: '', method: '', procedure: '', note: '' }],
      },
    }))
  const removeSignalRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      signalContact: { ...prev.signalContact, signals: prev.signalContact.signals.filter((r) => r.id !== id) },
    }))

  // ---- 위험물질 및 설비관리계획 ----
  const updateEquipmentRow = (id: string, patch: Partial<Omit<HazardousItemRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, equipmentRows: updateArrayItem(prev.hazardousMgmt.equipmentRows, id, patch) },
    }))
  const addEquipmentRow = () =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: {
        ...prev.hazardousMgmt,
        equipmentRows: [...prev.hazardousMgmt.equipmentRows, { id: newRowId(), name: '', controlMeasure: '', checkItem: '', manager: '' }],
      },
    }))
  const removeEquipmentRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, equipmentRows: prev.hazardousMgmt.equipmentRows.filter((r) => r.id !== id) },
    }))
  const updateMaterialRow = (id: string, patch: Partial<Omit<HazardousItemRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, materialRows: updateArrayItem(prev.hazardousMgmt.materialRows, id, patch) },
    }))
  const addMaterialRow = () =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: {
        ...prev.hazardousMgmt,
        materialRows: [...prev.hazardousMgmt.materialRows, { id: newRowId(), name: '', controlMeasure: '', checkItem: '', manager: '' }],
      },
    }))
  const removeMaterialRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, materialRows: prev.hazardousMgmt.materialRows.filter((r) => r.id !== id) },
    }))
  const updateProcedureRow = (id: string, patch: Partial<Omit<ProcedureRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, procedureRows: updateArrayItem(prev.hazardousMgmt.procedureRows, id, patch) },
    }))
  const addProcedureRow = () =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: {
        ...prev.hazardousMgmt,
        procedureRows: [...prev.hazardousMgmt.procedureRows, { id: newRowId(), work: '', procedure: '', note: '' }],
      },
    }))
  const removeProcedureRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      hazardousMgmt: { ...prev.hazardousMgmt, procedureRows: prev.hazardousMgmt.procedureRows.filter((r) => r.id !== id) },
    }))

  // ---- 비상대책 ----
  const updateEmergencyTeamRow = (id: string, patch: Partial<Omit<EmergencyTeamRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: { ...prev.emergencyPlan, teamRows: updateArrayItem(prev.emergencyPlan.teamRows, id, patch) },
    }))
  const addEmergencyTeamRow = () =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: {
        ...prev.emergencyPlan,
        teamRows: [...prev.emergencyPlan.teamRows, { id: newRowId(), role: '', member: '', mainDuty: '', note: '' }],
      },
    }))
  const removeEmergencyTeamRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: { ...prev.emergencyPlan, teamRows: prev.emergencyPlan.teamRows.filter((r) => r.id !== id) },
    }))
  const updateEmergencyContactRow = (id: string, patch: Partial<Omit<ContactRow, 'id'>>) =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: { ...prev.emergencyPlan, contactRows: updateArrayItem(prev.emergencyPlan.contactRows, id, patch) },
    }))
  const addEmergencyContactRow = () =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: { ...prev.emergencyPlan, contactRows: [...prev.emergencyPlan.contactRows, { id: newRowId(), name: '', phone: '' }] },
    }))
  const removeEmergencyContactRow = (id: string) =>
    updateContent((prev) => ({
      ...prev,
      emergencyPlan: { ...prev.emergencyPlan, contactRows: prev.emergencyPlan.contactRows.filter((r) => r.id !== id) },
    }))

  // ---- 재해발생현황 ----
  const updateWorkplaceNumber = (value: string) =>
    updateContent((prev) => ({
      ...prev,
      incidentHistory: { ...prev.incidentHistory, workplaceManagementNumber: value },
    }))
  const toggleNoAccidentConfirm = (checked: boolean) =>
    updateContent((prev) => ({
      ...prev,
      incidentHistory: { ...prev.incidentHistory, noAccidentConfirm: checked },
    }))
  const updateYearlyStat = (idx: number, count: string) =>
    updateContent((prev) => ({
      ...prev,
      incidentHistory: {
        ...prev.incidentHistory,
        yearlyStats: prev.incidentHistory.yearlyStats.map((s, i) => (i === idx ? { ...s, count } : s)),
      },
    }))

  // ---- 파일 첨부 ----
  const handleAddPhoto = async (
    field: 'workerPhotos' | 'sitePhotos' | 'improvementPhotos',
    category: string,
    file: File,
  ) => {
    setUploadingCategory(category)
    try {
      const uploaded = await uploadFile(category, file)
      if (uploaded) {
        updateContentImmediate((prev) => ({
          ...prev,
          checklist: { ...prev.checklist, [field]: [...prev.checklist[field], uploaded] },
        }))
      }
    } catch (err) {
      console.error(err)
      alert(`사진 업로드에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setUploadingCategory(null)
    }
  }

  const handleRemovePhoto = async (
    field: 'workerPhotos' | 'sitePhotos' | 'improvementPhotos',
    file: UploadedFile,
  ) => {
    try {
      await deleteFile(file.path)
    } catch (err) {
      console.error(err)
    }
    updateContentImmediate((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [field]: prev.checklist[field].filter((f) => f.path !== file.path) },
    }))
  }

  const handleSetSingleFile = async (
    field: 'accidentReportFile' | 'insuranceMemberFile',
    category: string,
    file: File,
  ) => {
    setUploadingCategory(category)
    try {
      const existing = contentRef.current?.incidentHistory[field] ?? null
      const uploaded = await uploadFile(category, file)
      if (uploaded) {
        updateContentImmediate((prev) => ({
          ...prev,
          incidentHistory: { ...prev.incidentHistory, [field]: uploaded },
        }))
        if (existing) {
          deleteFile(existing.path).catch(() => undefined)
        }
      }
    } catch (err) {
      console.error(err)
      alert(`파일 업로드에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setUploadingCategory(null)
    }
  }

  const handleRemoveSingleFile = async (field: 'accidentReportFile' | 'insuranceMemberFile') => {
    const existing = contentRef.current?.incidentHistory[field] ?? null
    if (existing) {
      try {
        await deleteFile(existing.path)
      } catch (err) {
        console.error(err)
      }
    }
    updateContentImmediate((prev) => ({
      ...prev,
      incidentHistory: { ...prev.incidentHistory, [field]: null },
    }))
  }

  // ---- AI 위험성평가 항목 추출/추천 ----
  const handleReferenceFileUpload = async (file: File) => {
    if (
      contentRef.current &&
      contentRef.current.riskAssessment.rows.length > 0 &&
      !window.confirm('이미 입력된 위험성평가 항목이 있습니다. AI 추출 결과로 교체하시겠습니까?')
    ) {
      return
    }

    setExtracting(true)
    try {
      const [uploaded, items] = await Promise.all([
        uploadFile('risk-reference', file),
        extractRiskItemsFromFile(file),
      ])
      if (items.length === 0) {
        alert('파일에서 위험성평가 항목을 찾지 못했습니다. 파일 내용을 확인해주세요.')
        return
      }
      updateContentImmediate((prev) => ({
        ...prev,
        riskAssessment: {
          ...prev.riskAssessment,
          referenceFile: uploaded,
          rows: items.map((item, i) => ({
            id: newRowId(),
            no: i + 1,
            hazard: item.hazard,
            level: item.level,
            countermeasure: item.countermeasure,
            plannedDate: '',
            completedDate: '',
            manager: '',
            frequency: '',
            severity: '',
            checked: true,
          })),
        },
      }))
      alert(`${items.length}개 항목을 AI가 자동으로 추출했습니다. 위험성평가 단계에서 확인·수정해주세요.`)
    } catch (err) {
      console.error(err)
      alert(`AI 추출에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setExtracting(false)
    }
  }

  const handleRemoveReferenceFile = async () => {
    const existing = contentRef.current?.riskAssessment.referenceFile ?? null
    if (existing) {
      try {
        await deleteFile(existing.path)
      } catch (err) {
        console.error(err)
      }
    }
    updateContentImmediate((prev) => ({
      ...prev,
      riskAssessment: { ...prev.riskAssessment, referenceFile: null },
    }))
  }

  const handleSuggestMoreItems = async () => {
    if (!content) return
    setExtracting(true)
    try {
      const items = await suggestRiskItems(
        content.riskAssessment.constructionType || '일반공사',
        content.cover.projectName,
      )
      if (items.length === 0) {
        alert('AI가 추가로 제안할 항목을 찾지 못했습니다.')
        return
      }
      updateContent((prev) => {
        const merged = [
          ...prev.riskAssessment.rows,
          ...items.map((item) => ({
            id: newRowId(),
            no: 0,
            hazard: item.hazard,
            level: item.level,
            countermeasure: item.countermeasure,
            plannedDate: '',
            completedDate: '',
            manager: '',
            frequency: '',
            severity: '',
            checked: true,
          })),
        ].map((r, i) => ({ ...r, no: i + 1 }))
        return { ...prev, riskAssessment: { ...prev.riskAssessment, rows: merged } }
      })
    } catch (err) {
      console.error(err)
      alert(`AI 추천에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setExtracting(false)
    }
  }

  const handleViewFile = async (path: string) => {
    try {
      const url = await getFileUrl(path)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error(err)
      alert('파일을 열 수 없습니다.')
    }
  }

  // ---- 저장 / 완료 / 다운로드 ----
  const handleSaveNow = async () => {
    const current = contentRef.current
    if (!current) return
    await saveContentNow(current)
    await saveMeta({ percentComplete: calcPercentComplete(current) })
  }

  const handleComplete = async () => {
    const current = contentRef.current
    if (!current) return
    await saveContentNow(current)
    await saveMeta({ status: 'completed', percentComplete: 100 })
    alert('계획서 작성이 완료 처리되었습니다. 이제 PDF/DOCX로 다운로드할 수 있습니다.')
  }

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!canDownload && !unlockedByCoupon) return
    const current = contentRef.current
    if (!current || !doc) return
    setDownloading(format)
    try {
      const exportContent = await buildExportContent(current, async (path) => {
        try {
          return await getFileUrl(path)
        } catch {
          return null
        }
      })
      const safeTitle = sanitizeFilename(doc.title)
      if (format === 'pdf') {
        await exportToPDF(exportContent, `${safeTitle}.pdf`)
      } else {
        await exportToDOCX(exportContent, `${safeTitle}.docx`)
      }
    } catch (err) {
      console.error(err)
      alert(`다운로드에 실패했습니다.\n${errMessage(err)}`)
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="wizard-page">
        <div className="container">
          <Spinner />
        </div>
      </div>
    )
  }

  if (error || !doc || !content) {
    return (
      <div className="wizard-page">
        <div className="container">
          <div className="empty-state">
            {error || '문서를 찾을 수 없습니다.'}
            <div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
                문서함으로
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const percent = calcPercentComplete(content)
  const accidentType = ACCIDENT_TYPE_BY_CONSTRUCTION[content.riskAssessment.constructionType || '일반공사']

  return (
    <div className="wizard-page">
      <div className="container">
        <div className="wizard-page-header">
          <h1 className="page-title">{doc.title}</h1>
          <div className="wizard-page-header-actions">
            <span className="save-status">{saving ? '저장 중...' : '자동 저장됨'}</span>
            <Button variant="secondary" size="sm" onClick={handleSaveNow}>
              지금 저장
            </Button>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="progress-text">진행률 {percent}%</div>
        </div>

        <TrialBanner />

        <div className="wizard-layout">
          <aside className="wizard-toc">
            {TOC_CHAPTERS.map((chapter) => (
              <div key={chapter.title} className="wizard-toc-chapter">
                <div className="wizard-toc-chapter-title">{chapter.title}</div>
                <ul>
                  {chapter.items.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => scrollToSection(item.id)}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          <div className="wizard-main">
            {/* Ⅰ-1. 표지 */}
            <section id="sec-cover" className="wizard-section">
              <h2 className="wizard-section-title">표지</h2>
              <div className="field-group ai-reference-group">
                <label className="field-group-label">
                  기존 안전관리계획서 첨부 (선택 — AI가 위험성평가 항목을 자동으로 채워드립니다)
                </label>
                <p className="field-group-hint">
                  회사가 이미 가진 안전관리계획서나 위험성평가표 파일(PDF/이미지/DOCX)을 첨부하면, AI가
                  내용을 읽고 위험성평가표를 자동으로 작성합니다. 없으면 위험성평가 항목에서 표준 항목을
                  자동으로 채워드립니다.
                </p>
                <SingleFileUpload
                  label="예시파일"
                  file={content.riskAssessment.referenceFile}
                  uploading={extracting}
                  onSet={handleReferenceFileUpload}
                  onRemove={handleRemoveReferenceFile}
                  onView={handleViewFile}
                />
              </div>
              <Input
                label="사업(공사)명"
                value={content.cover.projectName}
                onChange={(e) => updateCoverField('projectName', e.target.value)}
                required
              />
              <Input
                label="발주기관명"
                value={content.cover.orgName}
                onChange={(e) => updateCoverField('orgName', e.target.value)}
                required
              />
              <Input
                label="업체명"
                value={content.cover.companyName}
                onChange={(e) => updateCoverField('companyName', e.target.value)}
                required
              />
              <Input
                label="대표이사명"
                value={content.cover.ceoName}
                onChange={(e) => updateCoverField('ceoName', e.target.value)}
                required
              />
              <Input
                label="작성일자"
                type="date"
                value={content.cover.docDate}
                onChange={(e) => updateCoverField('docDate', e.target.value)}
                required
              />
            </section>

            {/* Ⅰ-2. 사업개요 */}
            <section id="sec-overview" className="wizard-section">
              <h2 className="wizard-section-title">사업개요</h2>
              <p className="section-note">
                공고문을 검색하여 해당 내용이 있으면 자동으로 채워지고, 내용이 없으면 직접 입력하는
                항목입니다.
              </p>
              <Input
                label="사업기간"
                value={content.businessOverview.period}
                onChange={(e) => updateOverviewField('period', e.target.value)}
                placeholder="예: 계약일로부터 90일"
              />
              <Input
                label="위치"
                value={content.businessOverview.location}
                onChange={(e) => updateOverviewField('location', e.target.value)}
                placeholder="예: 경기도 안양시"
              />
              <Textarea
                label="주요내용"
                value={content.businessOverview.mainContent}
                onChange={(e) => updateOverviewField('mainContent', e.target.value)}
                maxLength={1000}
              />
              <p className="field-group-hint">예정공정표: 별첨 (공정표 파일은 별도로 제출)</p>
            </section>

            {/* Ⅱ-1. 위험성평가 */}
            <section id="sec-risk" className="wizard-section">
              <h2 className="wizard-section-title">위험성평가</h2>
              <div className="field-group">
                <label className="field-group-label">위험성평가 실시규정 (참고)</label>
                <ol className="static-guide-list">
                  {RISK_REGULATION_ARTICLES.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ol>
              </div>
              <div className="field-group">
                <label className="field-group-label">위험성평가 방법</label>
                <div className="radio-pill-row">
                  {RISK_METHODS.map((method) => (
                    <label key={method} className="radio-pill">
                      <input
                        type="radio"
                        name="risk-method"
                        checked={content.riskAssessment.method === method}
                        onChange={() => updateRiskMethod(method)}
                      />
                      {method}
                    </label>
                  ))}
                </div>
                <p className="section-note">{RISK_METHOD_DESCRIPTIONS[content.riskAssessment.method]}</p>
              </div>
              <Input
                label="평가자"
                value={content.riskAssessment.assessor}
                onChange={(e) => updateRiskText('assessor', e.target.value)}
              />
              <Input
                label="평가 시기"
                value={content.riskAssessment.assessedAt}
                onChange={(e) => updateRiskText('assessedAt', e.target.value)}
              />
              <Textarea
                label="개요"
                value={content.riskAssessment.overview}
                onChange={(e) => updateRiskText('overview', e.target.value)}
                placeholder="위험성평가 실시 개요를 작성하세요"
                maxLength={1000}
              />
              <div className="field-group">
                <label className="field-group-label">공사 종류 (자동분류 — 실제와 다르면 변경 후 다시 불러오세요)</label>
                <div className="construction-type-row">
                  <select
                    value={content.riskAssessment.constructionType}
                    onChange={(e) => updateConstructionType(e.target.value as ConstructionType)}
                  >
                    <option value="">선택 안 함</option>
                    {CONSTRUCTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    disabled={!content.riskAssessment.constructionType}
                    onClick={loadTemplateRows}
                  >
                    표준 항목 불러오기
                  </Button>
                  <Button variant="secondary" size="sm" type="button" disabled={extracting} onClick={handleSuggestMoreItems}>
                    {extracting ? 'AI 분석 중...' : 'AI로 항목 추천받기'}
                  </Button>
                </div>
              </div>
              <div className="field-group">
                <label className="field-group-label">위험성평가표</label>
                <RiskAssessmentTable
                  rows={content.riskAssessment.rows}
                  method={content.riskAssessment.method}
                  onUpdateRow={updateRiskRow}
                  onAddRow={addRiskRow}
                  onRemoveRow={removeRiskRow}
                />
                <p className="field-group-hint">
                  ※ 상기 평가표는 착공 전 사전평가 결과이며, 착공 후 현장여건 변화 시 재평가를
                  실시하고 결과를 반영하여 지속 관리합니다.
                </p>
              </div>
            </section>

            {/* Ⅱ-2. 안전보건방침 */}
            <section id="sec-policy" className="wizard-section">
              <h2 className="wizard-section-title">안전보건방침</h2>
              <div className="policy-doc">
                <p className="policy-doc-title">안전보건 경영방침 및 목표</p>
                <p>
                  {content.cover.companyName || '회사'} 사업장의 각종 산업재해예방 및 근로자의 생명을
                  보호하기 위해 사업주와 근로자가 안전보건 의무를 이행함으로써 재해없는 일터, 행복하고
                  건강한 일터를 조성하는 것을 목표로 경영방침, 안전목표 달성을 위해 각자 주어진 업무와
                  역할을 충실히 수행함으로써 안전문화 정착을 통한 상호협력 및 상생을 통한 지속가능한
                  기업으로 추구하고자 한다.
                </p>
                <ul>
                  <li>기본과 원칙을 준수하는 안전/보건문화를 정착한다.</li>
                  <li>체계적인 사전 위험성평가와 지속적인 개선활동을 통하여 무재해 목표 달성을 실천한다.</li>
                  <li>전 구성원의 능동적 참여, 협력사와의 상생으로 안전하고 쾌적한 작업환경을 조성한다.</li>
                </ul>
                <Input
                  label="안전보건 목표"
                  value={content.safetyPolicy.goalText}
                  onChange={(e) => updatePolicyGoal(e.target.value)}
                />
                <p className="policy-doc-signature">
                  {content.cover.docDate || '20 . . .'} · {content.cover.companyName || '회사명'} 대표이사{' '}
                  {content.cover.ceoName || '(성명)'}
                </p>
              </div>
            </section>

            {/* Ⅱ-3. 산업재해예방활동 이행계획 */}
            <section id="sec-prevention" className="wizard-section">
              <h2 className="wizard-section-title">산업재해예방활동 이행계획</h2>
              <SimpleRowTable
                rows={content.preventionPlan.rows}
                columns={PREVENTION_COLUMNS}
                onUpdateRow={updatePreventionRow}
                onAddRow={addPreventionRow}
                onRemoveRow={removePreventionRow}
                emptyText="등록된 이행계획 항목이 없습니다."
              />
            </section>

            {/* Ⅱ-4. 안전보건관리조직 */}
            <section id="sec-org" className="wizard-section">
              <h2 className="wizard-section-title">안전보건관리조직</h2>
              <SafetyOrgTable roles={content.safetyOrg.roles} onUpdateName={updateSafetyOrgName} />
            </section>

            {/* Ⅲ-1. 안전점검 및 조치계획 */}
            <section id="sec-checklist" className="wizard-section">
              <h2 className="wizard-section-title">안전점검 및 조치계획</h2>
              <div className="field-group">
                <label className="field-group-label">보호구 지급계획</label>
                <PpeTable rows={content.ppe.rows} onUpdateRow={updatePpeRow} onAddRow={addPpeRow} onRemoveRow={removePpeRow} />
              </div>

              <Input
                label="점검일자"
                type="date"
                value={content.checklist.inspectionDate}
                onChange={(e) => updateChecklistMeta('inspectionDate', e.target.value)}
              />
              <Input
                label="점검현장"
                value={content.checklist.inspectionSite}
                onChange={(e) => updateChecklistMeta('inspectionSite', e.target.value)}
              />
              <Input
                label="관리감독자"
                value={content.checklist.supervisorName}
                onChange={(e) => updateChecklistMeta('supervisorName', e.target.value)}
              />

              <div className="field-group">
                <label className="field-group-label">현장점검 체크리스트</label>
                <ChecklistSection categories={content.checklist.categories} onUpdateItem={updateChecklistItem} />
              </div>

              <Textarea
                label="기타사항"
                value={content.checklist.otherNotes}
                onChange={(e) => updateChecklistMeta('otherNotes', e.target.value)}
                maxLength={1000}
              />

              <div className="field-group">
                <label className="field-group-label">현장점검 사진</label>
                <PhotoUploadGroup
                  label="작업자 점검 사진"
                  files={content.checklist.workerPhotos}
                  uploading={uploadingCategory === 'worker-photo'}
                  onAdd={(file) => handleAddPhoto('workerPhotos', 'worker-photo', file)}
                  onRemove={(file) => handleRemovePhoto('workerPhotos', file)}
                  onView={handleViewFile}
                />
                <PhotoUploadGroup
                  label="현장 점검 사진"
                  files={content.checklist.sitePhotos}
                  uploading={uploadingCategory === 'site-photo'}
                  onAdd={(file) => handleAddPhoto('sitePhotos', 'site-photo', file)}
                  onRemove={(file) => handleRemovePhoto('sitePhotos', file)}
                  onView={handleViewFile}
                />
                <PhotoUploadGroup
                  label="기타 개선사항 사진"
                  files={content.checklist.improvementPhotos}
                  uploading={uploadingCategory === 'improvement-photo'}
                  onAdd={(file) => handleAddPhoto('improvementPhotos', 'improvement-photo', file)}
                  onRemove={(file) => handleRemovePhoto('improvementPhotos', file)}
                  onView={handleViewFile}
                />
              </div>

              <div className="field-group">
                <label className="field-group-label">안전조치 및 이행확인 절차 (참고)</label>
                <ul className="static-guide-list">
                  <li>① 위험발굴 — 각종 점검을 통한 개선 필요사항 발굴, 아차사고·잠재위험 발굴</li>
                  <li>② 위험성평가 — 위험요인에 대한 수시 위험성평가 시행</li>
                  <li>③ 조치시행 — 경미한 사항은 즉시 시정조치, 중대한 사항은 예산·인력·시간 소요 시 응급조치 후 개선계획 수립</li>
                  <li>④ 근로자주지 — 위험요인·감소대책 이행현황에 대한 공유 및 교육 시행, TBM을 통한 위험요인 수시 주지</li>
                  <li>⑤ 이행확인 — 위험성 감소대책 이행 여부, 현장 작동성에 대한 지속적 확인 시행</li>
                </ul>
              </div>
            </section>

            {/* Ⅲ-2. 안전보건교육계획 */}
            <section id="sec-education" className="wizard-section">
              <h2 className="wizard-section-title">안전보건교육계획</h2>
              <Textarea
                label="안내문구"
                value={content.education.note}
                onChange={(e) => updateEducationNote(e.target.value)}
                placeholder="안전보건교육 계획에 대한 안내문구를 작성하세요"
                maxLength={1000}
              />
              <div className="field-group">
                <label className="field-group-label">교육계획표 (법정 교육 9종 기본 제공)</label>
                <EducationTable
                  rows={content.education.rows}
                  onUpdateRow={updateEducationRow}
                  onAddRow={addEducationRow}
                  onRemoveRow={removeEducationRow}
                />
              </div>
            </section>

            {/* Ⅲ-3. 안전작업제도 */}
            <section id="sec-permit" className="wizard-section">
              <h2 className="wizard-section-title">안전작업제도</h2>
              <p className="field-group-hint">
                밀폐공간 출입작업, 굴착작업, 건설기계사용작업, 중장비사용작업 등은 작업 전 허가를 받아야
                합니다 (KOSHA-GUIDE P-94-2021 안전작업허가지침 참고).
              </p>
              <SimpleRowTable
                rows={content.workPermitSystem.rows}
                columns={WORK_PERMIT_COLUMNS}
                onUpdateRow={updateWorkPermitRow}
                onAddRow={addWorkPermitRow}
                onRemoveRow={removeWorkPermitRow}
                emptyText="등록된 대상작업이 없습니다."
              />
            </section>

            {/* Ⅳ-1. 신호 및 연락체계 */}
            <section id="sec-signal" className="wizard-section">
              <h2 className="wizard-section-title">신호 및 연락체계</h2>
              <div className="field-group">
                <label className="field-group-label">연락체계</label>
                <SimpleRowTable
                  rows={content.signalContact.contacts}
                  columns={CONTACT_COLUMNS}
                  onUpdateRow={updateSignalContactRow}
                  onAddRow={addSignalContactRow}
                  onRemoveRow={removeSignalContactRow}
                  emptyText="등록된 연락처가 없습니다."
                />
              </div>
              <div className="field-group">
                <label className="field-group-label">신호체계</label>
                <SimpleRowTable
                  rows={content.signalContact.signals}
                  columns={SIGNAL_COLUMNS}
                  onUpdateRow={updateSignalRow}
                  onAddRow={addSignalRow}
                  onRemoveRow={removeSignalRow}
                  emptyText="등록된 신호체계가 없습니다."
                />
              </div>
            </section>

            {/* Ⅳ-2. 개인보호구 지급계획 */}
            <section id="sec-ppe" className="wizard-section">
              <h2 className="wizard-section-title">개인보호구 지급계획</h2>
              <PpeTable rows={content.ppe.rows} onUpdateRow={updatePpeRow} onAddRow={addPpeRow} onRemoveRow={removePpeRow} />
              <p className="field-group-hint">
                보호구는 사용목적에 맞게 선택하고, 근로자가 상시 사용할 수 있도록 지급하며, 정기적으로
                점검·관리합니다.
              </p>
            </section>

            {/* Ⅳ-3. 위험물질 및 설비관리계획 */}
            <section id="sec-hazard" className="wizard-section">
              <h2 className="wizard-section-title">위험물질 및 설비관리계획</h2>
              <div className="field-group">
                <label className="field-group-label">유해위험 기계·기구·설비</label>
                <SimpleRowTable
                  rows={content.hazardousMgmt.equipmentRows}
                  columns={hazardousColumns('장비명')}
                  onUpdateRow={updateEquipmentRow}
                  onAddRow={addEquipmentRow}
                  onRemoveRow={removeEquipmentRow}
                  emptyText="등록된 장비가 없습니다."
                />
              </div>
              <div className="field-group">
                <label className="field-group-label">유해위험물질</label>
                <SimpleRowTable
                  rows={content.hazardousMgmt.materialRows}
                  columns={hazardousColumns('물질명')}
                  onUpdateRow={updateMaterialRow}
                  onAddRow={addMaterialRow}
                  onRemoveRow={removeMaterialRow}
                  emptyText="등록된 물질이 없습니다."
                />
              </div>
              <div className="field-group">
                <label className="field-group-label">작업절차 및 안전수칙</label>
                <SimpleRowTable
                  rows={content.hazardousMgmt.procedureRows}
                  columns={PROCEDURE_COLUMNS}
                  onUpdateRow={updateProcedureRow}
                  onAddRow={addProcedureRow}
                  onRemoveRow={removeProcedureRow}
                  emptyText="등록된 작업절차가 없습니다."
                />
              </div>
            </section>

            {/* Ⅳ-4. 비상대책 */}
            <section id="sec-emergency" className="wizard-section">
              <h2 className="wizard-section-title">비상대책</h2>
              <div className="field-group">
                <label className="field-group-label">대책반 구성</label>
                <SimpleRowTable
                  rows={content.emergencyPlan.teamRows}
                  columns={EMERGENCY_TEAM_COLUMNS}
                  onUpdateRow={updateEmergencyTeamRow}
                  onAddRow={addEmergencyTeamRow}
                  onRemoveRow={removeEmergencyTeamRow}
                  emptyText="등록된 대책반 구성원이 없습니다."
                />
              </div>
              <div className="field-group">
                <label className="field-group-label">비상연락체계</label>
                <SimpleRowTable
                  rows={content.emergencyPlan.contactRows}
                  columns={CONTACT_COLUMNS}
                  onUpdateRow={updateEmergencyContactRow}
                  onAddRow={addEmergencyContactRow}
                  onRemoveRow={removeEmergencyContactRow}
                  emptyText="등록된 연락처가 없습니다."
                />
              </div>
              <div className="field-group">
                <label className="field-group-label">세부대응절차 (참고)</label>
                <ul className="static-guide-list">
                  {EMERGENCY_PROCEDURE_STEPS.map((s) => (
                    <li key={s.label}>
                      <strong>{s.label}</strong> — {s.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="field-group">
                <label className="field-group-label">
                  공종별 비상대응절차 예시 ({content.riskAssessment.constructionType || '일반공사'} → {accidentType})
                </label>
                <div className="wizard-table-wrap">
                  <table className="wizard-table">
                    <thead>
                      <tr>
                        <th className="col-narrow">진행단계</th>
                        <th>세부조치사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EMERGENCY_EXAMPLES[accidentType].map((row) => (
                        <tr key={row.step}>
                          <td>{row.step}</td>
                          <td>{row.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Ⅴ-1. 산업재해 발생현황 */}
            <section id="sec-incident" className="wizard-section">
              <h2 className="wizard-section-title">산업재해 발생현황</h2>
              <div className="field-group">
                <label className="field-group-label">최근 3개년 재해건수</label>
                <div className="wizard-table-wrap">
                  <table className="wizard-table">
                    <thead>
                      <tr>
                        {content.incidentHistory.yearlyStats.map((s) => (
                          <th key={s.year} className="col-narrow">
                            {s.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {content.incidentHistory.yearlyStats.map((s, idx) => (
                          <td key={s.year}>
                            <input value={s.count} onChange={(e) => updateYearlyStat(idx, e.target.value)} placeholder="0" />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <Input
                label="사업장관리번호"
                value={content.incidentHistory.workplaceManagementNumber}
                onChange={(e) => updateWorkplaceNumber(e.target.value)}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={content.incidentHistory.noAccidentConfirm}
                  onChange={(e) => toggleNoAccidentConfirm(e.target.checked)}
                />
                현재까지 산업재해(무재해) 발생 사실이 없음을 확인합니다.
              </label>

              <div className="field-group">
                <label className="field-group-label">첨부서류</label>
                <SingleFileUpload
                  label="산재요양(반려) 확인서"
                  file={content.incidentHistory.accidentReportFile}
                  uploading={uploadingCategory === 'accident-report'}
                  onSet={(file) => handleSetSingleFile('accidentReportFile', 'accident-report', file)}
                  onRemove={() => handleRemoveSingleFile('accidentReportFile')}
                  onView={handleViewFile}
                />
                <SingleFileUpload
                  label="4대사회보험 가입자명부"
                  file={content.incidentHistory.insuranceMemberFile}
                  uploading={uploadingCategory === 'insurance-list'}
                  onSet={(file) => handleSetSingleFile('insuranceMemberFile', 'insurance-list', file)}
                  onRemove={() => handleRemoveSingleFile('insuranceMemberFile')}
                  onView={handleViewFile}
                />
              </div>
            </section>

            <div className="download-section">
              <Button variant="primary" onClick={handleComplete}>
                완료 처리
              </Button>
              {canDownload || unlockedByCoupon ? (
                <>
                  <Button variant="secondary" disabled={downloading !== null} onClick={() => handleDownload('pdf')}>
                    {downloading === 'pdf' ? '다운로드 중...' : 'PDF 다운로드'}
                  </Button>
                  <Button variant="secondary" disabled={downloading !== null} onClick={() => handleDownload('docx')}>
                    {downloading === 'docx' ? '다운로드 중...' : 'DOCX 다운로드'}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => navigate('/subscription')}>
                  구독하기
                </Button>
              )}
              {!unlockedByCoupon && (
                <Button variant="secondary" onClick={() => setShowCouponModal(true)}>
                  쿠폰 등록
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/documents')}>
                목록으로
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showCouponModal && doc && (
        <CouponRedeemModal
          documents={[{ id: doc.id, title: doc.title }]}
          initialDocumentId={doc.id}
          onClose={() => setShowCouponModal(false)}
          onRedeemed={() => setUnlockedByCoupon(true)}
        />
      )}
    </div>
  )
}
