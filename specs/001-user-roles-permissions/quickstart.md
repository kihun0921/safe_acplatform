# Quickstart & Validation: 올케어안전플랫폼

Generated: 2026-08-29

---

## Overview

This guide provides step-by-step validation scenarios to prove the UI implementation works end-to-end with mock data (Phase 1) and integrates correctly with Supabase (Phase 2).

---

## Phase 1: UI with Mock Data

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd acplatform

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# → http://localhost:5173 opens automatically
```

### Validation Scenarios

#### Scenario 1: Public User Browses Main Page

**Goal**: Verify main page renders with hero section, announcements, and features

**Steps**:
1. Open browser: http://localhost:5173
2. See **올케어안전플랫폼** logo + hero section
3. Verify hero displays:
   - Main heading: "안전계획서 AI 자동 작성"
   - Search box for announcements
   - Features grid (4 items)
4. Scroll down: verify announcement cards show
   - Title, agency, deadline, D-day
5. See footer with links

**Expected Outcome**: ✅ Hero section visible, announcements loaded from mock data

**Pass Criteria**:
- Page loads in <2 seconds
- No console errors
- Mobile responsive (test at 640px width)

---

#### Scenario 2: User Signs Up

**Goal**: Verify signup form validation and mock auth flow

**Steps**:
1. Click "회원가입" button on main page
2. Fill signup form:
   - Email: `test@example.com`
   - Password: `password123456`
   - Company: `테스트건설`
   - Manager: `테스트담당`
   - Phone: `010-1234-5678`
   - Registration #: `123-45-67890`
3. Submit form
4. Verify redirect to login or member dashboard

**Expected Outcome**: ✅ User created in mock data, session stored in localStorage

**Pass Criteria**:
- Form validates all required fields
- Error messages appear for invalid input (bad email format, short password)
- `(필수)` label visible next to asterisks (accessibility)
- On success: localStorage contains `currentUser` key

---

#### Scenario 3: User Logs In

**Goal**: Verify login flow and role-based routing

**Steps**:
1. Navigate to login page (`/login`)
2. Enter credentials:
   - Email: `manager@ooconst.co.kr`
   - Password: `password123`
3. Click login
4. Verify redirect to `/announcements` (member dashboard)
5. See header with user initials avatar ("담") and navigation menu

**Expected Outcome**: ✅ User authenticated, redirected to member area

**Pass Criteria**:
- Auth state restored from localStorage
- User menu shows: "담당자님" + logout link
- Mobile menu button (hamburger) appears and toggles drawer
- Session persists on page reload

---

#### Scenario 4: Member Views Announcements

**Goal**: Verify announcement search and list view

**Steps**:
1. Login as member (see Scenario 3)
2. Navigate to `/announcements`
3. Verify list shows 3 mock announcements:
   - "OO초등학교 증축공사" (OO교육청, 2026-09-01)
   - "OO지방도로 확장 공사" (OO도로시설공단, 2026-09-07)
   - "OO변전소 개보수 공사" (한국전력공사, 2026-09-15)
4. Test search box: type "초등" → filter shows only first announcement
5. Click announcement → navigate to detail page

**Expected Outcome**: ✅ Announcements list filters correctly, detail page loads

**Pass Criteria**:
- No console errors
- Search is case-insensitive
- Detail page shows full announcement + "계획서 작성" button
- RLS prep: verify Supabase would enforce member-only access (Phase 2)

---

#### Scenario 5: Member Creates Document (Plan Wizard)

**Goal**: Verify multi-step form with mock data persistence

**Steps**:
1. From announcement detail, click "계획서 작성"
2. Enter Step 1 (project info):
   - Project name: "테스트 공사"
   - Location: "서울"
   - Manager: "테스트"
3. Click "다음 단계" → verify Step 2 loads
4. Enter Step 2 (safety info):
   - Safety Manager: "박안전"
   - Hazards: "추락"
5. Click "다음 단계" → Step 3 loads
6. Click "완료" → verify success message
7. Navigate to `/documents` → see new document in "완료" tab

**Expected Outcome**: ✅ Multi-step form saves data, document appears in list

**Pass Criteria**:
- Progress bar updates (25%, 50%, 75%, 100%)
- Form data persists if user navigates away and returns (mock localStorage or state)
- "다시 작성" button allows re-editing
- PDF/DOCX download buttons visible (UI only; no actual file in Phase 1)

---

#### Scenario 6: Member Views My Page

**Goal**: Verify profile info and subscription status

**Steps**:
1. Click user avatar or "마이페이지" link
2. See member profile:
   - Company: "OO건설(주)"
   - Manager: "김담당"
   - Email: "manager@ooconst.co.kr"
   - Subscription: "구독 불가"
3. See "구독 가이드" button
4. Click button → navigate to `/subscription-guide`

**Expected Outcome**: ✅ Profile displayed, subscription info shown

**Pass Criteria**:
- Read-only display (no edit in Phase 1)
- Subscription status matches mock data
- Mobile layout stacks vertically

---

#### Scenario 7: Member Submits Inquiry

**Goal**: Verify inquiry form submission and list

**Steps**:
1. Navigate to `/inquiries`
2. Click "문의 작성"
3. Fill form:
   - Title: "계획서 저장이 안 됩니다"
   - Content: "Step 2에서 저장을 누르면 에러가 나요"
4. Submit
5. Verify redirect to inquiry list
6. See new inquiry with "답변 대기" badge

**Expected Outcome**: ✅ Inquiry created, visible in list with correct status

**Pass Criteria**:
- Inquiry list shows all user inquiries
- Status badge color correct (warn/danger for pending)
- Form validation: title/content required, min length enforced
- Mock: Admin can view inquiry via `/admin/inquiries`

---

#### Scenario 8: Admin Logs In

**Goal**: Verify admin-only access and layout

**Steps**:
1. Navigate to `/login`
2. Click "관리자 로그인" tab
3. Enter admin credentials:
   - Email: `admin@oacplatform.co.kr`
   - Password: `admin123`
4. Verify redirect to `/admin/dashboard`
5. See admin header (dark blue, "관리자" badge)
6. See admin navigation: 대시보드, 회원관리, API관리, 결제관리, 문의관리

**Expected Outcome**: ✅ Admin role detected, admin UI shown

**Pass Criteria**:
- Header background different from member (dark blue)
- Navigation links admin-only
- Non-admin cannot access `/admin/*` (Unauthorized state shown)
- Mobile hamburger menu includes admin links

---

#### Scenario 9: Admin Views Dashboard

**Goal**: Verify admin analytics and cards

**Steps**:
1. Login as admin (Scenario 8)
2. Navigate to `/admin/dashboard` (auto-redirect)
3. See metric cards:
   - 전체 회원: 128명
   - 구독중 회원: 94명
   - 답변 대기 문의: 3건 (긴급 label in red)
   - 연동 실패 API: 1건 (점검필요 label in red)
4. Scroll down: see API status list + recent inquiries
5. Verify no color-only indicators (all have text labels)

**Expected Outcome**: ✅ Dashboard loads, metrics display correctly

**Pass Criteria**:
- WCAG: Urgent/warning statuses have text + color + icon (not color alone)
- Cards responsive: 4 columns (desktop), 2 (tablet), 1 (mobile)
- Mock: Admin can manage members, API creds, billing, inquiries

---

#### Scenario 10: Admin Manages Members

**Goal**: Verify admin member list and actions

**Steps**:
1. Click "회원관리" in admin header
2. See member table: email, company, manager, subscription status
3. Click member → see detail view
4. Verify edit/deactivate buttons (mock: don't actually save)
5. Return to list, test search/filter by company

**Expected Outcome**: ✅ Member list displays, admin can view details

**Pass Criteria**:
- Table is sortable (click header)
- Search filters by email or company
- Pagination works (if >10 members)

---

#### Scenario 11: Accessibility Check

**Goal**: Verify WCAG AA compliance

**Steps**:
1. Run Lighthouse audit (DevTools → Lighthouse)
2. Verify:
   - All images have alt text
   - All buttons/links keyboard accessible (Tab key)
   - Focus ring visible
   - Color contrast ≥ 4.5:1
3. Test with screen reader (NVDA, JAWS, or VoiceOver)
4. Test prefers-reduced-motion: in DevTools, toggle "Reduced motion"
   - Animations should be instant (no delay)

**Expected Outcome**: ✅ Accessibility score ≥95

**Pass Criteria**:
- Keyboard navigation works on all pages
- `aria-label` present on icon buttons
- `role="progressbar" aria-valuenow` on progress indicators
- No color-only status indicators (Signup, AdminDashboard tested)
- Form labels `<label for="">` properly associated

---

#### Scenario 12: Responsive Design

**Goal**: Verify mobile, tablet, desktop layouts

**Steps**:
1. Open DevTools → toggle device toolbar
2. Test at 3 breakpoints:
   - **Mobile (640px)**: Single column, hamburger menu
   - **Tablet (960px)**: 2-column grids, nav links hidden
   - **Desktop (1200px)**: 4-column grids, nav visible
3. Test at intermediate sizes (e.g., 800px, 1000px)
4. Verify no horizontal scroll at any width

**Expected Outcome**: ✅ All layouts responsive, no scroll

**Pass Criteria**:
- Hero section stacks properly
- Announcement cards reflow correctly
- Form fields full width on mobile
- Touch targets ≥44px (mobile button size)

---

### Phase 1 Test Summary

**Run all tests**:
```bash
npm run test
npm run test:coverage
```

**Expected**: All unit/component tests pass, coverage >80%

---

## Phase 2: Supabase Integration

### Prerequisites

- Supabase project created (https://supabase.com)
- `.env.local` configured with Supabase credentials:
  ```
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=xxx
  ```
- Database schema and RLS policies deployed (see `contracts/schema.sql`, `contracts/rls-policies.sql`)

### Setup

```bash
# 1. Deploy schema to Supabase
# In Supabase dashboard → SQL Editor → Run contracts/schema.sql

# 2. Update .env.local with real credentials

# 3. Restart dev server
npm run dev
```

### Validation Scenarios

#### Scenario 1: Real Auth - User Signs Up

**Goal**: Verify Supabase Auth signup works end-to-end

**Steps**:
1. On main page, click "회원가입"
2. Fill form with unique email (e.g., `testuser+{timestamp}@example.com`)
3. Submit
4. Verify email confirmation flow (if configured in Supabase)
5. Login with new credentials
6. Verify session persists across page reload

**Expected Outcome**: ✅ User row created in PostgreSQL, JWT session active

**Pass Criteria**:
- No console errors
- `localStorage` contains Supabase session
- User can logout and login again

---

#### Scenario 2: Real Announcements - Sync from API

**Goal**: Verify announcements synced from NaraJangTeo API

**Steps**:
1. As admin, navigate to `/admin/api-credentials`
2. Add API key for NaraJangTeo
3. Trigger sync (button or manual call)
4. Wait for sync job
5. Check announcements list for new entries

**Expected Outcome**: ✅ Real announcements populated in PostgreSQL

**Pass Criteria**:
- Announcements appear in member search
- No duplicates (unique index prevents inserts)

---

#### Scenario 3: RLS Enforcement - Member Can't See Others' Docs

**Goal**: Verify RLS policy prevents unauthorized access

**Steps**:
1. Login as user A
2. Create document
3. Copy document ID
4. Login as user B
5. Try to access document via API:
   ```bash
   curl https://xxx.supabase.co/rest/v1/documents?id=eq.{doc_id} \
     -H "Authorization: Bearer {user_b_jwt}"
   ```
6. Verify empty result (403 Forbidden or empty array)

**Expected Outcome**: ✅ RLS policy enforces member isolation

**Pass Criteria**:
- Member B cannot read user A's document
- Admin can read all documents

---

#### Scenario 4: Real Document Persistence

**Goal**: Verify documents saved to PostgreSQL survive refresh

**Steps**:
1. Login as member
2. Create document, fill Step 1
3. Refresh page (Cmd+R)
4. Navigate back to document
5. Verify Step 1 data still there

**Expected Outcome**: ✅ Document persisted to DB, not just localStorage

**Pass Criteria**:
- No data loss on refresh
- `updated_at` timestamp updates on edit

---

#### Scenario 5: Real Inquiry Response

**Goal**: Verify admin can respond to inquiry in real-time

**Setup**:
- Two browsers/tabs open
- One logged in as member
- One logged in as admin

**Steps**:
1. Member: Create inquiry "테스트 질문"
2. Admin: Navigate to inquiry management
3. Admin: See new inquiry in pending list
4. Admin: Fill response + click "답변하기"
5. Member: Refresh or check inquiries list
6. Verify status changed to "답변 완료" + response visible

**Expected Outcome**: ✅ Real-time updates via Supabase

**Pass Criteria**:
- Admin response saved to PostgreSQL
- Member sees status update immediately

---

### Phase 2 Test Summary

```bash
npm run test              # Run all tests
npm run test:coverage     # Coverage report
npm run build             # Production build
npm run preview           # Test production build locally
```

---

## Post-Implementation: Design-Sync

### Prerequisites

- Phase 1 UI complete with mock data
- All 16 pages rendering correctly
- Responsive tests passed
- Accessibility audit passed

### Run Design-Sync

```bash
npm run design-sync
# OR manually trigger via Claude Code
```

### Validation

Design-Sync compares React components against Claude Design `.dc.html` files and reports:

1. **Layout Structure**: Matches grid/flex layout
2. **Typography**: Matches font-size, font-weight, font-family
3. **Colors**: All CSS variables match oklch() values
4. **Spacing**: Padding, margin, gap consistent
5. **Responsive**: Breakpoints at 1200px, 960px, 640px

### Expected Output

**Zero differences**: ✅ UI matches design perfectly

**Minor diffs**: 🟡 Review and justify (document in PR)

**Major diffs**: ❌ Fix before merging

---

## CI/CD Integration

### Pre-Merge Checklist

```bash
# 1. Type check
npm run type-check

# 2. Lint & format
npm run lint
npm run format

# 3. Unit/Component tests
npm run test

# 4. e2e tests (Playwright)
npm run test:e2e

# 5. Build
npm run build

# 6. Design-sync (after Phase 1)
npm run design-sync
```

All must pass before merging to main.

---

## Troubleshooting

### Issue: "Cannot find module '@/components/Button'"

**Solution**: Verify Vite alias in `vite.config.ts`:
```ts
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

### Issue: "RLS violation" on document query

**Solution**: Verify user is authenticated:
```ts
const { data } = supabase.auth.getSession();
console.log('Auth session:', data);
```

### Issue: Mock data not showing

**Solution**: Verify `useAuth()` returns mock user in Phase 1:
```ts
const { user } = useAuth();
console.log('Current user:', user);
```

### Issue: Announcements empty

**Solution**: Verify mock data populated in `services/mockData.ts`:
```bash
console.log('Mock announcements:', MOCK_ANNOUNCEMENTS);
```

---

## Success Criteria Checklist

### Phase 1
- [ ] All 16 pages render with mock data
- [ ] Search/filter work correctly
- [ ] Multi-step form persists across steps
- [ ] Responsive at 3 breakpoints (640/960/1200px)
- [ ] WCAG AA accessibility passed
- [ ] Unit tests >80% coverage
- [ ] Design-sync reports zero diffs
- [ ] No console errors

### Phase 2
- [ ] Real auth signup/login/logout works
- [ ] Documents persist to PostgreSQL
- [ ] RLS enforces member isolation
- [ ] Admin can access all member data
- [ ] Inquiries sync between member/admin
- [ ] All tests still pass
- [ ] Production build successful

---

**Status**: Validation framework ready | **Next**: Begin Phase 1 implementation
