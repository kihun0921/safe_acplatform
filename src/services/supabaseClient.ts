import { createClient } from '@supabase/supabase-js'
import type { WizardContent } from '../types/wizardContent'
import { createEmptyWizardContent, mergeWizardContent } from '../types/wizardContent'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

// autoRefreshToken/persistSession은 supabase-js v2 기본값과 동일하지만, 세션이
// 예기치 않게 끊기는 문제를 조사한 이력이 있어 의도를 명시적으로 남겨둔다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Auth functions
export async function signUp(
  email: string,
  password: string,
  metadata?: Record<string, unknown>,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email)
}

// ============================================================================
// Database functions
// ============================================================================
// 아래 타입/매핑은 schema.sql 문서가 아니라 실제 배포된 Supabase 테이블 컬럼명을
// 기준으로 작성됨 (information_schema.columns 조회로 확인됨, 2026-08-29).
//   announcements: id, title, organization, deadline, category, status, created_at
//   documents: id, user_id, announcement_id, title, status, current_step,
//              percent_complete, created_at, updated_at, last_saved_at

export interface Announcement {
  id: string
  title: string
  organization: string
  deadline: string
  category: string
  status: string
  apiSource: string
  awarded: boolean
  winnerName: string
  winnerAmount: string
  awardDate: string
  externalNo: string
  estimatedPrice: string
  industryType: string
  contactName: string
  contactPhone: string
  sourceUrl: string
}

interface AnnouncementRow {
  id: string
  title: string
  organization: string | null
  deadline: string | null
  category: string | null
  status: string | null
  created_at: string | null
  api_source: string | null
  awarded: boolean | null
  winner_name: string | null
  winner_amount: string | null
  award_date: string | null
  external_no: string | null
  estimated_price: string | null
  industry_type: string | null
  contact_name: string | null
  contact_phone: string | null
  source_url: string | null
}

function mapAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization ?? '',
    deadline: row.deadline ?? '',
    category: row.category ?? '',
    status: row.status ?? '',
    apiSource: row.api_source ?? '',
    awarded: row.awarded ?? false,
    winnerName: row.winner_name ?? '',
    winnerAmount: row.winner_amount ?? '',
    awardDate: row.award_date ?? '',
    externalNo: row.external_no ?? '',
    estimatedPrice: row.estimated_price ?? '',
    industryType: row.industry_type ?? '',
    contactName: row.contact_name ?? '',
    contactPhone: row.contact_phone ?? '',
    sourceUrl: row.source_url ?? '',
  }
}

// 안전보건관리계획서는 "입찰이 끝난(마감일이 지난)" 공사를 대상으로 작성하므로,
// 마감일이 아직 도래하지 않은 공고는 제외하고, 최근 30일 이내 마감된 공고만
// 마감일 최신순으로 보여준다. (deadline은 TEXT 컬럼이지만 'YYYY-MM-DD HH:mm[:ss]'
// 형식으로 정규화되어 있어 문자열 비교/정렬이 곧 날짜순 비교/정렬과 동일하다.)
function dateBoundaries(daysBack: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const now = new Date()
  const past = new Date(now)
  past.setDate(past.getDate() - daysBack)

  return {
    upperBound: `${toDateStr(now)} 23:59:59`,
    lowerBound: `${toDateStr(past)} 00:00:00`,
  }
}

export async function getAnnouncements(limit?: number): Promise<{
  data: Announcement[] | null
  error: Error | null
}> {
  const { upperBound, lowerBound } = dateBoundaries(30)

  let query = supabase
    .from('announcements')
    .select(
      'id, title, organization, deadline, category, status, created_at, api_source, awarded, winner_name, winner_amount, award_date, external_no, estimated_price, industry_type, contact_name, contact_phone, source_url',
    )
    // 최근 30일 마감/개찰 기준 노출이 원칙이지만, 한전(kepco)은 확정(Final)까지
    // 통상 90~180일이 걸려 "마감일 30일 이내"로는 사실상 노출되지 않는다.
    // 이미 확정된 건만 골라서 동기화하므로 한전은 날짜 범위 제한에서 제외한다.
    // 한국도로공사(ex)도 deadline에 계약체결일자를 넣는데 실제 응답의 날짜 포맷이
    // 검증 전이라(TEXT 컬럼 문자열 비교라 포맷이 다르면 조용히 안 걸릴 수 있음) 같은
    // 이유로 우선 제외 — 포맷 확인되면 다시 범위 필터에 포함시킬 수 있음.
    .or(`and(deadline.gte.${lowerBound},deadline.lte.${upperBound}),api_source.eq.kepco,api_source.eq.ex`)
    // 조달청(pps) 공고는 "실제로 낙찰이 확정된" 건만 노출한다 (마감만 되고
    // 유찰/취소된 건은 제외). 낙찰정보 API가 없는 출처(방위사업청 등)는
    // 기존처럼 마감일 경과 여부만으로 판단한다.
    .or('api_source.neq.pps,awarded.eq.true')
    .order('deadline', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query

  if (error || !data) return { data: null, error }
  return { data: data.map(mapAnnouncement), error: null }
}

export interface AppDocument {
  id: string
  userId: string
  announcementId: string | null
  title: string
  status: 'in_progress' | 'completed'
  currentStep: number
  percentComplete: number
  content: WizardContent
  createdAt: string
  updatedAt: string
  lastSavedAt: string
}

interface DocumentRow {
  id: string
  user_id: string
  announcement_id: string | null
  title: string
  status: string | null
  current_step: number | null
  percent_complete: number | null
  content: WizardContent | null
  created_at: string | null
  updated_at: string | null
  last_saved_at: string | null
}

const DOCUMENT_SELECT =
  'id, user_id, announcement_id, title, status, current_step, percent_complete, content, created_at, updated_at, last_saved_at'

function mapDocument(row: DocumentRow): AppDocument {
  return {
    id: row.id,
    userId: row.user_id,
    announcementId: row.announcement_id,
    title: row.title,
    status: (row.status as 'in_progress' | 'completed') ?? 'in_progress',
    currentStep: row.current_step ?? 1,
    percentComplete: row.percent_complete ?? 0,
    content: mergeWizardContent(row.content),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
    lastSavedAt: row.last_saved_at ?? '',
  }
}

export async function getDocuments(userId: string): Promise<{
  data: AppDocument[] | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return { data: null, error }
  return { data: data.map(mapDocument), error: null }
}

export async function getDocumentById(documentId: string): Promise<{
  data: AppDocument | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('id', documentId)
    .maybeSingle()

  if (error || !data) return { data: null, error }
  return { data: mapDocument(data), error: null }
}

export async function createDocumentRow(
  userId: string,
  announcementId: string | null,
  title: string,
): Promise<{ data: AppDocument | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      announcement_id: announcementId,
      title,
      status: 'in_progress',
      current_step: 1,
      percent_complete: 0,
      content: createEmptyWizardContent(),
      last_saved_at: new Date().toISOString(),
    })
    .select(DOCUMENT_SELECT)
    .single()

  if (error || !data) return { data: null, error }
  return { data: mapDocument(data), error: null }
}

export async function updateDocument(
  documentId: string,
  updates: Partial<
    Pick<AppDocument, 'status' | 'currentStep' | 'percentComplete'>
  >,
) {
  const payload: Record<string, unknown> = {
    last_saved_at: new Date().toISOString(),
  }
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.currentStep !== undefined) payload.current_step = updates.currentStep
  if (updates.percentComplete !== undefined) {
    payload.percent_complete = updates.percentComplete
  }

  return supabase.from('documents').update(payload).eq('id', documentId)
}

export async function updateDocumentContent(
  documentId: string,
  content: WizardContent,
) {
  return supabase
    .from('documents')
    .update({ content, last_saved_at: new Date().toISOString() })
    .eq('id', documentId)
}

// 작성자 본인이 내 문서함에서 직접 삭제 (RLS: auth.uid() = user_id 인 본인 문서만 삭제 가능)
export async function deleteDocumentRow(documentId: string) {
  return supabase.from('documents').delete().eq('id', documentId)
}

// ============================================================================
// Storage: 계획서 첨부파일 (현장 사진, 산재확인서, 4대보험명부 등)
// ============================================================================

const ATTACHMENTS_BUCKET = 'document-attachments'

export async function uploadDocumentFile(
  userId: string,
  documentId: string,
  category: string,
  file: File,
): Promise<{ data: { path: string; name: string } | null; error: Error | null }> {
  // Supabase Storage는 오브젝트 키에 한글 등 비-ASCII 문자를 허용하지 않아
  // "Invalid key" 오류가 발생한다. 원본 파일명은 UploadedFile.name에 그대로 보존하고,
  // 스토리지 경로에는 ASCII로 안전하게 치환한 이름만 사용한다.
  const safeName = file.name.replace(/[^\w.-]/g, '_')
  const path = `${userId}/${documentId}/${category}/${crypto.randomUUID()}-${safeName}`

  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) return { data: null, error }
  return { data: { path, name: file.name }, error: null }
}

export async function getSignedFileUrl(
  path: string,
  expiresIn = 3600,
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error || !data) return { data: null, error }
  return { data: data.signedUrl, error: null }
}

export async function deleteDocumentFile(path: string) {
  return supabase.storage.from(ATTACHMENTS_BUCKET).remove([path])
}

// ============================================================================
// 구독/결제 (토스페이먼츠 카드결제 + 무통장입금)
// ============================================================================
//   subscriptions: id, member_id, status, plan_type, start_date, end_date,
//                  amount, payment_method, created_at, updated_at
//   payments: id, member_id, subscription_id, plan_type, amount, method, status,
//             order_id, toss_payment_key, depositor_name, confirmed_by,
//             confirmed_at, created_at, updated_at

export interface SubscriptionPlan {
  id: string
  name: string
  amount: number
  periodMonths: number
}

// 단일 월간 플랜으로 시작 — 배열이라 플랜 추가는 이 목록에 항목만 늘리면 됨
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'monthly', name: '월간 구독', amount: 50000, periodMonths: 1 },
]

export interface MySubscription {
  id: string
  status: string
  planType: string
  startDate: string | null
  endDate: string | null
}

interface SubscriptionRow {
  id: string
  status: string | null
  plan_type: string | null
  start_date: string | null
  end_date: string | null
}

function mapSubscription(row: SubscriptionRow): MySubscription {
  return {
    id: row.id,
    status: row.status ?? '',
    planType: row.plan_type ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
  }
}

export async function getMySubscription(memberId: string): Promise<MySubscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, plan_type, start_date, end_date')
    .eq('member_id', memberId)
    .maybeSingle()
  if (error) console.error('[getMySubscription]', error)
  return data ? mapSubscription(data as SubscriptionRow) : null
}

export interface Payment {
  id: string
  planType: string
  amount: number
  method: 'card' | 'bank_transfer'
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  depositorName: string | null
  createdAt: string
}

interface PaymentRow {
  id: string
  plan_type: string
  amount: number
  method: string
  status: string
  depositor_name: string | null
  created_at: string
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    planType: row.plan_type,
    amount: row.amount,
    method: row.method as Payment['method'],
    status: row.status as Payment['status'],
    depositorName: row.depositor_name,
    createdAt: row.created_at,
  }
}

export async function getMyPayments(memberId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('id, plan_type, amount, method, status, depositor_name, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  return (data as PaymentRow[] | null)?.map(mapPayment) ?? []
}

// 결제(카드/무통장입금) 시작 시 subscriptions를 pending으로 만들고(없으면 생성),
// payments에 이번 결제 시도 1건을 기록한다. orderId는 토스 결제창 호출과 승인 API
// 조회에 공통으로 쓰는 식별자라 여기서 미리 만들어 반환한다.
export async function createPendingSubscriptionAndPayment(
  memberId: string,
  plan: SubscriptionPlan,
  method: 'card' | 'bank_transfer',
  depositorName?: string,
): Promise<{ paymentId: string; orderId: string }> {
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('member_id', memberId)
    .maybeSingle()

  let subscriptionId: string
  if (existingSub) {
    subscriptionId = existingSub.id
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'pending', plan_type: plan.id, amount: plan.amount, payment_method: method })
      .eq('id', subscriptionId)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        member_id: memberId,
        status: 'pending',
        plan_type: plan.id,
        amount: plan.amount,
        payment_method: method,
      })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('구독 생성에 실패했습니다.')
    subscriptionId = data.id
  }

  const orderId = crypto.randomUUID()
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      member_id: memberId,
      subscription_id: subscriptionId,
      plan_type: plan.id,
      amount: plan.amount,
      method,
      status: 'pending',
      order_id: orderId,
      depositor_name: method === 'bank_transfer' ? depositorName ?? null : null,
    })
    .select('id')
    .single()
  if (paymentError || !paymentData) throw paymentError ?? new Error('결제 생성에 실패했습니다.')

  return { paymentId: paymentData.id, orderId }
}

export interface AdminPayment extends Payment {
  memberName: string
  memberCompany: string
}

interface AdminPaymentRow extends PaymentRow {
  members: { name: string | null; company: string | null } | null
}

export async function getAllPaymentsAdmin(): Promise<AdminPayment[]> {
  // payments -> members 관계가 member_id/confirmed_by 두 개라 PostgREST가 어느 쪽을
  // 조인할지 특정하지 못해 기본 문법(members(...))은 "여러 관계가 발견됨" 오류를 낸다.
  // FK 이름으로 명시해 member_id 쪽 관계를 지정한다.
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, plan_type, amount, method, status, depositor_name, created_at, members!payments_member_id_fkey(name, company)',
    )
    .order('created_at', { ascending: false })
  if (error) console.error('[getAllPaymentsAdmin]', error)
  if (error || !data) return []
  return (data as unknown as AdminPaymentRow[]).map((row) => ({
    ...mapPayment(row),
    memberName: row.members?.name ?? '(알수없음)',
    memberCompany: row.members?.company ?? '',
  }))
}

// 무통장입금 확인(관리자 수동 확인 — 토스 API 호출 없음). 카드결제 승인/갱신은
// confirm-toss-payment Edge Function이 SERVICE ROLE로 처리한다.
export async function confirmBankTransferPayment(
  paymentId: string,
  adminId: string,
): Promise<{ error: Error | null }> {
  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('subscription_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (fetchErr || !payment) return { error: fetchErr ?? new Error('결제 내역을 찾을 수 없습니다.') }

  const now = new Date()
  const endDate = new Date(now)
  endDate.setMonth(endDate.getMonth() + 1)

  const { error: payErr } = await supabase
    .from('payments')
    .update({ status: 'paid', confirmed_by: adminId, confirmed_at: now.toISOString() })
    .eq('id', paymentId)
  if (payErr) return { error: payErr }

  if (payment.subscription_id) {
    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: now.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
      })
      .eq('id', payment.subscription_id)
    if (subErr) return { error: subErr }
  }

  return { error: null }
}

// ============================================================================
// 쿠폰 (제휴처 발급 — 문서 1건 단위 다운로드 잠금해제, 계정 구독과는 별개)
// ============================================================================
//   coupons: id, code, status, source, document_id, used_by, used_at, created_at

const COUPON_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 0/O, 1/I/L 등 헷갈리는 문자 제외
const COUPON_CODE_LENGTH = 8

function randomCouponCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(COUPON_CODE_LENGTH))
  return Array.from(bytes, (b) => COUPON_CODE_CHARSET[b % COUPON_CODE_CHARSET.length]).join('')
}

// 쿠폰 등록은 members 테이블 UPDATE 권한 없이도 안전하게 동작하도록 DB의 SECURITY DEFINER
// 함수(redeem_coupon)를 통해서만 이루어진다 (동시성 안전 + 본인 문서 검증을 원자적으로 수행).
export async function redeemCoupon(
  code: string,
  documentId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('redeem_coupon', {
    p_code: code.trim().toUpperCase(),
    p_document_id: documentId,
  })
  if (!error) return { error: null }

  const message = error.message || ''
  if (message.includes('INVALID_OR_USED_COUPON')) {
    return { error: new Error('유효하지 않거나 이미 사용된 쿠폰입니다.') }
  }
  if (message.includes('FORBIDDEN_DOCUMENT')) {
    return { error: new Error('본인이 작성한 문서에만 쿠폰을 등록할 수 있습니다.') }
  }
  return { error: new Error(message || '쿠폰 등록에 실패했습니다.') }
}

// 로그인한 회원이 쿠폰으로 잠금해제한 document_id 목록을 한 번에 조회 (문서함 목록 렌더링 시
// 문서마다 개별 조회하지 않도록 Set으로 반환)
export async function getRedeemedCouponDocumentIds(memberId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('coupons')
    .select('document_id')
    .eq('used_by', memberId)
    .eq('status', 'used')
  const ids = (data as { document_id: string | null }[] | null) ?? []
  return new Set(ids.map((row) => row.document_id).filter((id): id is string => Boolean(id)))
}

export interface AdminCoupon {
  id: string
  code: string
  status: 'unused' | 'used' | 'revoked'
  source: string
  createdAt: string
  usedAt: string | null
  memberName: string | null
  documentTitle: string | null
}

interface AdminCouponRow {
  id: string
  code: string
  status: string
  source: string | null
  created_at: string
  used_at: string | null
  members: { name: string | null } | null
  documents: { title: string | null } | null
}

// 관리자가 배치로 쿠폰코드 N개를 생성 (코드 충돌 시 해당 건만 재시도)
export async function generateCoupons(source: string, count: number): Promise<AdminCoupon[]> {
  const created: AdminCoupon[] = []
  for (let i = 0; i < count; i++) {
    let attempt = 0
    for (;;) {
      attempt++
      const code = randomCouponCode()
      const { data, error } = await supabase
        .from('coupons')
        .insert({ code, source, status: 'unused' })
        .select('id, code, status, source, created_at, used_at')
        .single()

      if (!error && data) {
        created.push({
          id: data.id,
          code: data.code,
          status: data.status,
          source: data.source ?? '',
          createdAt: data.created_at,
          usedAt: data.used_at,
          memberName: null,
          documentTitle: null,
        })
        break
      }
      // unique 제약 충돌(23505)이면 코드를 다시 뽑아 재시도, 그 외 오류면 포기
      if (error?.code !== '23505' || attempt >= 5) {
        throw error ?? new Error('쿠폰 생성에 실패했습니다.')
      }
    }
  }
  return created
}

export async function getAllCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    // coupons -> members는 used_by 하나뿐이라 members(payments 때와 달리) 관계가 모호하지 않음
    .select('id, code, status, source, created_at, used_at, members(name), documents(title)')
    .order('created_at', { ascending: false })
  if (error) console.error('[getAllCoupons]', error)
  if (error || !data) return []
  return (data as unknown as AdminCouponRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status as AdminCoupon['status'],
    source: row.source ?? '',
    createdAt: row.created_at,
    usedAt: row.used_at,
    memberName: row.members?.name ?? null,
    documentTitle: row.documents?.title ?? null,
  }))
}

export async function getInquiries(userId: string) {
  return supabase
    .from('inquiries')
    .select('*')
    .eq('user_id', userId)
}

export async function createInquiry(
  userId: string,
  title: string,
  content: string,
) {
  return supabase.from('inquiries').insert([
    {
      user_id: userId,
      title,
      content,
      status: 'open',
    },
  ])
}

// Real-time subscriptions (Phase 2+)
// Note: Real-time subscriptions require Supabase to be configured
export function subscribeToDocuments(
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _callback: (payload: unknown) => void,
) {
  // Supabase real-time subscription would go here
  // For now, returning null to avoid errors
  return null
}

export function subscribeToInquiries(
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _callback: (payload: unknown) => void,
) {
  // Supabase real-time subscription would go here
  // For now, returning null to avoid errors
  return null
}
