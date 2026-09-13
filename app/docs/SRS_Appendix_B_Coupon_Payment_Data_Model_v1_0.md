# Appendix B — 구독·결제·쿠폰 상세 데이터 모델 v1.0

> 본 문서는 SRS 6.5절(구독·결제·쿠폰, FR-014~FR-015, FR-028~FR-030)의 상세 부속서이다.
>
> **중요**: `specs/001-user-roles-permissions/data-model.md`와 `contracts/schema.sql`은 Phase 1(Mock) 시점에 작성된 문서로, 본 절의 실제 배포 스키마와 컬럼명이 다르다(예: `schema.sql`의 `subscriptions`에는 `amount`/`payment_method`가 없고 `plan_type`이 'basic'/'premium' enum이지만, 실제로는 `plan_type='monthly'` 단일 플랜을 사용한다). **본 부속서가 현재 코드 기준의 실제 스키마이며, 후속 변경 시에도 코드(`src/services/supabaseClient.ts`, Edge Functions)를 우선 기준으로 삼는다.**
>
> 근거: `src/services/supabaseClient.ts`(구독/결제/쿠폰 섹션), `supabase/functions/confirm-toss-payment/index.ts`, `supabase/functions/issue-coupon/index.ts`, `src/pages/SubscriptionPage.tsx`, `src/pages/AdminSubscriptionsPage.tsx`, `src/pages/AdminCouponsPage.tsx`, `src/pages/DocumentsPage.tsx`.
>
> **미확보 항목**: `subscriptions`/`payments`/`coupons` 테이블의 `CREATE TABLE` DDL과 `redeem_coupon()` PostgreSQL 함수(SECURITY DEFINER) 정의는 저장소에 커밋되어 있지 않다(Supabase 대시보드에서 직접 생성된 것으로 추정). 아래 스키마는 애플리케이션 코드가 실제로 select/insert/update하는 컬럼을 기준으로 역추적한 것이며, 컬럼 타입·제약조건·인덱스의 정확한 DDL은 `[결정 필요: Supabase 대시보드에서 실제 DDL을 export하여 이 문서에 반영]`.

---

## 1. 구독(Subscription) — 회원 계정 단위 정기 구독

### 1.1 목적

회원의 서비스 이용 자격(공고 검색·계획서 작성·다운로드 등 핵심 기능 접근 권한, FR-015)을 나타낸다. 결제(Payment) 1건과 1:N 관계이며, 한 회원당 활성 구독은 1행(`member_id` 기준 `maybeSingle()` 조회, 사실상 단일 레코드 가정)만 유지한다.

### 1.2 테이블: `public.subscriptions`

| 컬럼 | 코드 상 사용 방식 | 비고 |
|---|---|---|
| `id` | UUID PK, `insert().select('id').single()`로 생성 시 반환받아 사용 | |
| `member_id` | FK → `members.id`, 회원당 1행 (`eq('member_id', memberId).maybeSingle()`) | 실질적 UNIQUE 제약이 있어야 함 `[결정 필요: 실제 UNIQUE 제약 존재 여부 확인]` |
| `status` | `'pending'` \| `'active'` \| (만료 시 `'expired'` 추정) | 결제 시작 시 `'pending'`, 결제/입금 확인 완료 시 `'active'`로 전이 |
| `plan_type` | `'monthly'`(현재 유일 플랜, `SUBSCRIPTION_PLANS[0].id`) | `SubscriptionPlan.id`와 동일 문자열 |
| `amount` | 결제 시점 플랜 금액(원) 스냅샷 | 플랜 금액이 바뀌어도 기존 구독 행의 금액은 보존됨(스냅샷) |
| `payment_method` | `'card'` \| `'bank_transfer'` | 마지막으로 시도한 결제 수단 |
| `start_date` | DATE, 결제 확정 시점 설정(`now.toISOString().slice(0,10)`) | |
| `end_date` | DATE, 확정 시점 기준 **+1개월** (`endDate.setMonth(endDate.getMonth()+1)`) | 카드결제(`confirm-toss-payment`)·무통장입금(`confirmBankTransferPayment`) 양쪽 모두 동일 로직 |
| `created_at` / `updated_at` | 자동 관리 추정 | `[결정 필요: 트리거 존재 여부 확인]` |

### 1.3 상태 전이

```
(없음) → pending   [createPendingSubscriptionAndPayment 호출 시 최초 생성]
pending → active   [confirm-toss-payment(카드) 승인 성공 또는 confirmBankTransferPayment(무통장) 관리자 확인 시]
active → pending   [회원이 재결제를 시작하면 update({status:'pending', plan_type, amount, payment_method})로 덮어씀]
```

- `MySubscription.status`가 `'active'`이고 `end_date`가 지난 경우를 "만료"로 어떻게 표시하는지는 `SubscriptionPage.tsx`의 `statusBadge()`가 `'active'`/`'pending'`/그 외(미구독) 3가지만 구분하므로, **만료(expired) 상태를 별도로 갱신하는 배치/트리거가 코드베이스에 없다** `[결정 필요: 만료 처리 배치 작업 필요 여부 — SPEC-001 §Expired Subscription Access의 "만료 시 신규 기능 차단" 요구사항을 실제로 강제하려면 만료 판단 로직이 필요]`.

### 1.4 UI 표시 (`SubscriptionPage.tsx`)

| 표시 상태 | 뱃지 | 라벨 |
|---|---|---|
| `active` | success | 구독중 |
| `pending` | warn | 결제 확인 대기 |
| 그 외(null 포함) | default | 미구독 |

---

## 2. 결제(Payment) — 개별 결제 시도/트랜잭션

### 2.1 목적

카드 결제(토스페이먼츠) 또는 무통장입금 신청 1건을 기록한다. 구독(Subscription) 갱신마다 새 결제 행이 생성된다(1 Subscription : N Payment).

### 2.2 테이블: `public.payments`

| 컬럼 | 코드 상 사용 방식 | 비고 |
|---|---|---|
| `id` | UUID PK | |
| `member_id` | FK → `members.id` | 본인 결제 여부 검증에 사용(`confirm-toss-payment`에서 `paymentRow.member_id !== userId` 체크) |
| `subscription_id` | FK → `subscriptions.id` | |
| `plan_type` | 플랜 ID 스냅샷 | |
| `amount` | 결제 금액(원) | 승인 요청 시 금액 위변조 방지를 위해 DB에 저장된 값과 실제 요청 `amount`를 대조(`confirm-toss-payment`) |
| `method` | `'card'` \| `'bank_transfer'` | |
| `status` | `'pending'` \| `'paid'` \| `'failed'` \| `'cancelled'` | |
| `order_id` | `crypto.randomUUID()`로 생성, 토스 결제창 호출과 승인 API 조회에 공통 사용하는 멱등 키 | UNIQUE 제약 필요 `[결정 필요: 실제 UNIQUE 제약 존재 여부 확인]` |
| `toss_payment_key` | 토스 결제 승인 성공 시 저장되는 토스 측 결제 식별자 | 카드 결제만 해당 |
| `depositor_name` | 무통장입금 신청 시 입금자명 | 카드 결제는 NULL |
| `confirmed_by` | 무통장입금을 확인한 관리자의 `member_id` | 카드 결제는 NULL(시스템이 자동 승인) |
| `confirmed_at` | 결제/입금 확정 시각 | |
| `created_at` / `updated_at` | | |

### 2.3 결제 흐름

#### 2.3.1 카드 결제 (토스페이먼츠 SDK v1)

```
1. [Client] createPendingSubscriptionAndPayment(memberId, plan, 'card')
   → subscriptions: upsert(status='pending', plan_type, amount, payment_method='card')
   → payments: insert(status='pending', order_id=uuid, method='card')
2. [Client] 토스 SDK(js.tosspayments.com/v1/payment) requestPayment('카드', {amount, orderId, orderName, customerName, successUrl, failUrl})
   → 토스 결제창(팝업/리다이렉트)에서 카드 인증 진행
3. [Toss] 성공 시 successUrl(`/subscription?paymentKey=...&orderId=...&amount=...`)로 리다이렉트
4. [Client] SubscriptionPage가 쿼리파라미터를 감지해 confirm-toss-payment Edge Function 호출
5. [Edge Function] 
   a. Authorization 헤더로 회원 인증
   b. order_id로 payments 행 조회, member_id 일치·amount 일치·status!='paid' 검증
   c. Basic Auth(TOSS_SECRET_KEY)로 https://api.tosspayments.com/v1/payments/confirm 호출
   d. 성공 시: payments.status='paid', toss_payment_key, confirmed_at 갱신
      subscriptions.status='active', start_date=오늘, end_date=오늘+1개월 갱신
   e. 실패 시: payments.status='failed'로 갱신, 502 응답
6. [Client] 결과를 alert로 안내, 쿼리파라미터 제거 후 구독/결제 내역 재조회
```

**보안 검증 포인트** (코드에 이미 구현됨):
- 결제 승인은 반드시 서버(Edge Function, SERVICE ROLE)에서 토스 시크릿키로 수행 — 클라이언트는 시크릿키를 알 수 없음
- 본인 결제 건만 승인 가능(`member_id` 대조)
- 금액 위변조 방지(`amount` 대조)
- 이미 승인된 결제 재요청 시 `alreadyConfirmed: true` 반환(중복 승인 방지)
- 프론트에서도 `confirmedOrderRef`로 동일 `orderId` 중복 호출 가드(React StrictMode 이중 실행 대응)

#### 2.3.2 무통장입금

```
1. [Client] createPendingSubscriptionAndPayment(memberId, plan, 'bank_transfer', depositorName)
   → subscriptions: upsert(status='pending', payment_method='bank_transfer')
   → payments: insert(status='pending', method='bank_transfer', depositor_name)
2. [Client] 입금 계좌 안내(우리은행 1005-804-614327, 예금주 올케어솔루션 주식회사 — 플레이스홀더,
   [결정 필요: 실제 계좌정보로 교체 필요]) 표시, "신청 완료" 안내
3. [관리자] AdminSubscriptionsPage에서 입금 확인 후 confirmBankTransferPayment(paymentId, adminId) 호출
   → payments.status='paid', confirmed_by=adminId, confirmed_at 갱신
   → subscriptions.status='active', start_date=오늘, end_date=오늘+1개월 갱신
```

### 2.4 플랜 정의

| 필드 | 값 |
|---|---|
| `id` | `monthly` |
| `name` | 월간 구독 |
| `amount` | 50,000원 |
| `periodMonths` | 1 |

`SUBSCRIPTION_PLANS` 배열(`src/services/supabaseClient.ts`)에 항목을 추가하는 것만으로 신규 플랜 확장 가능하도록 설계되어 있으나(코드 주석), 현재는 단일 월간 플랜만 운영 중이다.

### 2.5 관리자 화면 (`AdminSubscriptionsPage.tsx`)

- 전체 결제 내역 조회: `getAllPaymentsAdmin()` — `members!payments_member_id_fkey(name, company)`로 결제자 이름·소속을 조인 조회 (payments→members FK가 `member_id`/`confirmed_by` 2개라 PostgREST가 관계를 특정 못 해 FK명을 명시해야 했던 이력이 코드 주석에 남아 있음)
- 무통장입금 확인 액션: `confirmBankTransferPayment(paymentId, adminId)` 호출

---

## 3. 쿠폰(Coupon) — 문서 단위 다운로드 잠금해제

### 3.1 목적 및 성격

계정 단위 구독(Subscription)과는 **별개의 개념**이다. 제휴처(예: 퇴직공제단말기 신청, 이벤트 당첨)를 통해 발급된 코드 1개는 **완료된 계획서(Document) 1건**의 다운로드 잠금을 해제하는 용도로 사용되며, 계정 전체의 구독 상태를 바꾸지 않는다(`AdminCouponsPage.tsx` 안내 문구: "그 문서 1건을 계속 다운로드할 수 있습니다").

### 3.2 테이블: `public.coupons`

| 컬럼 | 코드 상 사용 방식 | 비고 |
|---|---|---|
| `id` | UUID PK | |
| `code` | 8자 랜덤 코드, 문자셋 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`(0/O, 1/I/L 등 혼동 문자 제외) | UNIQUE 제약(충돌 시 에러코드 `23505`로 재시도 로직 존재) |
| `status` | `'unused'` \| `'used'` \| `'revoked'` | |
| `source` | 발급 사유(프리셋: "퇴직공제단말기 신청", "이벤트 당첨", "직접입력" 또는 자유 텍스트) | |
| `document_id` | 사용(redeem) 시 연결된 `documents.id` | 미사용 시 NULL |
| `used_by` | 사용(redeem) 시 연결된 `members.id` | 미사용 시 NULL |
| `used_at` | 사용 시각 | |
| `created_at` | 발급 시각 | |

### 3.3 발급 경로 2가지

1. **관리자 수동 발급** (`AdminCouponsPage.tsx` → `generateCoupons(source, count)`): 관리자가 발급 사유와 수량(최대 100개)을 입력하면, 코드별로 QR 이미지(`qrcode` 라이브러리, `{origin}/documents?coupon={code}` URL 인코딩)를 함께 생성하여 카카오톡 등으로 전달 가능한 형태로 제공. CSV 내보내기(코드/상태/발급사유/발급일/사용회원/사용일/적용문서) 지원.
2. **외부 시스템 서버간 발급** (`issue-coupon` Edge Function): `allcaresolution.net`(퇴직공제단말기 신청/이벤트 페이지) 백엔드가 `X-Coupon-Secret` 헤더(공유 시크릿, `COUPON_ISSUE_SECRET`)로 인증하여 호출. **코드 주석에 따르면 allcaresolution.net 개발코드를 아직 인수하지 못해 실제 외부 연동은 미완료 상태이며, 이 함수는 향후 연동을 위해 선제적으로 준비된 것** `[결정 필요: allcaresolution.net 개발코드 인수 일정]`. 요청/응답 계약:
   ```
   POST /functions/v1/issue-coupon
   Headers: Content-Type: application/json, X-Coupon-Secret: <COUPON_ISSUE_SECRET>
   Body: { "source": "퇴직공제단말기 신청", "count": 1 }
   Response: { "ok": true, "codes": ["AB12CD34", ...] }
   ```
   최대 100개/요청(`MAX_COUNT`).

### 3.4 사용(Redeem) 경로

- 회원이 완료된 계획서의 다운로드 화면(`DocumentsPage.tsx`)에서 쿠폰 코드를 입력 → `redeemCoupon(code, documentId)` 호출 → PostgreSQL **SECURITY DEFINER 함수 `redeem_coupon(p_code, p_document_id)`**(RPC)를 실행.
- `redeem_coupon()` 함수의 실제 SQL 정의는 저장소에 없음(Supabase 대시보드에서 직접 생성) `[결정 필요: DDL을 export하여 이 문서 §3.4에 추가]`. 코드에서 유추 가능한 계약(contract)은 다음과 같다:
  - 코드가 유효하지 않거나 이미 사용됨 → 에러 메시지에 `INVALID_OR_USED_COUPON` 포함
  - 본인이 작성하지 않은 문서에 등록 시도 → 에러 메시지에 `FORBIDDEN_DOCUMENT` 포함
  - 성공 시 `coupons.status='used'`, `document_id`, `used_by`, `used_at` 갱신 (원자적 처리 — 코드 주석: "동시성 안전 + 본인 문서 검증을 원자적으로 수행")
  - SECURITY DEFINER로 구현된 이유: 회원 클라이언트가 `coupons` 테이블에 직접 UPDATE 권한이 없어도 안전하게 redeem 가능하도록 함
- 회원이 쿠폰으로 잠금해제한 문서 목록은 `getRedeemedCouponDocumentIds(memberId)`로 일괄 조회하여, 문서함 목록 렌더링 시 문서마다 개별 조회하지 않도록 함(Set 반환).

### 3.5 관리자 화면 (`AdminCouponsPage.tsx`)

| 컬럼 | 내용 |
|---|---|
| 코드 | 8자 쿠폰 코드 |
| 상태 | 미사용(warn) / 사용됨(success) / 취소됨(danger) |
| 발급사유 | source |
| 발급일 | created_at |
| 사용회원 | `members.name` (조인, `used_by` 기준) |
| 사용일 | used_at |
| 적용 문서 | `documents.title` (조인, `document_id` 기준) |

---

## 4. 엔티티 관계 요약

```
Member (1) ──── (0..1) Subscription ──── (1..N) Payment
Member (1) ──── (0..N) Document ──── (0..1) Coupon [document_id로 역참조]
Member (1) ──── (0..N) Coupon [used_by로 역참조, redeem 시점에만 연결]
```

---

## 5. Open Issues (요약)

- `subscriptions`/`payments`/`coupons` 테이블의 실제 DDL(제약조건, 인덱스, RLS 정책)이 저장소에 커밋되어 있지 않다. `contracts/rls-policies.sql`에도 반영 안 됨 — 보안 감사를 위해 실제 Supabase DDL을 export하여 `contracts/` 이하에 추가하는 작업이 필요하다.
- `redeem_coupon()` PostgreSQL 함수의 원자성·잠금 전략(예: `SELECT ... FOR UPDATE` 사용 여부)이 코드로 확인되지 않는다.
- 구독 만료(`status='expired'`) 전이를 수행하는 배치/크론이 코드베이스에 보이지 않는다 — SPEC-001의 "구독 만료 시 핵심 기능 차단"(FR-015) 요구사항을 실제로 강제하려면 만료 판단 로직이 프론트(단순 `end_date` 비교) 또는 백엔드 배치 중 어디에 있는지 확인·보완이 필요하다.
- 결제 실패/취소/환불 시 쿠폰 재사용, 구독 롤백 등 SRS Open Question과 동일한 이슈가 적용된다.

---

## Version History

### v1.0 (2026-09-12)
- 최초 작성. `src/services/supabaseClient.ts`, `confirm-toss-payment`, `issue-coupon` Edge Function, 관련 Admin/Subscription 페이지 코드를 근거로 구독·결제·쿠폰의 실제 배포 스키마와 흐름을 문서화. 기존 Phase 1 `data-model.md`/`schema.sql`과의 불일치를 명시.
