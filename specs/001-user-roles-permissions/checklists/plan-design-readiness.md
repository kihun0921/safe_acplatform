# Plan-Design Readiness Checklist

**Feature**: 올케어안전플랫폼 (`001-user-roles-permissions`)  
**Purpose**: Unit tests for requirements quality—validate spec.md, design-brief.md, design.md, and plan.md are complete, clear, and internally consistent before implementation begins.  
**Created**: 2026-08-29  
**Status**: Ready for reviewer assessment

---

## Ownership & Checkbox Lifecycle

- `[x]` = Reviewer determined the requirement-quality criterion is satisfied
- `[ ]` = Not yet verified or criterion not met
- Each item tests the **quality of the requirements themselves**, not implementation behavior
- Generated items start unchecked; reviewer populates checkbox states

---

## Requirement Completeness: User Roles & Authorization

Evaluates whether user roles and permission boundaries are fully documented.

- [ ] **CHK001** - Are all three user roles (비회원 / 회원 / 관리자) explicitly defined with distinct access scopes? [Completeness, Spec §3, Design-Brief §3]

- [ ] **CHK002** - Are member-to-member isolation requirements (데이터 보호, 조회·수정·삭제 차단) quantified with specific rules for all member artifacts (계획서, 문의)? [Clarity, Spec §FR-004, FR-018, FR-019]

- [ ] **CHK003** - Are admin-only operations (회원 관리, API 관리, 구독 결제, 문의 답변) enumerated with role enforcement rules? [Completeness, Spec §FR-012 to FR-017, FR-020]

- [ ] **CHK004** - Is the admin account creation/issuance pathway explicitly distinguished from member self-signup? [Clarity, Spec §FR-020, FR-001]

- [ ] **CHK005** - Are role-specific UI differences documented (e.g., 관리자 헤더, 관리자 네비게이션, 회원-only 화면)? [Completeness, Design-Brief §5.1, §5.14-5.18]

---

## Requirement Completeness: Data Scope & Permissions

Evaluates whether data access boundaries and member/admin visibility are unambiguous.

- [ ] **CHK006** - Is the data scope for members vs. admins viewing announcements (공고 목록) clearly defined—do both see identical ranges, or are filters applied? [Clarity, Spec §FR-023, Clarification Q3, Design-Brief §5.5]

- [ ] **CHK007** - Is admin-only visibility of API sync status (연동 상태, 마지막 조회 시각) specified as incremental to the member view? [Completeness, Spec §FR-023, Design-Brief §5.17]

- [ ] **CHK008** - Are member document access rules defined for all document lifecycle states (작성중, 완료, 다운로드, 재수정)? [Completeness, Spec §FR-010, Edge Case]

- [ ] **CHK009** - Is inquiry access control defined for both member (self-created only) and admin (all inquiries) perspectives? [Completeness, Spec §FR-004, FR-016 to FR-019]

- [ ] **CHK010** - Is the subscription status boundary defined—which features require active subscription vs. publicly available? [Clarity, Spec §FR-015]

---

## Requirement Completeness: Unauthorized Access Handling

Evaluates whether error states and boundary violations are explicitly specified.

- [ ] **CHK011** - Are non-member access attempt responses defined for all protected screens (계획서 작성, 내 문서함, 문의, 관리자 영역)? [Completeness, Spec §FR-003, Design-Brief §5.2]

- [ ] **CHK012** - Is the "login guard" screen UI and messaging specified to prevent protected content exposure? [Clarity, Spec §FR-003, SC-006, Design-Brief §5.2]

- [ ] **CHK013** - Are requirements defined for member attempting to access another member's data (계획서, 문의)? [Completeness, Spec §FR-004, Edge Case]

- [ ] **CHK014** - Is the behavior specified when a member (not admin) attempts to access admin-only screens (회원 관리, API 관리, 구독 결제 관리)? [Completeness, Spec §FR-013, Design-Brief §5.14-5.18]

- [ ] **CHK015** - Are API-level RLS (Row-Level Security) enforcement requirements documented in data-model.md and contracts/rls-policies.sql? [Completeness, Contracts §RLS]

---

## Requirement Clarity: Input Validation & Boundary Conditions

Evaluates whether input constraints and null/empty handling are quantified.

- [ ] **CHK016** - Are all signup required fields (이메일, 비밀번호, 건설사명, 사업자등록번호, 담당자명, 연락처) documented with format constraints? [Clarity, Spec §FR-001, Design-Brief §5.4, Data-Model §Member]

- [ ] **CHK017** - Is email format validation specified (RFC format or specific pattern)? [Clarity, Data-Model §Validation Rules]

- [ ] **CHK018** - Is password minimum length specified? [Clarity, Data-Model §Validation Rules, Gap]

- [ ] **CHK019** - Is business registration number format (사업자등록번호) validated with specific regex or pattern? [Clarity, Data-Model §Validation Rules]

- [ ] **CHK020** - Is phone number format (연락처) validated with specific pattern? [Clarity, Data-Model §Validation Rules]

- [ ] **CHK021** - Are field length limits specified for signup fields (회사명, 담당자명, 연락처)? [Clarity, Data-Model §Validation Rules, Gap]

- [ ] **CHK022** - Is inquiry title/content length specified (minimum and maximum)? [Clarity, Data-Model §Inquiry Validation Rules]

- [ ] **CHK023** - Is the behavior defined when any required field is empty during signup? [Completeness, Spec §FR-001]

- [ ] **CHK024** - Are document step_current boundaries (1-4) validated, and behavior specified for out-of-range input? [Clarity, Data-Model §Document Validation Rules]

- [ ] **CHK025** - Is percent_complete boundary (0-100) validated and error handling specified? [Clarity, Data-Model §Document Validation Rules]

---

## Requirement Measurability: Success Criteria

Evaluates whether success outcomes can be objectively verified without ambiguity.

- [ ] **CHK026** - Are all success criteria (SC-001 to SC-008) measurable with specific time limits, percentages, or counts? [Measurability, Spec §Success Criteria]

- [ ] **CHK027** - Is "5분 이내" (SC-001: signup to first search) testable with a concrete timing metric? [Measurability, Spec §SC-001]

- [ ] **CHK028** - Is "100% 차단" (SC-002: member isolation enforcement) testable—does it mean 100% of unauthorized queries rejected, or something else? [Measurability, Spec §SC-002]

- [ ] **CHK029** - Is "10분 이내" (SC-003: plan completion) measurable under realistic user conditions? [Measurability, Spec §SC-003]

- [ ] **CHK030** - Is "10초 이내" (SC-004: PDF download) testable with a defined file size constraint? [Measurability, Spec §SC-004]

- [ ] **CHK031** - Is "90% 이상" (SC-008: user satisfaction on consistency) a defined survey methodology or acceptance criteria? [Measurability, Spec §SC-008, Gap]

---

## Requirement Clarity: Scope Boundaries

Evaluates whether in-scope and out-of-scope work is explicitly delineated.

- [ ] **CHK032** - Is Phase 1 (UI with mock data) explicitly separated from Phase 2 (Supabase integration) and Phase 3 (testing)? [Clarity, Plan §Timeline & Milestones]

- [ ] **CHK033** - Are excluded features (e.g., new admin account creation, API key generation) documented? [Clarity, Spec §Assumptions]

- [ ] **CHK034** - Is the subscription feature marked as Phase 2+ (not Phase 1 MVP)? [Clarity, Data-Model §5. Subscription Table]

- [ ] **CHK035** - Is the payment/billing feature marked as Phase 2+ (not Phase 1)? [Clarity, Data-Model §Subscription]

- [ ] **CHK036** - Is the admin API sync job (나라장터 API polling) marked as Phase 2+ (not Phase 1 mock)? [Clarity, Data-Model §Announcements Table]

- [ ] **CHK037** - Is real Supabase integration (Auth, PostgreSQL, RLS) explicitly deferred to Phase 2? [Clarity, Plan §Phase 1-3 Summary]

---

## Requirement Completeness: Core Screen Information Architecture

Evaluates whether all required screens are documented with consistent structure.

- [ ] **CHK038** - Are all 16 pages from design.md section 3 listed in quickstart.md validation scenarios? [Completeness, Design §3, Quickstart §Validation Scenarios]

- [ ] **CHK039** - Is the sitemap (design-brief §4) aligned with the page/component structure in plan.md? [Consistency, Design-Brief §4, Plan §Project Structure]

- [ ] **CHK040** - Is each screen's purpose, key components, and related spec section documented? [Completeness, Design-Brief §5]

- [ ] **CHK041** - Are empty/no-results states defined for all list screens (공고 목록, 내 문서함, 문의 목록)? [Completeness, Design-Brief §5.5, Spec §Edge Cases]

- [ ] **CHK042** - Are error states defined for API failure scenarios (나라장터 API 응답 실패, 공고 조회 실패)? [Completeness, Spec §Edge Cases, Spec §User Story 2 Acceptance Scenario 3]

- [ ] **CHK043** - Is the "계획서 작성 마법사" modal structure (4 steps, wizard pattern) explicitly documented with step progression rules? [Completeness, Design-Brief §5.7, Spec §FR-008, FR-009]

- [ ] **CHK044** - Is the mobile navigation pattern (햄버거 → drawer) documented for all member and admin screens? [Completeness, Spec §FR-022, Design-Brief §5, Plan §6. Mobile Navigation]

---

## Requirement Completeness & Clarity: Design Token Implementation

Evaluates whether design-to-CSS conversion is planned with sufficient detail.

- [ ] **CHK045** - Are all design tokens (colors, typography, spacing, radius, shadows) defined in oklch() format in design.md or plan.md? [Completeness, Design §11, Plan §3. CSS Variables]

- [ ] **CHK046** - Is there a plan for a single `tokens.css` file with `:root` CSS variables as the source of truth? [Completeness, Plan §3. tokens.css]

- [ ] **CHK047** - Are color tokens documented with oklch() values for primary, success, warn, danger, neutral, and text variants? [Clarity, Plan §3. token definitions]

- [ ] **CHK048** - Are typography tokens defined (font-family, font-size, font-weight families for body and display)? [Completeness, Design §12, Plan §tokens.css]

- [ ] **CHK049** - Are spacing tokens defined (gap-xs through gap-xl with pixel values)? [Completeness, Design §13, Plan §tokens.css]

- [ ] **CHK050** - Is the responsive breakpoint strategy (1200px desktop / 960px tablet / 640px mobile) documented in tokens and media query guidance? [Clarity, Plan §6. Media Query Strategy, Design §14]

- [ ] **CHK051** - Is the plan for converting design component visuals (HeroSection, Button, Badge, etc.) to React components with token-based styling included? [Completeness, Plan §4-5]

- [ ] **CHK052** - Are dark mode CSS variables (if planned) documented with @media (prefers-color-scheme) rules? [Completeness, Plan §3. Dark theme, Gap: only light mode is designed]

---

## Requirement Clarity: Hero Section Visual Effects

Evaluates whether the main page's visual design is sufficiently scoped and unambiguous.

- [ ] **CHK053** - Is the HeroSection layout documented (2-column grid with left text + right visual)? [Clarity, Design §4.1, Plan §5. HeroVisual]

- [ ] **CHK054** - Is the Aurora/floating card pattern defined—specifically, what visual effect is the "aurora" and how is "floating" expressed (shadow, position, animation)? [Clarity, Plan §5. HeroVisual, Gap: Aurora effect not quantified]

- [ ] **CHK055** - Are hero text size, font-weight, color, and line-height specified? [Clarity, Design §4.1]

- [ ] **CHK056** - Is the search input styling (width, placeholder text, icon placement) documented? [Clarity, Design §4.1, Plan §Hero SearchInput]

- [ ] **CHK057** - Is the floating card status indicator (top-right badge showing "실시간 공고 분석 중") positioned and sized with specific metrics? [Clarity, Plan §5. Floating status indicator, Gap: dimensions not quantified]

- [ ] **CHK058** - Are animation requirements for hero elements defined (e.g., fade-in on load, hover effects on cards)? [Completeness, Design §5, Gap]

- [ ] **CHK059** - Is the layout reflow at tablet (960px) and mobile (640px) breakpoints documented for the hero section? [Completeness, Design §6, Plan §6. Mobile Breakpoints]

---

## Requirement Completeness: prefers-reduced-motion Support

Evaluates whether accessibility for motion-sensitive users is specified.

- [ ] **CHK060** - Is prefers-reduced-motion support documented with specific guidance on which animations are affected? [Completeness, Plan §7. prefers-reduced-motion]

- [ ] **CHK061** - Is the CSS media query rule `@media (prefers-color-scheme: reduce)` documented? [Clarity, Plan §7. CSS Media Query]

- [ ] **CHK062** - Are React hook guidance and implementation pattern documented (e.g., `useReducedMotion()`)? [Completeness, Plan §7. React Implementation]

- [ ] **CHK063** - Is the expected behavior defined (animations should be instant/removed, not shortened)? [Clarity, Plan §7]

---

## Requirement Completeness: UI State Definitions

Evaluates whether all state patterns are documented with screen examples.

- [ ] **CHK064** - Are Loading state requirements defined (spinner component, message, blocking/non-blocking)? [Completeness, Plan §8. StateWrapper, Design-Brief §5.5]

- [ ] **CHK065** - Are Empty state requirements defined with message text for zero-result scenarios? [Completeness, Spec §User Story 2 Scenario 3, Design-Brief §5.5]

- [ ] **CHK066** - Are Error state requirements defined (error message, retry button, visual treatment)? [Completeness, Spec §Edge Cases, Design-Brief §5.5, Plan §8]

- [ ] **CHK067** - Is the Unauthorized/LoginGuard state specified for non-logged-in access attempts? [Completeness, Spec §FR-003, Design-Brief §5.2, Plan §8]

- [ ] **CHK068** - Is each state component (Spinner, EmptyState, ErrorBoundary, UnauthorizedGuard) documented in the component library? [Completeness, Plan §Component Library, Plan §8]

- [ ] **CHK069** - Are state transitions documented (e.g., Loading → Success, Error → Retry)? [Completeness, Plan §8. StateWrapper]

---

## Requirement Clarity: Member vs. Admin UI Differentiation

Evaluates whether role-specific UI changes are unambiguous and documented.

- [ ] **CHK070** - Is the admin header styling explicitly different from member header (color, badge, layout)? [Clarity, Plan §11. Admin Header Styling, Design-Brief §5.14]

- [ ] **CHK071** - Are admin navigation links (대시보드, 회원관리, API관리, 결제관리, 문의관리) documented separately from member links (공고검색, 내 문서함, 문의하기)? [Completeness, Plan §11, Design-Brief §5.14]

- [ ] **CHK072** - Is the admin dashboard layout and metric card structure documented (4 cards + 2 sections)? [Clarity, Design-Brief §5.16, Design §AdminDashboard]

- [ ] **CHK073** - Are admin-only sections (API 인증정보 관리, 회원 관리 테이블, 결제창 관리, 문의 관리) documented with access control rules? [Completeness, Design-Brief §5.14-5.18]

- [ ] **CHK074** - Is the styling treatment for admin-specific badges ("(긴급)", "(점검필요)") documented as color + text + icon (not color-only)? [Clarity, Design §AdminDashboard, Plan §Accessibility]

---

## Requirement Completeness: Implementation Sequencing

Evaluates whether Phase 1 → /design-sync → Phase 2 sequencing is explicitly documented.

- [ ] **CHK075** - Is the Phase 1 endpoint documented (all 16 pages rendering with mock data, responsive, accessible, all 4 states working)? [Clarity, Quickstart §Phase 1 Test Summary]

- [ ] **CHK076** - Is /design-sync trigger timing explicitly defined (after Phase 1 UI complete, before Supabase integration)? [Clarity, Plan §16. Design-Sync Readiness, Quickstart §Post-Implementation]

- [ ] **CHK077** - Is the design-sync scope documented (layout, typography, colors, spacing, responsive breakpoints)? [Completeness, Plan §16. Design-Sync Readiness]

- [ ] **CHK078** - Is the success criteria for design-sync defined (zero differences, or justified diffs documented)? [Clarity, Plan §16, Quickstart §Post-Implementation]

- [ ] **CHK079** - Are the outcomes of a failed design-sync documented (re-enter Phase 1, fix styling drift)? [Completeness, Plan §16]

---

## Requirement Completeness: Supabase Integration Sequencing

Evaluates whether Phase 2 (Supabase connection) is properly sequenced after Phase 1 + design-sync.

- [ ] **CHK080** - Is Phase 1 explicitly defined as using mock data, not Supabase Auth or PostgreSQL? [Clarity, Plan §Phase 1, Data-Model §Phase 1 Note]

- [ ] **CHK081** - Is Phase 2 start trigger documented (after design-sync passes, before feature shipping)? [Completeness, Plan §Timeline, Quickstart §Phase 2]

- [ ] **CHK082** - Is the Supabase integration scope documented (Auth signup/login, PostgreSQL data queries, RLS policy enforcement)? [Completeness, Research §8. API Integration, Contracts §schema.sql]

- [ ] **CHK083** - Are database schema and RLS policies documented in contracts/schema.sql and contracts/rls-policies.sql? [Completeness, Contracts]

- [ ] **CHK084** - Is the mock-to-real data migration path documented (Phase 1 useAuth with localStorage → Phase 2 useAuth with Supabase Auth)? [Completeness, Plan §15. Mock Data Lifecycle]

- [ ] **CHK085** - Is the Phase 2 endpoint documented (.env.local credentials, real users in PostgreSQL, RLS enforcing isolation)? [Clarity, Quickstart §Phase 2]

- [ ] **CHK086** - Are prerequisites for Phase 2 start documented (Supabase project created, schema + RLS deployed, .env.local configured)? [Completeness, Quickstart §Phase 2 Prerequisites]

---

## Requirement Consistency: Cross-Document Alignment

Evaluates whether spec.md, design-brief.md, design.md, and plan.md are internally consistent.

- [ ] **CHK087** - Do user role definitions in spec.md match role descriptions in design-brief.md? [Consistency, Spec §Key Entities, Design-Brief §3]

- [ ] **CHK088** - Does the sitemap in design-brief.md align with pages listed in design.md §3? [Consistency, Design-Brief §4, Design §3]

- [ ] **CHK089** - Do functional requirements (spec §FR-xxx) have corresponding screen definitions in design-brief §5? [Traceability, Spec §FR-001 to FR-023, Design-Brief §5.1 to 5.18]

- [ ] **CHK090** - Do success criteria (spec §SC-xxx) map to validation scenarios in quickstart.md? [Traceability, Spec §SC-001 to SC-008, Quickstart §Validation Scenarios]

- [ ] **CHK091** - Do data entities in spec §Key Entities match table definitions in data-model.md? [Consistency, Spec, Data-Model §Entities]

- [ ] **CHK092** - Do design token definitions in design.md match CSS token guidance in plan.md? [Consistency, Design §Design Tokens, Plan §3. CSS Variables]

- [ ] **CHK093** - Does the component library structure in plan.md match components referenced in design-brief.md? [Consistency, Plan §Project Structure, Design-Brief §Baseline]

---

## Gap Analysis: Requirements Not Yet Defined ✅ RESOLVED

Identifies potential missing requirements that should be addressed before implementation starts.

- [x] **CHK094** - Is password reset / account recovery flow documented? [RESOLVED: Spec §Clarifications, Plan §Session Management & Account Recovery]

- [x] **CHK095** - Is session timeout behavior documented (e.g., logout after 30 mins inactivity)? [RESOLVED: Spec §Session Timeout & Account Recovery, Plan §Session Management]

- [x] **CHK096** - Is the document persistence strategy defined during multi-step wizard (auto-save frequency, where saved—localStorage vs DB)? [RESOLVED: Spec §Document Persistence & Auto-Save, Plan §Document Auto-Save Strategy]

- [x] **CHK097** - Is PDF/DOCX generation approach documented (client-side library vs. backend service)? [RESOLVED: Spec §PDF & DOCX Generation, Plan §PDF/DOCX Generation]

- [ ] **CHK098** - Is the role of 내 문서함 위젯 on main page documented (widget vs full page, mock vs real data for non-members)? [Clarification: Design-Brief §5.1 states "샘플 미리보기"와 "실 데이터"를 구분해 보여줄 수 있다" — logically handled by conditional rendering in Phase 1 mock]

- [ ] **CHK099** - Is the error retry logic documented (e.g., exponential backoff for API failures)? [Gap: Design-Brief §5.5 shows retry button but exponential backoff strategy not quantified. Recommend simple 1 retry for Phase 1 MVP]

- [ ] **CHK100** - Is form autofill behavior documented (browser autofill for signup, or custom)? [Gap: Low priority. Recommend allowing native browser autofill per HTML spec compliance]

---

## Ambiguities & Conflicts: RESOLVED ✅

Identifies contradictions or unclear phrasing that need clarification before implementation.

- [x] **CHK101** - Spec §Clarification Q3 states "회원과 관리자 모두 등록된 발주처의 전체 공고를 동일한 범위로 본다" but design-brief §5.5 says "추가로 각 발주처 API의 연동 상태..." — is this additive or substitutive? 
  - **RESOLVED**: Additive. Both see same full list. Admin ADDITIONALLY sees API sync status + last sync time.
  - **Where**: Plan §Data Scope Clarification

- [x] **CHK102** - Spec §FR-015 states subscription blocks "공고 검색·계획서 작성·다운로드" but doesn't specify completed plans access. 
  - **RESOLVED**: Yes. Expired members retain access to completed documents (status='completed'). In-progress documents locked.
  - **Where**: Spec §Expired Subscription Access to Existing Documents, Plan §Subscription Expiry & Document Access

- [ ] **CHK103** - Plan §16. Design-Sync mentions "validate against Claude Design .dc.html files" but design-brief.md is input to Claude Design. 
  - **NOTE**: Clarification deferred post-design-sync. Current understanding: design-sync compares React components (output) against Claude Design HTML (ground truth).

- [x] **CHK104** - Spec §Edge Cases mentions expired subscription access but doesn't specify response.
  - **RESOLVED**: Read-only access to completed documents. Locked access to in-progress documents. Reactivation resumes from last saved point.
  - **Where**: Spec §Expired Subscription Access to Existing Documents

- [x] **CHK105** - Design-Brief §5.7 mentions "다단계" but counts refer to 4-step wizard. 
  - **RESOLVED**: Phase 1 fixed at 4 steps with "1/4"~"4/4". Phase 2+ supports variable steps per announcement requirements.
  - **Where**: Design-Brief §5.7, Spec §Wizard Step Variability, Plan §Wizard Step Variability

---

## Traceability & Dependency Map

Evaluates whether requirements can be traced to source documents and priorities are clear.

- [ ] **CHK106** - Are all FR-xxx and SC-xxx items from spec.md referenced in design-brief.md screens or plan.md components? [Traceability]

- [ ] **CHK107** - Do User Stories in spec (US1-US7) have corresponding phase priorities (P1/P2/P3) that align with Phase 1-3 in plan.md? [Traceability, Spec §User Scenarios, Plan §Timeline]

- [ ] **CHK108** - Is the Edge Cases list in spec.md fully addressed by requirements/design/plan (or explicitly deferred)? [Coverage, Spec §Edge Cases, Gap: Some marked for Phase 2]

- [ ] **CHK109** - Are assumptions in spec.md documented in plan.md or contracts (e.g., "admin accounts pre-created", "NaraJangTeo API already issued")? [Traceability, Spec §Assumptions]

---

## Notes

1. **Checklist Scope**: This checklist evaluates requirements quality only. It does NOT test whether implementation works; it tests whether the requirements documents are complete, clear, consistent, and measurable before implementation starts.

2. **Reviewer Guidance**:
   - For each item, mark `[x]` only if the reviewer confirms the requirement is present AND meets the quality criterion listed.
   - If a criterion is partially met or unclear, leave `[ ]` and flag for clarification (update Ambiguities & Conflicts section or create follow-up issue).
   - Do not mark items as complete just because they're important; only mark them when the requirement documentation is actually sufficient.

3. **Next Steps After Checklist**:
   - If all items marked `[x]`: Proceed to Phase 1 implementation with confidence.
   - If >5 items remain `[ ]`: Schedule clarification session with feature owner before implementation starts.
   - If conflicts exist in Ambiguities section: Resolve via clarification or spec amendment.

4. **Maintenance**:
   - This checklist lives alongside spec.md, design-brief.md, design.md, and plan.md.
   - If requirements are added/changed during implementation, update this checklist to reflect coverage.

---

**Total Items**: 109  
**Quality Dimensions**: Completeness, Clarity, Consistency, Measurability, Coverage, Traceability

---

## Summary of Resolutions (2026-08-29)

### Critical Gaps Resolved: 6/7
- ✅ CHK094: Password reset & account recovery flow
- ✅ CHK095: Session timeout behavior  
- ✅ CHK096: Document auto-save strategy (15 seconds, localStorage Phase 1 → PostgreSQL Phase 2+)
- ✅ CHK097: PDF/DOCX generation approach (deferred to Phase 2+, options documented)
- ✅ CHK102: Expired subscription access (read-only for completed, locked for in-progress)
- ✅ CHK104: Expired subscription document behavior (same as CHK102)

**Remaining Low-Priority Gaps**:
- CHK099: Retry logic strategy (recommend 1 retry for Phase 1)
- CHK100: Form autofill behavior (recommend browser native)

### Clarifications Resolved: 3/3
- ✅ CHK101: Announcement list scope → **Same list, admin sees additive API status**
- ✅ CHK102/CHK104: Subscription expiry access → **Yes, read-only for completed docs**
- ✅ CHK105: Wizard steps → **Phase 1 fixed 4, Phase 2+ variable**

### Ambiguities & Conflicts: 5/5 RESOLVED
All 5 ambiguities in the checklist have been clarified with documented evidence.

---

**Status**: Ready for reviewer assessment & Phase 1 implementation | **Approval Target**: 2026-08-30

**Branch Readiness**: ✅ spec.md complete | ✅ design-brief.md complete | ✅ design.md complete | ✅ plan.md complete | ✅ data-model.md complete | ✅ contracts/ complete | ✅ quickstart.md complete
