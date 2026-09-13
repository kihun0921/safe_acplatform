# Appendix C — UI 화면 명세 v1.0

> 본 문서는 `src/pages/*.tsx` 실제 구현을 근거로 각 화면의 목적·구성·데이터소스·사용자 액션을 정리한 UI 화면 명세이다. SRS 본문(§5 System Context, §6 Functional Requirements)의 화면 단위 상세 부속서로 사용한다.
>
> 표기 규칙: 실제 코드에서 확인된 사실은 그대로 서술하고, SRS/constitution.md/SPEC-001과 실제 구현이 어긋나는 부분은 **⚠ 스펙-구현 불일치**로 별도 표시한다(추측이 아니라 코드 확인 기반).

---

## 1. 공개 화면 (비회원 접근 가능)

### 1.1 LandingPage — 메인페이지 (기준선)

- **목적**: 비회원 대상 서비스 소개, 공고 미리보기, 가입 유도
- **섹션 순서(실제 코드)**: ① Hero(검색폼 + 플로팅 카드 애니메이션, "직접작성으로 시작하기" 링크) → ② `#announcements` 공고 미리보기(최대 20건) → ③ `#how-it-works` 이용방법 4단계(공고검색 → 요구사항 자동분석 → 단계별 작성 → 다운로드) → ④ 특징 하이라이트 3카드(실시간 나라장터 연동 / 양식 자동인식 / PDF·DOCX) → ⑤ CTA(7일 무료체험) → ⑥ Footer(회사정보, 약관/개인정보처리방침/고객센터/환불규정 링크)
- **데이터소스**: `useSupabaseAnnouncements(20)`
- **상태 처리**: loading / error / empty 각각 별도 처리
- **인터랙션**: 공고 쇼케이스 카드 3.5초 간격 자동 순환(`prefers-reduced-motion` 존중), `calcDday()`로 D-day 배지, 낙찰정보(awarded/winnerName/winnerAmount) 있으면 노출
- **⚠ 스펙-구현 불일치**: constitution.md Principle I이 기준선으로 명시한 섹션 목록은 "헤더, 히어로+검색, 공고 리스트, 이용방법 4단계, 특징 하이라이트, **내 문서함**, CTA, 푸터"이나, 실제 `LandingPage.tsx` 안에는 "내 문서함" 미리보기 섹션이 존재하지 않는다(공고 미리보기 섹션이 그 위치를 대체). 별도 `<header>`도 이 파일 내부에는 없음(공통 레이아웃 컴포넌트로 분리되어 있는지 별도 확인 필요). `[결정 필요: 기준선 재승인 또는 "내 문서함" 섹션 추가 여부 결정]`

### 1.2 LegalPage — 약관/정책 공개 페이지

- **목적**: 이용약관/개인정보처리방침/고객센터/환불규정 열람 (비회원 포함 전원 접근 가능)
- **구현 방식**: `slug` prop만 다른 공용 컴포넌트, `getSitePage(slug)` 조회 후 제목·최종수정일·본문을 렌더링
- **RLS**: `site_pages` 테이블은 anon SELECT 허용(로그인 전에도 약관 열람 가능해야 하므로)

### 1.3 NotFoundPage — 404

- 404 텍스트 + 홈으로 돌아가기 링크만 있는 단순 페이지. 인라인 style 사용(다른 페이지와 달리 별도 CSS 파일 없음).

### 1.4 LoginPage / SignupPage

| 화면 | 필드 | 특이사항 |
|---|---|---|
| LoginPage | 이메일, 비밀번호 | `useAuth().login` 호출, 에러 메시지 한글화(예: "Invalid login credentials" → 한글 안내), 성공 시 `/announcements`로 이동 |
| SignupPage | 이메일, 비밀번호, 담당자(name), **대표이사(ceoName)**, 회사명, 사업자등록번호, 연락처 | 필드별 required 검증만 있고, 전화번호/사업자번호 정규식 포맷 검증은 프론트 코드에서 확인되지 않음. `members` 행은 클라이언트가 직접 insert하지 않고 DB 트리거(`on_auth_user_created`, SECURITY DEFINER)가 `auth.signUp` 이후 자동 생성. 이메일 인증이 켜져 있으면 세션 없이 안내 메시지만 표시 |

- **⚠ 스펙-구현 불일치**: SPEC-001 FR-001은 "이메일, 비밀번호, 소속 건설사명, 사업자등록번호, 담당자명, 연락처"만 필수 항목으로 명시하나, 실제 `SignupPage.tsx`에는 스펙에 없는 **대표이사(ceo_name)** 필드가 추가로 존재한다. `[결정 필요: SPEC-001 FR-001 개정 또는 UI에서 제거 여부 결정]`

---

## 2. 회원 화면 (로그인 필요)

### 2.1 AnnouncementsPage — 공고 조회

- **목적**: 발주처 실공고 검색/필터 + 계획서 작성 시작(자동수집 공고 또는 수동입력 공고)
- **주요 섹션**:
  1. 검색 Input + 카테고리 필터 버튼(전체 + 공고 데이터에서 추출한 카테고리)
  2. **수동 시작(manual-start) 섹션**: 공사명(필수), 발주기관 선택, 공고문 PDF 첨부(선택) — LH 등 아직 자동 연동되지 않은 발주처의 공고를 회원이 직접 입력해 시작할 수 있도록 하는 경로
  3. 공고 카드 리스트: 카테고리·업종 배지, 발주처/마감일/상태/기초금액, 담당자, 낙찰정보, 원문 링크, "계획서 작성 시작" 버튼
- **데이터소스**: `useSupabaseAnnouncements()`(검색어 포함), `useSupabaseDocuments(user?.id).createDocument`, `useSubscriptionAccess().canCreateDocument`, `getMyDocumentTemplate`(회원 저장 템플릿 불러오기), `classifyConstructionType`/`buildRiskOverviewText`/`buildRiskRowsFromTemplate`(공사명 기반 공종 자동 추정), `extractBusinessOverviewFromText` + `extractTextFromPdfFile`(첨부 PDF 클라이언트측 텍스트 추출·사업개요 파싱)
- **주요 액션**: 카테고리 필터 클릭 / "계획서 작성 시작"(공고에 연결된 문서 생성) / "직접 입력해서 시작"(`announcement_id: null`로 문서 생성)
- **특이사항**: 무료체험 만료 시 `window.confirm`으로 구독 페이지 유도(`checkCanCreateDocument` 공통 로직). `#manual-start` 해시 진입 시 자동 스크롤. `?q=` 쿼리파라미터로 검색어 프리필.

### 2.2 DocumentWizardPage — 계획서 작성

- **목적**: 안전보건관리계획서 본문 작성
- **⚠ 스펙-구현 불일치**: SPEC-001 §Wizard Step Variability는 "Phase 1: 정확히 4단계 고정, 각 단계 상단에 1/4~4/4 진행 인디케이터"를 명시하나, 실제 구현은 **단계 전환형 마법사가 아니라 좌측 목차(TOC) + 앵커 스크롤 방식의 단일 연속 폼**이다. 좌측 목차 항목 클릭 시 `scrollToSection(id)`로 해당 섹션까지 스무스 스크롤하는 구조이며, "1/4" 같은 진행률 표시나 단계 이동 버튼은 존재하지 않는다. `[결정 필요: SPEC-001/SRS FR-008~010의 "마법사(4단계)" 표현을 실제 "TOC 기반 단일 폼" 구조에 맞게 개정할지, 혹은 향후 실제 단계형 UI로 재구현할지 결정]`
- **목차 구조(기본, 일반 발주처)**: Ⅰ.사업개요(표지/사업개요) → Ⅱ.안전보건관리체계(위험성평가/안전보건방침/산업재해예방활동 이행계획/안전보건관리조직) → Ⅲ.실행계획(안전점검 및 조치계획/안전보건교육계획/안전작업제도) → Ⅳ.운영관리(신호 및 연락체계/개인보호구 지급계획/위험물질 및 설비관리계획/비상대책) → Ⅴ.재해발생수준 → Ⅵ.기타사항(협의체 회의계획·청렴서약·적격업체 선정기준)
- **발주처별 목차 분기(FR-027 구현 사례)**: 문서의 `content.cover.agency === 'LH'`일 때 목차가 LH 실제 제출서식 구조(Ⅰ~Ⅷ장, "Ⅷ. 작업투입 인력 인적사항" 섹션 포함)로 전환된다. DOM 순서는 동일하게 유지되며 좌측 목차 라벨·장 번호와 다운로드 문서의 장 제목만 바뀐다.
- **섹션별 포함/제외 토글**: `toggleIncludedSection(key)`로 다음 섹션들을 발주처 요구사항에 따라 켜고 끌 수 있다 — 별첨 평가기준(appendixEvaluationCriteria), 별첨 사고유형(appendixAccidentTypes), 기계장비 매트릭스, 위험성 매트릭스, 실행계획, 작업허가제도, 신호/연락체계(signalContacts/signalSignals), 별첨 LOTO, 개인별 PPE 지급이력(ppeIndividualIssuance — LH 등 요구), 별첨 PPE 관리, 별첨 점검주기, LH 전용 작업투입 인력 인적사항(workerAssignmentLH). 각 토글 상단에 "발주처가 요구하지 않으면 해제" 안내 문구가 붙어 있다.
- **위험성평가 섹션**: 공종(constructionType) 선택 → 표준 위험성평가 항목 자동 채움. 평가방법 라디오(3단계 판단법 등). 참고파일 업로드 시 AI 자동 추출(`extractRiskItemsFromFile` → Edge Function `extract-risk-items` 경유로 추정) — 이미 입력된 항목이 있으면 덮어쓸지 confirm. "추가 항목 제안" 기능(`handleSuggestMoreItems`) 포함.
- **사업개요 섹션**: 공고 연결 시 공고 데이터로 자동 채움 + 첨부 PDF 텍스트 추출(`extractBusinessOverviewFromText`, AnnouncementsPage의 수동입력과 동일 유틸 공유). 서버측 Edge Function `extract-business-overview`도 별도 존재.
- **자동저장**: 이 페이지가 직접 구현하지 않고 `src/hooks/useSupabaseDocuments.ts`의 `saveContent()`가 **15초 디바운스**로 `updateDocumentContent`를 호출(Supabase `documents` 테이블 갱신) — SPEC-001 §Auto-Save Strategy(15초)와 일치.
- **다운로드**: `exportToPDF`/`exportToDOCX`(`utils/documentExport`) 호출, `buildExportContent`로 첨부파일(서명 URL 포함)을 조합한 뒤 파일명을 sanitize하여 생성.
- **비상대응 섹션**: 공종별 사고유형(추락/감전/질식/붕괴) 매핑에 따라 예시 대응절차를 자동 표시.
- **기타**: "무재해 확인" 체크(`toggleNoAccidentConfirm`), 완료율 계산(`calcPercentComplete` — cover/overview/risk 등 필드 존재 여부 기반).

### 2.3 DocumentsPage — 내 문서함

- **목적**: 작성중/완료 계획서 목록 관리 및 다운로드
- **섹션**: 상단 필터 탭(전체/작성중/완료, 각 건수 표시) + 검색(제목/발주처) + 테이블(번호/제목/발주처/첨부파일 건수/최근 저장일시/상태배지/다운로드/계속작성 또는 보기/삭제)
- **데이터소스**: `useSupabaseDocuments(user?.id)`, `useSubscriptionAccess().canDownload`, `getRedeemedCouponDocumentIds`(쿠폰으로 개별 잠금해제된 문서 Set), `getSignedFileUrl`, `exportToPDF`/`exportToDOCX`
- **주요 액션**: PDF/DOCX 다운로드(구독 없고 쿠폰 미등록 시 버튼이 "구독하기"로 대체), "쿠폰 등록"(`CouponRedeemModal`, 미해제 문서에만 노출), 삭제(confirm 후 첨부파일 포함 삭제), 계속작성/보기(위저드로 이동)
- **특이사항**: URL `?coupon=` 딥링크로 진입 시 localStorage에 임시 저장된 코드(`pendingCouponCode`)를 이 페이지 도달 시 자동으로 모달에 프리필해 등록을 유도(쿠폰 QR 스캔 플로우 지원, §Appendix B 참조)

### 2.4 MyPage — 마이페이지

- **목적**: 회원 프로필 열람/수정, 비밀번호·이메일 변경, 로그아웃
- **표시 항목**: 담당자(name), 대표이사(ceo_name), 이메일, 회사명(company), 사업자등록번호(registration_number), 연락처(phone), 권한(role, 읽기 전용)
- **수정 가능 범위**: 담당자/대표이사/회사명/사업자등록번호/연락처(자유 텍스트 Input, 클라이언트측 포맷 정규식 검증 없음). 이메일 변경은 Supabase Auth `updateUser({email})` 확인메일 발송 방식(즉시 반영 아님). 비밀번호 변경은 8자 이상 + 확인 일치 검증 후 `updateUser({password})`.
- **비고**: 회원 템플릿 저장(`document_templates`) 기능은 이 파일에서 직접 구현되어 있지 않고, `AnnouncementsPage`(불러오기)·`DocumentWizardPage`(저장 트리거 추정) 쪽에 위치한다. 권한(role)은 이 화면에서 읽기 전용이며, 관리자 승격/강등은 `AdminMembersPage`에서만 가능하다.

### 2.5 InquiriesPage — 문의(Q&A)

- **⚠ 스펙-구현 불일치(중요)**: 이 화면은 **아직 Mock 데이터(`MOCK_INQUIRIES`)로만 동작**하며 Supabase 연동이 되어 있지 않다. 목록/작성 폼 모두 로컬 React state로만 유지되어 새로고침하면 사라진다. 관리자가 답변을 작성하는 UI 자체가 존재하지 않으며, 답변은 읽기 전용(`inq.answer`)으로만 노출된다. **SRS FR-016~FR-019(문의 작성/관리자 답변권한/답변 후 수정·삭제 잠금)는 현재 프론트엔드 레벨에서 실질적으로 미구현 상태다.** `[결정 필요: 우선순위를 정해 Supabase 연동 + 관리자 답변 UI 구현 필요]`
- **UI 구성(현재)**: 문의 작성 토글 폼(제목 + 내용, `Textarea maxLength=1000`), 카드 리스트(상태배지 답변완료/대기중, 답변 여부에 따라 관리자 답변 블록 노출, 작성일/답변일)

### 2.6 SubscriptionPage — 구독 관리

> 상세 데이터 흐름은 Appendix B §2.3 참조.

- **섹션**: 구독 상태 카드(뱃지 + 만료일) → 플랜 카드(월간 구독 50,000원, "카드로 결제"/"무통장입금 신청" 버튼) → 무통장입금 폼(계좌 안내 + 입금자명 입력, 조건부 노출) → 결제 내역 테이블(플랜/금액/수단/상태/신청일)
- **특이사항**: 토스 결제창 리다이렉트 복귀 시 쿼리파라미터(`paymentKey`, `orderId`, `amount`)를 감지해 `confirm-toss-payment` 자동 호출, 처리 중 전용 로딩 문구("결제 승인을 확인하는 중입니다...") 표시. 계좌 정보(우리은행 1005-804-614327, 예금주 올케어솔루션 주식회사)는 코드 주석상 **플레이스홀더이며 실제 계좌로 교체 필요**.

---

## 3. 관리자 화면 (role='admin' 필요)

### 3.1 AdminDashboardPage

- **운영 지표(7종)**: 전체 회원 / 활성 회원(status='active') / 전체 계획서 / 작성중 계획서 / 완료 계획서 / 전체 공고 / 미답변 문의(status='open') 카운트
- **패널**: 최근 가입 회원 5건, 최근 작성된 계획서 5건(상태배지 포함), API 연동 현황(마지막 동기화 시각 — `sync_log` 최신 1건, `AdminApiSyncPage`와 동일 소스)
- **참고**: `members.status`(active/inactive/suspended)는 `AdminMembersPage`와 동일 필드 기준이며, 구 `data-model.md`의 `subscription_status`와는 별개 필드다.

### 3.2 AdminMembersPage

- **표시 필드**: 담당자(name), 대표이사(ceo_name), 이메일, 회사명, 연락처, 권한(배지: 관리자/일반회원), 상태(배지: 활성/비활성/중지)
- **액션**: `handleToggleRole`(member ↔ admin 역할 전환, confirm 필수), `handleDelete`(FK 제약으로 실패 시 안내 메시지 분기)
- **⚠ 스펙-구현 불일치**: SPEC-001 Assumptions는 "회원의 관리자 승격 절차는 이번 범위에 포함하지 않는다"(관리자는 별도 발급)고 명시하나, 실제 `AdminMembersPage.tsx`에는 **기존 회원을 관리자로 승격/강등하는 `handleToggleRole` 기능이 구현되어 있다.** `[결정 필요: SPEC-001/SRS FR-020 개정(승격 절차를 정식 범위로 인정) 또는 UI 기능 제거 중 정책 결정 필요 — 보안 관점에서 회원 자기 자신을 관리자로 전환하지 못하도록 하는 별도 안전장치가 있는지도 확인 필요]`

### 3.3 AdminApiSyncPage

> 상세는 Appendix A §3 참조. 발주처별 연동 상태 테이블(발주처명/범위/설명/보유 건수/상태) + "지금 동기화" 액션 + 최근 동기화 결과·오류 표시.

### 3.4 AdminSubscriptionsPage

- **목적**: 전체 결제내역 조회 + 무통장입금 수동 확인
- **표시**: 회원명(+회사), 플랜, 금액, 수단(카드/무통장입금), 입금자명, 상태배지(완료/대기/실패/취소), 신청일
- **액션**: "입금 확인"(무통장입금 + `pending` 상태에만 노출) → `confirmBankTransferPayment(paymentId, adminId)` 호출. 카드결제는 이 화면에서 별도 액션 없음(토스 콜백으로 자동 처리).
- **데이터소스**: `getAllPaymentsAdmin()`(`payments` → `members!payments_member_id_fkey` 조인 — FK가 `member_id`/`confirmed_by` 2개라 PostgREST 관계가 모호해서 FK명을 명시해야 했던 이력이 코드 주석에 남아 있음)

### 3.5 AdminCouponsPage

> 상세는 Appendix B §3.5 참조. 쿠폰 발급 폼(발급사유 프리셋/직접입력, 수량 최대 100) + 발급 직후 QR/코드 카드 그리드(코드 복사, QR 저장) + 전체 쿠폰 이력 테이블(코드/상태/발급사유/발급일/사용회원/사용일/적용문서) + CSV 내보내기.

### 3.6 AdminSitePagesPage

- **목적**: 공개 약관/정책 페이지 콘텐츠(제목 + 본문) 편집
- **편집 대상**: `getAllSitePages()`로 `site_pages` 테이블 전체 행을 동적 로드(슬러그를 코드에 하드코딩하지 않음). 시드 데이터 기준 현재 등록된 slug는 `terms`(이용약관), `privacy`(개인정보처리방침), `customer-service`(고객센터), `refund-policy`(환불규정) 4종.
- **액션**: 슬러그별 Title/Textarea(14행) 편집 후 개별 저장(`updateSitePage`), 저장 성공 시 "저장됨" 표시.

---

## 4. 화면-요구사항 매핑 요약

| 화면 | 관련 FR |
|---|---|
| LoginPage / SignupPage | FR-001~FR-003 |
| AnnouncementsPage | FR-005~FR-007, FR-023~FR-024 |
| DocumentWizardPage | FR-008~FR-010, FR-026~FR-027 |
| DocumentsPage | FR-004, FR-011, FR-030 |
| SubscriptionPage | FR-014~FR-015, FR-028 |
| InquiriesPage | FR-016~FR-019 (⚠ 프론트엔드 미구현, §2.5 참조) |
| MyPage | FR-004(자기 데이터 조회·수정 범위) |
| AdminDashboardPage | FR-032 |
| AdminMembersPage | FR-012, FR-020(⚠ 승격 기능 불일치, §3.2 참조) |
| AdminApiSyncPage | FR-007, FR-013, FR-021, FR-023, FR-025 |
| AdminSubscriptionsPage | FR-014, FR-028 |
| AdminCouponsPage | FR-029 |
| AdminSitePagesPage / LegalPage | FR-031 |

---

## 5. Open Issues (SRS §10에 반영 필요한 신규 발견)

1. **DocumentWizardPage 구조 불일치**: "4단계 고정 마법사" 스펙 표현과 실제 "TOC 기반 단일 연속 폼" 구현이 다르다 (§2.2).
2. **InquiriesPage 미구현**: 문의 기능이 Mock 데이터로만 동작하며 Supabase 연동·관리자 답변 UI가 없다 (§2.5).
3. **AdminMembersPage 승격 기능**: SPEC-001 Assumptions와 배치되는 관리자 승격/강등 UI가 실제로 존재한다 (§3.2).
4. **SignupPage 필드 초과**: SPEC-001 FR-001에 없는 "대표이사" 필드가 실제 가입 폼에 존재한다 (§1.4).
5. **LandingPage "내 문서함" 섹션 부재**: constitution.md Principle I 기준선과 실제 구현이 다르다 (§1.1).

---

## Version History

### v1.0 (2026-09-12)
- 최초 작성. `src/pages/*.tsx` 실제 구현 조사를 근거로 전체 화면 명세 및 SPEC-001/constitution.md와의 불일치 5건을 문서화.
