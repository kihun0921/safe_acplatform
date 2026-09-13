import StitchScreen from "@/components/StitchScreen";

const HTML_my_page = `
<!-- ==================== TOP NAVIGATION BAR ==================== -->
<!-- Shared Component: TopNavBar (Web Header) conforming to JSON definition & styling -->
<header class="sticky top-0 z-50 w-full bg-surface dark:bg-surface border-b border-border dark:border-border shadow-sm">
<div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
<!-- Brand & Left Navigation -->
<div class="flex items-center space-x-10">
<!-- Logo -->
<a class="flex items-center space-x-2.5 font-headline text-lg font-bold text-primary dark:text-primary tracking-tight" href="/">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-8 h-8 object-contain"/>
<span class="text-primary font-bold text-lg tracking-tight">올케어안전플랫폼</span>
</a>
<!-- Main Navigation Links from JSON -->
<nav class="hidden md:flex items-center space-x-7 font-body text-sm font-medium tracking-normal">
<a class="text-text-secondary dark:text-text-secondary hover:text-text dark:hover:text-text transition-colors duration-150 py-1" href="/announcements">공고 검색</a>
<a class="text-text-secondary dark:text-text-secondary hover:text-text dark:hover:text-text transition-colors duration-150 py-1" href="#">계획서 작성</a>
<a class="text-text-secondary dark:text-text-secondary hover:text-text dark:hover:text-text transition-colors duration-150 py-1" href="/documents">내 문서함</a>
<a class="text-text-secondary dark:text-text-secondary hover:text-text dark:hover:text-text transition-colors duration-150 py-1" href="/legal">고객지원</a>
</nav>
</div>
<!-- Right Action & Member Profile Area -->
<div class="flex items-center space-x-4">
<!-- Primary Action Button (from JSON: trailing_primary_action) -->
<a class="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-primary text-white hover:bg-primary-hover active:scale-[0.98] transition-all shadow-xs" href="#">
<span class="material-symbols-outlined text-sm">edit_document</span>
<span>새 계획서 작성</span>
</a>
<!-- Notifications Action (from JSON: trailing_icon_actions) -->
<button aria-label="알림" class="relative p-2 text-text-secondary hover:text-text hover:bg-primary-soft rounded-full transition-colors" type="button">
<span class="material-symbols-outlined text-[22px]">notifications</span>
<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-danger ring-2 ring-white"></span>
</button>
<div class="h-5 w-[1px] bg-border mx-1"></div>
<!-- Authenticated User Profile Information -->
<div class="flex items-center space-x-3">
<div class="text-right hidden lg:block">
<div class="text-xs font-bold text-text flex items-center justify-end space-x-1.5">
<span class="text-text-secondary font-normal">(주)대한종합건설</span>
<span class="text-text font-semibold">홍길동 부장</span>
</div>
<div class="text-[11px] text-text-muted flex items-center justify-end space-x-1">
<span class="inline-block w-1.5 h-1.5 rounded-full bg-status-success"></span>
<span>안전보건총괄책임</span>
</div>
</div>
<!-- User Avatar with Initials -->
<div class="w-9 h-9 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm border border-primary/20 ring-1 ring-border">
            홍
          </div>
<!-- Logout Button -->
<button class="text-xs text-text-muted hover:text-text p-1.5 hover:bg-slate-100 rounded transition-colors flex items-center space-x-0.5" title="로그아웃" type="button">
<span class="material-symbols-outlined text-lg">logout</span>
<span class="hidden sm:inline text-xs">로그아웃</span>
</button>
</div>
</div>
</div>
</header>
<!-- ==================== SUB-HEADER & BREADCRUMB ==================== -->
<section class="bg-surface border-b border-border">
<div class="max-w-7xl mx-auto px-6 py-6">
<!-- Breadcrumb -->
<nav class="flex items-center space-x-2 text-xs text-text-muted font-body mb-2.5">
<a class="hover:text-primary transition-colors flex items-center" href="#">
<span class="material-symbols-outlined text-sm mr-1">home</span>홈
        </a>
<span class="text-slate-300">/</span>
<a class="hover:text-primary transition-colors" href="/my-page">마이페이지</a>
<span class="text-slate-300">/</span>
<span class="text-text font-medium">회원 정보 관리</span>
</nav>
<!-- Title & Context Description -->
<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
<div>
<h1 class="font-headline text-2xl font-bold text-text tracking-tight flex items-center gap-2.5">
<span>회원 정보 관리 (마이페이지)</span>
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary border border-primary/20">
              공공입찰 기업회원
            </span>
</h1>
<p class="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
            공공 발주처(LH·SH·국가철도공단 등) 안전보건관리계획서 제출용 기업 정보 및 담당자 계정을 관리합니다.
          </p>
</div>
<!-- Verification Notice Ribbon -->
<div class="inline-flex items-center gap-2 bg-status-success-soft text-status-success-text px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-medium self-start sm:self-auto">
<span class="material-symbols-outlined text-base text-status-success fill-icon">verified</span>
<span>조달청 나라장터 연동 기업계정</span>
</div>
</div>
</div>
</section>
<!-- ==================== MAIN CONTENT (2-COLUMN BENTO/GRID) ==================== -->
<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
<!-- LEFT COLUMN: SIDE PROFILE SUMMARY CARD & TABS (lg:col-span-4) -->
<aside class="lg:col-span-4 space-y-6">
<!-- Summary Profile Card -->
<div class="bg-surface rounded-xl border border-border p-6 shadow-card">
<div class="flex items-start justify-between pb-5 border-b border-border">
<div class="flex items-center space-x-3.5">
<div class="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-xs border border-primary-strong">
<span>홍</span>
</div>
<div>
<div class="flex items-center space-x-2">
<h2 class="text-base font-bold text-text">홍길동 부장</h2>
<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-soft text-primary">안전총괄</span>
</div>
<p class="text-xs text-text-secondary mt-0.5 font-medium">(주)대한종합건설</p>
<div class="flex items-center space-x-1.5 mt-1.5 text-[11px] text-text-muted">
<span class="material-symbols-outlined text-[13px] text-status-success">check_circle</span>
<span class="text-slate-600 font-medium">계정 상태: 정상 인증</span>
</div>
</div>
</div>
</div>
<!-- Account Metadata Details -->
<div class="py-4 space-y-2.5 text-xs border-b border-border">
<div class="flex justify-between items-center text-text-secondary">
<span class="text-text-muted">회원 권한</span>
<span class="font-medium text-text bg-slate-100 px-2 py-0.5 rounded">일반회원 (공공입찰)</span>
</div>
<div class="flex justify-between items-center text-text-secondary">
<span class="text-text-muted">소속 부서</span>
<span class="font-medium text-text">안전보건품질본부</span>
</div>
<div class="flex justify-between items-center text-text-secondary">
<span class="text-text-muted">최종 접속일시</span>
<span class="font-medium text-text">2025.02.26 14:48 (KST)</span>
</div>
<div class="flex justify-between items-center text-text-secondary">
<span class="text-text-muted">조달업체등록번호</span>
<span class="font-mono font-medium text-text">KR-2018-09412</span>
</div>
</div>
<!-- Mini Document Progress Indicator -->
<div class="pt-5">
<div class="flex items-center justify-between mb-3">
<span class="text-xs font-bold text-text flex items-center gap-1.5">
<span class="material-symbols-outlined text-sm text-primary">description</span>
<span>계획서 작성 및 제출 현황</span>
</span>
<a class="text-[11px] text-primary hover:underline font-medium" href="/documents">내 문서함 가기</a>
</div>
<div class="grid grid-cols-2 gap-3">
<div class="p-3 bg-surface-alt rounded-lg border border-border text-center">
<span class="text-[11px] text-text-muted block">작성 중인 계획서</span>
<span class="text-xl font-bold text-primary mt-1 block">5<span class="text-xs font-normal text-text-secondary ml-1">건</span></span>
</div>
<div class="p-3 bg-status-success-soft rounded-lg border border-emerald-100 text-center">
<span class="text-[11px] text-emerald-700 block">승인 완료 (공공제출)</span>
<span class="text-xl font-bold text-status-success-text mt-1 block">19<span class="text-xs font-normal text-emerald-800 ml-1">건</span></span>
</div>
</div>
</div>
</div>
<!-- Mypage Side Navigation Menu -->
<nav aria-label="마이페이지 메뉴" class="bg-surface rounded-xl border border-border overflow-hidden shadow-card">
<div class="px-4 py-3 bg-surface-alt border-b border-border">
<span class="text-xs font-bold text-text-secondary tracking-wider">마이페이지 메뉴</span>
</div>
<div class="p-2 space-y-1">
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white shadow-xs" href="#">
<div class="flex items-center space-x-2.5">
<span class="material-symbols-outlined text-lg">badge</span>
<span>회원 정보 관리</span>
</div>
<span class="material-symbols-outlined text-sm">chevron_right</span>
</a>
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-alt transition-colors" href="#">
<div class="flex items-center space-x-2.5">
<span class="material-symbols-outlined text-lg text-text-muted">notifications_active</span>
<span>알림 설정</span>
</div>
<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">수신중</span>
</a>
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-alt transition-colors" href="#">
<div class="flex items-center space-x-2.5">
<span class="material-symbols-outlined text-lg text-text-muted">security</span>
<span>접속 보안 로그</span>
</div>
<span class="material-symbols-outlined text-sm text-text-muted">chevron_right</span>
</a>
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-alt transition-colors" href="#">
<div class="flex items-center space-x-2.5">
<span class="material-symbols-outlined text-lg text-text-muted">vpn_key</span>
<span>조달청 인증서 연동 관리</span>
</div>
<span class="inline-flex items-center text-[11px] font-semibold text-status-success bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                연동됨
              </span>
</a>
</div>
</nav>
<!-- Help Desk Banner Card -->
<div class="bg-primary-soft rounded-xl border border-blue-100 p-4 flex items-start space-x-3">
<span class="material-symbols-outlined text-primary mt-0.5">contact_support</span>
<div class="text-xs">
<h4 class="font-bold text-primary">기업 인증 및 명의 변경 문의</h4>
<p class="text-text-secondary mt-1 leading-relaxed">
              사업자등록번호 변경 및 대표자 변경 등 증빙서류 승인이 필요한 작업은 전담 헬프데스크로 연락 바랍니다.
            </p>
<div class="mt-2 text-primary font-bold">1588-0428 <span class="text-text-muted font-normal text-[11px]">(평일 09:00 - 18:00)</span></div>
</div>
</div>
</aside>
<!-- RIGHT COLUMN: MAIN CONTENT FORMS (lg:col-span-8) -->
<section class="lg:col-span-8 space-y-6">
<!-- SECTION 1: 기업 및 담당자 기본 정보 수정 FORM CARD -->
<div class="bg-surface rounded-xl border border-border p-6 sm:p-7 shadow-card">
<!-- Card Header -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-2">
<div>
<h2 class="font-headline text-lg font-bold text-text flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-xl">domain</span>
<span>기업 및 담당자 기본 정보</span>
</h2>
<p class="text-xs text-text-muted mt-1">
                * 수정된 정보는 향후 새로 작성되는 공공 안전보건관리계획서 서식에 자동 반영됩니다.
              </p>
</div>
<span class="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full self-start">
              필수항목 입력
            </span>
</div>
<!-- Form Fields Grid (2-column layout) -->
<form class="pt-6 space-y-5" onsubmit="event.preventDefault();">
<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
<!-- Field 1: 담당자명 -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="manager-name">
                  담당자명 <span class="text-status-danger">*</span>
</label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted font-medium transition-all" id="manager-name" required="" type="text" value="홍길동"/>
<span class="material-symbols-outlined absolute right-3 top-2.5 text-text-muted text-lg pointer-events-none">person</span>
</div>
</div>
<!-- Field 2: 직책/부서 -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="manager-position">
                  직책 / 부서 <span class="text-status-danger">*</span>
</label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted font-medium transition-all" id="manager-position" required="" type="text" value="안전보건팀 부장"/>
<span class="material-symbols-outlined absolute right-3 top-2.5 text-text-muted text-lg pointer-events-none">badge</span>
</div>
</div>
<!-- Field 3: 회사명 (법인명) -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="company-name">
                  회사명 (법인명) <span class="text-status-danger">*</span>
</label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted font-medium transition-all" id="company-name" required="" type="text" value="(주)대한종합건설"/>
<span class="material-symbols-outlined absolute right-3 top-2.5 text-text-muted text-lg pointer-events-none">corporate_fare</span>
</div>
</div>
<!-- Field 4: 대표이사명 -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="ceo-name">
                  대표이사명 <span class="text-status-danger">*</span>
</label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted font-medium transition-all" id="ceo-name" required="" type="text" value="김대표"/>
<span class="material-symbols-outlined absolute right-3 top-2.5 text-text-muted text-lg pointer-events-none">account_circle</span>
</div>
</div>
<!-- Field 5: 사업자등록번호 & 진위확인 배지 -->
<div class="sm:col-span-2">
<div class="flex items-center justify-between mb-1.5">
<label class="block text-xs font-semibold text-text" for="business-number">
                    사업자등록번호 <span class="text-status-danger">*</span>
</label>
<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-status-success bg-status-success-soft px-2.5 py-0.5 rounded-full border border-emerald-200">
<span class="material-symbols-outlined text-[13px] fill-icon">verified_user</span>
                    사업자등록증 진위확인 완료
                  </span>
</div>
<div class="flex gap-2">
<input class="flex-1 px-3.5 py-2.5 text-sm text-text bg-surface-alt border border-border rounded-lg font-mono font-medium cursor-not-allowed text-slate-700" id="business-number" readonly="" type="text" value="123-45-67890"/>
<button class="px-3.5 py-2.5 text-xs font-medium text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-alt active:scale-[0.98] transition-all" type="button">
                    등록증 재확인
                  </button>
</div>
<p class="text-[11px] text-text-muted mt-1.5">※ 국세청 홈택스 사업자 상태가 정상 계속사업자로 검증되었습니다.</p>
</div>
<!-- Field 6: 연락처 (휴대전화) & SMS 체크박스 -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="contact-phone">
                  담당자 연락처 (휴대전화) <span class="text-status-danger">*</span>
</label>
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted font-medium transition-all" id="contact-phone" required="" type="tel" value="010-1234-5678"/>
<div class="mt-2 flex items-center space-x-2">
<input checked="" class="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary focus:ring-offset-0" id="sms-optin" type="checkbox"/>
<label class="text-xs text-text-secondary cursor-pointer" for="sms-optin">
                    계획서 검토 및 보완 요청 긴급 SMS 알림 수신 동의
                  </label>
</div>
</div>
<!-- Field 7: 담당 업무 역할 -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="role-select">
                  현장 담당 업무 <span class="text-status-danger">*</span>
</label>
<select class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg font-medium transition-all" id="role-select">
<option selected="" value="safety_manager">안전총괄책임자 (현장총괄)</option>
<option value="site_agent">현장대리인</option>
<option value="safety_staff">안전관리자 / 보건관리자</option>
<option value="admin_staff">공무담당 / 본사 기술지원</option>
</select>
<p class="text-[11px] text-text-muted mt-2">안전보건관리계획서 서명란 기본 직책으로 표기됩니다.</p>
</div>
</div>
</form>
</div>
<!-- SECTION 2: 보안 및 인증 정보 변경 SECTION -->
<div class="space-y-6">
<!-- 2.1 업무용 이메일 변경 카드 -->
<div class="bg-surface rounded-xl border border-border p-6 shadow-card">
<div class="pb-4 border-b border-border flex items-center justify-between">
<h3 class="font-headline text-base font-bold text-text flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-xl">mark_email_read</span>
<span>업무용 이메일 계정 관리</span>
</h3>
<span class="text-xs text-text-muted font-mono">인증된 로그인 ID</span>
</div>
<div class="pt-5 space-y-4">
<!-- Current Email Box -->
<div class="p-3.5 bg-surface-alt rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
<div>
<span class="text-[11px] text-text-muted block">현재 등록된 업무용 이메일</span>
<span class="text-sm font-semibold text-text font-mono mt-0.5 block">hong.safety@daehancon.co.kr</span>
</div>
<span class="inline-flex items-center gap-1 text-xs text-status-success font-medium self-start sm:self-auto">
<span class="material-symbols-outlined text-base fill-icon">check_circle</span>
                  인증 완료
                </span>
</div>
<!-- Change Email Input Group -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="new-email">
                  새 이메일 주소 입력
                </label>
<div class="flex flex-col sm:flex-row gap-2.5">
<div class="relative flex-1">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted transition-all" id="new-email" placeholder="새로운 회사 이메일을 입력하세요 (예: user@daehancon.co.kr)" type="email"/>
<span class="material-symbols-outlined absolute right-3 top-2.5 text-text-muted text-lg pointer-events-none">mail</span>
</div>
<button class="px-4 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 text-primary border border-primary/30 rounded-lg shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1" type="button">
<span class="material-symbols-outlined text-base">send</span>
<span>인증메일 발송</span>
</button>
</div>
<div class="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-text-secondary text-[11px] leading-relaxed">
<span class="font-semibold text-text">※ 안내 사항:</span> 이메일 변경 시 입력하신 새 이메일 주소로 본인 확인 링크가 발송되며, 메일 인증 완료 후 로그인 계정이 전환됩니다.
                </div>
</div>
</div>
</div>
<!-- 2.2 비밀번호 변경 카드 -->
<div class="bg-surface rounded-xl border border-border p-6 shadow-card">
<div class="pb-4 border-b border-border flex items-center justify-between">
<h3 class="font-headline text-base font-bold text-text flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-xl">lock_reset</span>
<span>비밀번호 변경</span>
</h3>
<span class="text-xs text-text-muted">주기적 변경 권장(90일)</span>
</div>
<div class="pt-5 space-y-4">
<!-- Field: Current Password -->
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="curr-password">
                  현재 비밀번호
                </label>
<div class="relative max-w-md">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted transition-all" id="curr-password" placeholder="현재 사용 중인 비밀번호" type="password"/>
<button class="absolute right-3 top-2.5 text-text-muted hover:text-text text-sm" onclick="togglePasswordVisibility('curr-password')" type="button">
<span class="material-symbols-outlined text-lg">visibility</span>
</button>
</div>
</div>
<!-- Field: New Password & Confirm Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="new-password">
                    새 비밀번호
                  </label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted transition-all" id="new-password" oninput="checkPasswordMatch()" placeholder="새 비밀번호 입력" type="password"/>
</div>
</div>
<div>
<label class="block text-xs font-semibold text-text mb-1.5" for="confirm-password">
                    새 비밀번호 확인
                  </label>
<div class="relative">
<input class="w-full px-3.5 py-2.5 text-sm text-text bg-white border border-border rounded-lg placeholder-text-muted transition-all" id="confirm-password" oninput="checkPasswordMatch()" placeholder="새 비밀번호 재입력" type="password"/>
</div>
</div>
</div>
<!-- Real-time Matching Indicator & Rules Box -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-alt rounded-lg border border-border">
<div class="flex items-center space-x-2 text-xs text-text-secondary">
<span class="material-symbols-outlined text-base text-primary">info</span>
<span class="text-[11px]">8자 이상, 영문 대소문자/숫자/특수문자 조합</span>
</div>
<div class="text-xs font-semibold flex items-center space-x-1 text-text-muted" id="match-status">
<span class="material-symbols-outlined text-sm">remove</span>
<span>비밀번호 확인 필요</span>
</div>
</div>
</div>
</div>
</div>
<!-- ==================== STICKY ACTION BAR ==================== -->
<div class="sticky bottom-4 z-40 bg-surface/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-sticky flex flex-col sm:flex-row items-center justify-between gap-3">
<div class="flex items-center space-x-2 text-xs text-text-secondary">
<span class="material-symbols-outlined text-base text-status-success">verified</span>
<span>작성 완료 후 저장 시 공공기관 서식 자동 동기화 데이터베이스에 반영됩니다.</span>
</div>
<div class="flex items-center space-x-3 w-full sm:w-auto justify-end">
<button class="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text bg-surface hover:bg-slate-100 border border-border active:scale-[0.98] transition-all" type="button">
              취소 / 되돌리기
            </button>
<button class="flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-sm active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5" id="save-btn" onclick="triggerSaveNotice()" type="button">
<span class="material-symbols-outlined text-base">save</span>
<span>회원 정보 저장하기</span>
</button>
</div>
</div>
<!-- Toast Feedback Notification Element -->
<div class="hidden fixed bottom-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-xs flex items-center space-x-2.5 transition-all transform translate-y-2" id="toast-message">
<span class="material-symbols-outlined text-status-success text-base fill-icon">check_circle</span>
<span class="font-medium">회원 정보가 성공적으로 저장되었습니다.</span>
</div>
</section>
</div>
</main>
<!-- ==================== FOOTER ==================== -->
<!-- Shared Component: Footer conforming to JSON and Design System specs -->
<footer class="w-full bg-surface-alt dark:bg-surface-alt border-t border-border dark:border-border mt-16">
<div class="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 font-body text-xs text-text-muted dark:text-text-muted leading-relaxed">
<!-- Brand and Legal Copyright Note -->
<div class="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-6 h-6 object-contain"/>
<span class="font-headline text-base font-bold text-text dark:text-text">올케어안전플랫폼</span>
<div class="text-[11px] text-text-muted">
          © 2025 AllCare Safety Inc. 본 서비스는 나라장터 및 공공기관 안전보건관리계획서 제출 가이드라인을 준수합니다. * 데모 데이터가 포함될 수 있습니다.
        </div>
</div>
<!-- Footer Policy Links -->
<div class="flex items-center space-x-5 text-xs">
<a class="text-text-muted dark:text-text-muted hover:text-primary dark:hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary" href="/legal">이용약관</a>
<a class="text-text dark:text-text font-medium underline hover:text-primary dark:hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary" href="/legal">개인정보처리방침</a>
<a class="text-text-muted dark:text-text-muted hover:text-primary dark:hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary" href="#">조달청 제출 가이드</a>
<a class="text-text-muted dark:text-text-muted hover:text-primary dark:hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary" href="#">보안인증센터</a>
</div>
</div>
</footer>
<!-- ==================== MICRO-INTERACTIONS SCRIPT ==================== -->
`;

const SCRIPT_my_page = `

    // Password visibility toggle
    function togglePasswordVisibility(fieldId) {
      const input = document.getElementById(fieldId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    }

    // Real-time password confirmation validator
    function checkPasswordMatch() {
      const p1 = document.getElementById('new-password').value;
      const p2 = document.getElementById('confirm-password').value;
      const statusEl = document.getElementById('match-status');

      if (!p1 && !p2) {
        statusEl.className = 'text-xs font-semibold flex items-center space-x-1 text-text-muted';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm">remove</span><span>비밀번호 확인 필요</span>';
        return;
      }

      if (p1 === p2 && p1.length >= 8) {
        statusEl.className = 'text-xs font-semibold flex items-center space-x-1 text-status-success-text';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm text-status-success fill-icon">check_circle</span><span>일치합니다</span>';
      } else if (p1 !== p2) {
        statusEl.className = 'text-xs font-semibold flex items-center space-x-1 text-status-danger-text';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm text-status-danger">error</span><span>비밀번호가 불일치합니다</span>';
      } else {
        statusEl.className = 'text-xs font-semibold flex items-center space-x-1 text-status-warn-text';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm text-status-warn">warning</span><span>8자 이상 입력해주세요</span>';
      }
    }

    // Simple toast interaction for save demonstration
    function triggerSaveNotice() {
      const toast = document.getElementById('toast-message');
      toast.classList.remove('hidden');
      toast.classList.remove('translate-y-2');
      
      setTimeout(() => {
        toast.classList.add('translate-y-2');
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 200);
      }, 3000);
    }
  
`;

export default function Page() {
  return <StitchScreen html={HTML_my_page} script={SCRIPT_my_page} />;
}
