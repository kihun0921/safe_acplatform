import SignupScreen from "@/components/SignupScreen";

const HTML_signup = `
<!-- Top Minimal App Bar -->
<header class="w-full bg-surface border-b border-border shadow-sm sticky top-0 z-50">
<div class="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
<!-- Left: Logo & Subtitle -->
<a class="flex items-center gap-3.5 group" href="/">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-105"/>
<div class="flex flex-col">
<div class="flex items-center gap-2">
<span class="text-xl font-headline font-bold text-primary tracking-tight">올케어안전플랫폼</span>
<span class="text-[11px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full border border-primary/20">B2B SaaS</span>
</div>
<span class="text-xs text-text-secondary hidden sm:inline-block font-normal">공공발주처 안전보건관리 특화 솔루션</span>
</div>
</a>
<!-- Right Action Items -->
<div class="flex items-center gap-3 text-sm">
<a class="text-text-secondary hover:text-text font-medium px-3 py-1.5 rounded-lg hover:bg-primary-soft transition-colors duration-150 flex items-center gap-1.5" href="/legal">
<span class="material-symbols-outlined text-base">support_agent</span>
<span>고객지원센터</span>
</a>
<div class="h-3.5 w-px bg-border"></div>
<a class="inline-flex items-center gap-1.5 text-primary font-semibold px-3.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary-soft transition-all duration-150 shadow-xs" href="/login">
<span class="material-symbols-outlined text-base">login</span>
<span>로그인</span>
</a>
</div>
</div>
</header>
<!-- Main Content Container -->
<main class="flex-grow flex flex-col items-center justify-center py-10 px-4 sm:px-6">
<!-- Top Trust Badge -->
<div class="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-soft border border-primary/20 text-primary shadow-xs">
<span class="material-symbols-outlined text-sm font-semibold">shield</span>
<span class="text-xs font-semibold tracking-tight">건설 공공입찰 전문 B2B 안전 관리 솔루션</span>
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
</div>
<!-- Sign-Up Card -->
<section class="w-full max-w-xl bg-surface rounded-2xl border border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-7 sm:p-10 relative">
<!-- Card Header -->
<div class="text-center mb-8">
<h1 class="font-headline text-2xl sm:text-3xl font-bold text-primary tracking-tight">회원가입</h1>
<p class="mt-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
          모든 항목은 <span class="text-danger font-medium">필수 입력</span>입니다. 공공 발주처 입찰 및 서식 자동 연동을 위한 기업 담당자 정보를 입력해 주세요.
        </p>
</div>
<!-- Registration Form -->
<form class="space-y-5" onsubmit="event.preventDefault();">
<!-- Field 1: Work Email -->
<div>
<div class="flex items-center justify-between mb-1.5">
<label class="text-xs font-semibold text-text flex items-center gap-1" for="email">
<span>업무용 이메일</span>
<span class="text-danger">*</span>
</label>
<span class="text-[11px] text-text-muted">회사 도메인 이메일 권장</span>
</div>
<div class="flex gap-2">
<div class="relative flex-grow">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">mail</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="email" placeholder="manager@company.co.kr" required="" type="email"/>
</div>
<button class="px-3.5 py-2.5 text-xs font-semibold text-primary bg-primary-soft border border-primary/25 rounded-lg hover:bg-primary/10 transition-colors whitespace-nowrap active:scale-[0.98] disabled:opacity-60" id="emailCheckBtn" type="button">
              중복확인
            </button>
</div>
<p class="text-[11px] text-text-muted mt-1.5 flex items-center gap-1" id="emailCheckResult">
<span class="material-symbols-outlined text-xs">info</span>
<span>로그인 계정 ID 및 공공 문서 수신용으로 사용됩니다.</span>
</p>
</div>
<!-- Field 2 & 3: Password & Confirm Password (2-col grid) -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<!-- Password -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="password">
<span>비밀번호</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">lock</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="password" placeholder="영문, 숫자, 특수문자 조합 8자+" required="" type="password"/>
</div>
</div>
<!-- Password Confirm -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="password_confirm">
<span>비밀번호 확인</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">check_circle</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="password_confirm" placeholder="비밀번호 재입력" required="" type="password"/>
</div>
</div>
</div>
<!-- Section Divider: Company Information -->
<div class="pt-3 border-t border-border/70">
<span class="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
<span class="material-symbols-outlined text-sm">apartment</span>
<span>건설사 및 입찰 담당자 정보</span>
</span>
</div>
<!-- Field 4 & 5: Company Name & Business Registration Number (2-col grid) -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<!-- Company Name -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="company_name">
<span>소속 건설사명</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">domain</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="company_name" placeholder="(주)대한종합건설" required="" type="text"/>
</div>
</div>
<!-- Business Number -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="business_number">
<span>사업자등록번호</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">badge</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="business_number" maxlength="12" placeholder="123-45-67890" required="" type="text"/>
</div>
</div>
</div>
<!-- Field 6 & 7: Manager Name & Phone Number (2-col grid) -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<!-- Manager Name -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="manager_name">
<span>담당자명 및 직급</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">person</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="manager_name" placeholder="홍길동 부장" required="" type="text"/>
</div>
</div>
<!-- Phone Number -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1" for="phone">
<span>담당자 연락처</span>
<span class="text-danger">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-lg">call</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface rounded-lg border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150" id="phone" placeholder="010-1234-5678" required="" type="tel"/>
</div>
</div>
</div>
<!-- Notice Callout Box -->
<div class="rounded-xl bg-primary-soft/70 border border-primary/20 p-3.5 flex items-start gap-2.5">
<span class="material-symbols-outlined text-primary text-lg mt-0.5">policy</span>
<p class="text-xs text-text leading-relaxed">
            입력하신 사업자등록 정보는 <span class="font-semibold text-primary">LH, SH, 한국토지주택공사, 국가철도공단</span> 등 공공 발주처 제출용 안전보건관리계획서 양식에 자동 연동됩니다.
          </p>
</div>
<!-- Terms and Agreements -->
<div class="space-y-2.5 pt-2 border-t border-border">
<div class="flex items-start gap-2.5">
<input class="mt-0.5 rounded border-border text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer" id="agree_required" required="" type="checkbox"/>
<label class="text-xs text-text cursor-pointer leading-normal flex-grow" for="agree_required">
<span class="text-primary font-bold">[필수]</span>
<span>서비스 이용약관 및 개인정보 수집·이용에 동의합니다.</span>
<a class="text-text-secondary hover:text-primary underline ml-1 font-medium" href="#">약관전문보기</a>
</label>
</div>
<div class="flex items-start gap-2.5">
<input class="mt-0.5 rounded border-border text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer" id="agree_optional" type="checkbox"/>
<label class="text-xs text-text-secondary cursor-pointer leading-normal" for="agree_optional">
<span class="text-text-muted font-medium">[선택]</span>
<span>나라장터 실시간 입찰 공고 및 안전보건 최신 개정 서식 알림 수신 (SMS/Email)</span>
</label>
</div>
</div>
<!-- Primary CTA Button -->
<div class="pt-2">
<button class="w-full py-3.5 px-6 rounded-lg bg-primary hover:bg-primary-strong text-white font-semibold text-sm sm:text-base tracking-normal flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.99]" type="submit">
<span>회원가입 완료</span>
<span class="material-symbols-outlined text-lg">arrow_forward</span>
</button>
</div>
<!-- Already Registered Link -->
<div class="text-center pt-2">
<span class="text-xs text-text-secondary">이미 계정이 있으신가요?</span>
<a class="text-xs font-bold text-primary hover:text-primary-strong underline ml-1.5 transition-colors" href="/login">로그인</a>
</div>
</form>
</section>
<!-- Trust and Security Badges -->
<div class="mt-6 text-center max-w-lg space-y-2">
<div class="flex items-center justify-center gap-4 text-xs text-text-muted">
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm text-success">lock</span>
<span>SSL 256-bit 전송구간 암호화</span>
</span>
<span class="text-border">|</span>
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm text-primary">verified</span>
<span>전자정부 표준 보안 규격 준수</span>
</span>
</div>
<p class="text-[11px] text-text-muted">
        본 플랫폼은 공공 발주처 제출용 안전보건관리계획서 표준 규격을 준수하며 기업 데이터는 안전하게 보호됩니다.
      </p>
</div>
</main>
<!-- Informational Corporate Footer -->
<footer class="w-full bg-surface-alt border-t border-border mt-12">
<div class="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
<!-- Footer Copyright & Info -->
<div class="text-center md:text-left">
<p class="font-body text-xs leading-relaxed text-text-muted">
          © 올케어안전플랫폼 (주). 나라장터 및 공공 발주처 안전보건관리계획서 표준 규격 준수. All rights reserved.
        </p>
<p class="text-[11px] text-text-muted/80 mt-1">
          고객지원실: 1588-0000 (평일 09:00 ~ 18:00) | 안전기술자문센터 상시 접수 지원
        </p>
</div>
<!-- Footer Policy Links -->
<div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
<a class="text-text-muted hover:text-text transition-colors duration-150" href="/legal">이용약관</a>
<a class="text-text font-medium underline hover:text-primary transition-colors duration-150" href="/legal">개인정보처리방침</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#">안전보건 운영규정</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#">공공발주처 가이드</a>
</div>
</div>
</footer>
`;

const SCRIPT_signup = `

`;

export default function Page() {
  return <SignupScreen html={HTML_signup} />;
}
