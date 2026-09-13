# 올케어안전플랫폼 SRS (Software Requirements Specification) v1.0

> 본 문서는 `constitution.md`, `specs/001-user-roles-permissions/spec.md`(이하 SPEC-001), `specs/001-user-roles-permissions/data-model.md`, `specs/001-user-roles-permissions/contracts/api.md`, 현재 구현된 `src/pages`·`supabase/functions` 코드베이스, 그리고 프로젝트 진행 메모(발주처 API 연동 현황)를 근거로 작성한 신규 SRS이다.
>
> 표기 규칙: 각 항목 끝에 근거 출처를 `(§문서명)` 또는 `(FR-xx)` 형태로 표시한다. 코드베이스·기존 문서만으로 확정할 수 없는 항목은 `[결정 필요]`로 표시한다.

---

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 문서명 | 올케어안전플랫폼 SRS |
| 문서 ID | SRS-ACPLATFORM-001 |
| 버전 | v1.0 |
| 기반 문서 | `constitution.md` v2.1.0, SPEC-001 (`specs/001-user-roles-permissions/spec.md`), `data-model.md`, `contracts/api.md`, 코드베이스(`src/pages`, `supabase/functions`) |
| 다루는 범위 | 1. 문서 정보 / 2. Introduction / 3. Scope / 4. Stakeholders / 5. System Context / 6. Functional Requirements / 7. Non-Functional Requirements / 8. Data Requirements / 9. External Interface Requirements / 10. Open Questions & Risks |
| 상태 | Draft |
| 작성일 | 2026-09-12 |
| Owner | Product & Engineering |

---

## 2. Introduction

### 2.1 Purpose

본 SRS는 나라장터(및 개별 발주처) 공고 기반 안전보건관리계획서 자동화 플랫폼("올케어안전플랫폼")의 소프트웨어 요구사항을 하나의 문서로 통합하여, 이후 기능 추가·발주처 확장·감사(audit) 시 참조 가능한 기준 문서로 사용하기 위해 작성한다.

### 2.2 Product Summary

- **제품 목표**: 건설사 담당자가 나라장터 등 공공 발주처의 실 공고문을 조회하고, 발주처가 요구하는 양식에 맞춰 안전보건관리계획서를 단계별로 작성·다운로드할 수 있게 하는 SaaS형 플랫폼 (constitution.md 제목, SPEC-001 Input)
- **핵심 가치 제안**: 공고 다양성(샘플 유무, 발주처별 양식 차이)에도 불구하고 4단계 양식 폴백 체인을 통해 항상 계획서 작성을 시작할 수 있게 함 (constitution.md Principle V)
- **대상 사용자**: 비회원 · 회원(건설사 담당자) · 관리자 (SPEC-001)
- **플랫폼**: 반응형 웹, Mobile First (constitution.md Principle I·III)
- **핵심 기능 영역**: 회원 인증·권한, 발주처 공고 조회(멀티 API 연동), 계획서 작성 마법사, PDF/DOCX 다운로드, 구독·결제(토스페이먼츠) 및 쿠폰, 문의응대, 관리자 운영(회원/구독/쿠폰/API 연동/사이트페이지 관리)

### 2.3 Definitions

| 용어 | 정의 | 출처 |
|---|---|---|
| 양식 폴백 체인 (Template Fallback Chain) | ①공고 첨부 샘플 → ②발주처 표준 양식 → ③범용 기본 양식 → ④회원 업로드 양식 순으로 계획서 양식을 제공하는 원칙 | constitution.md Principle V |
| 낙찰/진행상태 판단 폴백 체인 (Award Status Fallback Chain) | ①최종 낙찰자 확정 정보 → ②개찰결과 1순위 업체 정보 → ③입찰공고 마감일 기준 순으로 "종료된 공고"를 판단하는 원칙 | constitution.md Principle V |
| 발주처 (Ordering Agency) | 공고를 발주하는 공공기관(예: 조달청/나라장터, 방위사업청, 한국전력공사, 한국도로공사(EX), LH, K-water, 가스공사 등). 기관별 오픈API 인증 체계가 다름 | constitution.md Principle V, project memory |
| 메인페이지 기준선 (Main Page Baseline) | 이미 합의된 메인 페이지 시안(헤더, 히어로+검색, 공고 리스트, 이용방법 4단계, 특징 하이라이트, 내 문서함, CTA, 푸터)을 프론트엔드 구현의 공식 기준으로 삼는 것 | constitution.md Principle I |
| 마법사(Wizard) | 계획서 작성을 단계별 폼으로 진행하는 UI 패턴. Phase 1 기준 4단계 고정 | SPEC-001 §Wizard Step Variability |
| RLS (Row-Level Security) | Supabase PostgreSQL의 행 단위 접근 제어 정책. 회원은 자신의 데이터만 접근 가능 | data-model.md, contracts/rls-policies.sql |

### 2.4 References

- `constitution.md` — 프로젝트 헌법(핵심 원칙 6개)
- `specs/001-user-roles-permissions/spec.md` — 회원·관리자 권한 기반 기능 명세 (FR-001~FR-023)
- `specs/001-user-roles-permissions/data-model.md` — 엔티티/스키마 정의
- `specs/001-user-roles-permissions/contracts/api.md` — Supabase PostgREST API 계약
- `SUPABASE_SETUP.md`, `PHASE_5_SUMMARY.md` — Supabase 통합 이력
- `src/pages/*`, `supabase/functions/*` — 현재 구현 상태(코드베이스)
- **`SRS/SRS_Appendix_A_Agency_Integration_Spec_v1_0.md`** — 발주처별 오픈API 연동 상세 스펙(§6.2 부속서)
- **`SRS/SRS_Appendix_B_Coupon_Payment_Data_Model_v1_0.md`** — 구독·결제·쿠폰 상세 데이터 모델(§6.5, §8 부속서)
- **`SRS/SRS_Appendix_C_UI_Screen_Spec_v1_0.md`** — 화면별 UI 명세 및 스펙-구현 불일치 목록

---

## 3. Scope

### 3.1 In-Scope (본 SRS가 다루는 범위)

- 비회원/회원/관리자 3단계 권한 모델과 접근 제어 (FR-001~FR-004, FR-020)
- 발주처별 오픈API 연동을 통한 실 공고 조회 및 관리자 API 인증정보 관리 (FR-005~FR-007, FR-021, FR-023, constitution.md Principle V)
- 양식 폴백 체인 기반 계획서 단계별 작성 마법사 (FR-008~FR-010, SPEC-001 User Story 3)
- 완성 계획서의 PDF/DOCX 다운로드 (FR-011)
- 구독(Subscription)·결제(토스페이먼츠 연동)·쿠폰 발급/사용 관리 (FR-014~FR-015, `supabase/functions/confirm-toss-payment`, `issue-coupon`, `AdminSubscriptionsPage`, `AdminCouponsPage`, `SubscriptionPage`)
- 문의(Q&A) 작성 및 관리자 답변 권한 통제 (FR-016~FR-019)
- 관리자 운영 화면: 회원 관리, API 연동 현황, 구독/쿠폰 관리, 사이트 페이지(약관 등) 관리 (FR-012~FR-013, `AdminMembersPage`, `AdminApiSyncPage`, `AdminSitePagesPage`)
- 반응형/모바일 내비게이션 (FR-022)
- 메인페이지 기준선 및 디자인 일관성 준수 (constitution.md Principle I·III)

### 3.2 Out-of-Scope (범위 밖)

- 신규 발주처 오픈API 발급 신청 절차 자체 (SPEC-001 Assumptions)
- 결제대행사(PG) 선정 세부 절차(현재 토스페이먼츠로 확정되어 있으나, 대체 PG 도입 절차는 별도 결정) (SPEC-001 Assumptions)
- 회원의 관리자 승격 절차(관리자 계정은 운영자가 별도 발급) (FR-020)
- 네이티브 모바일 앱 (SPEC-001 Assumptions)
- 발주처별 세부 오픈API 명세서 자체(개별 발주처 API 연동 구현 세부는 각 발주처 연동 스펙 문서에서 다룸)

---

## 4. Stakeholders

| 이해관계자 | 역할 / 관심사 |
|---|---|
| 회원(건설사 담당자) | 공고 조회, 계획서 작성·다운로드, 문의 등록. 정확한 공고 정보와 발주처 맞춤 양식, 안정적인 자동저장을 요구 |
| 관리자(플랫폼 운영자) | 회원/구독/쿠폰 관리, 발주처 API 인증정보 등록·모니터링, 문의 응대. 연동 안정성과 매출(구독) 관리를 요구 |
| 발주처(공공기관, 간접 이해관계자) | 나라장터 등 오픈API 제공자. 플랫폼은 발주처 API 정책(요청 한도, 인증 방식)을 준수해야 함 |
| 결제대행사(토스페이먼츠) | 구독 결제 승인/취소 트랜잭션의 상대방. `confirm-toss-payment` Edge Function을 통해 연동 |
| Product & Engineering | spec→plan→tasks→implement 워크플로 수행, 헌법 준수 여부 검토 (constitution.md 개발 워크플로) |

---

## 5. System Context

### 5.1 아키텍처 개요

- **프론트엔드**: React 18 + React Router + Vite, TypeScript. `src/pages/*`에 화면 단위 구현 (LandingPage, AnnouncementsPage, DocumentWizardPage, DocumentsPage, MyPage, SubscriptionPage, InquiriesPage, LoginPage/SignupPage, LegalPage, Admin* 화면군, NotFoundPage)
- **백엔드/데이터**: Supabase(PostgreSQL + Auth + RLS + Edge Functions). 인증·데이터 CRUD는 `src/services/supabaseClient.ts`를 경유 (PHASE_5_SUMMARY.md)
- **Edge Functions**(`supabase/functions/`):
  - `sync-announcements` — 발주처별 공고 동기화
  - `extract-risk-items` — 공고/샘플 문서에서 위험성평가 항목 추출
  - `extract-business-overview` — 공고 문서에서 사업개요 추출
  - `issue-coupon` — 쿠폰 발급
  - `confirm-toss-payment` — 토스페이먼츠 결제 승인 콜백 처리
- **문서 생성**: `docx`, `jspdf`, `html2canvas-pro` 라이브러리로 클라이언트 측 PDF/DOCX 생성 (package.json dependencies)
- **문서 파싱**: `mammoth`(DOCX), `pdfjs-dist`(PDF), `jsqr`/`qrcode`(QR) — 회원 업로드 양식 파싱 및 QR 관련 기능 지원 (package.json dependencies)

### 5.2 외부 시스템 연동 현황

| 발주처/시스템 | 상태 | 비고 |
|---|---|---|
| 조달청(PPS, 나라장터) | 연동 완료 | project memory |
| 방위사업청(DAPA) | 연동 완료 | project memory |
| 한국전력공사(KEPCO) | 연동 완료 | project memory (한전은 `progressState=Final`로 낙찰 확정 판단, constitution.md Principle V 예시) |
| 한국도로공사(EX) | 코드 배포됨, API 응답 404(활성화 대기 추정) | project memory — [결정 필요: EX 측 API 키 활성화 확인 필요] |
| LH(한국토지주택공사) | 코드 미작성 | project memory — 개찰결과 1순위 업체 API 활용 예정 (constitution.md Principle V 예시) |
| K-water(한국수자원공사) | 코드 미작성 | project memory |
| 한국가스공사 | 코드 미작성 | project memory |
| 토스페이먼츠 | 연동됨(`confirm-toss-payment`) | 구독 결제 승인 |

### 5.3 사용자 접근 경로

```
비회원 → LandingPage(공개) ─┬─ 로그인 안내 ─→ LoginPage/SignupPage
                             └─ (보호 화면 접근 시 차단) ─→ 로그인 안내

회원 → 로그인 → AnnouncementsPage(공고 조회)
              → DocumentWizardPage(계획서 작성, 양식 폴백 체인)
              → DocumentsPage(내 문서함) → PDF/DOCX 다운로드
              → SubscriptionPage(구독/결제) / InquiriesPage(문의) / MyPage

관리자 → 로그인(회원과 분리) → AdminDashboardPage
              → AdminMembersPage / AdminApiSyncPage / AdminSubscriptionsPage
              → AdminCouponsPage / AdminSitePagesPage
```

---

## 6. Functional Requirements

> FR 번호는 SPEC-001과 동일 체계를 유지하며, SPEC-001 이후 코드베이스에서 확인된 항목은 FR-024 이후 번호로 신규 추가한다.

### 6.1 인증 및 권한 (FR-001~FR-004, FR-020)

- **FR-001**: 비회원은 이메일, 비밀번호, 소속 건설사명, 사업자등록번호, 담당자명, 연락처를 모두 입력해야 회원가입을 완료할 수 있다.
- **FR-002**: 회원은 로그인·로그아웃할 수 있다.
- **FR-003**: 비회원이 보호된 화면(계획서 작성, 다운로드, 내 문서함, 문의 등)에 접근하면 로그인 안내를 표시하고 실제 내용은 노출하지 않는다.
- **FR-004**: 회원은 자신이 작성한 계획서·문의만 조회·수정·삭제할 수 있다(RLS로 강제).
- **FR-020**: 관리자 계정은 일반 회원가입과 완전히 분리되어 운영자가 사전 발급하며, 관리자 로그인은 회원 로그인과 구분되는 경로를 사용한다.

### 6.2 발주처 공고 조회 및 API 연동 (FR-005~FR-007, FR-021, FR-023)

- **FR-005**: 관리자가 등록한 API 인증 정보를 사용해 발주처별 오픈API에서 실제 입찰 공고를 조회한다.
- **FR-006**: 조회된 공고에 첨부된 안전보건관리계획서 샘플·표준 양식을 식별하여 회원에게 제시한다.
- **FR-007**: 관리자는 발주처 단위로 API 인증 정보를 개별 등록·수정·삭제할 수 있다(`AdminApiSyncPage`).
- **FR-021**: API 인증 정보는 소스코드·화면에 노출하지 않고 관리자 전용 화면과 환경변수·시크릿 체계로만 관리한다.
- **FR-023**: 회원·관리자는 등록된 발주처의 전체 공고를 동일 범위로 조회하되, 관리자 화면에는 발주처별 최근 연동 상태(성공/실패)와 마지막 조회 시각이 추가로 표시된다.
- **FR-024 [신규]**: 시스템은 발주처별로 "종료된 공고" 여부를 판단할 때 constitution.md Principle V의 3단계 낙찰/진행상태 폴백 체인(①낙찰자 확정 → ②개찰결과 1순위 → ③마감일 기준)을 적용해야 하며, 신규 발주처 연동 시 어느 단계까지 지원 가능한지 코드 주석/문서에 명시해야 한다.
- **FR-025 [신규]**: `sync-announcements` 함수는 발주처별 동기화 실행 결과(성공/실패, 처리 건수, 오류 메시지)를 기록하여 `AdminApiSyncPage`에서 확인 가능해야 한다.

### 6.3 계획서 작성 (FR-008~FR-010)

- **FR-008**: 회원은 선택한 공고가 요구하는 항목에 맞춰 계획서를 단계별(마법사)로 작성할 수 있다.
- **FR-009**: 계획서 작성 각 단계는 메인 화면 및 다른 단계와 일관된 화면 구조·상호작용 패턴을 유지한다(constitution.md Principle III).
- **FR-010**: 작성 중인 계획서의 입력 내용과 진행 단계는 저장되어, 재접속 시 이어서 작성할 수 있다(자동저장 15초 간격, SPEC-001 §Auto-Save Strategy).
- **FR-026 [신규]**: 시스템은 `extract-risk-items`, `extract-business-overview` Edge Function을 통해 공고 첨부 샘플·회원 업로드 문서에서 위험성평가 항목과 사업개요를 자동 추출하여 마법사 입력 초안으로 제공해야 한다.
- **FR-027 [신규]**: 발주처별 특수 항목(발주처 고유 양식 요구사항)은 공통 마법사 흐름에 토글(선택적 표시) 형태로 반영해야 한다(project memory: 발주처 샘플문서 비교 워크플로우).

### 6.4 다운로드 (FR-011)

- **FR-011**: 완료된 계획서를 PDF와 DOCX 두 형식으로 다운로드할 수 있으며, 두 형식 간 내용·서식 일관성을 보장한다(constitution.md 기술 및 통합 제약).

### 6.5 구독·결제·쿠폰 (FR-014~FR-015, 신규)

- **FR-014**: 관리자는 구독료 결제 화면(결제창)을 설정·관리할 수 있다(`AdminSubscriptionsPage`).
- **FR-015**: 구독하지 않은 회원은 로그인 이후에도 공고 검색·계획서 작성·다운로드 등 핵심 기능 대부분에 접근할 수 없고 구독 안내 화면으로 전환된다.
- **FR-028 [신규]**: 시스템은 토스페이먼츠 결제 요청 승인 콜백을 `confirm-toss-payment` Edge Function에서 처리하여, 결제 성공 시 회원의 구독 상태(`subscription_status`, 만료일)를 갱신해야 한다.
- **FR-029 [신규]**: 관리자는 쿠폰(할인/무료 이용권)을 발급할 수 있어야 하며(`issue-coupon`, `AdminCouponsPage`), 회원은 구독 결제 시 발급받은 쿠폰을 적용할 수 있어야 한다.
- **FR-030 [신규]**: 이미 완료된(status='completed') 계획서는 구독이 만료된 회원도 조회·다운로드할 수 있으나, 작성 중(status='in_progress')인 계획서는 만료 후 편집이 차단된다(SPEC-001 §Expired Subscription Access).

### 6.6 문의(Q&A) (FR-016~FR-019)

- **FR-016**: 회원은 문의(질문)를 작성할 수 있다.
- **FR-017**: 관리자만 회원 문의에 답변을 작성할 수 있고, 일반 회원은 답변을 작성할 수 없다.
- **FR-018**: 관리자가 답변을 등록한 문의는 작성 회원이 더 이상 수정·삭제할 수 없다.
- **FR-019**: 관리자 답변 등록 전까지 작성 회원은 자신의 문의를 수정·삭제할 수 있다.

### 6.7 관리자 운영 (FR-012~FR-013, 신규)

- **FR-012**: 관리자는 전체 회원 목록을 조회하고 계정 상태(정상/정지)를 관리할 수 있다(`AdminMembersPage`).
- **FR-013**: 관리자만 발주처별 API 인증 정보를 등록·수정·삭제할 수 있고, 일반 회원의 접근은 차단된다.
- **FR-031 [신규]**: 관리자는 사이트 공개 페이지(약관, 안내문 등)의 콘텐츠를 관리할 수 있어야 한다(`AdminSitePagesPage`, `LegalPage`).
- **FR-032 [신규]**: 관리자 대시보드는 회원 수, 계획서 작성 현황, 구독 매출, 발주처 API 연동 상태 등 운영 지표를 요약하여 표시해야 한다(`AdminDashboardPage`).

### 6.8 반응형/내비게이션 (FR-022)

- **FR-022**: 좁은 화면(모바일 폭)에서는 상단 내비게이션을 햄버거 아이콘으로 축약하고, 탭하면 드로어/오버레이로 전체 내비게이션을 노출한다. 헤더 로고와 주요 CTA는 축약 상태에서도 항상 노출된다.

---

## 7. Non-Functional Requirements

### 7.1 보안

- 나라장터 등 발주처 API 인증키는 소스코드·저장소에 하드코딩하지 않고 환경변수·시크릿 관리 체계로 주입한다(constitution.md Principle V).
- Supabase RLS로 회원 간 데이터 격리를 강제한다: 회원은 자신의 `documents`/`inquiries`만 접근 가능, `api_credentials`는 관리자만 접근 가능(data-model.md, contracts/rls-policies.sql).
- 로그인 실패 5회 초과 시 해당 계정 15분간 로그인 차단(SPEC-001 §Account Lockout).
- 세션은 마지막 작업 후 30분 무동작 시 자동 만료(SPEC-001 §Session Timeout).

### 7.2 일관성·디자인

- 모든 신규 화면은 메인페이지 기준선의 정보 구조(섹션 순서, 내비게이션 라벨, 카드·뱃지 패턴)와 디자인 토큰(oklch 컬러, Noto Serif KR/Noto Sans KR, 여백·라운드 규칙)을 재사용해야 한다(constitution.md Principle III).

### 7.3 가용성/폴백

- 발주처 API 응답 실패 시 서비스 전체가 중단되지 않고 조회 실패를 명확히 안내한다(SPEC-001 User Story 2).
- 계획서 양식은 항상 4단계 폴백 체인 중 하나로 제공 가능해야 하며, 모든 자동 경로가 불가능한 경우 회원 업로드+수동 입력으로 폴백한다(constitution.md Principle V).

### 7.4 추적성

- 모든 구현 TASK는 근거 요구사항(spec 항목 ID)과 디자인 근거를 명시해야 하며, 근거가 불명확한 TASK는 착수하지 않는다(constitution.md Principle IV).

### 7.5 성능(목표치, SPEC-001 Success Criteria 기준)

- 회원가입~첫 공고 검색 결과 확인: 5분 이내
- 계획서 단계별 작성 완료: 10분 이내
- 완성 계획서 다운로드: 요청 후 10초 이내(10KB~5MB 파일 기준)
- 신규 발주처 API 인증정보 등록 → 검색 결과 반영: 5분 이내

---

## 8. Data Requirements (요약)

주요 엔티티는 `data-model.md`에 정의되어 있으며, 본 SRS는 다음과 같이 요약 인용한다:

| 엔티티 | 요약 | 비고 |
|---|---|---|
| Member | 이메일, 비밀번호(해시), 소속 건설사명, 사업자등록번호, 담당자명, 연락처, 역할(member/admin), 구독 상태 | data-model.md §1 |
| Announcement | 공고명, 발주처, 공고번호, 카테고리, 마감일, 첨부 서식 여부, api_source | data-model.md §2 — 발주처별 소스는 §5.2 연동 현황 참조 |
| Document | 회원/공고 연결, 상태(in_progress/completed), 진행 단계, step_data(JSONB), 첨부파일 | data-model.md §3 |
| Inquiry | 회원 연결, 제목/내용, 상태(pending/answered), 관리자 응답 | data-model.md §4 |
| Subscription | 회원 연결, 플랜, 상태(active/expired/cancelled), 시작·만료일 | data-model.md §5 — 현재 구현은 토스페이먼츠 연동으로 확장됨(FR-028) |
| ApiCredential | 발주처, 인증키(암호화), 엔드포인트, 상태, 최근 연동 상태 | data-model.md §6 |
| Coupon [신규, 스키마 상세는 코드 확인 필요] | 쿠폰 코드, 할인/혜택 내용, 발급 대상, 사용 여부 | `issue-coupon` function, `AdminCouponsPage` — [결정 필요: 정식 스키마 문서화] |

---

## 9. External Interface Requirements

### 9.1 발주처 오픈API

- 발주처별로 인증 방식·응답 필드·낙찰정보 제공 범위가 상이하다(constitution.md Principle V).
- 신규 발주처 연동 시 반드시 실제 API 응답으로 지원 가능한 폴백 단계(§6.2 FR-024)를 확인한 뒤 `sync-announcements`에 fetchXxx 형태로 추가한다(project memory: 신규 발주처 API 추가 절차).

### 9.2 Supabase PostgREST API

- 상세 엔드포인트·권한·요청/응답 예시는 `contracts/api.md`를 따른다(Members, Announcements, Documents, Inquiries, ApiCredentials 엔드포인트).
- 인증은 `Authorization: Bearer <JWT>` 헤더 사용, 토큰 만료 3600초(contracts/api.md §Authentication).

### 9.3 결제 인터페이스(토스페이먼츠)

- 결제 승인은 클라이언트에서 토스페이먼츠 SDK로 결제창을 호출한 뒤, `confirm-toss-payment` Edge Function에서 서버 측 승인 API를 호출해 최종 확정한다 [결정 필요: 결제 실패/취소/환불 시나리오의 상세 요구사항은 `AdminSubscriptionsPage`/코드 리뷰로 추가 정의 필요].

### 9.4 문서 파싱/생성 인터페이스

- PDF 파싱: `pdfjs-dist` / DOCX 파싱: `mammoth` — 회원 업로드 양식 처리(양식 폴백 체인 4단계)
- 문서 생성: `docx`(DOCX 생성), `jspdf`+`html2canvas-pro`(PDF 생성)

---

## 10. Open Questions & Risks

- **EX(한국도로공사) API 404**: 코드가 배포되었으나 실제 호출이 404를 반환하고 있다. 발주처 측 API 활성화 승인 대기로 추정되나 확인이 필요하다 (project memory). [결정 필요]
- **LH/K-water/가스공사 미연동**: 코드가 아직 작성되지 않았으며, 우선순위와 일정이 정의되어야 한다. [결정 필요]
- **쿠폰(Coupon) 정식 데이터 모델 미문서화**: `issue-coupon` 함수와 `AdminCouponsPage`는 구현되어 있으나 `data-model.md`에는 별도 엔티티로 반영되어 있지 않다. 후속 문서에서 스키마·검증 규칙을 확정해야 한다. [결정 필요]
- **결제 실패/환불 흐름**: 토스페이먼츠 결제 실패, 부분 환불, 구독 해지 시 시스템 동작(구독 상태 롤백, 쿠폰 재사용 여부 등)이 SPEC-001에 명시되어 있지 않다. [결정 필요]
- **발주처별 낙찰판단 폴백 단계 문서화 상태**: 현재 연동 완료된 PPS/DAPA/KEPCO 각각이 3단계 중 어느 단계를 사용하는지 코드 주석/문서에 일관되게 명시되어 있는지 재점검이 필요하다(constitution.md Principle V 검토 기준). [결정 필요]
- **마법사 단계 가변화(Phase 2+)**: 현재 4단계 고정이며, 발주처별 요구 항목 차이는 토글(FR-027)로 흡수하는 방식을 채택했다. 향후 단계 수 자체가 가변화될 경우 별도 SRS 개정이 필요하다.

### 10.1 부속서(Appendix) 작성 중 추가로 확인된 스펙-구현 불일치 (Appendix C §5 상세 참조)

- **DocumentWizardPage는 "4단계 고정 마법사(1/4~4/4)" 구조가 아니다**: 실제로는 좌측 목차(TOC) + 앵커 스크롤 방식의 단일 연속 폼이다. FR-008~FR-010과 SPEC-001 §Wizard Step Variability의 "마법사" 표현을 실제 구조에 맞게 개정할지 결정 필요. [결정 필요]
- **InquiriesPage는 Mock 데이터로만 동작한다**: Supabase 연동과 관리자 답변 작성 UI가 모두 없어, FR-016~FR-019가 프론트엔드 레벨에서는 사실상 미구현 상태다. [결정 필요]
- **AdminMembersPage에 회원→관리자 승격/강등 기능이 실제로 존재한다**: SPEC-001 Assumptions("관리자는 회원가입과 분리되어 운영자가 사전 발급, 승격 절차는 범위 밖")·FR-020과 배치된다. 정책을 승격 허용으로 개정할지, 기능을 제거할지 결정 필요. [결정 필요]
- **SignupPage에 스펙에 없는 "대표이사(ceo_name)" 필드가 존재한다**: FR-001 개정 여부 결정 필요. [결정 필요]
- **LandingPage에 constitution.md Principle I이 기준선으로 못박은 "내 문서함" 섹션이 없다**: 기준선 재승인 또는 섹션 추가 여부 결정 필요. [결정 필요]

---

## Version History

### v1.0 (2026-09-12)
- 최초 작성. constitution.md, SPEC-001, data-model.md, contracts/api.md, 코드베이스(src/pages, supabase/functions), 프로젝트 메모리(발주처 API 연동 현황)를 통합하여 프로젝트 전체 범위의 SRS로 신규 작성.
