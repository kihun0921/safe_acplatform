# Research: 올케어안전플랫폼 Technical Stack

Generated: 2026-08-29

## Summary

This document resolves key technical clarifications for React + Vite + TypeScript + Supabase implementation of the 올케어안전플랫폼 Feature.

---

## 1. Vite Configuration for React + TypeScript

**Decision**: Use Vite 5.x with `@vitejs/plugin-react` (JSX transform plugin)

**Rationale**:
- Near-instant HMR on modern hardware (<100ms refresh)
- Smaller build output than Create React App
- ES2020 native module support in browsers
- Out-of-box TypeScript support via esbuild

**Config Pattern**:
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5173, open: true },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom'] } },
    },
  },
})
```

**Alternatives considered**:
- Create React App: Slower HMR, larger builds, maintained by Meta but less active
- Next.js: Requires backend/API routes (excluded by spec)
- Remix: Overkill for static member + admin pages

---

## 2. TypeScript Strict Mode

**Decision**: Enable strict mode; use `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`

**Rationale**:
- Design.md is UI-first, visual contracts are the spec — types must match visual state
- useAuth, useAnnouncements, useDocuments hooks share types across pages
- RLS policies depend on exact field names (string-safe refactoring critical)
- Supabase SDK is fully typed (supabase-js@2.x has complete type definitions)

**tsconfig.json core**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "target": "ES2020"
  }
}
```

**Exceptions**:
- No `any` in user-facing code
- Any used only in third-party library shims (if needed)
- `@ts-ignore` requires comment explaining why

---

## 3. Supabase RLS Policy Patterns

**Decision**: Row-level security enabled on all tables; policies written in SQL with Postgres native syntax

**Rationale**:
- Design.md specifies member-only access to own documents/inquiries
- AdminDashboard.dc.html shows admin-only metrics
- No custom backend means all access control must be in DB layer
- Supabase RLS is declarative, testable, and auditable

**Pattern**:
```sql
-- Members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members see only themselves
CREATE POLICY "members_see_self" ON public.members
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Members update only themselves
CREATE POLICY "members_update_self" ON public.members
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Admins see all members
CREATE POLICY "admins_see_all" ON public.members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.members WHERE role = 'admin'
    )
  );
```

**Alternative considered**: JWT claims-based RLS (store role in JWT). Rejected: harder to audit, role changes require logout/re-login to take effect.

---

## 4. Mock Data Structure & Lifecycle

**Decision**: Mock data in `src/services/mockData.ts`, consumed by hooks (useAuth, useAnnouncements, etc.)

**Rationale**:
- Phase 1 must deliver fully-functional UI without Supabase
- Hooks abstract data source (phase 1: mock; phase 2: Supabase)
- Team can build UI & test logic in parallel with Supabase setup
- Clear hand-off point: `/design-sync` before Supabase integration

**Data Structure**:
```ts
// src/services/mockData.ts
export const MOCK_USERS = [
  { id: '1', email: 'manager@oo.co.kr', role: 'member', password: 'password123', ... },
  { id: 'admin', email: 'admin@oacplatform.co.kr', role: 'admin', password: 'admin123', ... },
];

export const MOCK_ANNOUNCEMENTS = [
  { id: 'a1', title: '...', agency: '...', deadline: new Date(...), ... },
];

// Phase 1: hooks call MOCK_* arrays
// Phase 2: hooks call supabase.from('table_name').select(...)
```

**Lifecycle**:
- Phase 1: Components use mock data, localStorage for "session"
- Design-sync runs: validate against Claude Design
- Phase 2: Replace localStorage with `supabase.auth.session()`
- Phase 2: Replace hook implementations to query Supabase

---

## 5. CSS Variables (Design Tokens) Strategy

**Decision**: Single source of truth in `:root` using oklch() color space; dark mode via `@media (prefers-color-scheme: dark)` with explicit `[data-theme]` override

**Rationale**:
- design.md defines all colors in oklch()
- oklch() is perceptually uniform (better for accessibility)
- Media queries allow system preference respect
- HTML `data-theme` attribute enables manual toggle

**Token Scope**:
- Color: primary, success, warn, danger, neutral (bg, surface, text, muted)
- Typography: body font, display font
- Spacing: xs(8px), sm(12px), md(16px), lg(24px), xl(40px)
- Radius: sm(7px), md(9px), lg(12px), xl(16px)
- Shadows: sm, md (for depth)

**Alternatives considered**:
- Tailwind CSS: Overkill for this design, harder to match oklch() exactly
- CSS-in-JS (styled-components): Adds runtime overhead, breaks server-side analysis tools

---

## 6. Component State Management

**Decision**: React hooks (useState, useEffect) for local component state; Supabase Auth context for global auth

**Rationale**:
- No Redux needed: state tree is shallow (user, role, mobile menu open)
- useAuth hook replaces Redux in centralized auth
- Component state (tab selection, form input) lives in component

**Pattern**:
```tsx
// Local state
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// Global auth state (via context)
const { user, isAuthenticated } = useAuth();

// Data fetching state (via hook)
const { announcements, loading, error } = useAnnouncements();
```

**Alternative considered**: Redux Toolkit. Rejected: overkill for shallow state, adds bundle size (~50KB gzipped).

---

## 7. Testing Library & Framework

**Decision**: Vitest + @testing-library/react for unit/component tests; Playwright for e2e

**Rationale**:
- Vitest: Same philosophy as Jest but 5-10x faster with Vite integration
- Testing Library: Encourages testing user behavior, not implementation details
- Playwright: Cross-browser e2e (Chrome, Firefox, Safari), CI-ready

**Setup**:
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

**Alternatives considered**:
- Jest: Slower cold start, heavier on disk
- Cypress: Good for e2e but slower than Playwright
- Pupetter: Lower-level than what we need

---

## 8. API Integration (Supabase Auth vs. Custom Endpoint)

**Decision**: Supabase Auth (`supabase.auth.*`) for signup/login; PostgreSQL for data queries; no custom backend

**Rationale**:
- Spec explicitly excludes separate backend
- Supabase Auth handles password hashing, session tokens, MFA-ready
- Supabase PostgREST auto-generates API from schema
- No infrastructure to manage

**Auth Flow**:
```
1. User submits email+password → supabase.auth.signUpWithPassword()
2. Supabase signs JWT token, stores in localStorage
3. Subsequent requests: JWT in Authorization header (automatic via supabase-js)
4. Logout → supabase.auth.signOut() clears session
```

**Alternatives considered**:
- Custom Node.js backend: Adds ops overhead, doesn't match design.md (no backend)
- Firebase Auth: Locked into Google ecosystem, less control over RLS

---

## 9. Responsive Design Breakpoints

**Decision**: Desktop (1200px), Tablet (960px), Mobile (640px); mobile-first CSS structure

**Rationale**:
- design.md shows layouts at these exact breakpoints
- MyDocuments.dc.html has `@media (max-width:960px)` rules
- Mobile-first: easier to add complexity than remove it

**Implementation**:
```css
/* Base: mobile */
.container { width: 100%; padding: 20px; }

/* Tablet */
@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop */
@media (min-width: 960px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
  .container { max-width: 1200px; }
}
```

---

## 10. Accessibility (WCAG AA) Baseline

**Decision**: ARIA labels, semantic HTML, keyboard navigation, color + text for status, prefers-reduced-motion support

**Rationale**:
- design.md specifies WCAG AA compliance
- Signup.dc.html has `(필수)` text labels after asterisks (color-blind safe)
- prefers-reduced-motion in AdminDashboard reduces animation for motion sensitivity

**Checklist**:
- `role="progressbar" aria-valuenow="X" aria-valuemax="100"` on progress bars
- `role="button" aria-pressed="true"` on toggles
- `aria-label` on icon buttons
- Semantic tags: `<button>`, `<input>`, `<header>`, `<nav>`, `<main>`
- No `color` as sole indicator of status (must also have text/icon)

---

## 11. Design-Sync Readiness

**Decision**: UI-first implementation → `/design-sync` validation → Supabase integration

**Rationale**:
- design.md is authoritative (generated from Claude Design)
- Phase 1 UI must match design.md pixel-for-pixel
- Phase 2 can proceed in parallel with design validation

**Timing**:
- Phase 1 end: All 16 pages render with mock data, responsive, accessible
- Trigger: `npm run design-sync` (hypothetical; uses DesignSync tool)
- Output: design.sync.report.json with layout/typography/spacing diffs
- Phase 1 complete when: 0 diffs or all diffs justified and fixed

---

## 12. Build & Deployment

**Decision**: Vite build → `dist/` folder; static hosting (Vercel, Netlify, S3)

**Rationale**:
- No backend means no Node.js server required
- Static hosting provides CDN caching automatically
- Environment variables via `.env.local` (phase 1: mocks; phase 2: Supabase credentials)

**Build Command**:
```bash
npm run build
# → dist/index.html + dist/assets/*.js, *.css
```

**Environment Setup**:
```
# .env.local (Phase 2+)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
# Never commit credentials; use deploy-time env vars
```

---

## 13. Folder Structure Finalization

**Decision**: Mirrors design.md structure: components (common/hero/lists/forms), pages (public/member/admin), hooks, services, utils

**Rationale**:
- Matches design.md page groupings (MainPage, AnnouncementDetail, AdminDashboard)
- Clear separation of concerns
- Easy to find where a feature lives

**Folder Tree**:
```
src/
├── components/
│   ├── common/        # Reusable: Header, Button, Input, Badge, etc.
│   ├── hero/          # HeroSection, HeroVisual
│   ├── lists/         # AnnouncementCard, DocumentCard, InquiryCard
│   └── forms/         # SignupForm, LoginForm, PlanWizard
├── pages/
│   ├── public/        # MainPage, LoginPage, SignupPage
│   ├── member/        # AnnouncementList, MyDocuments, MyPage
│   └── admin/         # AdminDashboard, MemberManagement
├── hooks/             # useAuth, useAnnouncements, useMobileMenu
├── services/          # auth.ts, db.ts, mockData.ts, types.ts
├── utils/             # validation.ts, formatting.ts
└── styles/
    ├── tokens.css     # Design tokens (variables)
    └── layout.css     # Responsive grid/flexbox
```

---

## Phase 0 Closure

All NEEDS CLARIFICATION items resolved. Proceed to Phase 1: data-model.md, contracts/, quickstart.md.

**Sign-off**: Research complete, implementation can begin.
