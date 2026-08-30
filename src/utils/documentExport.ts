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
} from 'docx'
import type {
  WizardContent,
  RiskRow,
  RiskMethod,
  PpeRow,
  EducationRow,
  PreventionRow,
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

  const headers = [
    '번호',
    '유해·위험요인',
    ...(isLevel3 ? ['위험성수준'] : []),
    ...(isFreqSeverity ? ['빈도', '강도', '위험성(빈도×강도)'] : []),
    '개선대책',
    '개선예정일',
    '개선완료일',
    '담당자',
  ]

  return {
    headers,
    rows: exportRows.map((r, i) => [
      String(i + 1),
      r.hazard,
      ...(isLevel3 ? [r.level] : []),
      ...(isFreqSeverity
        ? [r.frequency ?? '', r.severity ?? '', String((Number(r.frequency) || 0) * (Number(r.severity) || 0))]
        : []),
      r.countermeasure,
      r.plannedDate,
      r.completedDate,
      r.manager,
    ]),
  }
}

function ppeTable(rows: PpeRow[]): DocumentTable {
  return {
    headers: ['품명', '수량', '지급대상', '관리계획'],
    rows: rows.map((r) => [r.name, r.qty, r.target, r.managementPlan]),
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
    headers: [nameLabel, '관리대책', '점검항목', '관리책임자'],
    rows: rows.map((r) => [r.name, r.controlMeasure, r.checkItem, r.manager]),
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

/**
 * 마법사 입력 내용(WizardContent)을 실제 문서 순서(표지→Ⅰ.실행수준→Ⅱ.재해발생수준)대로
 * PDF/DOCX 출력용 DocumentContent로 변환한다. 첨부파일은 signed URL이 필요하므로
 * resolveFileUrl(path)를 통해 비동기로 해석한다.
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
  } = content

  const [workerPhotos, sitePhotos, improvementPhotos, accidentReport, insuranceMember] = await Promise.all([
    resolveImages(checklist.workerPhotos, resolveFileUrl),
    resolveImages(checklist.sitePhotos, resolveFileUrl),
    resolveImages(checklist.improvementPhotos, resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.accidentReportFile, '산재요양(반려)확인서', resolveFileUrl),
    resolveIncidentAttachment(incidentHistory.insuranceMemberFile, '4대사회보험 가입자명부', resolveFileUrl),
  ])

  const attachmentNames = [accidentReport.name, insuranceMember.name].filter(
    (v): v is string => Boolean(v),
  )
  const attachmentImages = [accidentReport.image, insuranceMember.image].filter(
    (v): v is DocumentImage => Boolean(v),
  )

  const sections: DocumentSection[] = [
    {
      heading: '수급업체 안전·보건 관리계획서 (표지)',
      content:
        `사업(공사)명: ${cover.projectName}\n` +
        `발주기관명: ${cover.orgName}\n` +
        `업체명: ${cover.companyName}\n` +
        `대표이사: ${cover.ceoName}\n` +
        `작성일자: ${cover.docDate}`,
    },
    {
      heading: 'Ⅰ-2. 사업개요',
      content:
        `사업기간: ${businessOverview.period}\n` +
        `위치: ${businessOverview.location}` +
        (businessOverview.mainContent ? `\n주요내용: ${businessOverview.mainContent}` : ''),
    },
    {
      heading: 'Ⅱ-1. 위험성평가',
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
      heading: 'Ⅱ-2. 안전보건방침',
      content:
        `${cover.companyName || '회사'} 안전보건 경영방침 및 목표\n` +
        `목표: ${safetyPolicy.goalText}\n` +
        `${cover.docDate} · ${cover.companyName} 대표이사 ${cover.ceoName}`,
    },
    {
      heading: 'Ⅱ-3. 산업재해예방활동 이행계획',
      table: preventionTable(preventionPlan.rows),
    },
    {
      heading: 'Ⅱ-4. 안전보건관리조직',
      table: safetyOrgTable(safetyOrg.roles),
    },
    {
      heading: 'Ⅲ-1. 안전점검 및 조치계획',
      content:
        `점검일자: ${checklist.inspectionDate}\n` +
        `점검현장: ${checklist.inspectionSite}\n` +
        `관리감독자: ${checklist.supervisorName}` +
        (checklist.otherNotes ? `\n기타사항: ${checklist.otherNotes}` : ''),
      table: checklistTable(checklist.categories),
    },
  ]

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
      heading: 'Ⅲ-2. 안전보건교육계획',
      content: education.note || undefined,
      table: educationTable(education.rows),
    },
    {
      heading: 'Ⅲ-3. 안전작업제도',
      table: workPermitTable(workPermitSystem.rows),
    },
    {
      heading: 'Ⅳ-1. 신호 및 연락체계 - 연락체계',
      table: contactTable(signalContact.contacts),
    },
    {
      heading: 'Ⅳ-1. 신호 및 연락체계 - 신호체계',
      table: signalTable(signalContact.signals),
    },
    {
      heading: 'Ⅳ-2. 개인보호구 지급계획',
      table: ppeTable(ppe.rows),
    },
    {
      heading: 'Ⅳ-3. 위험물질 및 설비관리계획 - 유해위험 기계·기구·설비',
      table: hazardousItemTable(hazardousMgmt.equipmentRows, '장비명'),
    },
    {
      heading: 'Ⅳ-3. 위험물질 및 설비관리계획 - 유해위험물질',
      table: hazardousItemTable(hazardousMgmt.materialRows, '물질명'),
    },
    {
      heading: 'Ⅳ-3. 위험물질 및 설비관리계획 - 작업절차 및 안전수칙',
      table: procedureTable(hazardousMgmt.procedureRows),
    },
    {
      heading: 'Ⅳ-4. 비상대책 - 대책반 구성',
      table: emergencyTeamTable(emergencyPlan.teamRows),
    },
    {
      heading: 'Ⅳ-4. 비상대책 - 비상연락체계',
      table: contactTable(emergencyPlan.contactRows),
    },
    {
      heading: 'Ⅴ-1. 산업재해 발생현황',
      content:
        `사업장관리번호: ${incidentHistory.workplaceManagementNumber}\n` +
        `무재해 확인: ${incidentHistory.noAccidentConfirm ? '확인함' : '미확인'}` +
        (attachmentNames.length ? `\n첨부파일(비이미지 - 파일명만 표기): ${attachmentNames.join(', ')}` : ''),
      table: yearlyStatsTable(incidentHistory.yearlyStats),
    },
  )

  if (attachmentImages.length) {
    sections.push({ heading: 'Ⅴ-1. 산업재해 발생현황 - 첨부서류', images: attachmentImages })
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

export async function exportToPDF(
  documentContent: DocumentContent,
  filename: string = 'document.pdf',
): Promise<void> {
  const textOnlySections = documentContent.sections
    .filter((s) => s.content || s.table)
    .map((s) => ({ ...s, images: undefined }))
  const images = documentContent.sections.flatMap((s) => s.images ?? [])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cursor: PdfCursor = { usedPage: false }

  const element = createHTMLContent({ ...documentContent, sections: textOnlySections })
  element.style.position = 'fixed'
  element.style.left = '-9999px'
  element.style.top = '0'
  element.style.width = `${OFFSCREEN_WIDTH_PX}px`
  element.style.backgroundColor = '#ffffff'
  element.style.boxSizing = 'border-box'
  document.body.appendChild(element)

  try {
    const canvas = await renderElementToCanvas(element)
    addCanvasAsPages(pdf, canvas, cursor)
  } finally {
    document.body.removeChild(element)
  }

  for (const image of images) {
    try {
      await addImagePage(pdf, image, cursor)
    } catch (err) {
      console.error('첨부 이미지 페이지 생성 실패:', err)
    }
  }

  pdf.save(filename)
}

function createHTMLContent(content: DocumentContent): HTMLElement {
  const div = document.createElement('div')
  div.style.padding = '20px'
  div.style.fontFamily = "'Noto Sans KR', sans-serif"

  const title = document.createElement('h1')
  title.textContent = content.title
  title.style.marginBottom = '20px'
  div.appendChild(title)

  if (content.metadata?.company) {
    const meta = document.createElement('p')
    meta.textContent = `회사명: ${content.metadata.company}`
    meta.style.color = '#666'
    meta.style.marginBottom = '10px'
    div.appendChild(meta)
  }

  if (content.metadata?.date) {
    const date = document.createElement('p')
    date.textContent = `작성일: ${content.metadata.date}`
    date.style.color = '#666'
    date.style.marginBottom = '30px'
    div.appendChild(date)
  }

  content.sections.forEach((section) => {
    const heading = document.createElement('h2')
    heading.textContent = section.heading
    heading.style.marginTop = '20px'
    heading.style.marginBottom = '10px'
    div.appendChild(heading)

    if (section.content) {
      const text = document.createElement('p')
      text.textContent = section.content
      text.style.lineHeight = '1.6'
      text.style.whiteSpace = 'pre-wrap'
      div.appendChild(text)
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
      div.appendChild(table)
    }

    if (section.footnote) {
      const note = document.createElement('p')
      note.textContent = section.footnote
      note.style.fontSize = '11px'
      note.style.color = '#666'
      note.style.marginTop = '4px'
      div.appendChild(note)
    }

    if (section.images && section.images.length > 0) {
      const gallery = document.createElement('div')
      gallery.style.display = 'flex'
      gallery.style.flexWrap = 'wrap'
      gallery.style.gap = '12px'
      gallery.style.marginTop = '10px'
      gallery.style.marginBottom = '10px'

      section.images.forEach((img) => {
        const figure = document.createElement('figure')
        figure.style.margin = '0'
        figure.style.width = '160px'

        const imageEl = document.createElement('img')
        imageEl.src = img.url
        imageEl.crossOrigin = 'anonymous'
        imageEl.style.width = '100%'
        imageEl.style.height = '120px'
        imageEl.style.objectFit = 'cover'
        imageEl.style.border = '1px solid #ccc'
        figure.appendChild(imageEl)

        if (img.caption) {
          const caption = document.createElement('figcaption')
          caption.textContent = img.caption
          caption.style.fontSize = '11px'
          caption.style.color = '#666'
          caption.style.textAlign = 'center'
          figure.appendChild(caption)
        }

        gallery.appendChild(figure)
      })

      div.appendChild(gallery)
    }
  })

  return div
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

export async function exportToDOCX(
  documentContent: DocumentContent,
  filename: string = 'document.docx',
): Promise<void> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: documentContent.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
  ]

  if (documentContent.metadata?.company) {
    children.push(
      new Paragraph({ text: `회사명: ${documentContent.metadata.company}`, spacing: { after: 100 } }),
    )
  }
  if (documentContent.metadata?.date) {
    children.push(
      new Paragraph({ text: `작성일: ${documentContent.metadata.date}`, spacing: { after: 300 } }),
    )
  }

  for (const section of documentContent.sections) {
    children.push(
      new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }),
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

    if (section.images && section.images.length > 0) {
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
