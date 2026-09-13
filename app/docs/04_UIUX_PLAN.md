# UI/UX Plan v1.1

> 본 문서는 `docs/01_PRD.md`, `docs/02_SRS_BASELINE.md`, `docs/03_UI_COVERAGE_ANALYSIS.md`(이하 03번 문서)와, 디자인 자산(`design/app/*.dc.html`, `design/main-page/*.dc.html`, `design/visual-directions/*.dc.html`) 및 재구현 대상 코드베이스(`app/`, Next.js 16 스캐폴드 상태)를 종합하여, Next.js(`app/`) 재구현의 **UI/UX 실행 계획**을 수립한다.
>
> **v1.1 변경 요지**: v1.0에서 식별된 "디자인 시안이 없는 화면 7개"를 본 개정에서 `design/app/*.dc.html`에 신규 작성하여 해소했다. 그 결과 03번 문서의 화면 인벤토리(17개 코드 화면 + 신규 2개) **19개 전 화면에 디자인 시안이 1:1로 확보**되었다. v1.1은 이 완료 상태를 반영하고, 그 다음 단계인 Next.js 구현 실행 계획(디자인→코드 전환 계획)을 추가로 수립한다.

---

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 문서명 | UI/UX Plan |
| 문서 ID | SRS-ACPLATFORM-004 |
| 버전 | v1.1 |
| 이전 버전 | v1.0(2026-09-12) — 시안 공백 7건 식별 |
| 기반 문서 | `docs/01_PRD.md`, `docs/02_SRS_BASELINE.md`, `docs/03_UI_COVERAGE_ANALYSIS.md`, `design/app/*`, `design/main-page/*`, `design/visual-directions/*`, `app/src/app/*`(현재 Next.js 스캐폴드) |
| 상태 | Draft |
| 작성일 | 2026-09-12 |
| Owner | Product & Engineering |

---

## 2. 목적

- v1.0은 디자인 시안(16개 아트보드)과 코드 화면 인벤토리(19개 목표)를 대조해 **7개 화면의 시안 공백**을 식별했다.
- v1.1은 (1) 그 7개 화면의 시안을 기존 디자인 시스템(토큰·헤더 패턴·컴포넌트 관용구)을 그대로 준용하여 신규 작성해 공백을 해소하고, (2) 그 결과로 확정된 "시안 100% 확보" 상태를 문서화하며, (3) 이제 남은 실제 작업 — Next.js(`app/`) 코드 구현 — 을 위한 후속 실행 계획(디자인 토큰 이식, 컴포넌트 추출, 라우팅 설계, 데이터 연동 순서, QA/롤아웃)을 수립한다.

---

## 3. 신규 작성한 디자인 시안 (7개, 이번 개정)

기존 아트보드의 헤더 구조(회원용 sticky 라이트 헤더 / 관리자용 네이비 헤더), 공용 토큰(oklch 컬러, Noto Serif KR/Noto Sans KR), 카드·배지·탭·테이블 관용구를 그대로 재사용하여 작성했다.

| 신규 파일 | 대응 코드 화면 | 재사용한 기존 패턴 | 추가로 설계한 것 |
|---|---|---|---|
| `DocumentWizard.dc.html` | DocumentWizardPage | 회원 헤더(`MyDocuments.dc.html`), 배지·토글 스타일 | 좌측 sticky TOC + 우측 연속 스크롤 6개 대장(Ⅰ~Ⅵ), 발주처 선택(일반/LH) 전환 시 목차·섹션이 Ⅷ까지 확장되는 구조, 12개 섹션 포함/제외 토글 스위치, 위험성평가 AI 자동추출 버튼, 자동저장 상태 표시, 상단 PDF/DOCX 다운로드 |
| `AnnouncementList.dc.html` | AnnouncementsPage | `Main.dc.html`의 공고 카드·카테고리 필터·검색바 | 전용 목록 페이지로 독립, "수동 시작"(발주처 미연동 공고 직접 입력) 섹션 |
| `Subscription.dc.html` | SubscriptionPage(회원용) | `SubscriptionBilling.dc.html`(관리자용)의 결제 이력 테이블 패턴 | 구독 상태 카드, 플랜 카드(카드결제/무통장입금 버튼), 무통장입금 폼 토글 |
| `CouponManagement.dc.html` | AdminCouponsPage | 관리자 헤더·테이블 패턴(`ApiCredentials.dc.html`) | 발급 폼(프리셋/직접입력 사유, 수량), 발급 직후 QR/코드 카드 그리드, 전체 이력 테이블 |
| `SitePages.dc.html` | AdminSitePagesPage | 관리자 헤더, `InquiryManagement.dc.html`의 탭 패턴 | 슬러그별(terms/privacy/customer-service/refund-policy) 탭 전환 + 제목/본문 편집 폼 |
| `Legal.dc.html` | LegalPage | 공개 페이지 헤더(`LoginGuide.dc.html`류) | 단순 텍스트 조항 레이아웃 |
| `NotFound.dc.html` | NotFoundPage | 공개 페이지 헤더 | 최소 404 안내 |

**추가 조치**: 기존 관리자 화면 5개(`AdminDashboard`, `MemberManagement`, `ApiCredentials`, `SubscriptionBilling`, `InquiryManagement`)의 상단 내비게이션에 신규 항목 "쿠폰관리"·"사이트관리" 링크를 추가하여, 관리자 화면 전체(7개)의 내비게이션이 다시 일관되도록 동기화했다. `design/app/canvas.json`에도 7개 아트보드를 `page-member`/`page-admin` 그룹에 추가하고, `LegalPage`·`NotFoundPage`를 위한 `page-public` 그룹을 신설했다.

---

## 4. 디자인 시안 커버리지 — 최종 확인 (19/19)

| 코드 화면(03번 문서 인벤토리) | 디자인 시안 | 상태 |
|---|---|---|
| LandingPage | Main.dc.html | 기존 |
| LoginPage | Login.dc.html | 기존 |
| SignupPage | Signup.dc.html | 기존 |
| DocumentsPage | MyDocuments.dc.html | 기존 |
| MyPage | MyPage.dc.html | 기존 |
| InquiriesPage | InquiryList.dc.html (+ InquiryDetail.dc.html) | 기존 |
| AdminDashboardPage | AdminDashboard.dc.html | 기존(내비 갱신) |
| AdminMembersPage | MemberManagement.dc.html | 기존(내비 갱신) |
| AdminApiSyncPage | ApiCredentials.dc.html | 기존(내비 갱신) |
| AdminSubscriptionsPage | SubscriptionBilling.dc.html | 기존(내비 갱신) |
| AdminLoginPage(신규 라우트, FR-020) | AdminLogin.dc.html | 기존 |
| AdminInquiriesPage(신규 라우트, FR-017) | InquiryManagement.dc.html | 기존(내비 갱신) |
| **DocumentWizardPage** | **DocumentWizard.dc.html** | **신규 작성** |
| **AnnouncementsPage** | **AnnouncementList.dc.html** (+ AnnouncementDetail.dc.html 기존) | **신규 작성** |
| **SubscriptionPage(회원용)** | **Subscription.dc.html** | **신규 작성** |
| **AdminCouponsPage** | **CouponManagement.dc.html** | **신규 작성** |
| **AdminSitePagesPage** | **SitePages.dc.html** | **신규 작성** |
| **LegalPage** | **Legal.dc.html** | **신규 작성** |
| **NotFoundPage** | **NotFound.dc.html** | **신규 작성** |

**결론: 목표 화면 19개 전체가 디자인 시안을 1:1로 확보했다.** 상태/컴포넌트로 유지되는 `LoginGuide.dc.html`(FR-003 비보호 접근 안내), `SubscriptionGuide.dc.html`(FR-015 구독 유도 안내)은 여전히 독립 라우트가 아닌 공용 컴포넌트로 취급한다(§4.1, v1.0과 동일).

---

## 5. 다음 단계 — Next.js(`app/`) 구현 실행 계획

시안이 갖춰졌으므로, 이제 실제 코드 전환이 남은 작업이다. 아래는 시안 이후 단계의 실행 계획이다.

### 5.1 Phase 0 — 디자인 시스템 이식 (선행 필수, v1.0과 동일 — 아직 미착수)

1. `design/app/*.dc.html` 공용 토큰(oklch 컬러 전체, `--font-display`/`--font-body`)을 `app/src/app/globals.css`의 Tailwind 4 `@theme` 블록으로 이식
2. `next/font`로 Noto Serif KR / Noto Sans KR 로드
3. 상태 배지(성공/대기/오류 soft-fill), 탭 스위치, 토글 스위치(§5.4 참조) 등 dc.html에서 반복 확인된 관용구를 공용 컴포넌트로 선구현

### 5.2 Phase 1 — 공용 레이아웃/컴포넌트 추출

19개 시안을 검토한 결과 아래 공용 요소가 명확히 식별된다. 화면별 개별 구현 전에 먼저 추출한다.

| 공용 요소 | 근거(반복 확인된 파일 수) | 구현 위치(안) |
|---|---|---|
| 회원용 헤더(로고+nav+프로필+로그아웃+모바일 드로어) | 8개 시안(Main, MyDocuments, InquiryList, AnnouncementList, Subscription, DocumentWizard 등) 동일 마크업 반복 | `app/src/components/member/Header.tsx` |
| 관리자용 헤더(네이비, 7개 nav) | 7개 관리자 시안 동일 마크업 반복 | `app/src/components/admin/AdminHeader.tsx` |
| 상태 배지(success/warn/danger soft-fill) | 전 시안 공통 | `app/src/components/ui/StatusBadge.tsx` |
| 탭 스위치(진행중/완료, 전체/대기/완료 등) | MyDocuments, InquiryManagement, SitePages 등 | `app/src/components/ui/SegmentedTabs.tsx` |
| 토글 스위치(발주처별 섹션 포함/제외) | DocumentWizard 전용이나 재사용 가능성 높음 | `app/src/components/ui/ToggleSwitch.tsx` |
| 안내 인터스티셜(로그인/구독 유도) | LoginGuide, SubscriptionGuide | `app/src/components/guards/AccessGuide.tsx`(§4.1) |

### 5.3 Phase 2 — 라우트 매핑 및 구현 우선순위

`PROJECT_SCOPE.md`의 IMPLEMENT 우선순위와 SRS §7.5 골든 패스 성능 목표를 근거로 순서를 정한다. 이제 전 화면이 시안을 갖췄으므로 v1.0의 "시안 있음/없음" 구분은 더 이상 우선순위 기준이 아니며, **골든 패스 위치 + PROJECT_SCOPE P0/P1 지정**만을 기준으로 재정렬한다.

| 우선순위 | 라우트(안) | 화면 | 근거 |
|---|---|---|---|
| P0 | `/` | LandingPage | 골든 패스 진입점, FR-022 반응형 내비게이션의 기준 화면 |
| P0 | `/login`, `/signup` | LoginPage/SignupPage | 골든 패스, FR-001~002 |
| P0 | `/admin/login` | AdminLoginPage | FR-020 관리자 로그인 경로 분리 |
| P0 | `/announcements` | AnnouncementsPage | 골든 패스, FR-005~007 |
| **P0** | `/documents/[id]/wizard` | **DocumentWizardPage** | 골든 패스 핵심 체류 화면(SRS §7.5: 10분 이내 작성 완료 목표). 가장 복잡하므로 다른 화면과 병행하여 최우선 착수 |
| P1 | `/documents` | DocumentsPage | 골든 패스 종착점(다운로드) |
| P1 | `/my-page` | MyPage | — |
| P1 | `/inquiries` | InquiriesPage | PROJECT_SCOPE §2.6: Mock→실연동 P0 결정 사항 |
| P1 | `/admin`, `/admin/members`, `/admin/api-sync`, `/admin/subscriptions`, `/admin/inquiries` | Admin* | 운영 필수 화면 |
| P2 | `/subscription` | SubscriptionPage | — |
| P2 | `/admin/coupons`, `/admin/site-pages` | AdminCouponsPage/AdminSitePagesPage | — |
| P3 | `/legal/[slug]`, `/404`(Next.js `not-found.tsx`) | LegalPage/NotFoundPage | 낮은 복잡도, 언제든 착수 가능 |

### 5.4 Phase 3 — DocumentWizardPage 세부 구현 계획 (최고 복잡도 화면)

`DocumentWizard.dc.html` 시안을 코드로 옮길 때 특히 유의할 점:

- **TOC 스크롤 스파이**: 시안은 클릭 시 상태 전환으로 활성 TOC 항목을 표시하는 단순화된 프로토타입이다. 실제 구현에서는 `IntersectionObserver` 기반 스크롤 스파이로 대체해야 한다(레거시 `scrollToSection(id)` 로직 참고, Appendix C §2.2).
- **발주처별 목차 분기**: 시안의 "발주처 선택 드롭다운"은 프로토타입 편의 장치다. 실제로는 `document.content.cover.agency` 값에 따라 서버에서 내려온 데이터로 자동 결정되어야 하며, 사용자가 임의로 전환하는 UI가 아니다.
- **12개 토글 상태**: `document.step_data`(JSONB)에 섹션별 포함 여부를 영속화해야 하며, 15초 자동저장(FR-010)과 함께 저장되어야 한다.
- **AI 자동추출 버튼**: 시안은 클릭 즉시 결과가 채워지는 것으로 단순화했으나, 실제로는 `extract-risk-items` Edge Function 호출 → 로딩 상태 → 기존 입력 덮어쓰기 confirm(Appendix C §2.2 `handleSuggestMoreItems` 참고) 흐름이 필요하다.

### 5.5 Phase 4 — QA/롤아웃 체크리스트

| 항목 | 검증 방법 |
|---|---|
| 디자인 토큰 일치 | 구현된 각 화면을 대응 `.dc.html`과 나란히 놓고 컬러·타이포·간격 diff 확인 |
| 반응형 | 375 / 768 / 1440px 스냅샷(PROJECT_SCOPE §5 검사 전략과 동일 기준) |
| 관리자 내비게이션 7항목 일관성 | 7개 관리자 화면 모두 동일한 nav 순서·라벨 노출 확인 |
| DocumentWizardPage 골든 패스 | 공고 선택 → 계획서 작성 10분 이내 완료(SRS §7.5) 수동 측정 |
| 접근 제어 | 비회원 보호화면 차단(FR-003), 회원↔관리자 라우트 분리(FR-020) E2E |

---

## 6. 남은 열린 질문 (v1.0에서 이월, 시안 작업으로는 해소되지 않음)

### 6.1 AnnouncementDetail / InquiryDetail 라우팅 구조 미정

- 시안(`AnnouncementDetail.dc.html`, `InquiryDetail.dc.html`)은 "상세 페이지" 형태이나, 레거시 코드(Appendix C)는 리스트 내 인라인 확장 구조였다. `[결정 필요: 별도 라우트(`/announcements/[id]`, `/inquiries/[id]`) 신설 여부는 여전히 미정 — 시안 작성 단계에서는 판단 근거가 추가되지 않았으므로 구현 착수 전 별도 결정 필요]`

### 6.2 Direction B(모던 미니멀 SaaS) 잔존 여부

- v1.0과 동일. `visual-directions/DirectionB.dc.html`은 참고용으로 남아 있으며 본 문서 범위 밖의 운영 판단 사항이다.

---

## 7. Version History

### v1.1 (2026-09-12)
- v1.0에서 식별된 시안 공백 7개 화면(DocumentWizardPage, AnnouncementsPage, SubscriptionPage, AdminCouponsPage, AdminSitePagesPage, LegalPage, NotFoundPage)의 디자인 시안을 `design/app/*.dc.html`에 기존 디자인 시스템(토큰·헤더·컴포넌트 관용구)을 준용하여 신규 작성. 관리자 화면 5개의 내비게이션에 신규 항목(쿠폰관리/사이트관리)을 반영해 7개 관리자 화면 전체를 동기화. `canvas.json`에 7개 아트보드 등록 및 `page-public` 그룹 신설. 그 결과 목표 화면 19개 전체가 디자인 시안을 확보했음을 확인(§4). Next.js 구현을 위한 후속 실행 계획(공용 컴포넌트 추출, 라우트 우선순위, DocumentWizardPage 세부 구현 유의사항, QA 체크리스트)을 신규로 수립(§5). AnnouncementDetail/InquiryDetail 라우팅 구조 미정 건은 시안 작성만으로는 해소되지 않아 열린 질문으로 이월(§6).

### v1.0 (2026-09-12)
- 최초 작성. `design/app/*.dc.html`(16개 아트보드) 및 `design/visual-directions/*`를 03번 문서의 코드 화면 인벤토리(17개)와 전수 대조. Direction A 채택 확정 확인, 03번 문서의 커버리지 갭 2건(AdminLogin/InquiryManagement)이 이미 시안 존재로 해소됨을 확인, DocumentWizardPage를 포함한 시안 부재 화면 7개를 식별하고 Phase 0~3 실행 계획 및 우선순위를 수립.
