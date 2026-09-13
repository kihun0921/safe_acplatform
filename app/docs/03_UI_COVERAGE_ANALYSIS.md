# UI Coverage Analysis v1.0

> 본 문서는 `docs/02_SRS_BASELINE.md`(이하 SRS)의 기능 요구사항(FR-001~FR-032) 전체를 유지한 채, 각 요구사항이 **어느 화면(Screen)에 배치되는지**를 검증하는 커버리지 분석 문서이다.
>
> 근거: `docs/SRS_Appendix_C_UI_Screen_Spec_v1_0.md`(레거시 코드베이스 조사 기준 화면 인벤토리), `docs/PROJECT_SCOPE.md`(Next.js(`app/`) 재구현 시 IMPLEMENT/EXCLUDED 결정).
>
> 표기 규칙: 화면은 근거 문서에 실제로 존재가 확인된 것만 인벤토리에 포함한다. 요구사항은 있으나 화면이 없는 경우 **⚠ 커버리지 갭**으로 별도 표시한다.

---

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 문서명 | UI Coverage Analysis |
| 문서 ID | SRS-ACPLATFORM-003 |
| 버전 | v1.0 |
| 기반 문서 | `docs/02_SRS_BASELINE.md`, `docs/SRS_Appendix_C_UI_Screen_Spec_v1_0.md`, `docs/PROJECT_SCOPE.md` |
| 상태 | Draft |
| 작성일 | 2026-09-12 |
| Owner | Product & Engineering |

---

## 2. 목적 및 방법론

- SRS는 "무엇을 만족해야 하는가"(FR-001~FR-032)를 다루고, Appendix C는 "레거시 코드에 실제로 어떤 화면이 존재하는가"를 다룬다. 두 문서는 각각 별도로 작성되어, **FR이 화면 단위로 빠짐없이 배치되어 있는지**를 교차 검증한 적이 없었다.
- 본 문서는 (1) 현재 존재가 확인된 화면 수를 확정하고, (2) FR-001~FR-032 전 항목을 화면에 매핑하며, (3) 매핑되지 않는 FR(커버리지 갭)을 찾아내고, (4) `PROJECT_SCOPE.md`의 IMPLEMENT/EXCLUDED 결정이 화면 배치에 미치는 변화(신규 화면 필요 여부 포함)를 반영한다.
- SRS 본문(FR 번호·문구)은 변경하지 않는다. 본 문서는 배치 관점의 부속 분석이며, FR 자체의 개정은 SRS 개정판에서 다룬다.

---

## 3. 현재 화면(Screen) 인벤토리

> Appendix C(레거시 `src/pages/*.tsx` 조사) 기준. 총 **17개** 화면이 확인되며, 모든 화면에 공통으로 적용되는 Header/Nav 컴포넌트(FR-022 반응형 내비게이션)는 개별 화면으로 카운트하지 않는다.

### 3.1 공개 화면 (비회원 접근 가능) — 5개

| # | 화면 | 근거 |
|---|---|---|
| 1 | LandingPage | Appendix C §1.1 |
| 2 | LegalPage | Appendix C §1.2 |
| 3 | NotFoundPage | Appendix C §1.3 |
| 4 | LoginPage | Appendix C §1.4 |
| 5 | SignupPage | Appendix C §1.4 |

### 3.2 회원 화면 (로그인 필요) — 6개

| # | 화면 | 근거 |
|---|---|---|
| 6 | AnnouncementsPage | Appendix C §2.1 |
| 7 | DocumentWizardPage | Appendix C §2.2 |
| 8 | DocumentsPage | Appendix C §2.3 |
| 9 | MyPage | Appendix C §2.4 |
| 10 | InquiriesPage | Appendix C §2.5 |
| 11 | SubscriptionPage | Appendix C §2.6 |

### 3.3 관리자 화면 (role='admin' 필요) — 6개

| # | 화면 | 근거 |
|---|---|---|
| 12 | AdminDashboardPage | Appendix C §3.1 |
| 13 | AdminMembersPage | Appendix C §3.2 |
| 14 | AdminApiSyncPage | Appendix C §3.3 |
| 15 | AdminSubscriptionsPage | Appendix C §3.4 |
| 16 | AdminCouponsPage | Appendix C §3.5 |
| 17 | AdminSitePagesPage | Appendix C §3.6 |

### 3.4 이번 분석에서 신규로 필요성이 확인된 화면 (아직 인벤토리에 없음)

| 후보 화면 | 근거 |
|---|---|
| **AdminInquiriesPage(가칭)** — 관리자 문의 답변 화면 | PROJECT_SCOPE §2.6 "관리자 답변 작성 — 관리자 전용 답변 폼 신규 구현(레거시에 UI 자체가 없었음)"에 해당하는 화면이 위 17개 인벤토리 어디에도 없음. FR-017~FR-019를 실제로 충족하려면 신규 화면(또는 InquiriesPage 내 관리자 전용 뷰 분기)이 필요하다. §6.1 참조. `[결정 필요: 독립 화면으로 신설할지, InquiriesPage에 role 분기로 통합할지]` |
| **AdminLoginPage(가칭)** — 관리자 전용 로그인 경로 | FR-020 및 PROJECT_SCOPE §2.1은 "관리자 로그인 경로를 회원과 분리(`/admin/login`)"라고 명시하나, Appendix C 화면 인벤토리에는 LoginPage 1개만 존재하고 관리자 전용 로그인 화면이 별도로 확인되지 않는다. §6.1 참조. `[결정 필요: 신규 화면 신설 여부, 혹은 LoginPage 내 라우트 분기로 대체 가능한지 확인]` |

> 위 2건을 포함하면 목표 인벤토리는 **17 + 2(신규) = 19개**가 된다. 단, 신규 2건은 아직 설계 확정 전이므로 §6에서 별도 관리한다.

---

## 4. 화면별 FR 배치

> `PROJECT_SCOPE.md`의 IMPLEMENT/EXCLUDED 결정을 반영하여, 각 화면에 배치되는 FR과 배치 시 유의사항(정책 변경·스펙 표현 정정 등)을 정리한다.

### 4.1 공개 화면

| 화면 | 배치 FR | 비고 |
|---|---|---|
| LandingPage | FR-022(반응형 내비게이션 진입점) | PROJECT_SCOPE §2.8: 레거시에 없던 "내 문서함" 섹션 추가 필요(누락 보강) — constitution.md Principle I 기준선 준수 |
| LegalPage | FR-031(사이트 페이지 공개 열람) | AdminSitePagesPage에서 편집한 콘텐츠의 공개 노출 지점 |
| NotFoundPage | (해당 FR 없음, 공통 UX) | — |
| LoginPage | FR-002, FR-003(비보호 상태 안내), FR-020(회원 로그인 경로) | 관리자 로그인 경로 분리(FR-020)는 §3.4 신규 화면 이슈와 연결 |
| SignupPage | FR-001 | PROJECT_SCOPE §2.1: SRS에 없던 "대표이사(ceo_name)" 필드를 FR-001에 정식 반영하기로 결정 완료(더 이상 결정 필요 아님) |

### 4.2 회원 화면

| 화면 | 배치 FR | 비고 |
|---|---|---|
| AnnouncementsPage | FR-005, FR-006, FR-007(조회 측), FR-023, FR-024 | 관리자 API 인증정보 등록/관리 자체는 AdminApiSyncPage(§4.3) |
| DocumentWizardPage | FR-008, FR-009, FR-010, FR-011(생성), FR-026, FR-027 | PROJECT_SCOPE §2.3: "1/4~4/4 고정 마법사" 표현을 실제 "TOC+연속 스크롤" 구조에 맞춰 정정(결정 완료). FR-008~010 문구는 SRS 개정 시 이 정정을 반영해야 함 |
| DocumentsPage | FR-004(자기 문서 범위), FR-011(다운로드), FR-030(만료 후 완료문서 접근) | — |
| MyPage | FR-004(자기 프로필 범위) | 회원 템플릿 저장/불러오기는 AnnouncementsPage·DocumentWizardPage에 걸쳐 구현(Appendix C §2.4 비고) |
| InquiriesPage | FR-004(자기 문의 범위), FR-016, FR-018, FR-019 | ⚠ FR-017(관리자 답변 작성)은 이 화면에 없음 — §3.4/§6.1 신규 화면 갭 참조 |
| SubscriptionPage | FR-014(결제 화면 측 노출), FR-015, FR-028, FR-029(적용) | — |

### 4.3 관리자 화면

| 화면 | 배치 FR | 비고 |
|---|---|---|
| AdminDashboardPage | FR-032 | PROJECT_SCOPE §2.5: 구독/결제/쿠폰 KPI 위젯 확장(신규) |
| AdminMembersPage | FR-012, FR-020(정책 측) | PROJECT_SCOPE §2.1/§2.7: 회원↔관리자 역할 전환(`handleToggleRole`) UI는 **EXCLUDED** — FR-020 원칙 위반 상태를 재구현 시 제거하기로 결정 완료(더 이상 결정 필요 아님) |
| AdminApiSyncPage | FR-007(등록 측), FR-013, FR-021, FR-023, FR-025 | — |
| AdminSubscriptionsPage | FR-014(관리 측), FR-028(무통장입금 확인) | PROJECT_SCOPE §2.5: 결제 실패/취소/환불 흐름 신규 정의분 포함 |
| AdminCouponsPage | FR-029(발급 측) | 쿠폰 외부 시스템(allcaresolution.net) 연동은 **EXCLUDED(보류)** |
| AdminSitePagesPage | FR-031(편집 측) | — |

### 4.4 화면에 속하지 않는 교차 관심사(Cross-cutting) FR

| FR | 성격 | 배치 근거 |
|---|---|---|
| FR-003 | 비회원의 보호 화면 접근 차단 | 특정 화면이 아니라 Next.js Middleware(`middleware.ts`)가 AnnouncementsPage/DocumentWizardPage/DocumentsPage/MyPage/InquiriesPage/SubscriptionPage/Admin* 진입 전체에 적용(PROJECT_SCOPE §2.1) |
| FR-020(회원 데이터 격리 원칙) | 관리자 계정 분리 원칙 | 화면 UI가 아니라 인증 라우트/RLS 정책 계층에서 강제 |
| FR-022 | 반응형 내비게이션 | 공통 Header 컴포넌트, 모든 17개 화면에 적용(개별 화면 표에서 반복 표기하지 않음) |
| 구독 만료 자동 전이(PROJECT_SCOPE §2.4 신규) | 배치 스케줄러 | 특정 화면 없음(Cron), 결과만 DocumentsPage/SubscriptionPage에 반영 |

---

## 5. FR 전수 커버리지 검증

> SRS FR-001~FR-032(총 32개) 전 항목이 최소 1개 화면(또는 명시된 교차 관심사)에 배치되었는지 확인한다.

| FR 범위 | 검증 결과 |
|---|---|
| FR-001~FR-004 | 배치 완료 (SignupPage/LoginPage/DocumentsPage·InquiriesPage·MyPage/Middleware) |
| FR-005~FR-007 | 배치 완료 (AnnouncementsPage/AdminApiSyncPage) |
| FR-008~FR-011 | 배치 완료 (DocumentWizardPage/DocumentsPage) |
| FR-012~FR-013 | 배치 완료 (AdminMembersPage/AdminApiSyncPage) |
| FR-014~FR-015 | 배치 완료 (SubscriptionPage/AdminSubscriptionsPage) |
| FR-016~FR-019 | **부분 배치** — FR-016·018·019는 InquiriesPage에 배치되나, **FR-017(관리자 답변 작성)은 화면 인벤토리 어디에도 없음(⚠ 커버리지 갭, §3.4/§6.1)** |
| FR-020 | 배치 완료(원칙적), 단 관리자 로그인 화면 자체는 §3.4 갭 참조 |
| FR-021 | 배치 완료 (AdminApiSyncPage, 화면 노출 금지 원칙) |
| FR-022 | 배치 완료 (공통 Header, 전 화면) |
| FR-023~FR-025 | 배치 완료 (AnnouncementsPage/AdminApiSyncPage) |
| FR-026~FR-027 | 배치 완료 (DocumentWizardPage) |
| FR-028~FR-030 | 배치 완료 (SubscriptionPage/DocumentsPage/AdminSubscriptionsPage) |
| FR-031 | 배치 완료 (AdminSitePagesPage/LegalPage) |
| FR-032 | 배치 완료 (AdminDashboardPage) |

**결론**: FR-001~FR-032 중 **31개는 기존 17개 화면(+교차 관심사)에 정상 배치**되어 있다. **FR-017 1건만 배치 화면이 존재하지 않는 커버리지 갭**이며, 이는 이미 Appendix C §2.5와 PROJECT_SCOPE §2.6에서 "미구현"으로 확인된 사실과 일치한다.

---

## 6. 커버리지 갭 및 후속 조치

### 6.1 갭 1 — FR-017(관리자 문의 답변) 배치 화면 부재

- **현상**: InquiriesPage는 회원의 문의 작성/조회(FR-016, FR-018, FR-019)만 배치되어 있고, 관리자가 답변을 작성하는 화면이 17개 인벤토리에 없다.
- **PROJECT_SCOPE 결정**: §2.6에서 "관리자 답변 작성 — IMPLEMENT(실연동, P0), 관리자 전용 답변 폼 신규 구현"으로 이미 구현 대상 확정.
- **남은 결정 사항**: 신규 답변 UI를 (a) 회원용 InquiriesPage와 분리된 관리자 전용 화면(`AdminInquiriesPage`)으로 신설할지, (b) 기존 InquiriesPage 라우트에 role 기반 뷰 분기로 통합할지는 아직 확정되지 않았다. `[결정 필요]`
- **권고**: 다른 관리자 기능(회원/API/구독/쿠폰/사이트페이지)이 모두 `Admin*Page` 독립 화면 패턴을 따르고 있으므로, 일관성상 `AdminInquiriesPage` 신설을 기본안으로 제안한다.

### 6.2 갭 2 — 관리자 전용 로그인 화면 부재

- **현상**: FR-020 및 PROJECT_SCOPE §2.1은 관리자 로그인 경로(`/admin/login`)를 회원 로그인과 분리하도록 명시하지만, 화면 인벤토리에는 공용 LoginPage 1개만 존재한다.
- **남은 결정 사항**: 별도 `AdminLoginPage` 화면을 신설할지, 아니면 하나의 로그인 폼 컴포넌트를 `/admin/login`과 `/login` 두 라우트에서 재사용(스타일/문구만 분기)할지 결정되지 않았다. `[결정 필요]`
- **권고**: UI 재사용성과 유지보수 비용을 고려하면 화면(컴포넌트)은 공유하되 라우트만 분리하는 방식이 합리적이나, 최종 결정은 보안 검토(관리자 로그인 화면에 회원가입 링크 노출 금지 등)를 거쳐야 한다.

### 6.3 참고 — 이미 SRS/PROJECT_SCOPE에서 결정 완료되어 본 문서의 갭 목록에서 제외한 항목

다음은 과거 SRS §10.1의 "결정 필요" 목록에 있었으나 `PROJECT_SCOPE.md`에서 이미 최종 결론이 난 항목으로, 화면 배치 관점에서는 갭이 아니다:

- DocumentWizardPage 구조 표현(마법사→TOC) — 정정 완료(§4.2)
- AdminMembersPage 승격 기능 — 제거(EXCLUDED) 결정 완료(§4.3)
- SignupPage "대표이사" 필드 — FR-001 정식 반영 결정 완료(§4.1)
- LandingPage "내 문서함" 섹션 부재 — 섹션 추가로 보강 결정 완료(§4.1)

---

## 7. Version History

### v1.0 (2026-09-12)
- 최초 작성. `docs/02_SRS_BASELINE.md`의 FR-001~FR-032 전체를 `docs/SRS_Appendix_C_UI_Screen_Spec_v1_0.md` 기준 화면 17개(공개 5·회원 6·관리자 6)에 배치. 배치 결과 FR-017(관리자 문의 답변) 1건의 화면 부재를 커버리지 갭으로 확인하고, 관리자 전용 로그인 화면 부재를 추가 갭으로 식별.
