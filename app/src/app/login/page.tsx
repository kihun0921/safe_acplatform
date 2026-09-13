import LoginScreen from "@/components/LoginScreen";

const HTML_login = `
<!-- TopNavBar (Minimal Public Header as per Shared Components JSON) -->
<header class="bg-surface border-b border-border shadow-sm sticky top-0 z-50">
<div class="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
<!-- Brand Logo -->
<a class="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg py-1 px-1.5 transition-all" href="/">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-9 h-9 object-contain"/>
<div class="flex flex-col">
<span class="text-xl font-headline font-bold text-primary tracking-tight">올케어안전플랫폼</span>
<span class="text-[10px] text-text-muted font-medium tracking-wide -mt-0.5">공공발주처 안전보건관리 특화 솔루션</span>
</div>
</a>
<!-- Trailing Action Cluster -->
<div class="flex items-center gap-4 text-sm font-label">
<a class="text-text-secondary hover:text-text font-medium transition-colors duration-150 flex items-center gap-1.5" href="/legal">
<span class="material-symbols-outlined text-[18px] text-text-muted" data-icon="headset_mic">headset_mic</span>
<span>고객지원센터</span>
</a>
<span class="h-3.5 w-[1px] bg-border"></span>
<a class="px-3.5 py-1.5 rounded-lg border border-border text-primary font-semibold hover:bg-primary-soft transition-all duration-200 active:opacity-80" href="/signup">
          회원가입
        </a>
</div>
</div>
</header>
<!-- Main Canvas: Centered Login Card -->
<main class="flex-1 flex items-center justify-center px-4 py-12 md:py-16 bg-gradient-to-b from-bg to-surface-alt/60">
<div class="w-full max-w-md">
<!-- Official Public Trust Badge -->
<div class="flex items-center justify-center gap-2 mb-4">
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary border border-primary/10">
<span class="material-symbols-outlined text-[14px]" data-icon="verified">verified</span>
          건설 공공입찰 전문 B2B 안전 관리 솔루션
        </span>
</div>
<!-- Main Login Container -->
<div class="bg-surface rounded-xl border border-border p-8 md:p-10 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
<!-- Header Text -->
<div class="text-center mb-8">
<h1 class="font-headline font-bold text-2xl md:text-3xl text-text tracking-tight mb-2">
            로그인
          </h1>
<p class="text-text-secondary text-sm leading-relaxed">
            담당자 계정으로 로그인하여 발주처 맞춤 계획서를 관리하세요.
          </p>
</div>
<!-- Form Area -->
<form class="space-y-5" onsubmit="event.preventDefault();">
<!-- Email Field -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 tracking-wide" for="email">
              업무용 이메일
            </label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-[19px]" data-icon="mail">mail</span>
</div>
<input class="block w-full pl-10 pr-3.5 py-2.5 bg-surface text-text text-sm rounded-lg border border-border placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition duration-150" id="email" name="email" placeholder="example@company.co.kr" required="" type="email"/>
</div>
</div>
<!-- Password Field -->
<div>
<div class="flex items-center justify-between mb-1.5">
<label class="block text-xs font-semibold text-text tracking-wide" for="password">
                비밀번호
              </label>
</div>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-[19px]" data-icon="lock">lock</span>
</div>
<input class="block w-full pl-10 pr-10 py-2.5 bg-surface text-text text-sm rounded-lg border border-border placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition duration-150" id="password" name="password" placeholder="비밀번호 입력" required="" type="password"/>
<button aria-label="비밀번호 표시 토글" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text focus:outline-none" id="togglePassword" type="button">
<span class="material-symbols-outlined text-[19px]" data-icon="visibility" id="toggleIcon">visibility</span>
</button>
</div>
</div>
<!-- Remember Me & Forgot Password Links -->
<div class="flex items-center justify-between pt-1">
<label class="flex items-center gap-2 cursor-pointer select-none group">
<input class="w-4 h-4 rounded text-primary border-border focus:ring-primary/20 focus:ring-offset-0 focus:ring-2 transition cursor-pointer" type="checkbox"/>
<span class="text-xs text-text-secondary group-hover:text-text transition-colors">로그인 상태 유지</span>
</label>
<a class="text-xs text-text-secondary hover:text-primary font-medium hover:underline transition-colors" href="#">
              비밀번호 찾기
            </a>
</div>
<!-- Primary Submit Button -->
<button class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-strong text-white font-label font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all duration-200 active:opacity-90 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30" type="submit">
<span>로그인</span>
<span class="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
</button>
</form>
<!-- Divider with text -->
<div class="relative my-7">
<div class="absolute inset-0 flex items-center">
<div class="w-full border-t border-border"></div>
</div>
<div class="relative flex justify-center text-xs">
<span class="px-3 bg-surface text-text-muted font-medium">신규 담당자 안내</span>
</div>
</div>
<!-- Signup Prompt -->
<div class="text-center">
<p class="text-xs text-text-secondary">
            아직 플랫폼 계정이 없으신가요?
            <a class="ml-1 text-primary font-bold hover:underline inline-flex items-center" href="/signup">
              회원가입
            </a>
</p>
</div>
<!-- Demonstration Notice Banner -->
<div class="mt-6 pt-4 border-t border-border/80">
<div class="p-2.5 rounded-lg bg-surface-alt flex items-start gap-2 text-left">
<span class="material-symbols-outlined text-[16px] text-text-muted shrink-0 mt-0.5" data-icon="info">info</span>
<p class="text-[11px] text-text-secondary leading-snug">
              * 아래 데이터는 서비스 연동 전 데모 데이터입니다. 조달청 나라장터 및 LH·SH 공공 발주 가이드라인 규격이 사전 반영되어 있습니다.
            </p>
</div>
</div>
</div>
<!-- Security & Government Standard Assurance -->
<div class="mt-6 text-center space-y-2">
<div class="inline-flex items-center gap-2 text-xs text-text-muted font-medium">
<span class="inline-flex items-center gap-1 text-text-secondary">
<span class="material-symbols-outlined text-[15px] text-success" data-icon="lock" style="font-variation-settings: 'FILL' 1;">lock</span>
            SSL 256-bit 보안 암호화 적용
          </span>
<span class="text-border">|</span>
<span class="inline-flex items-center gap-1 text-text-secondary">
<span class="material-symbols-outlined text-[15px] text-primary" data-icon="verified_user">verified_user</span>
            전자정부 표준보안 규격 준수
          </span>
</div>
<p class="text-[11px] text-text-muted">
          본 플랫폼은 공공 발주처 제출용 안전보건관리계획서 표준 규격을 지원합니다.
        </p>
</div>
</div>
</main>
<!-- Footer (Informational as per Shared Components JSON) -->
<footer class="bg-surface-alt border-t border-border mt-auto">
<div class="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
<!-- Brand & Compliance Notice -->
<div class="flex flex-col items-center md:items-start text-center md:text-left gap-1">
<div class="flex items-center gap-2">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-5 h-5 object-contain"/>
<span class="font-headline font-bold text-text text-sm">올케어안전플랫폼</span>
<span class="px-2 py-0.5 rounded text-[10px] bg-white border border-border text-text-muted">공공기관 제출용</span>
</div>
<p class="font-body text-xs leading-relaxed text-text-muted">
          © 올케어안전플랫폼 (주). 나라장터 및 공공 발주처 안전보건관리계획서 표준 규격 준수. All rights reserved.
        </p>
</div>
<!-- Footer Policy Links & CS info -->
<div class="flex flex-wrap justify-center md:justify-end items-center gap-x-5 gap-y-2 text-xs">
<a class="text-text-muted hover:text-text transition-colors duration-150" href="/legal">이용약관</a>
<a class="text-text-muted hover:text-text transition-colors duration-150 font-semibold text-text" href="/legal">개인정보처리방침</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#">안전보건 운영규정</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#">공공발주처 가이드</a>
<span class="hidden md:inline text-border">|</span>
<span class="text-text-secondary font-medium">고객지원실 <strong class="text-text font-bold">1588-0000</strong></span>
</div>
</div>
</footer>
<!-- Micro-interactions Script -->
`;

const SCRIPT_login = `

    // Password visibility toggle
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');

    if (togglePasswordBtn && passwordInput && toggleIcon) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
        toggleIcon.setAttribute('data-icon', isPassword ? 'visibility_off' : 'visibility');
      });
    }
  
`;

export default function Page() {
  return <LoginScreen html={HTML_login} script={SCRIPT_login} />;
}
