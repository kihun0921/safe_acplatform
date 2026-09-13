import AdminLoginScreen from "@/components/AdminLoginScreen";

const HTML_admin_login = `
<!-- Subtle Ambient Glow -->
<div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-gradient-to-b from-primary-soft/60 to-transparent pointer-events-none -z-10 blur-2xl"></div>
<!-- Top Navigation Header (Admin Portal Minimal Anchor) -->
<header class="w-full bg-surface/90 backdrop-blur-md border-b border-border shadow-sm sticky top-0 z-50">
<div class="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
<!-- Brand & Admin Console Identifier -->
<div class="flex items-center gap-3">
<a class="flex items-center gap-2 group" href="/admin">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-9 h-9 object-contain"/>
<span class="text-xl font-headline font-bold text-primary tracking-tight">올케어안전플랫폼</span>
</a>
<div class="h-4 w-px bg-border"></div>
<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-medium tracking-wide">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
<span>Admin Console</span>
</div>
</div>
<!-- Right Action & Security Badge -->
<div class="flex items-center gap-4">
<div class="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary bg-primary-soft px-3 py-1.5 rounded-full border border-primary/10">
<span class="material-symbols-outlined text-[16px] text-primary" data-icon="lock">lock</span>
<span class="font-medium text-primary">안전보안 프로토콜 v2.4 가동 중</span>
</div>
<a class="text-xs text-text-secondary hover:text-text font-medium flex items-center gap-1 transition-colors" href="#support-modal" onclick="document.getElementById('support-modal').classList.remove('hidden')">
<span class="material-symbols-outlined text-[16px]" data-icon="support_agent">support_agent</span>
<span>보안팀 문의</span>
</a>
</div>
</div>
</header>
<!-- Main Portal Login Content Canvas -->
<main class="flex-1 flex items-center justify-center px-4 py-12 md:py-16">
<div class="w-full max-w-[480px]">
<!-- Security Status Strip Indicator -->
<div class="mb-4 flex items-center justify-between px-3 py-2 bg-surface rounded-lg border border-border text-[11px] text-text-secondary shadow-sm">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-emerald-600 text-[16px]" data-icon="verified_user">verified_user</span>
<span>내부망 보안 게이트웨이 연결됨 (SSL 암호화)</span>
</div>
<span class="font-mono text-text-muted">IP: 211.38.***.***</span>
</div>
<!-- Centered Security Card -->
<div class="bg-surface rounded-xl border border-border shadow-sm p-7 sm:p-9 relative overflow-hidden">
<!-- Card Top Decorative Line (Navy Accent) -->
<div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-strong to-primary"></div>
<!-- Header of Card -->
<div class="text-center mb-6">
<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold mb-3 shadow-xs">
<span class="material-symbols-outlined text-[15px]" data-icon="admin_panel_settings">admin_panel_settings</span>
<span>관리자 전용 (Admin Only)</span>
</div>
<h1 class="text-2xl sm:text-3xl font-headline font-bold text-text tracking-tight mb-2">관리자 로그인</h1>
<p class="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
            올케어안전플랫폼 통합 운영 관리자 포털입니다.<br/>사전 인가된 전담 운영자 계정으로 접속하십시오.
          </p>
</div>
<!-- Security Warning Banner -->
<div class="mb-6 p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-900 flex items-start gap-2.5">
<span class="material-symbols-outlined text-amber-700 shrink-0 text-[18px] mt-0.5" data-icon="warning">warning</span>
<p class="text-xs leading-snug font-medium text-amber-900/90">
            ※ 본 시스템은 허가된 관리자만 접근 가능하며, 비인가자의 불법 접근 및 무단 조작 시 <strong>정보통신망법</strong>에 의해 엄중 처벌받을 수 있습니다.
          </p>
</div>
<!-- Admin Login Form -->
<form class="space-y-4" id="adminLoginForm" onsubmit="event.preventDefault(); simulateLogin();">
<!-- Administrator ID -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5 flex items-center justify-between" for="adminId">
<span>관리자 아이디 (사번 또는 이메일)</span>
<span class="text-[11px] text-text-muted font-normal">필수 인증</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-[18px]" data-icon="badge">badge</span>
</div>
<input class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body" id="adminId" name="adminId" placeholder="admin@allcare.co.kr 또는 관리자 ID" required="" type="text"/>
</div>
</div>
<!-- Password Field with Visibility Toggle -->
<div>
<div class="flex items-center justify-between mb-1.5">
<label class="text-xs font-semibold text-text flex items-center gap-1" for="adminPassword">
<span>비밀번호</span>
</label>
<button class="text-xs text-text-secondary hover:text-primary transition-colors underline-offset-2 hover:underline" onclick="document.getElementById('support-modal').classList.remove('hidden')" type="button">
                계정 문의 / 암호 초기화
              </button>
</div>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
<span class="material-symbols-outlined text-[18px]" data-icon="lock_open">lock_open</span>
</div>
<input class="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body" id="adminPassword" name="adminPassword" placeholder="보안 패스워드를 입력하세요" required="" type="password"/>
<button aria-label="비밀번호 보기 토글" class="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text focus:outline-none" id="togglePasswordBtn" onclick="togglePasswordVisibility()" type="button">
<span class="material-symbols-outlined text-[18px]" data-icon="visibility" id="eyeIcon">visibility</span>
</button>
</div>
</div>
<!-- Security Options (IP Binding & OTP Preparation) -->
<div class="pt-1.5 space-y-2.5">
<label class="flex items-center gap-2.5 cursor-pointer select-none">
<input checked="" class="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary/20 focus:ring-offset-0 transition-colors cursor-pointer" type="checkbox"/>
<div class="flex items-center gap-1.5">
<span class="text-xs font-medium text-text">보안 세션 유지 (인가 공인 IP 고정 인증)</span>
<span class="px-1.5 py-0.5 rounded text-[10px] bg-primary-soft text-primary font-semibold">권장</span>
</div>
</label>
<label class="flex items-center gap-2.5 cursor-pointer select-none">
<input checked="" class="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary/20 focus:ring-offset-0 transition-colors cursor-pointer" type="checkbox"/>
<span class="text-xs font-medium text-text-secondary">
                2차 인증(OTP / SMS 코드) 단계 자동 연결
              </span>
</label>
</div>
<!-- Submit Action Button -->
<div class="pt-2">
<button class="w-full py-3 px-4 bg-primary hover:bg-primary-strong active:bg-slate-900 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-150 group cursor-pointer" id="submitBtn" type="submit">
<span>관리자 포털 로그인</span>
<span class="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform" data-icon="login">login</span>
</button>
</div>
<!-- Pre-deployment Demo Notice -->
<p class="text-[11px] text-center text-text-muted pt-1">
            * 아래 데이터는 서비스 연동 전 데모 환경이며, 내부 보안망 정책이 적용됩니다.
          </p>
</form>
<!-- Divider -->
<div class="relative my-6">
<div class="absolute inset-0 flex items-center">
<div class="w-full border-t border-border"></div>
</div>
<div class="relative flex justify-center text-xs">
<span class="bg-surface px-3 text-text-muted font-medium">사용자 포털 구분</span>
</div>
</div>
<!-- Switch to Regular Member Login (Strict: No SignUp Allowed for Admin) -->
<div class="rounded-lg bg-surface-alt border border-border p-3 flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-text-secondary text-[18px]" data-icon="domain">domain</span>
<div class="text-left">
<div class="text-xs font-semibold text-text">일반 건설사/회원이신가요?</div>
<div class="text-[11px] text-text-muted">공공 발주처 계획서 작성 업무는 회원 전용 로그인으로 접속하세요.</div>
</div>
</div>
<a class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-surface border border-primary/20 hover:bg-primary-soft rounded-md transition-colors" href="/login">
<span>회원 로그인</span>
<span class="material-symbols-outlined text-[14px]" data-icon="arrow_forward">arrow_forward</span>
</a>
</div>
</div>
<!-- Security Help & Quick Troubleshooting Details -->
<div class="mt-6 text-center space-y-2">
<div class="flex items-center justify-center gap-4 text-xs text-text-secondary">
<button class="hover:text-primary transition-colors flex items-center gap-1" onclick="document.getElementById('support-modal').classList.remove('hidden')" type="button">
<span class="material-symbols-outlined text-[15px]" data-icon="security">security</span>
<span>시스템 관리자(보안팀) 문의</span>
</button>
<span class="text-border">|</span>
<button class="hover:text-primary transition-colors flex items-center gap-1" onclick="document.getElementById('ip-guide-modal').classList.remove('hidden')" type="button">
<span class="material-symbols-outlined text-[15px]" data-icon="dns">dns</span>
<span>사내 고정 IP 등록 가이드</span>
</button>
</div>
<p class="text-[11px] text-text-muted">
          관리자 계정은 최고운영자 승인 하에 전산팀에서만 생성되며, 온라인 신규 가입을 일절 지원하지 않습니다.
        </p>
</div>
</div>
</main>
<!-- Informational Footer (Compliance & Standards) -->
<footer class="w-full bg-surface-alt border-t border-border flat no shadows">
<div class="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
<!-- Left: Copyright & Security Norms -->
<div class="text-left space-y-1">
<div class="flex items-center gap-2">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-5 h-5 object-contain"/>
<span class="font-headline font-bold text-text text-sm">올케어안전플랫폼 통합보안관제</span>
<span class="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-semibold font-mono">SOC-2 / ISO 27001</span>
</div>
<p class="font-body text-xs leading-relaxed text-text-muted">
          © 올케어안전플랫폼 (주). 나라장터 및 공공 발주처 안전보건관리계획서 표준 규격 준수. All rights reserved.
        </p>
<p class="text-[11px] text-text-muted flex items-center gap-2 pt-0.5">
<span class="inline-flex items-center gap-1">
<span class="material-symbols-outlined text-[13px] text-emerald-600" data-icon="check_circle">check_circle</span>
<span>256-Bit SSL 엔드투엔드 암호화 통신</span>
</span>
<span class="text-border">•</span>
<span>내부 감사 로그 5년 의무 보관</span>
<span class="text-border">•</span>
<span>24/7 침해대응센터 가동 중</span>
</p>
</div>
<!-- Right: Standard Legal Links -->
<div class="flex items-center flex-wrap gap-4 text-xs">
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#terms">이용약관</a>
<a class="text-text font-medium underline transition-colors duration-150" href="#privacy">개인정보처리방침</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#rules">안전보건 운영규정</a>
<a class="text-text-muted hover:text-text transition-colors duration-150" href="#guide">공공발주처 가이드</a>
</div>
</div>
</footer>
<!-- Modal: System Security Admin Support Contact -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs hidden p-4" id="support-modal">
<div class="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
<div class="flex items-start justify-between pb-3 border-b border-border">
<div class="flex items-center gap-2">
<span class="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" data-icon="security_update_warning">security_update_warning</span>
</span>
<h3 class="text-base font-bold text-text">시스템 관리자 및 보안팀 문의</h3>
</div>
<button class="text-text-muted hover:text-text" onclick="document.getElementById('support-modal').classList.add('hidden')">
<span class="material-symbols-outlined text-[20px]" data-icon="close">close</span>
</button>
</div>
<div class="py-4 space-y-3 text-xs text-text-secondary leading-relaxed">
<p class="font-medium text-text">
          관리자 계정 발급, 패스워드 분실 및 보안 OTP 기기 재설정은 직무 권한 검증 후 사내 보안팀을 통해서만 처리됩니다.
        </p>
<div class="p-3 bg-surface-alt rounded-lg border border-border space-y-1.5 font-mono text-[11px]">
<div class="flex justify-between">
<span class="text-text-muted">보안관제 센터:</span>
<span class="font-semibold text-text">02-555-0911 (내선 4번)</span>
</div>
<div class="flex justify-between">
<span class="text-text-muted">IT인프라 운영팀:</span>
<span class="font-semibold text-text">sec-ops@allcare.co.kr</span>
</div>
<div class="flex justify-between">
<span class="text-text-muted">운영 가능 시간:</span>
<span class="text-text">평일 08:30 ~ 18:30 (야간 당직제 가동)</span>
</div>
</div>
<p class="text-[11px] text-text-muted">
          * 외부망 접속 요청 시 사전 VPN 결재 문서 번호가 필요합니다.
        </p>
</div>
<div class="pt-2 flex justify-end">
<button class="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-strong transition-colors" onclick="document.getElementById('support-modal').classList.add('hidden')">
          확인 완료
        </button>
</div>
</div>
</div>
<!-- Modal: Fixed IP Guide -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs hidden p-4" id="ip-guide-modal">
<div class="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
<div class="flex items-start justify-between pb-3 border-b border-border">
<div class="flex items-center gap-2">
<span class="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" data-icon="vpn_key">vpn_key</span>
</span>
<h3 class="text-base font-bold text-text">고정 IP 허가 및 보안 규정</h3>
</div>
<button class="text-text-muted hover:text-text" onclick="document.getElementById('ip-guide-modal').classList.add('hidden')">
<span class="material-symbols-outlined text-[20px]" data-icon="close">close</span>
</button>
</div>
<div class="py-4 space-y-3 text-xs text-text-secondary leading-relaxed">
<p>
          본 관리자 콘솔은 화이트리스트에 등록된 사내 지정 공인 IP 대역에서만 로그인이 허용됩니다. 비등록 네트워크(재택, 외부 등) 접속 시 관리자 전용 VPN 터널링을 활성화하십시오.
        </p>
<div class="bg-primary-soft/50 p-3 rounded-lg border border-primary/10 text-primary text-[11px]">
<strong>IP 변경 신청 방법:</strong> 사내 그룹웨어 전자결재 &gt; [IT자원요청] &gt; [관리자 콘솔 접속 IP 추가 신청서] 상신
        </div>
</div>
<div class="pt-2 flex justify-end">
<button class="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-strong transition-colors" onclick="document.getElementById('ip-guide-modal').classList.add('hidden')">
          확인
        </button>
</div>
</div>
</div>
<!-- Inline Interaction Logic -->
`;

const SCRIPT_admin_login = `

    // Password Toggle Functionality
    function togglePasswordVisibility() {
      const passwordInput = document.getElementById('adminPassword');
      const eyeIcon = document.getElementById('eyeIcon');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
      } else {
        passwordInput.type = 'password';
        eyeIcon.textContent = 'visibility';
      }
    }

    // Interactive Demo Simulation
    function simulateLogin() {
      const btn = document.getElementById('submitBtn');
      const adminId = document.getElementById('adminId').value;
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = \`
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>보안 인증 및 OTP 토큰 발급 중...</span>
      \`;

      setTimeout(() => {
        btn.innerHTML = \`
          <span class="material-symbols-outlined text-[18px]" data-icon="check_circle">check_circle</span>
          <span>인증 성공 (2차 OTP 단계로 전환)</span>
        \`;
        btn.classList.remove('bg-primary', 'hover:bg-primary-strong');
        btn.classList.add('bg-emerald-700');

        setTimeout(() => {
          alert(\`[안내] 관리자 계정(\${adminId || 'admin'}) 인증이 확인되었습니다.\\n실운영 환경에서는 OTP 6자리 2차 인증 챌린지 화면으로 안전하게 리다이렉션됩니다.\`);
          btn.innerHTML = originalText;
          btn.classList.remove('bg-emerald-700');
          btn.classList.add('bg-primary', 'hover:bg-primary-strong');
          btn.disabled = false;
        }, 600);
      }, 900);
    }
  
`;

export default function Page() {
  return <AdminLoginScreen html={HTML_admin_login} script={SCRIPT_admin_login} />;
}
