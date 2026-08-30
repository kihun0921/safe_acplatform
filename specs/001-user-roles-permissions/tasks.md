# Tasks: 올케어안전플랫폼 (001-user-roles-permissions)

**Input**: spec.md (7 User Stories P1-P3), design.md (20 sections), plan.md (8 phases)  
**Target**: Phase 1-3 → Local UI validation + /design-sync → Phase 4-8 → Supabase integration  
**MVP Scope**: Phase 1-3 complete (no Supabase)

---

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[ID]**: Task ID (T001, T002, etc.)
- **[P]**: Parallelizable (different files, no dependencies)
- **[Story]**: User Story label (US1, US2, ..., US7) for traceability
- **Description**: Action + file path

---

# Phase 1: Project Setup & Infrastructure (Blocking Gate)

**Purpose**: Initialize Vite + React + TypeScript project structure  
**Duration**: ~4 hours  
**Exit Criteria**: `npm run dev` starts local server on http://localhost:5173 with type-checking, linting, testing

## Setup Tasks

- [ ] T001 Create React + Vite + TypeScript project structure in src/ with vite.config.ts
  - **Spec**: Technical Context (TypeScript 5.x, React 18.x, Vite)
  - **Files**: `vite.config.ts`, `tsconfig.json`, `package.json`
  - **Verify**: `npm run dev` starts without errors

- [ ] T002 [P] Configure TypeScript strict mode (noImplicitAny, strictNullChecks, strictFunctionTypes)
  - **Spec**: FR-001 to FR-023 (type safety for role-based access)
  - **Files**: `tsconfig.json`
  - **Verify**: `npm run type-check` shows 0 errors

- [ ] T003 [P] Setup ESLint + Prettier for code style consistency
  - **Files**: `.eslintrc.json`, `.prettierrc`
  - **Verify**: `npm run lint` and `npm run format` work

- [ ] T004 [P] Setup Vitest for unit tests + Testing Library for component tests
  - **Files**: `vitest.config.ts`, `src/__tests__/setup.ts`
  - **Verify**: `npm run test` launches watch mode

- [ ] T005 [P] Configure build output (dist/) and dev server on port 5173
  - **Files**: `vite.config.ts`, `.env.example`
  - **Verify**: `npm run build` creates dist/, `npm run preview` runs build locally

- [ ] T006 [P] Setup path alias (@/ → src/) for imports
  - **Files**: `vite.config.ts`, `tsconfig.json`
  - **Verify**: `import { Button } from '@/components/Button'` works

**Checkpoint**: Foundation ready. All `npm run` commands work. Ready for Phase 2.

---

# Phase 2: Design System Foundation (Blocking Gate)

**Purpose**: Implement CSS design tokens + core components  
**Duration**: ~12 hours  
**Exit Criteria**: All design tokens + 7 core components rendering with mock data, responsive at 3 breakpoints

## 2.1 Design Tokens & Global Styles

- [ ] T007 Create tokens.css with oklch() color variables (primary, success, warn, danger, neutral, text variants)
  - **Design**: §11 Design Tokens, §3 Brand
  - **Files**: `src/styles/tokens.css`
  - **Content**: `:root { --primary, --success, --warn, --danger, --bg, --surface, ... }`
  - **Verify**: Browser DevTools shows all CSS variables defined

- [ ] T008 Create typography tokens (Noto Sans KR body, Noto Serif KR display, font-sizes, font-weights)
  - **Design**: §12 Typography, §2 Brand
  - **Files**: `src/styles/tokens.css` (typography section)
  - **Verify**: `<h1>` and `<body>` text render in correct fonts from plan.md §3

- [ ] T009 Create spacing tokens (--gap-xs through --gap-xl, 8px-40px scale)
  - **Design**: §13 Spacing
  - **Files**: `src/styles/tokens.css` (spacing section)
  - **Verify**: All gap values used in component tests

- [ ] T010 [P] Create radius tokens (--radius-sm through --radius-xl: 7px-16px)
  - **Design**: §13 Spacing (radius)
  - **Files**: `src/styles/tokens.css`
  - **Verify**: Buttons, cards render with correct border radius

- [ ] T011 [P] Create shadow tokens (--shadow-sm, --shadow-md for depth)
  - **Design**: §2 Brand
  - **Files**: `src/styles/tokens.css`
  - **Verify**: Hero card and floating elements have correct shadows

- [ ] T012 [P] Setup responsive breakpoint media queries (1200px desktop, 960px tablet, 640px mobile)
  - **Design**: §6 Responsive Rules, §4 Layouts
  - **Files**: `src/styles/layout.css`
  - **Content**: `@media (max-width: 960px)` and `@media (max-width: 640px)` rules
  - **Verify**: Page reflows correctly when viewport resized

- [ ] T013 [P] Setup prefers-reduced-motion CSS rule (@media (prefers-color-scheme: reduce))
  - **Design**: §17 prefers-reduced-motion, §18 Accessibility
  - **Files**: `src/styles/layout.css`
  - **Content**: `* { animation-duration: 0.01ms !important; }`
  - **Verify**: DevTools toggle prefers-reduced-motion → animations stop

- [ ] T014 Create global styles and reset (box-sizing: border-box, margins, link colors)
  - **Files**: `src/styles/globals.css`
  - **Verify**: All elements use --primary color for links

## 2.2 Core Components (7 Required)

- [ ] T015 [P] Create Header component with logo, nav links, user avatar for member/admin roles
  - **Spec**: FR-022 (mobile hamburger), FR-002 (logout)
  - **Design**: §4.1 Header, §8 Header Rules
  - **Files**: `src/components/common/Header/Header.tsx`
  - **Props**: `{ role: 'member' | 'admin' | null, onLogout: () => void }`
  - **Verify**: Renders logo + nav on desktop, hamburger on mobile (640px)

- [ ] T016 [P] Create Button component with variants (primary, secondary, text, pill) and sizes
  - **Design**: §9 Component Patterns (Button styles)
  - **Files**: `src/components/common/Button/Button.tsx`
  - **Props**: `{ variant?: 'primary' | 'secondary' | 'text' | 'pill', children, ... }`
  - **Verify**: Unit test in `__tests__/components/Button.test.tsx` passes

- [ ] T017 [P] Create Input component (text, email, password) with validation styling
  - **Spec**: FR-001 (signup fields: email, password, company, registration#, manager, phone)
  - **Design**: §9 Component Patterns, §4 Field styling
  - **Files**: `src/components/common/Input/Input.tsx`
  - **Props**: `{ type, label, error?, required? }`
  - **Verify**: Shows error state when validation fails

- [ ] T018 [P] Create Textarea component with character counter
  - **Spec**: FR-016 (inquiry content)
  - **Design**: §9 Component Patterns
  - **Files**: `src/components/common/Textarea/Textarea.tsx`
  - **Verify**: Placeholder text visible, can type content

- [ ] T019 [P] Create Badge component with status colors (default, success, warn, danger, info)
  - **Design**: §9 Component Patterns (Badge styles, color coding)
  - **Files**: `src/components/common/Badge/Badge.tsx`
  - **Props**: `{ status: 'default' | 'success' | 'warn' | 'danger', label }`
  - **Verify**: Each status renders correct background + text color from design.md

- [ ] T020 [P] Create Loading state component (Spinner component)
  - **Design**: §11 Loading/Empty/Error/Unauthorized states
  - **Files**: `src/components/common/Spinner/Spinner.tsx`
  - **Content**: Animated spinner with "로드중..." text
  - **Verify**: Renders without error, animation respects prefers-reduced-motion

- [ ] T021 [P] Create Empty state component with icon + message + CTA button
  - **Spec**: Edge Cases (zero results, no forms attached, etc.)
  - **Design**: §11 States
  - **Files**: `src/components/common/EmptyState/EmptyState.tsx`
  - **Props**: `{ icon?, title, message, ctaLabel?, onCta? }`
  - **Verify**: Shows correct icon + message combination

- [ ] T022 [P] Create Error state component with error message + retry button
  - **Spec**: Edge Cases (API failure)
  - **Design**: §11 States, Main.dc.html (API error state)
  - **Files**: `src/components/common/ErrorState/ErrorState.tsx`
  - **Props**: `{ error, onRetry }`
  - **Verify**: Error text visible + retry button clickable

- [ ] T023 [P] Create Unauthorized/LoginGuard component (보호된 화면 접근 시)
  - **Spec**: FR-003, SC-006
  - **Design**: §5.2 LoginGuide page
  - **Files**: `src/components/common/UnauthorizedGuard/UnauthorizedGuard.tsx`
  - **Content**: "로그인이 필요한 페이지입니다" message + login/signup buttons
  - **Verify**: No protected content exposed, buttons navigate correctly

**Checkpoint**: Design system complete. 9 components rendering with mock data. Ready for Phase 3.

---

# Phase 3: Core Screens & Mock Data (UI Foundation)

**Purpose**: Implement 16 pages + Mock Data + Responsive layouts  
**Duration**: ~20 hours  
**Exit Criteria**: All 16 pages rendering locally with mock data, all 4 states working, responsive at 3 breakpoints, /design-sync ready

## 3.1 Mock Data & Session Management

- [ ] T024 Create mock data structure (MOCK_USERS, MOCK_ANNOUNCEMENTS, MOCK_DOCUMENTS, MOCK_INQUIRIES)
  - **Spec**: User Story 1-7
  - **Files**: `src/services/mockData.ts`
  - **Content**: 2-5 items per collection, realistic structure matching data-model.md
  - **Verify**: `console.log(MOCK_ANNOUNCEMENTS)` shows array of announcements

- [ ] T025 Create useAuth hook with mock localStorage session
  - **Spec**: FR-001, FR-002, FR-003
  - **Design**: §8 Unauthorized state
  - **Files**: `src/hooks/useAuth.ts`
  - **Props**: Returns `{ user, isAuthenticated, login(), signup(), logout(), loading, error }`
  - **Verify**: After login, `localStorage.currentUser` contains user object

- [ ] T026 Create useAnnouncements hook with mock search/filter
  - **Spec**: User Story 2, FR-005, FR-006
  - **Files**: `src/hooks/useAnnouncements.ts`
  - **Returns**: `{ announcements, loading, error, search(query) }`
  - **Verify**: `search('초등')` filters MOCK_ANNOUNCEMENTS by title

- [ ] T027 Create useDocuments hook for draft & completed plans
  - **Spec**: User Story 3-4
  - **Files**: `src/hooks/useDocuments.ts`
  - **Returns**: `{ documents, loading, create(), update(), delete() }`
  - **Verify**: Mock data persists in localStorage across page reloads

- [ ] T028 Create useInquiries hook for Q&A
  - **Spec**: User Story 7, FR-016-019
  - **Files**: `src/hooks/useInquiries.ts`
  - **Returns**: `{ inquiries, create(), update(), delete() }`
  - **Verify**: Only user's own inquiries visible

## 3.2 Public Pages (2 screens)

- [ ] T029 Implement MainPage component (hero + search + announcements list + features + footer)
  - **Spec**: FR-005, User Story 2 entry point
  - **Design**: §4.1 Main page, §5.1 Main layout
  - **Files**: `src/pages/public/MainPage/MainPage.tsx`
  - **Content**: Hero section with search, mock announcement cards, 4-step feature section
  - **Verify**: All design tokens applied, responsive at 3 breakpoints

- [ ] T030 Implement LoginGuidePage component (shown when non-member accesses protected screen)
  - **Spec**: FR-003, SC-006
  - **Design**: §5.2 LoginGuide
  - **Files**: `src/pages/public/LoginGuidePage/LoginGuidePage.tsx`
  - **Content**: Message + login/signup buttons, NO protected content
  - **Verify**: Protected content never exposed

## 3.3 Member Pages (8 screens)

- [ ] T031 Implement AnnouncementListPage with search + filter + cards
  - **Spec**: User Story 2, FR-005
  - **Design**: §5.5 Announcement list
  - **Files**: `src/pages/member/AnnouncementListPage/AnnouncementListPage.tsx`
  - **States**: Loading, Empty, Error, Success
  - **Verify**: Search "초등" filters results, API error shows retry button

- [ ] T032 [P] Implement AnnouncementDetailPage with form attachment info
  - **Spec**: User Story 2, FR-006
  - **Design**: §5.6 Announcement detail
  - **Files**: `src/pages/member/AnnouncementDetailPage/AnnouncementDetailPage.tsx`
  - **Content**: Agency, deadline, category, forms list, "계획서 작성" button
  - **Verify**: Shows "첨부된 양식이 없습니다" if no forms

- [ ] T033 [P] Implement TemplateSelectionPage with 4 template options (양식 선택)
  - **Spec**: User Story 3 (양식 폴백 체인), Plan.md 양식 선택 폴백 체인
  - **Design**: §4.3-1 Template Selection page
  - **Files**: `src/pages/member/TemplateSelectionPage/TemplateSelectionPage.tsx`
  - **Content**: 
    - 공고명 + 발주처 상단 배너
    - 4개 옵션: 공고 샘플, 발주처 표준, 범용 기본, 직접 업로드
    - 각 옵션별 설명 (예상 항목 수, 파싱 상태)
    - "다음 단계로" 버튼 (선택 후 활성화)
  - **Logic**: 
    - Phase 1 (Mock): 모든 옵션 정적 표시 (4개 모두)
    - Phase 2+: 공고 API 결과에 따라 Priority 1/2 동적 필터링
  - **Verify**: 4개 옵션 모두 표시, 선택 후 버튼 활성화, 클릭 시 PlanWizardPage로 이동

- [ ] T034 [P] Implement file upload component for template (양식 파일 업로드)
  - **Spec**: User Story 3 (Priority 4 - 회원 업로드 양식)
  - **Design**: §4.3-1 Template Selection page (4️⃣ 직접 업로드)
  - **Files**: `src/components/common/FileUpload/FileUpload.tsx`
  - **Content**: 
    - 드래그 앤 드롭 영역
    - 지원 형식: PDF, DOCX, HWP
    - 파일 선택 후 상태 표시
  - **Logic**: Phase 1은 UI만, 실제 파싱은 Phase 2+
  - **Verify**: 파일 선택 가능, 크기 및 형식 검증 표시

- [ ] T035 [P] Implement PlanWizardPage with 4-step form (공고 확인 → 분석 → 입력 → 다운로드)
  - **Spec**: User Story 3, FR-008-010
  - **Design**: §5.7 Wizard, §5.9 Download options
  - **Files**: `src/pages/member/PlanWizardPage/PlanWizardPage.tsx`
  - **State**: Multi-step form with progress bar, auto-save every 15s to localStorage
  - **Verify**: Step navigation works, data persists on refresh

- [ ] T034 [P] Implement MyDocumentsPage with "작성중" / "완료" tabs
  - **Spec**: User Story 4, FR-010-011
  - **Design**: §5.8 My Documents, §4.2 My Documents layout
  - **Files**: `src/pages/member/MyDocumentsPage/MyDocumentsPage.tsx`
  - **Tabs**: "작성중" shows progress bars, "완료" shows PDF/DOCX buttons
  - **Verify**: Tabs switch correctly, progress bar updates

- [ ] T035 [P] Implement MyPagePage (profile info, subscription status)
  - **Spec**: User Story 6, FR-015
  - **Design**: §5.10 My Page
  - **Files**: `src/pages/member/MyPagePage/MyPagePage.tsx`
  - **Content**: Company, manager, email, subscription status
  - **Verify**: Shows "구독 불가" for non-subscribed users

- [ ] T036 [P] Implement SubscriptionGuidePage (구독 안내)
  - **Spec**: FR-015, User Story 6
  - **Design**: §5.11 Subscription guide
  - **Files**: `src/pages/member/SubscriptionGuidePage/SubscriptionGuidePage.tsx`
  - **Content**: Subscription pitch + payment CTA button
  - **Verify**: Redirects to payment screen on CTA click

- [ ] T037 [P] Implement InquiryListPage (Q&A list with status badges)
  - **Spec**: User Story 7, FR-016-019
  - **Design**: §5.12 Inquiry list
  - **Files**: `src/pages/member/InquiryListPage/InquiryListPage.tsx`
  - **Content**: List with "답변 대기" / "답변 완료" badges, "문의 작성" button
  - **Verify**: Only user's inquiries visible

- [ ] T038 [P] Implement InquiryDetailPage (Q&A detail + answer if admin replied)
  - **Spec**: User Story 7, FR-018-019
  - **Design**: §5.13 Inquiry detail
  - **Files**: `src/pages/member/InquiryDetailPage/InquiryDetailPage.tsx`
  - **Content**: Question title + body, admin answer if available, locked if answered
  - **Verify**: Edit/delete disabled after admin answers

## 3.4 Admin Pages (3 screens for Phase 1)

- [ ] T039 Implement AdminLoginPage (관리자 로그인, 회원 로그인과 분리)
  - **Spec**: FR-020
  - **Design**: §5.14 Admin login
  - **Files**: `src/pages/admin/AdminLoginPage/AdminLoginPage.tsx`
  - **Content**: Admin-specific login UI (different from member login)
  - **Verify**: Admin login creates admin session

- [ ] T040 Implement AdminDashboardPage with metric cards + API status + recent inquiries
  - **Spec**: User Story 5, FR-023
  - **Design**: §5.15 Admin dashboard, AdminDashboard.dc.html
  - **Files**: `src/pages/admin/AdminDashboardPage/AdminDashboardPage.tsx`
  - **Cards**: Total members, subscribed members, pending inquiries (긴급), failed APIs (점검필요)
  - **Verify**: Admin header shows "관리자" badge, colors + text used (not color-only)

- [ ] T041 Implement MemberManagementPage (회원 목록 with basic search)
  - **Spec**: User Story 5, FR-012
  - **Design**: §5.16 Member management
  - **Files**: `src/pages/admin/MemberManagementPage/MemberManagementPage.tsx`
  - **Content**: Table with email, company, manager, subscription status
  - **Verify**: Search by email/company filters results

## 3.5 Responsive & Accessibility

- [ ] T042 [P] Implement mobile hamburger menu + drawer navigation
  - **Spec**: FR-022
  - **Design**: §6 Mobile Navigation Pattern
  - **Files**: `src/components/common/Header/Header.tsx` (update)
  - **Content**: Hamburger button on 640px, drawer with full menu, backdrop overlay
  - **Verify**: Hamburger visible only on mobile, drawer closes on backdrop click

- [ ] T043 [P] Add accessibility attributes (aria-label, aria-progressbar, semantic HTML)
  - **Spec**: SC-008 (90% consistency), design.md §18 Accessibility
  - **Design**: §18 Accessibility
  - **Files**: All component files
  - **Content**: Add `role="progressbar"` to progress bars, `aria-label` to icon buttons, proper heading hierarchy
  - **Verify**: Run Lighthouse accessibility audit → score ≥95

- [ ] T044 [P] Add prefers-reduced-motion support to animated elements
  - **Spec**: design.md §17
  - **Design**: §17 prefers-reduced-motion
  - **Files**: `src/hooks/useReducedMotion.ts`, component files with animations
  - **Content**: Check `window.matchMedia('(prefers-reduced-motion: reduce)')`, disable animations
  - **Verify**: Toggle prefers-reduced-motion in DevTools → animations stop instantly

- [ ] T045 [P] Test responsive layouts at 3 breakpoints (1200px, 960px, 640px)
  - **Design**: §6 Responsive Rules
  - **Verify**: Manual testing in DevTools device toolbar
    - 1200px (desktop): 4-column grids visible
    - 960px (tablet): 2-column grids, nav hidden
    - 640px (mobile): 1-column layout, hamburger menu active

## 3.6 Error Handling & State Management

- [ ] T046 Add API error boundary for announcements search (FR-005 Edge Case)
  - **Spec**: User Story 2 Acceptance 3 (API failure handling)
  - **Files**: `src/components/common/ErrorBoundary/ErrorBoundary.tsx`
  - **Content**: Catch error, show error message + retry button
  - **Verify**: When mock API fails, error UI shows

- [ ] T047 Add document attachment detection (handles missing forms)
  - **Spec**: Edge Case (announcement without safety form)
  - **Design**: §5.6 Announcement detail
  - **Files**: `src/pages/member/AnnouncementDetailPage/AnnouncementDetailPage.tsx` (update)
  - **Verify**: Shows "첨부된 양식이 없습니다" + inquiry link

- [ ] T048 Add session timeout warning + auto-logout
  - **Spec**: §Clarifications Session Timeout
  - **Files**: `src/hooks/useAuth.ts` (update)
  - **Content**: Show warning 2min before 30min timeout, auto-logout + redirect to login
  - **Verify**: Inactive for 30min → logged out automatically

**Checkpoint**: Phase 3 complete. 16 pages rendering with mock data. All 4 states working. Ready for Phase 4 (design-sync).

---

# Phase 4: Design-Sync & Visual Validation (Quality Gate)

**Purpose**: Validate React UI against Claude Design before Supabase integration  
**Duration**: ~8 hours  
**Exit Criteria**: design-sync report shows zero critical diffs, all MEDIUM issues fixed

## 4.1 Pre-Design-Sync Code Validation

- [ ] T049 Run TypeScript type-check (`npm run type-check`)
  - **Verify**: 0 TypeScript errors

- [ ] T050 [P] Run ESLint (`npm run lint`) and fix violations
  - **Verify**: 0 lint errors

- [ ] T051 [P] Run unit tests (`npm run test`)
  - **Verify**: All component tests pass

- [ ] T052 Review component file structure matches design.md components list
  - **Files**: `src/components/common/`, `src/components/hero/`, `src/components/lists/`, `src/components/forms/`
  - **Verify**: All 7 required components exist + Header, Button, Input, Textarea, Badge, Loading, Empty, Error, Unauthorized

## 4.2 Design-Sync Execution

- [ ] T053 Run /design-sync to compare React components against Claude Design .dc.html files
  - **Command**: `npm run design-sync`
  - **Input**: React components in src/, Claude Design files in design/app/
  - **Output**: design.sync.report.json with diffs
  - **Verify**: Report generated without errors

- [ ] T054 Review design.sync.report.json for CRITICAL and HIGH severity issues
  - **Files**: `design.sync.report.json`
  - **Categories**: Layout, Typography, Colors, Spacing, Responsive, Components
  - **Action**: Extract all issues into GitHub issues or task list

## 4.3 Fix CRITICAL & HIGH Issues (Design Drift)

- [ ] T055 Fix layout structure diffs (grid columns, flex properties, positioning)
  - **Spec**: Design drift on Core screens
  - **Verify**: design-sync layout section shows passing

- [ ] T056 [P] Fix typography diffs (font-size, font-weight, font-family, line-height)
  - **Spec**: FR-009 (consistency across stages)
  - **Verify**: All text matches design tokens

- [ ] T057 [P] Fix color diffs (check all oklch() values match design.md §11)
  - **Spec**: design.md §11 Design Tokens
  - **Verify**: All colors use CSS variables from tokens.css

- [ ] T058 [P] Fix spacing diffs (padding, margin, gap)
  - **Design**: §13 Spacing
  - **Verify**: Spacing matches design.md gap scale (8px, 12px, 16px, 24px, 40px)

- [ ] T059 [P] Fix responsive breakpoint issues (1200px, 960px, 640px)
  - **Design**: §6 Responsive Rules, §4 Layouts
  - **Verify**: design-sync responsive section passes

- [ ] T060 [P] Fix component size/style diffs (button sizes, input heights, badge styling)
  - **Design**: §9 Component Patterns
  - **Verify**: All components match design visuals

## 4.4 Fix MEDIUM Issues & Accessibility

- [ ] T061 Fix color-only status indicators (add text + icon labels)
  - **Spec**: WCAG AA accessibility
  - **Files**: AdminDashboardPage, Badge components
  - **Examples**: "(긴급)" label + danger color, "(점검필요)" label + danger color
  - **Verify**: Run Lighthouse → accessibility ≥95

- [ ] T062 [P] Fix focus states and keyboard navigation
  - **Design**: §18 Accessibility
  - **Verify**: Tab key navigates all interactive elements, focus ring visible

- [ ] T063 [P] Fix prefers-reduced-motion edge cases
  - **Design**: §17 prefers-reduced-motion
  - **Verify**: Toggle in DevTools → all animations/transitions are instant

## 4.5 Regression & Sign-Off

- [ ] T064 Run full test suite including accessibility audit
  - **Command**: `npm run test && npm run build`
  - **Verify**: All tests pass, build succeeds without warnings

- [ ] T065 Manual visual inspection on 3 breakpoints (desktop, tablet, mobile)
  - **Duration**: 1-2 hours
  - **Verify**: All 16 pages match Claude Design at each breakpoint

- [ ] T066 Re-run /design-sync to confirm all issues resolved
  - **Command**: `npm run design-sync`
  - **Verify**: Report shows 0 critical, 0 high issues

**Checkpoint**: design-sync clean. Phase 3 UI approved. Ready for Phase 5 (Supabase integration).

---

# Phase 5: Supabase Foundation (Blocking Gate for User Stories)

**Purpose**: Setup Supabase Auth + PostgreSQL + RLS policies  
**Duration**: ~6 hours  
**Exit Criteria**: Real Supabase project configured, schema + RLS deployed, .env.local set up

## 5.1 Supabase Project Setup

- [ ] T067 Create Supabase project (https://supabase.com)
  - **Docs**: https://supabase.com/docs
  - **Output**: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - **Verify**: Connection test via Supabase dashboard succeeds

- [ ] T068 Deploy database schema from contracts/schema.sql to Supabase
  - **Files**: `contracts/schema.sql`
  - **Method**: Supabase dashboard → SQL Editor → paste + run
  - **Verify**: All 6 tables created (members, announcements, documents, inquiries, subscriptions, api_credentials)

- [ ] T069 [P] Deploy RLS policies from contracts/rls-policies.sql
  - **Files**: `contracts/rls-policies.sql`
  - **Method**: Supabase dashboard → SQL Editor → paste + run
  - **Verify**: All policies enabled, test policies work

- [ ] T070 [P] Configure Supabase Auth settings (email/password provider)
  - **Docs**: Supabase Auth docs
  - **Settings**: Enable email/password auth, disable social login for Phase 1
  - **Verify**: Auth tab shows email/password enabled

- [ ] T071 [P] Insert sample mock data into tables (via SQL Editor)
  - **Files**: `contracts/schema.sql` (sample data section)
  - **Verify**: SELECT from each table returns data

## 5.2 Environment Configuration

- [ ] T072 Create .env.local with Supabase credentials
  - **Files**: `.env.local`
  - **Content**: 
    ```
    VITE_SUPABASE_URL=https://xxx.supabase.co
    VITE_SUPABASE_ANON_KEY=xxx
    ```
  - **Verify**: `console.log(import.meta.env.VITE_SUPABASE_URL)` in browser console shows URL

- [ ] T073 Create Supabase client initialization module
  - **Files**: `src/services/supabase.ts`
  - **Content**: `createClient(URL, ANON_KEY)` with type definitions
  - **Verify**: Can import and use client in hooks

## 5.3 Update Mock Hooks for Supabase (Phase 2+ Strategy)

- [ ] T074 Update useAuth hook with Supabase Auth provider switch logic
  - **Files**: `src/hooks/useAuth.ts`
  - **Logic**: IF ENV=development THEN use mock, ELSE use Supabase Auth
  - **Verify**: Mock still works in dev, Supabase Auth used in test env

- [ ] T075 Update useAnnouncements, useDocuments, useInquiries hooks with Supabase RLS awareness
  - **Files**: `src/hooks/useAnnouncements.ts`, `useDocuments.ts`, `useInquiries.ts`
  - **Logic**: Hooks aware of Supabase but still use mock data in Phase 1
  - **Verify**: No errors when importing Supabase client

**Checkpoint**: Supabase ready. Schema + RLS deployed. Ready for Phase 6.

---

# Phase 6: Member Core Functionality (User Stories 1-4)

**Purpose**: Connect member features to Supabase Auth + data  
**Duration**: ~20 hours  
**Exit Criteria**: Member signup, login, document CRUD, all with real Supabase

## 6.1 User Story 1: Authentication (FR-001, FR-002, FR-003)

- [ ] T076 Implement Supabase Auth signup (email + password → members table)
  - **Spec**: FR-001, User Story 1
  - **Files**: `src/pages/public/SignupPage/SignupPage.tsx` (update), `src/hooks/useAuth.ts` (update)
  - **Flow**: Form → `supabase.auth.signUpWithPassword()` → creates members row
  - **Verify**: New user can sign up, exists in members table

- [ ] T077 [P] Implement Supabase Auth login (email + password → session)
  - **Spec**: FR-002, User Story 1
  - **Files**: `src/pages/public/LoginPage/LoginPage.tsx` (update), `src/hooks/useAuth.ts` (update)
  - **Flow**: Form → `supabase.auth.signInWithPassword()` → get JWT
  - **Verify**: Login redirects to announcements page, JWT in localStorage

- [ ] T078 [P] Implement logout (clear session)
  - **Spec**: FR-002, User Story 1
  - **Files**: `src/hooks/useAuth.ts` (update)
  - **Flow**: Click logout → `supabase.auth.signOut()` → redirect to login
  - **Verify**: After logout, protected pages show LoginGuard

- [ ] T079 Implement route protection (ProtectedRoute component)
  - **Spec**: FR-003, SC-006
  - **Design**: §5.2 LoginGuide
  - **Files**: `src/components/common/ProtectedRoute/ProtectedRoute.tsx`
  - **Logic**: Check `isAuthenticated` → render page or LoginGuard
  - **Verify**: Non-logged-in user accessing /documents → sees LoginGuard

- [ ] T080 [P] Add session timeout after 30 minutes inactivity + 2min warning
  - **Spec**: §Clarifications Session Timeout
  - **Files**: `src/hooks/useAuth.ts` (update)
  - **Verify**: Idle for 30min → auto-logout

- [ ] T081 [P] Implement password reset flow (send email link)
  - **Spec**: §Clarifications Password Reset
  - **Files**: `src/pages/public/ForgotPasswordPage/ForgotPasswordPage.tsx`
  - **Flow**: Email form → `supabase.auth.resetPasswordForEmail()` → user receives link
  - **Verify**: Email validation works

## 6.2 User Story 2: Announcements (FR-005, FR-006, FR-023)

- [ ] T082 Connect AnnouncementListPage to Supabase (fetch from announcements table)
  - **Spec**: FR-005, FR-023, User Story 2
  - **Files**: `src/hooks/useAnnouncements.ts` (update)
  - **Query**: `supabase.from('announcements').select('*')`
  - **Verify**: Real announcements display instead of mock

- [ ] T083 Implement announcement search with Supabase filtering (title, agency, number)
  - **Spec**: User Story 2 Acceptance 1
  - **Files**: `src/hooks/useAnnouncements.ts` (update)
  - **Query**: `.filter('title', 'ilike', `%${query}%`)`
  - **Verify**: Search filters correctly

- [ ] T084 [P] Implement category filter and sorting by deadline
  - **Spec**: design-brief.md §5.5
  - **Files**: `src/hooks/useAnnouncements.ts` (update)
  - **Query**: `.filter('category', 'eq', category).order('deadline', ...)`
  - **Verify**: Filter + sort work together

- [ ] T085 [P] Add API error handling with retry (User Story 2 Acceptance 3)
  - **Spec**: Edge Case, FR-005
  - **Files**: `src/hooks/useAnnouncements.ts` (update)
  - **Verify**: When Supabase unavailable, error UI shows with retry button

## 6.3 User Story 3: Document Creation (FR-008, FR-009, FR-010)

- [ ] T086 Connect PlanWizardPage to Supabase documents table (insert)
  - **Spec**: FR-008, FR-010, User Story 3
  - **Files**: `src/pages/member/PlanWizardPage/PlanWizardPage.tsx` (update), `src/hooks/useDocuments.ts` (update)
  - **Flow**: Form submit → `supabase.from('documents').insert({ ... })`
  - **Verify**: New document appears in database

- [ ] T087 [P] Implement auto-save every 15 seconds (update documents table)
  - **Spec**: §Clarifications Document Persistence, SC-003
  - **Files**: `src/hooks/useDocuments.ts` (update), PlanWizardPage (update)
  - **Flow**: `setInterval(() => update(), 15000)`
  - **Verify**: Changes auto-saved, survive page reload

- [ ] T088 [P] Implement step persistence (user can resume from last step)
  - **Spec**: FR-010, User Story 3 Acceptance 3
  - **Files**: PlanWizardPage (update)
  - **Query**: Load last document, resume from `step_current`
  - **Verify**: Close wizard → reopen → resume from step 3

- [ ] T089 [P] Implement UI consistency across steps (same styling as MainPage)
  - **Spec**: FR-009, SC-008
  - **Design**: §5.7 Wizard, §2 Baseline
  - **Verify**: Each step uses same Button, Card, Badge components

## 6.4 User Story 4: Download (FR-011)

- [ ] T090 Implement PDF download button (Phase 1: UI only, no generation)
  - **Spec**: FR-011, SC-004 (Phase 2+)
  - **Files**: `src/pages/member/MyDocumentsPage/MyDocumentsPage.tsx` (update)
  - **Content**: Button that would trigger download (disabled in Phase 1)
  - **Verify**: Button renders, shows disabled state

- [ ] T091 [P] Implement DOCX download button (Phase 1: UI only)
  - **Spec**: FR-011, SC-004 (Phase 2+)
  - **Verify**: Same as PDF

- [ ] T092 [P] Add user satisfaction check for UI consistency (SC-008)
  - **Spec**: SC-008 (90% consistency survey)
  - **Files**: Create form in browser console for manual testing
  - **Verify**: All pages use consistent colors, spacing, typography

## 6.5 Member Data Access Control (RLS)

- [ ] T093 Verify RLS on documents (member sees own only)
  - **Spec**: FR-004
  - **Test**: Query as User A → see own docs, don't see User B's docs
  - **Verify**: RLS policy enforces isolation

- [ ] T094 Verify RLS on documents insert (member can only create for self)
  - **Spec**: FR-004
  - **Test**: Try to insert document with member_id=other_user → fails
  - **Verify**: INSERT blocked by RLS

**Checkpoint**: Member features complete (Stories 1-4). Auth working, documents persisted. Ready for Phase 7.

---

# Phase 7: Admin Functionality (User Stories 5-6)

**Purpose**: Connect admin features to Supabase  
**Duration**: ~12 hours  
**Exit Criteria**: Admin login works, can view members + manage API credentials, subscription gating works

## 7.1 User Story 5: Admin Management (FR-012, FR-013, FR-023)

- [ ] T095 Implement admin role detection in useAuth hook
  - **Spec**: FR-020, FR-012
  - **Files**: `src/hooks/useAuth.ts` (update)
  - **Logic**: Query members table for `role = 'admin'`
  - **Verify**: Admin user detected, regular member is not

- [ ] T096 Implement admin-only route protection
  - **Spec**: FR-013
  - **Files**: `src/components/common/ProtectedRoute/ProtectedRoute.tsx` (update)
  - **Logic**: Check `role === 'admin'` before rendering admin pages
  - **Verify**: Regular member accessing /admin/* → 403 Forbidden

- [ ] T097 Connect MemberManagementPage to Supabase (fetch all members)
  - **Spec**: FR-012, User Story 5
  - **Files**: `src/pages/admin/MemberManagementPage/MemberManagementPage.tsx` (update)
  - **Query**: `supabase.from('members').select('*')`
  - **Verify**: Admin sees all members

- [ ] T098 [P] Implement member search/filter on admin page
  - **Spec**: User Story 5 Acceptance 1
  - **Files**: MemberManagementPage (update)
  - **Query**: Filter by email/company
  - **Verify**: Search works

- [ ] T099 [P] Create ApiCredentialsPage (manage narajangeo API keys)
  - **Spec**: FR-007, FR-013, User Story 5
  - **Design**: §5.17 API Credentials
  - **Files**: `src/pages/admin/ApiCredentialsPage/ApiCredentialsPage.tsx`
  - **Actions**: List all credentials, add new, enable/disable, delete
  - **Verify**: Admin can manage API creds

- [ ] T100 [P] Add API status display (last sync time + result)
  - **Spec**: FR-023
  - **Files**: AdminDashboardPage (update), ApiCredentialsPage
  - **Verify**: Shows "연동 정상" or "연동 실패" + timestamp

- [ ] T101 [P] Verify RLS on admin tables (api_credentials accessible to admin only)
  - **Spec**: FR-013
  - **Test**: Regular member tries to query api_credentials → error
  - **Verify**: RLS blocks non-admin access

## 7.2 User Story 6: Subscription Gating (FR-015)

- [ ] T102 Implement subscription status check in core routes
  - **Spec**: FR-015
  - **Files**: `src/hooks/useAuth.ts` (update), ProtectedRoute (update)
  - **Logic**: If member not subscribed → redirect to SubscriptionGuidePage
  - **Verify**: Unsubscribed member accessing /announcements → subscription guide

- [ ] T103 Create SubscriptionPage in admin to manage subscription settings
  - **Spec**: FR-014, User Story 6
  - **Design**: §5.17 Subscription billing
  - **Files**: `src/pages/admin/SubscriptionPage/SubscriptionPage.tsx`
  - **Content**: Mock: show subscription pricing, CTA
  - **Verify**: Admin can configure subscription

- [ ] T104 [P] Implement expiration date handling (allow access to completed docs, block new work)
  - **Spec**: §Clarifications Expired Subscription
  - **Files**: `src/hooks/useDocuments.ts` (update)
  - **Logic**: Completed docs queryable, new doc creation blocked
  - **Verify**: Expired member can see old docs but not create new

## 7.3 Admin Dashboard Metrics

- [ ] T105 Update AdminDashboardPage metrics (fetch from database)
  - **Spec**: FR-023, User Story 5
  - **Design**: §5.15 Admin Dashboard
  - **Files**: AdminDashboardPage (update)
  - **Metrics**: 
    - Total members: COUNT(*) from members
    - Subscribed: COUNT(*) where subscription_status='active'
    - Pending inquiries: COUNT(*) where status='pending'
    - Failed APIs: COUNT(*) where last_sync_status='failed'
  - **Verify**: Metrics update when data changes

- [ ] T106 [P] Implement API status mini-cards (show sync results per agency)
  - **Spec**: FR-023
  - **Files**: AdminDashboardPage (update)
  - **Verify**: Shows "연동 정상" / "연동 실패" per agency

- [ ] T107 [P] Implement recent inquiries section (link to inquiry management)
  - **Spec**: User Story 7 integration
  - **Files**: AdminDashboardPage (update)
  - **Verify**: Recent inquiries displayed with status

**Checkpoint**: Admin features complete (Stories 5-6). Role-based access working. Ready for Phase 8.

---

# Phase 8: User Story 7 & Testing (Quality Assurance)

**Purpose**: Implement Q&A system, run all tests, validate MVP  
**Duration**: ~12 hours  
**Exit Criteria**: All 7 user stories functional, tests pass, quickstart.md validation succeeds

## 8.1 User Story 7: Inquiries (FR-016, FR-017, FR-018, FR-019)

- [ ] T108 Connect InquiryListPage to Supabase inquiries table
  - **Spec**: FR-016, User Story 7
  - **Files**: `src/pages/member/InquiryListPage/InquiryListPage.tsx` (update)
  - **Query**: `supabase.from('inquiries').select('*').eq('member_id', user.id)`
  - **Verify**: Member sees own inquiries only

- [ ] T109 [P] Implement inquiry creation (POST to inquiries table)
  - **Spec**: FR-016, User Story 7 Acceptance 1
  - **Files**: Inquiry creation form
  - **Verify**: New inquiry appears in list

- [ ] T110 [P] Implement edit/delete for unanswered inquiries
  - **Spec**: FR-019
  - **Files**: InquiryListPage (update)
  - **Logic**: Show edit/delete buttons only if status='pending'
  - **Verify**: Edit works, delete works, save to DB

- [ ] T111 [P] Lock inquiries after admin responds
  - **Spec**: FR-018
  - **Files**: InquiryDetailPage
  - **Logic**: If status='answered', hide edit/delete buttons
  - **Verify**: Answered inquiry read-only

- [ ] T112 Create InquiryManagementPage (admin view all inquiries + respond)
  - **Spec**: FR-017, User Story 7
  - **Design**: §5.18 Inquiry management
  - **Files**: `src/pages/admin/InquiryManagementPage/InquiryManagementPage.tsx`
  - **Actions**: View all inquiries, click to respond, add admin_response
  - **Verify**: Admin can respond to inquiries

- [ ] T113 [P] Implement admin response saving (update inquiries with response)
  - **Spec**: FR-017
  - **Files**: InquiryManagementPage
  - **Query**: `supabase.from('inquiries').update({ admin_response, status: 'answered' })`
  - **Verify**: Response saved, member sees it

- [ ] T114 [P] Verify RLS on inquiries (member sees own, admin sees all)
  - **Spec**: FR-004
  - **Test**: User A queries inquiries → sees own only, admin sees all
  - **Verify**: RLS policies work

## 8.2 Comprehensive Testing

- [ ] T115 Write unit tests for all hooks (useAuth, useAnnouncements, useDocuments, useInquiries)
  - **Spec**: plan.md §14 Testing Strategy
  - **Files**: `src/hooks/__tests__/useAuth.test.ts`, etc.
  - **Coverage**: ≥80% of hook logic
  - **Verify**: `npm run test` passes

- [ ] T116 [P] Write component tests for 9 core components
  - **Spec**: plan.md §14 Testing Strategy
  - **Files**: `src/components/__tests__/Button.test.tsx`, etc.
  - **Content**: Render tests, prop tests, user interaction tests
  - **Verify**: All component tests pass

- [ ] T117 [P] Write integration tests for each User Story
  - **Spec**: plan.md §14 Testing Strategy
  - **Files**: `__tests__/integration/us1-auth.test.tsx`, etc.
  - **Content**: Full user journey per story
  - **Verify**: `npm run test:integration` passes

- [ ] T118 [P] Write e2e tests with Playwright (all 7 user stories)
  - **Spec**: plan.md §14 Testing Strategy
  - **Files**: `e2e/user-story-*.spec.ts`
  - **Verify**: `npm run test:e2e` passes (only after Phase 4 sign-off)

## 8.3 Quickstart Validation

- [ ] T119 Run quickstart.md validation scenarios (Phase 1 + Phase 2 combined)
  - **Spec**: quickstart.md
  - **Scenarios**: All 12 scenarios (3 phase 1, 5 phase 2, 2 design-sync, 2 post-launch)
  - **Verify**: All scenarios pass

- [ ] T120 [P] Run Lighthouse audit (FCP <1s, LCP <2.5s, accessibility ≥95)
  - **Spec**: plan.md Performance Goals
  - **Verify**: Lighthouse report shows all green

- [ ] T121 [P] Verify WCAG AA accessibility
  - **Spec**: plan.md §Accessibility
  - **Tools**: axe DevTools, WAVE, manual testing
  - **Verify**: No accessibility violations

- [ ] T122 [P] Run security audit (check for XSS, CSRF, SQL injection vulnerabilities)
  - **Spec**: Never expose API keys, RLS enforces auth
  - **Verify**: All secrets in .env.local (never in code)

## 8.4 Final Sign-Off

- [ ] T123 Re-run all tests (`npm run test`, `npm run test:coverage`)
  - **Verify**: All tests pass, coverage ≥80%

- [ ] T124 Run full build and preview
  - **Command**: `npm run build && npm run preview`
  - **Verify**: Build succeeds, preview runs on http://localhost:4173

- [ ] T125 Create GitHub release notes documenting all 7 user stories complete
  - **Spec**: All user stories (US1-US7) with acceptance criteria met
  - **Verify**: Release tagged as v1.0.0-beta

**Checkpoint**: MVP complete. All 7 user stories working end-to-end with Supabase. Ready for production deployment.

---

## Dependencies & Execution Strategy

### Phase Blocking Order

```
Phase 1 (Setup) ✓
    ↓
Phase 2 (Design System) ✓ [BLOCKS all phases]
    ↓
Phase 3 (UI + Mock Data) ✓
    ↓
Phase 4 (Design-Sync) ✓ [GATE: must pass before Supabase]
    ↓
Phase 5 (Supabase Setup) ✓ [BLOCKS all user stories]
    ↓
Phase 6 (Member Stories 1-4) ✓
Phase 7 (Admin Stories 5-6) ✓ [Can run parallel with Phase 6]
    ↓
Phase 8 (Story 7 + Testing) ✓
```

### User Story Parallelization

After Phase 5 (Supabase ready):
- **Developer A**: Phase 6 (Stories 1-4: Auth, Announcements, Documents, Download)
- **Developer B**: Phase 7 (Stories 5-6: Admin Member/API management, Subscriptions)
- **Developer C**: Phase 8 (Story 7: Inquiries + all tests)

Each story can be independently tested and validated.

### Parallel Opportunities Within Phases

**Phase 2**: T002, T003, T004, T005, T006 can run in parallel (different files)  
**Phase 3**: T015-T023 (component creation) can be parallelized by developer  
**Phase 4**: T050, T051, T056-T060 can run in parallel (fix different components)  
**Phase 5**: T069-T071 can run in parallel (independent Supabase configs)  
**Phase 6-7**: Different stories can be worked on simultaneously

### MVP Scope Definition

**Minimum to ship (Phase 1-4 + 6):**
- User Stories 1-4 (member auth + announcements + documents)
- Design-sync validated
- No Supabase integration needed (mock data sufficient for MVP)
- Can launch to beta testers with mock data

**Optional (Phase 5-8):**
- Supabase integration
- Admin features (Story 5)
- Subscription gating (Story 6)
- Q&A system (Story 7)
- Full test coverage

---

## Validation Checkpoints

| Checkpoint | Phase | Validation | Success Criteria |
|-----------|-------|-----------|-----------------|
| **Setup Complete** | 1 | `npm run dev` starts | Dev server on 5173 |
| **Design System Ready** | 2 | All 9 components render | Browser displays no errors |
| **UI Mockup Done** | 3 | 16 pages + 4 states | All pages render locally |
| **Design-Sync Clean** | 4 | `/design-sync` report | 0 CRITICAL, 0 HIGH issues |
| **Supabase Ready** | 5 | Schema + RLS deployed | Can query tables via console |
| **Member Features Done** | 6 | Stories 1-4 functional | Auth + documents working |
| **Admin Features Done** | 7 | Stories 5-6 functional | Member + API management |
| **Complete & Tested** | 8 | All tests pass | 7 user stories validated |

---

**Total Tasks**: 125  
**Estimated Duration**: 72-96 hours (2-3 weeks for 2-3 developers)  
**Start Date**: 2026-08-30  
**Target MVP Launch**: 2026-09-15 (Phase 1-4 + 6)  
**Full Feature Launch**: 2026-09-30 (Phase 5-8)
