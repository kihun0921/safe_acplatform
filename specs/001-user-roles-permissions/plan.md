# Implementation Plan: 올케어안전플랫폼

**Branch**: `001-user-roles-permissions` | **Date**: 2026-08-29 | **Spec**: `spec.md` | **Design**: `design.md`

**Input**: Feature specification from `/specs/001-user-roles-permissions/spec.md`

## Summary

건설사 공무직원이 나라장터 API로 실제 입찰 공고를 조회하고, 공고별 요구 항목에 맞춰 **안전보건관리계획서를 단계별(마법사 형태)로 작성·완료·다운로드(PDF/DOCX)**하는 B2B SaaS를 구축합니다.

**기술 접근**: React + Vite + TypeScript 기반의 UI 우선 구현 → Supabase Auth/RLS 통합의 단계별 진행. 디자인 토큰은 CSS 변수로 구현하고, Claude Design 승인 화면을 기준으로 컴포넌트 라이브러리를 구축합니다. Mock Data로 UI를 완성한 후 /design-sync 실행, 이후 Supabase 연결.

## Critical Gaps & Clarifications Resolved

### Session Management & Account Recovery (Phase 1+)
- **Password Reset**: 이메일로 24시간 유효 재설정 링크 발송
- **Session Timeout**: 30분 비활성 후 자동 로그아웃 (2분 전 경고)
- **Account Lockout**: 로그인 5회 실패 시 15분 차단
- **Implementation**: Phase 1에서 로직 구현, 실제 이메일 발송은 Phase 2+에서 Supabase Auth 활용

### Document Auto-Save Strategy
- **Frequency**: 15초 간격 자동 저장
- **Storage**: 
  - Phase 1: localStorage (mock)
  - Phase 2+: PostgreSQL documents 테이블
- **Unsaved Warning**: 변경사항 있는 상태로 화면 떠날 때 경고
- **Session Expiry**: 최종 저장 지점부터 재개 가능

### 양식 선택 폴백 체인 (Template Selection Fallback Chain)
- **Priority 1**: 공고 첨부 샘플 양식 → API에서 조회한 공고.attachments 파싱
- **Priority 2**: 발주처 표준 양식 → 사전 등록된 발주처별 템플릿
- **Priority 3**: 범용 기본 양식 → 서비스 기본 안전보건관리계획서 스키마
- **Priority 4**: 회원 업로드 양식 → PDF/DOCX/HWP 파일 업로드 후 파싱
  - 파싱 성공: 추출된 필드로 마법사 시작
  - 파싱 실패: 수동 입력 모드 제공
- **Implementation**:
  - Phase 1: UI 선택 화면만 (모든 옵션 정적 표시)
  - Phase 2+: 공고 API 연동 → Priority 1/2 동적 필터링
  - Phase 2+: 파일 파싱 라이브러리 (pdfjs-dist, docx, mammoth.js 등)

### PDF/DOCX Generation (Deferred to Phase 2+)
- **Phase 1**: UI 버튼만 (실제 생성 안 함)
- **Phase 2+ Options**:
  - Client-side: pdfkit / docx JS 라이브러리
  - Backend: Node.js 서비스 또는 Supabase Edge Functions
  - Third-party: Document Generation API
- **SC-004 Target**: 10초 이내 (10KB-5MB 범위)

### Subscription Expiry & Document Access
- **Completed Documents**: 만료 후에도 조회·다운로드 가능
- **In-Progress Documents**: 만료 후 편집 차단, 재개 후 계속 작성 가능
- **구독 안내**: 미구독 또는 만료 회원이 핵심 기능 접근 시 결제 안내 화면 표시

### Wizard Step Variability
- **Phase 1 Fixed**: 정확히 4단계 ("1/4" ~ "4/4")
- **Phase 2+ Flexible**: 공고별 요구 항목에 따라 3, 4, 5+ 단계 지원 설계
- **Design Pattern**: 각 단계는 동일한 컴포넌트 스타일 유지

### Data Scope Clarification
- **Announcement List**: 회원과 관리자 모두 동일한 공고 목록 조회
- **Admin Additive View**: 추가로 각 발주처 API 연동 상태(성공/실패) + 마지막 조회 시각 표시
- **Member Isolation**: 다른 회원의 계획서·문의는 100% 차단 (RLS 정책으로 강제)

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x)

**Primary Dependencies**: 
- Frontend: Vite, React Router, TypeScript
- Auth & Data: Supabase Auth, Supabase PostgreSQL + RLS
- Styling: CSS Variables, CSS Modules (scoped)
- Testing: Vitest (unit), Testing Library (component), MSW (mocking)
- No separate backend server (Supabase functions optional for future)

**Storage**: Supabase PostgreSQL (members, announcements, documents, inquiries, API credentials, subscriptions, payments)

**Testing**: Vitest (unit) + React Testing Library (component) + MSW (API mocking) + Playwright (e2e, UI-first phase 제외)

**Target Platform**: Web (Desktop 1200px+ / Tablet 960px / Mobile 640px)

**Project Type**: B2B SaaS web application (member-facing + admin portal)

**Performance Goals**: 
- FCP < 1s, LCP < 2.5s (lighthouse)
- API response < 200ms (Supabase RLS)

**Constraints**: 
- 모바일 반응형 필수 (FR-022)
- 색상만으로 상태 표시 금지 (design.md 19장)
- prefers-reduced-motion 대응 필수
- 비회원이 보호 화면에 접근 시 로그인 안내 (FR-003)

**Scale/Scope**: 16개 화면 (회원 8 + 관리자 6 + 공개 2) × 5개 상태 × 3가지 role

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✓ **기준선 준수**: design.md에서 Claude Design 화면 기준 확정
✓ **비용/리스크**: Supabase 종량제 + OSS 기술스택 = 저 리스크
✓ **범위**: design.md에 정의된 20개 화면 내에서만 구현
✓ **접근성**: WCAG AA 이상, ARIA 속성, 키보드 네비게이션, prefers-reduced-motion

## Project Structure

### Documentation (this feature)

```text
specs/001-user-roles-permissions/
├── plan.md              # This file
├── spec.md              # Feature spec
├── design.md            # Design documentation
├── design-brief.md      # Design brief for Claude Design
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (DB schema + API contracts)
│   ├── schema.sql       # Supabase PostgreSQL schema
│   ├── rls-policies.sql # Row-level security policies
│   └── api.md           # Realtime subscription contracts
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root - PLANNED STRUCTURE)

```text
src/
├── main.tsx                     # Vite entry point
├── App.tsx                      # Root router & layout
├── styles/
│   ├── tokens.css              # Design tokens (CSS variables)
│   ├── reset.css               # Global normalize
│   └── layout.css              # Grid/flex layouts
│
├── components/                 # Shared component library
│   ├── common/
│   │   ├── Header/             # Sticky header + mobile nav (users & admins)
│   │   ├── Button/             # Primary, secondary, pill button variants
│   │   ├── Input/              # Text input (email, text, number, tel)
│   │   ├── Textarea/           # Text area with resize & validation UI
│   │   ├── Badge/              # Status badges (success/warn/danger/primary)
│   │   ├── Card/               # Surface containers with border & shadow
│   │   ├── Tabs/               # Tab switching (작성중/완료, 전체/대기/완료)
│   │   ├── Modal/              # Dialog wrapper (계획서 마법사)
│   │   ├── Spinner/            # Loading indicator
│   │   ├── EmptyState/         # Empty 상태 (검색 결과 없음)
│   │   ├── ErrorBoundary/      # Error 상태 (API 오류)
│   │   └── UnauthorizedGuard/  # Unauthorized 상태 (로그인 필요)
│   │
│   ├── hero/
│   │   ├── HeroSection/        # 메인 히어로 (제목 + 검색 + 시각)
│   │   ├── HeroVisual/         # 계획서 카드 + 체크리스트 + 진행률
│   │   └── SearchInput/        # 검색창 + 버튼
│   │
│   ├── lists/
│   │   ├── AnnouncementCard/   # 공고 카드 (배지 2개 + 버튼)
│   │   ├── DocumentCard/       # 문서 카드 (제목 + 진행률/완료 배지)
│   │   └── InquiryCard/        # 문의 카드 (제목 + 상태 배지)
│   │
│   └── forms/
│       ├── SignupForm/         # 회원가입 (6개 필드)
│       ├── LoginForm/          # 로그인 (이메일 + 비밀번호)
│       ├── AnnouncementSearch/ # 공고 검색 + 필터
│       ├── PlanWizard/         # 4단계 마법사 모달
│       ├── InquiryForm/        # 문의 작성
│       └── AdminApiForm/       # API 인증정보 등록
│
├── pages/                      # Page-level components (routed)
│   ├── public/
│   │   ├── MainPage/           # 메인 페이지 (로그인 여부에 따라 데이터 변경)
│   │   ├── LoginPage/          # 로그인
│   │   ├── SignupPage/         # 회원가입
│   │   └── LoginGuidePage/     # 로그인 안내 (보호 화면 접근 시)
│   │
│   ├── member/                 # 회원 전용
│   │   ├── AnnouncementList/   # 공고 검색·목록
│   │   ├── AnnouncementDetail/ # 공고 상세
│   │   ├── MyDocuments/        # 내 문서함 (탭: 작성중/완료)
│   │   ├── MyPage/             # 마이페이지 (정보 + 구독 상태)
│   │   ├── SubscriptionGuide/  # 구독 안내 (미구독 접근 시)
│   │   ├── InquiryList/        # 문의하기 (작성 폼 + 목록)
│   │   └── InquiryDetail/      # 문의 상세 (답변 확인)
│   │
│   └── admin/                  # 관리자 전용
│       ├── AdminLogin/         # 관리자 로그인 (별도 경로)
│       ├── AdminDashboard/     # 대시보드 (메트릭 + 최근 목록)
│       ├── MemberManagement/   # 회원 관리 (테이블)
│       ├── ApiCredentials/     # API 인증정보 관리
│       ├── SubscriptionBilling/# 구독료 결제창 관리
│       └── InquiryManagement/  # 문의 관리·답변
│
├── hooks/
│   ├── useAuth.ts              # 인증 상태 (현재 사용자, 로그인/아웃)
│   ├── useRole.ts              # 역할 확인 (member/admin)
│   ├── useMobileMenu.ts        # 모바일 드로어 상태
│   ├── useAnnouncements.ts     # 공고 조회 (Mock → Supabase)
│   ├── useDocuments.ts         # 내 문서 조회 (Mock → Supabase)
│   └── useInquiries.ts         # 문의 조회 (Mock → Supabase)
│
├── services/
│   ├── auth.ts                 # Supabase Auth 래퍼
│   ├── db.ts                   # Supabase PostgreSQL 클라이언트
│   ├── mockData.ts             # Mock data (Phase 1 UI)
│   └── types.ts                # Shared type definitions
│
├── utils/
│   ├── validation.ts           # 입력 검증 (이메일, 비밀번호 등)
│   ├── cn.ts                   # 클래스명 병합 유틸
│   └── formatters.ts           # 날짜, 숫자 포매팅
│
└── __tests__/
    ├── components/             # Component unit tests
    ├── hooks/                  # Hook unit tests
    ├── pages/                  # Page integration tests
    └── e2e/                    # Playwright e2e (UI phase 후)

public/
├── index.html                  # Vite HTML entry
└── fonts/                      # Noto Sans/Serif KR WOFF2

package.json
vite.config.ts
tsconfig.json
vitest.config.ts
.env.example                    # Supabase credentials template
```

### Phases & Artifacts

**Phase 1: UI Implementation (Mock Data)**
- ✓ 공통 컴포넌트 라이브러리 구축
- ✓ 디자인 토큰 (CSS 변수) 구현
- ✓ 16개 페이지 레이아웃 구현
- ✓ Mock data로 전체 흐름 테스트
- ✓ 반응형 (desktop/tablet/mobile)
- ✓ prefers-reduced-motion 대응
- → `/design-sync` 실행

**Phase 2: Supabase Integration**
- Supabase Auth 연결 (회원 로그인/가입)
- PostgreSQL 스키마 생성
- RLS 정책 적용
- Admin 로그인 연결
- API 조회 hooks 구현
- Form 검증 강화

**Phase 3: Testing & Polish**
- Component unit tests
- Integration tests
- e2e tests (Playwright)
- 성능 최적화

---

## 3. 디자인 토큰을 CSS 변수로 구현하는 방법

### tokens.css 구조
```css
/* Light theme (default) */
:root {
  /* Colors */
  --bg: oklch(98% 0.004 250);
  --surface: oklch(100% 0 0);
  --surface-alt: oklch(96.5% 0.006 250);
  --border: oklch(90% 0.006 250);
  
  --text: oklch(22% 0.015 255);
  --text-secondary: oklch(46% 0.012 255);
  --text-muted: oklch(60% 0.008 255);
  
  --primary: oklch(33% 0.09 255);
  --primary-strong: oklch(24% 0.09 255);
  --primary-soft: oklch(94% 0.02 255);
  
  --success: oklch(58% 0.13 150);
  --success-soft: oklch(94% 0.035 150);
  
  --warn: oklch(63% 0.13 75);
  --warn-soft: oklch(94% 0.035 80);
  
  --danger: oklch(56% 0.17 25);
  --danger-soft: oklch(94% 0.03 25);
  
  /* Typography */
  --font-body: 'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif;
  --font-display: 'Noto Serif KR', 'Noto Sans KR', serif;
  
  /* Spacing */
  --gap-xs: 8px;
  --gap-sm: 12px;
  --gap-md: 16px;
  --gap-lg: 24px;
  --gap-xl: 40px;
  
  /* Sizing */
  --max-content: 1200px;
  --header-height: 72px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 8px 20px -8px rgba(15, 23, 42, 0.18);
  
  /* Radius */
  --radius-sm: 7px;
  --radius-md: 9px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

/* Dark theme (future, if needed) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: oklch(15% 0.01 255);
    --surface: oklch(20% 0.01 255);
    /* ... adjust for dark mode ... */
  }
}

/* Explicit dark theme toggle */
:root[data-theme="dark"] {
  /* ... dark mode vars ... */
}

/* Admin-specific darker palette */
[data-role="admin"] {
  --bg: oklch(97% 0.006 255);
  --surface-alt: oklch(95% 0.008 255);
}
```

### 사용법
```tsx
const Button = ({ variant = 'primary' }) => (
  <button style={{
    background: variant === 'primary' ? 'var(--accent-color)' : 'var(--surface)',
    color: variant === 'primary' ? '#fff' : 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--gap-sm) var(--gap-md)',
    fontFamily: 'var(--font-body)',
  }}>
    Click me
  </button>
);
```

---

## 4. Header, Button, Input, Textarea, Badge, QuestionCard 구조

### Header Component
```tsx
// src/components/common/Header/Header.tsx
export const Header: React.FC<{role: 'member' | 'admin' | null}> = ({ role }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = role === 'admin';
  
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: isAdmin ? 'var(--primary)' : 'var(--surface)',
      color: isAdmin ? '#fff' : 'var(--text)',
      borderBottom: isAdmin ? 'none' : '1px solid var(--border)',
      height: 'var(--header-height)',
    }}>
      {/* Logo + Nav + User Info */}
      <nav className="header-content">
        {/* Desktop nav: logo, links */}
        {/* Mobile: logo + hamburger */}
      </nav>
      
      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <aside className="mobile-drawer">
          {/* Menu items */}
        </aside>
      )}
    </header>
  );
};
```

### Button Variants
```tsx
// src/components/common/Button/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'text' | 'pill';

const variants = {
  primary: {
    background: 'var(--accent-color, #c2410c)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  text: {
    background: 'transparent',
    color: 'var(--primary)',
    border: 'none',
  },
  pill: {
    borderRadius: '999px',
    padding: '9px 18px',
    fontSize: '13.5px',
  }
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => (
  <button style={{...variants[variant], borderRadius: 'var(--radius-md)'}} {...props} />
);
```

### Input & Textarea
```tsx
// src/components/common/Input/Input.tsx
export const Input: React.FC<InputProps> = (props) => (
  <input style={{
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '11px 14px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    ':focus': {
      borderColor: 'var(--primary)',
      outlineColor: 'var(--primary)',
    },
  }} {...props} />
);

// src/components/common/Textarea/Textarea.tsx
export const Textarea: React.FC<TextareaProps> = (props) => (
  <textarea style={{
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    fontSize: '13.5px',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
  }} {...props} />
);
```

### Badge Component
```tsx
// src/components/common/Badge/Badge.tsx
type BadgeStatus = 'default' | 'success' | 'warn' | 'danger';

const badgeColors = {
  default: { bg: 'var(--primary-soft)', text: 'var(--primary)' },
  success: { bg: 'var(--success-soft)', text: 'var(--success)' },
  warn: { bg: 'var(--warn-soft)', text: 'var(--warn)' },
  danger: { bg: 'var(--danger-soft)', text: 'var(--danger)' },
};

export const Badge: React.FC<{status: BadgeStatus; label: string}> = ({ status, label }) => (
  <span style={{
    background: badgeColors[status].bg,
    color: badgeColors[status].text,
    fontSize: '11.5px',
    fontWeight: '700',
    padding: '3px 9px',
    borderRadius: '6px', // 또는 '999px' for pill
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  }}>
    {/* Optional icon here */}
    {label}
  </span>
);
```

### QuestionCard (InquiryCard)
```tsx
// src/components/lists/InquiryCard/InquiryCard.tsx
export const InquiryCard: React.FC<{inquiry: Inquiry}> = ({ inquiry }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  }}>
    <div>
      <h3 style={{fontSize: '14px', fontWeight: '600', margin: 0}}>
        {inquiry.title}
      </h3>
      <p style={{fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px'}}>
        {inquiry.date} 등록
      </p>
    </div>
    <Badge status={inquiry.answered ? 'success' : 'warn'} 
           label={inquiry.answered ? '답변 완료' : '답변 대기'} />
  </div>
);
```

---

## 5. 메인 Hero와 Aurora/Grid/Floating Card 구현 방법

### HeroSection Layout
```tsx
// src/components/hero/HeroSection/HeroSection.tsx
export const HeroSection: React.FC = () => (
  <section style={{
    padding: '88px 40px 76px',
    background: 'var(--surface-alt)',
  }}>
    <div style={{
      maxWidth: 'var(--max-content)',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 'var(--gap-xl)',
      alignItems: 'center',
    }}>
      {/* Left: Title + Search + Features */}
      <LeftContent />
      
      {/* Right: Visual (HeroVisual component) */}
      <HeroVisual />
    </div>
  </section>
);
```

### HeroVisual (Floating Card Pattern)
```tsx
// src/components/hero/HeroVisual/HeroVisual.tsx
export const HeroVisual: React.FC = () => (
  <div style={{position: 'relative'}}>
    {/* Main card with shadow (subtle Aurora effect) */}
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px',
      boxShadow: '0 24px 48px -16px rgba(15,23,42,0.16)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    }}>
      {/* File info */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        {/* Icon + name */}
        <Badge status="success" label="작성 완료" />
      </div>
      
      {/* Grid of checklist items */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {checklist.map(item => (
          <div key={item} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-md)',
          }}>
            <CheckIcon /> {/* SVG */}
            <span>{item}</span>
            <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>자동 인식</span>
          </div>
        ))}
      </div>
      
      {/* Progress bar with label */}
      <div>
        <div style={{
          height: '8px',
          background: 'var(--surface-alt)',
          borderRadius: '999px',
          overflow: 'hidden',
          role: 'progressbar',
          ariaValuenow: 100,
        }}>
          <div style={{height: '100%', background: 'var(--accent-color)', width: '100%'}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)'}}>
          <span>● 4/4 단계 완료</span>
          <span>PDF · DOCX 다운로드 가능</span>
        </div>
      </div>
    </div>
    
    {/* Floating status indicator (top-right) */}
    <div style={{
      position: 'absolute',
      top: '-16px',
      right: '-16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '999px',
      padding: '8px 14px',
      boxShadow: '0 8px 20px -8px rgba(15,23,42,0.18)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
    }}>
      <span style={{width: '8px', height: '8px', borderRadius: '999px', background: 'var(--success)'}} />
      실시간 공고 분석 중
    </div>
  </div>
);
```

---

## 6. 데스크톱과 모바일 반응형

### Media Query Strategy
```css
/* src/styles/layout.css */

/* Desktop-first approach */
body {
  font-size: 16px;
}

.hero-grid {
  grid-template-columns: 1.05fr 0.95fr;
}

/* Tablet (960px 이하) */
@media (max-width: 960px) {
  .nav-links { display: none !important; }
  .hamburger-btn { display: flex !important; }
  .hero-grid { grid-template-columns: 1fr !important; }
  .process-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .feature-grid { grid-template-columns: 1fr !important; }
  .footer-grid { grid-template-columns: 1fr 1fr !important; }
}

/* Mobile (640px 이하) */
@media (max-width: 640px) {
  .container { padding: 20px !important; }
  .announcement-card { flex-direction: column !important; }
  .hero-title { font-size: 32px !important; }
  .process-grid { grid-template-columns: 1fr !important; }
  input, button { font-size: 16px; } /* Prevent iOS zoom */
}

/* Tablet-specific: 2-column to 1-column stacking */
@media (640px < width < 960px) {
  .grid-2 { grid-template-columns: 1fr; }
}
```

### Mobile Navigation Pattern
```tsx
const MobileNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      {/* Hamburger button (show only on mobile) */}
      <button 
        className="hamburger-btn"
        onClick={() => setOpen(!open)}
        style={{display: 'none'}} /* Override by media query */
      >
        <MenuIcon />
      </button>
      
      {/* Drawer overlay + content */}
      {open && (
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              top: 'var(--header-height)',
              background: 'oklch(20% 0.02 255 / 0.35)',
              zIndex: 250,
            }}
            onClick={() => setOpen(false)}
          />
          
          {/* Drawer */}
          <nav style={{
            position: 'fixed',
            top: 'var(--header-height)',
            right: 0,
            bottom: 0,
            width: 'min(320px, 85vw)',
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            zIndex: 260,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <NavLink to="/announcements">공고검색</NavLink>
            <NavLink to="/documents">내 문서함</NavLink>
            <NavLink to="/inquiries">문의하기</NavLink>
            <NavLink to="/my-page">마이페이지</NavLink>
            <LogoutButton />
          </nav>
        </>
      )}
    </>
  );
};
```

### Touch Target Sizing
```css
/* Mobile-friendly tap targets */
button, a[role="button"] {
  min-height: 44px;
  min-width: 44px;
  padding: calc(var(--gap-sm) + 6px) calc(var(--gap-md) + 6px);
}

input, textarea, select {
  min-height: 44px;
  padding: var(--gap-sm) var(--gap-md);
}
```

---

## 7. prefers-reduced-motion 처리

### CSS Media Query
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### React Implementation
```tsx
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReduced;
};

// Usage in component
export const MobileDrawer: React.FC = ({ open, onClose }) => {
  const prefersReduced = useReducedMotion();
  
  if (!open) return null;
  
  // Render directly (no animation) when reduced motion is preferred
  return (
    <aside style={{
      transition: prefersReduced ? 'none' : 'all 0.3s ease',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
    }}>
      {/* Content */}
    </aside>
  );
};
```

---

## 8. Loading, Empty, Error, Unauthorized 상태

### StateWrapper Component
```tsx
// src/components/common/StateWrapper/StateWrapper.tsx
type State = 'loading' | 'empty' | 'error' | 'unauthorized' | 'success';

interface StateWrapperProps {
  state: State;
  data?: any;
  error?: Error;
  children?: React.ReactNode;
}

export const StateWrapper: React.FC<StateWrapperProps> = ({ state, data, error, children }) => {
  switch (state) {
    case 'loading':
      return <Spinner />;
    
    case 'empty':
      return <EmptyState message="검색 조건에 맞는 공고가 없습니다" />;
    
    case 'error':
      return (
        <ErrorBoundary error={error}>
          <div style={{
            textAlign: 'center',
            padding: '48px',
            background: 'var(--surface)',
            border: `1px solid var(--danger-soft)`,
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertIcon style={{color: 'var(--danger)', width: 40, height: 40}} />
            <h2 style={{fontSize: '15px', fontWeight: '700', color: 'var(--text)'}}>
              공고 조회에 실패했습니다
            </h2>
            <p style={{fontSize: '13.5px', color: 'var(--text-secondary)'}}>
              나라장터 API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.
            </p>
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </div>
        </ErrorBoundary>
      );
    
    case 'unauthorized':
      return <UnauthorizedGuard />;
    
    case 'success':
      return children;
  }
};
```

### UnauthorizedGuard Component
```tsx
// src/components/common/UnauthorizedGuard/UnauthorizedGuard.tsx
export const UnauthorizedGuard: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
  }}>
    <div style={{
      maxWidth: '420px',
      width: '100%',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
    }}>
      <LockIcon style={{width: 64, height: 64, background: 'var(--primary-soft)', borderRadius: 'var(--radius-xl)', padding: '16px'}} />
      <h1 style={{fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', margin: 0}}>
        로그인이 필요한 페이지입니다
      </h1>
      <p style={{fontSize: '14.5px', lineHeight: '1.7', color: 'var(--text-secondary)', margin: 0}}>
        계획서 작성, 내 문서함, 문의하기 등은 로그인한 회원만 이용할 수 있습니다.
      </p>
      <div style={{display: 'flex', gap: '10px', width: '100%', marginTop: '8px'}}>
        <Button variant="primary" style={{flex: 1}}>로그인</Button>
        <Button variant="secondary" style={{flex: 1}}>회원가입</Button>
      </div>
    </div>
  </div>
);
```

---

## 9. 인증 상태 관리

### useAuth Hook
```tsx
// src/hooks/useAuth.ts
interface User {
  id: string;
  email: string;
  role: 'member' | 'admin';
  company: string;
  manager: string;
}

interface AuthContext {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuth = (): AuthContext => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Phase 1: Load from localStorage (mock)
    const stored = localStorage.getItem('currentUser');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
    
    // Phase 2+: Load from Supabase session
    // supabase.auth.onAuthStateChange((event, session) => { ... })
  }, []);
  
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Phase 1: Validate against mock data
      const user = mockUsers.find(u => u.email === email);
      if (!user || user.password !== hashPassword(password)) {
        throw new Error('이메일 또는 비밀번호가 잘못되었습니다');
      }
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Phase 2+: const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    // Phase 2+: await supabase.auth.signOut();
  };
  
  return {
    user,
    loading,
    error,
    login,
    signup: async (data) => { /* ... */ },
    logout,
    isAuthenticated: !!user,
  };
};

// App.tsx usage
export const AppRouter: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <Spinner />;
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected member routes */}
        <Route 
          path="/announcements"
          element={isAuthenticated && user?.role === 'member' ? <AnnouncementList /> : <UnauthorizedGuard />}
        />
        
        {/* Protected admin routes */}
        <Route 
          path="/admin/*"
          element={isAuthenticated && user?.role === 'admin' ? <AdminLayout /> : <UnauthorizedGuard />}
        />
      </Routes>
    </BrowserRouter>
  );
};
```

---

## 11. 회원과 관리자 역할 모델

### User Roles & Permissions
```ts
// src/services/auth.ts

// Role-based access control
export const ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Page permissions
export const PERMISSIONS = {
  // Member routes
  '/announcements': ['member', 'admin'],
  '/documents': ['member', 'admin'],
  '/inquiries': ['member', 'admin'],
  '/my-page': ['member', 'admin'],
  
  // Admin routes
  '/admin/*': ['admin'],
};

export const hasPermission = (role: UserRole, path: string): boolean => {
  const allowedRoles = PERMISSIONS[path as keyof typeof PERMISSIONS] || [];
  return allowedRoles.includes(role);
};
```

### Login Path Separation
```tsx
// src/pages/public/LoginPage/LoginPage.tsx
export const LoginPage: React.FC = () => {
  const [type, setType] = useState<'member' | 'admin'>('member');
  
  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px'}}>
        <button 
          onClick={() => setType('member')}
          style={{fontWeight: type === 'member' ? 'bold' : 'normal'}}
        >
          회원 로그인
        </button>
        <button 
          onClick={() => setType('admin')}
          style={{fontWeight: type === 'admin' ? 'bold' : 'normal'}}
        >
          관리자 로그인
        </button>
      </div>
      
      {type === 'member' && <MemberLoginForm />}
      {type === 'admin' && <AdminLoginForm />}
    </div>
  );
};
```

### Admin Header Styling
```tsx
export const Header: React.FC<{role: UserRole | null}> = ({ role }) => {
  const isAdmin = role === 'admin';
  
  return (
    <header style={{
      background: isAdmin ? 'var(--primary)' : 'var(--surface)',
      color: isAdmin ? '#fff' : 'var(--text)',
      borderBottom: isAdmin ? 'none' : '1px solid var(--border)',
      height: isAdmin ? '64px' : 'var(--header-height)',
    }}>
      {/* Logo */}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: '700',
        fontSize: isAdmin ? '16px' : '20px',
      }}>
        올케어안전플랫폼
      </span>
      
      {/* Admin badge */}
      {isAdmin && (
        <span style={{
          background: 'rgba(255,255,255,0.16)',
          fontSize: '11px',
          fontWeight: '700',
          padding: '3px 9px',
          borderRadius: '999px',
          color: '#fff',
        }}>
          관리자
        </span>
      )}
      
      {/* Nav links (different for member vs admin) */}
      {isAdmin ? (
        <nav style={{display: 'flex', gap: '22px'}}>
          <a href="/admin">대시보드</a>
          <a href="/admin/members">회원관리</a>
          <a href="/admin/api-credentials">API 관리</a>
          <a href="/admin/billing">결제관리</a>
          <a href="/admin/inquiries">문의관리</a>
        </nav>
      ) : (
        <nav style={{display: 'flex', gap: '28px'}}>
          <a href="/announcements">공고검색</a>
          <a href="/documents">내 문서함</a>
          <a href="/inquiries">문의하기</a>
        </nav>
      )}
    </header>
  );
};
```

---

## 12. RLS (Row-Level Security) 정책

### PostgreSQL Schema & RLS
```sql
-- src/contracts/schema.sql

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  manager TEXT NOT NULL,
  phone TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Announcements (from NaraJangTeo API)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  announcement_number TEXT NOT NULL,
  deadline DATE NOT NULL,
  category TEXT NOT NULL,
  has_safety_form BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents (계획서)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  step_current INTEGER DEFAULT 1,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inquiries (문의)
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  admin_answer TEXT,
  admin_answer_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Credentials (관리자 전용)
CREATE TABLE public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_sync_at TIMESTAMP,
  last_sync_status TEXT DEFAULT 'success' CHECK (last_sync_status IN ('success', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Members can view only themselves
CREATE POLICY "members_read_self" ON public.members
  FOR SELECT USING (auth.uid() = id);

-- Members can update only themselves
CREATE POLICY "members_update_self" ON public.members
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view/update all members
CREATE POLICY "admins_read_all_members" ON public.members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

-- Documents: Members see only their own
CREATE POLICY "members_documents_own" ON public.documents
  FOR SELECT USING (auth.uid() = member_id);

-- Documents: Members insert only for themselves
CREATE POLICY "members_documents_insert" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- Inquiries: Members see only their own
CREATE POLICY "members_inquiries_own" ON public.inquiries
  FOR SELECT USING (auth.uid() = member_id);

-- API Credentials: Admins only
CREATE POLICY "admins_api_credentials_all" ON public.api_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 13. 입력 검증

### Validation Utilities
```ts
// src/utils/validation.ts

export const validateEmail = (email: string): string | null => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? null : '유효한 이메일 형식이 아닙니다';
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
  return null;
};

export const validateRegistrationNumber = (number: string): string | null => {
  const regex = /^\d{3}-\d{2}-\d{5}$/;
  return regex.test(number) ? null : '사업자등록번호 형식이 잘못되었습니다';
};

export const validatePhone = (phone: string): string | null => {
  const regex = /^01\d-\d{3,4}-\d{4}$/;
  return regex.test(phone) ? null : '전화번호 형식이 잘못되었습니다';
};

// Signup validation
export const validateSignupData = (data: SignupData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!data.email) errors.email = '이메일은 필수입니다';
  else errors.email = validateEmail(data.email) || '';
  
  if (!data.password) errors.password = '비밀번호는 필수입니다';
  else errors.password = validatePassword(data.password) || '';
  
  if (!data.company) errors.company = '소속 건설사명은 필수입니다';
  if (!data.registrationNumber) errors.registrationNumber = '사업자등록번호는 필수입니다';
  else errors.registrationNumber = validateRegistrationNumber(data.registrationNumber) || '';
  
  if (!data.manager) errors.manager = '담당자명은 필수입니다';
  if (!data.phone) errors.phone = '연락처는 필수입니다';
  else errors.phone = validatePhone(data.phone) || '';
  
  return Object.fromEntries(Object.entries(errors).filter(([_, v]) => v));
};
```

### Form Component with Validation
```tsx
// src/components/forms/SignupForm/SignupForm.tsx
export const SignupForm: React.FC = () => {
  const [data, setData] = useState<SignupData>({...});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setData(prev => ({...prev, [name]: value}));
    
    // Real-time validation
    if (name === 'email') {
      setErrors(prev => ({...prev, email: validateEmail(value) || ''}));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validateSignupData(data);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Phase 1: Mock signup
    // Phase 2+: await supabase.auth.signUp({...});
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <label>이메일 <span style={{color: 'var(--danger)'}}>*</span><span style={{color: 'var(--text-muted)'}}> (필수)</span></label>
      <Input name="email" value={data.email} onChange={handleChange} />
      {errors.email && <p style={{color: 'var(--danger)', fontSize: '12px'}}>{errors.email}</p>}
      
      {/* More fields... */}
      
      <Button type="submit" variant="primary" disabled={Object.keys(errors).length > 0}>
        회원가입 완료
      </Button>
    </form>
  );
};
```

---

## 14. 테스트 전략

### Test Structure
```
__tests__/
├── components/
│   ├── common/
│   │   ├── Button.test.tsx
│   │   ├── Input.test.tsx
│   │   ├── Badge.test.tsx
│   │   ├── Header.test.tsx
│   │   └── StateWrapper.test.tsx
│   ├── hero/
│   │   └── HeroSection.test.tsx
│   └── lists/
│       └── AnnouncementCard.test.tsx
│
├── hooks/
│   └── useAuth.test.ts
│
├── pages/
│   ├── MainPage.test.tsx
│   ├── LoginPage.test.tsx
│   └── AnnouncementList.test.tsx
│
├── utils/
│   └── validation.test.ts
│
└── integration/
    ├── signup-flow.test.tsx
    ├── announcement-search.test.tsx
    └── plan-wizard.test.tsx
```

### Example Tests
```tsx
// __tests__/components/common/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/common/Button';

describe('Button', () => {
  it('renders with primary variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveStyle({
      background: 'var(--accent-color, #c2410c)',
      color: '#fff',
    });
  });
  
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});

// __tests__/utils/validation.test.ts
import { validateEmail, validatePassword } from '@/utils/validation';

describe('validation', () => {
  it('validates valid email', () => {
    expect(validateEmail('test@example.com')).toBeNull();
  });
  
  it('rejects invalid email', () => {
    expect(validateEmail('invalid')).toBeDefined();
  });
  
  it('validates password length', () => {
    expect(validatePassword('short')).toBeDefined();
    expect(validatePassword('validpassword123')).toBeNull();
  });
});

// __tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  it('loads user from localStorage', () => {
    localStorage.setItem('currentUser', JSON.stringify({id: '1', email: 'test@example.com', role: 'member'}));
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({id: '1', email: 'test@example.com', role: 'member'});
  });
});
```

### Vitest Config
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts{,x}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 15. Mock Data 기반 UI 우선 구현 방법

### Phase 1: Mock Data Structure
```ts
// src/services/mockData.ts

export const MOCK_CURRENT_USER: User = {
  id: '1',
  email: 'manager@ooconst.co.kr',
  role: 'member',
  company: 'OO건설(주)',
  manager: '김담당',
};

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'OO초등학교 증축공사',
    agency: 'OO교육청',
    announcementNumber: '2026-00123',
    category: '건축',
    deadline: '2026-09-01',
    dDay: -3,
    hasSafetyForm: true,
  },
  {
    id: 'a2',
    title: 'OO지방도로 확장 공사',
    agency: 'OO도로시설공단',
    announcementNumber: '2026-00456',
    category: '토목',
    deadline: '2026-09-07',
    dDay: -7,
    hasSafetyForm: true,
  },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    memberId: '1',
    announcementId: 'a1',
    title: 'OO초등학교 증축공사 계획서',
    agency: 'OO교육청',
    status: 'in_progress',
    stepCurrent: 3,
    percent: 68,
  },
  {
    id: 'd2',
    memberId: '1',
    announcementId: 'a2',
    title: 'OO지방도로 확장 공사 계획서',
    agency: 'OO도로시설공단',
    status: 'completed',
    stepCurrent: 4,
    percent: 100,
    completedDate: '2026-08-12',
  },
];

export const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 'i1',
    memberId: '1',
    title: '계획서 작성 중 항목이 초기화됐어요',
    content: '...',
    date: '2026-08-20',
    status: 'answered',
    answer: '일시적인 저장 지연 문제로...',
    answeredDate: '2026-08-21',
  },
  {
    id: 'i2',
    memberId: '1',
    title: '구독 결제가 반영되지 않습니다',
    content: '...',
    date: '2026-08-27',
    status: 'pending',
  },
];
```

### Phase 1: useAuth with Mock Data
```ts
// src/hooks/useAuth.ts (Phase 1 implementation)

export const useAuth = (): AuthContext => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });
  
  const login = async (email: string, password: string) => {
    // Phase 1: Mock login
    const mockUser = MOCK_USERS.find(u => u.email === email);
    if (!mockUser) throw new Error('User not found');
    setUser(mockUser);
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
  };
  
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };
  
  return { user, isAuthenticated: !!user, login, logout, /* ... */ };
};

// Phase 2: Replace with Supabase
export const useAuth = (): AuthContext => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Watch auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(data);
      } else {
        setUser(null);
      }
    });
  }, []);
  
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  
  return { /* ... */ };
};
```

### Phase 1: Announcement Hooks
```ts
// src/hooks/useAnnouncements.ts

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const search = async (query: string) => {
    setLoading(true);
    try {
      // Phase 1: Filter mock data
      const filtered = MOCK_ANNOUNCEMENTS.filter(a =>
        a.title.includes(query) ||
        a.agency.includes(query) ||
        a.announcementNumber.includes(query)
      );
      setAnnouncements(filtered);
      
      // Phase 2: Call Supabase
      // const { data, error } = await supabase
      //   .from('announcements')
      //   .select('*')
      //   .ilike('title', `%${query}%`);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  return { announcements, loading, error, search };
};
```

---

## 16. UI 구현 후 /design-sync를 실행하는 시점과 범위

### Design-Sync Checklist
```
Phase 1 UI Complete:
✓ All 16 pages rendered with mock data
✓ All components styled with design tokens
✓ Responsive layouts tested (desktop/tablet/mobile)
✓ All 5 states working (Loading/Empty/Error/Unauthorized/Success)
✓ Accessibility (ARIA, keyboard nav, prefers-reduced-motion)
✓ Unit tests for components + hooks
✓ Integration tests for key flows

→ Execute: /design-sync

Design-Sync runs:
1. Compare current React components against Claude Design .dc.html files
2. Validate:
   - Layout structure matches (grid, flex, positioning)
   - Typography hierarchy maintained (font-size, font-weight, font-family)
   - Color tokens match (all --color-* variables)
   - Spacing matches (all gap, padding consistent)
   - Component sizes (buttons, inputs, cards)
   - Responsive breakpoints (960px, 640px)
3. Generate design.sync.report.json with diffs
4. Flag: styling drift, missing states, responsive breaks

→ Fix flagged issues
→ Re-run /design-sync until clean

Phase 2 Supabase Integration:
- Connect useAuth to Supabase Auth
- Connect hooks to Supabase data
- Add RLS policies (already in contracts/rls-policies.sql)
- Test with real database
```

---

## 17. 로컬 실행 방법

### Setup Instructions
```bash
# 1. Clone & dependencies
git clone <repo-url>
cd acplatform
npm install

# 2. Supabase setup (Phase 2+)
# Create .env.local based on .env.example:
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=xxx
# VITE_SUPABASE_SERVICE_ROLE_KEY=xxx (admin only)

# 3. Run dev server
npm run dev
# → http://localhost:5173

# 4. Run tests
npm run test              # Vitest watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report

# 5. Type check
npm run type-check

# 6. Lint & format
npm run lint
npm run format
```

### Vite Config (vite.config.ts)
```ts
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
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    minify: 'terser',
  },
})
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src",
    "design-sync": "claude --sync design"
  }
}
```

### Local Development Flow
```
1. npm run dev
   → Vite dev server on http://localhost:5173
   → HMR enabled (auto-reload on file change)

2. Open browser → see MainPage with mock data
   → Render all 16 pages locally
   → Test routing: /announcements, /documents, /admin/dashboard, etc.

3. npm run test (in another terminal)
   → Vitest watch mode
   → Auto-run tests on file change

4. Edit component → HMR reloads
   → Component renders instantly
   → Tests re-run in parallel

5. Once satisfied:
   → npm run build (creates dist/)
   → npm run preview (preview production build)
   → git commit
   → Push to branch

6. In PR: Run /design-sync (after approval)
   → Validate against Claude Design
   → Fix any styling drift
   → Merge when clean
```

---

## Timeline & Milestones

**Week 1: Phase 1 - UI Foundation**
- Day 1-2: Directory setup, component library, design tokens
- Day 3-4: 16 pages (mock data)
- Day 5: Responsive + accessibility
- → PR #001: "UI implementation with mock data"

**Week 2: Phase 1 - Testing & Design-Sync**
- Day 1: Unit + integration tests
- Day 2: /design-sync validation & fixes
- → PR #002: "UI validation & tests"

**Week 3: Phase 2 - Supabase Integration**
- Day 1-2: Auth (login/signup)
- Day 3-4: Data integration (announcements, documents, inquiries)
- Day 5: Admin features (API management, member management)
- → PR #003: "Supabase integration"

**Week 4: Phase 3 - Testing & Polish**
- Day 1-2: e2e tests (Playwright)
- Day 3: Performance optimization, security review
- Day 4: Final QA
- → PR #004: "e2e tests & production ready"

---

## Key Design Decisions

1. **Mock Data First**: Phase 1 UI is completely functional with mock data, enabling parallel work and early validation
2. **CSS Variables**: All colors, spacing, typography use token-based variables for consistency
3. **Component Library**: Reusable, tested components for Button, Input, Badge, etc.
4. **UI-First Pipeline**: UI complete → /design-sync → Supabase integration (not simultaneous)
5. **RLS from Day 1**: PostgreSQL schema includes RLS policies, ready for integration
6. **Accessibility Built-in**: ARIA, keyboard nav, prefers-reduced-motion in initial components
7. **Type Safety**: TypeScript strict mode, shared types in `services/types.ts`
8. **Testing Strategy**: Unit tests for utilities, component tests for UI, integration tests for flows

---

**Status**: Ready for implementation | **Branch**: `001-user-roles-permissions`
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
