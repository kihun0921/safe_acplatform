import StitchScreen from "@/components/StitchScreen";

const HTML_admin = `
<!-- ========================================================================= -->
<!-- 1. SHARED COMPONENT: TopNavBar (관리자 풀칼라 네이비 헤더)                   -->
<!-- ========================================================================= -->
<header class="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 dark:border-slate-800 shadow-sm sticky top-0 z-50">
<div class="w-full px-6 py-3 flex items-center justify-between mx-auto">
<!-- Brand & Admin Badge -->
<div class="flex items-center gap-6">
<div class="font-headline text-lg font-bold text-white flex items-center gap-2">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-7 h-7 object-contain"/>
<span class="tracking-tight">올케어안전플랫폼 관리자</span>
<span class="ml-2 px-2 py-0.5 rounded text-[11px] font-sans font-medium tracking-wide bg-blue-900/60 text-blue-300 border border-blue-700/60 flex items-center gap-1">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Admin Console
          </span>
</div>
<!-- Desktop Navigation Links (7 Mandated Navigation Tabs) -->
<nav class="hidden xl:flex items-center space-x-1 pl-4 border-l border-slate-800 text-sm">
<!-- 대시보드 (Active) -->
<a class="px-3.5 py-1.5 text-white font-semibold border-b-2 border-white flex items-center gap-1.5 transition-all" href="/admin">
<span class="material-symbols-outlined text-base" data-icon="dashboard">dashboard</span>
            대시보드
          </a>
<!-- 회원관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5" href="/admin/members">
<span class="material-symbols-outlined text-base" data-icon="groups">groups</span>
            회원관리
          </a>
<!-- API관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5" href="/admin/api">
<span class="material-symbols-outlined text-base" data-icon="hub">hub</span>
            API관리
          </a>
<!-- 결제관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5" href="/admin/payments">
<span class="material-symbols-outlined text-base" data-icon="credit_card">credit_card</span>
            결제관리
          </a>
<!-- 쿠폰관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5" href="/admin/coupons">
<span class="material-symbols-outlined text-base" data-icon="confirmation_number">confirmation_number</span>
            쿠폰관리
          </a>
<!-- 문의관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5 relative" href="/admin/inquiries">
<span class="material-symbols-outlined text-base" data-icon="contact_support">contact_support</span>
            문의관리
            <span class="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5 ring-2 ring-slate-900"></span>
</a>
<!-- 사이트관리 -->
<a class="px-3.5 py-1.5 text-slate-300 hover:text-white font-medium hover:bg-slate-800/60 rounded-lg transition-all duration-150 flex items-center gap-1.5" href="/admin/site-pages">
<span class="material-symbols-outlined text-base" data-icon="tune">tune</span>
            사이트관리
          </a>
</nav>
</div>
<!-- Right Trailing Profile & Actions -->
<div class="flex items-center gap-4">
<!-- Live Security Uptime Chip -->
<div class="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
<span class="material-symbols-outlined text-emerald-400 text-sm" data-icon="shield">shield</span>
<span>보안 관제 상태: <strong class="text-emerald-400 font-medium">정상(99.98%)</strong></span>
</div>
<!-- Trailing Icon Actions -->
<div class="flex items-center gap-1">
<button aria-label="알림" class="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all" type="button">
<span class="material-symbols-outlined text-xl" data-icon="notifications">notifications</span>
<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
</button>
<button aria-label="설정" class="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all" type="button">
<span class="material-symbols-outlined text-xl" data-icon="settings">settings</span>
</button>
</div>
<div class="h-5 w-px bg-slate-800 hidden sm:block"></div>
<!-- Trailing Secondary & Primary Actions (Admin User & Logout) -->
<div class="flex items-center gap-3">
<div class="flex items-center gap-2.5">
<div class="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold text-blue-200">
              관
            </div>
<div class="hidden lg:block text-left leading-tight">
<div class="text-xs font-semibold text-white">최고관리자</div>
<div class="text-[11px] text-slate-400">전산보안총괄 김관리</div>
</div>
</div>
<button class="ml-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors" type="button">
            로그아웃
          </button>
</div>
</div>
</div>
</header>
<!-- ========================================================================= -->
<!-- 2. QUICK OPERATIONS BAR & TIMESTAMP BANNER                                -->
<!-- ========================================================================= -->
<section class="bg-white border-b border-slate-200 shadow-sm">
<div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<div class="flex items-center gap-2.5">
<h1 class="font-headline text-xl font-bold text-slate-900 tracking-tight">통합 운영 대시보드</h1>
<span class="text-xs font-normal text-slate-500 font-sans tracking-normal">(Platform Operations Overview)</span>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            LIVE
          </span>
</div>
<p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
<span class="material-symbols-outlined text-sm text-slate-400" data-icon="schedule">schedule</span>
          기준 일시: 2025.02.26 16:30 KST (실시간 자동 갱신 30초마다)
          <span class="text-slate-300">|</span>
<span class="text-slate-400">* 아래 데이터는 서비스 연동 전 데모 데이터입니다</span>
</p>
</div>
<!-- Quick Action Controls -->
<div class="flex items-center flex-wrap gap-2">
<button class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors" type="button">
<span class="material-symbols-outlined text-sm text-blue-700" data-icon="sync">sync</span>
          나라장터 API 강제 동기화
        </button>
<button class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors" type="button">
<span class="material-symbols-outlined text-sm text-slate-600" data-icon="download">download</span>
          시스템 로그 다운로드
        </button>
<button class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors" type="button">
<span class="material-symbols-outlined text-sm text-white" data-icon="campaign">campaign</span>
          비상 공지 등록
        </button>
</div>
</div>
</section>
<!-- ========================================================================= -->
<!-- MAIN CONTENT CONTAINER                                                    -->
<!-- ========================================================================= -->
<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
<!-- ======================================================================= -->
<!-- 3. 7개 핵심 운영 지표 카드 그리드 (7-STAT KPI BENTO GRID)                   -->
<!-- ======================================================================= -->
<section>
<div class="flex items-center justify-between mb-3">
<h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
<span class="material-symbols-outlined text-sm text-slate-400" data-icon="query_stats">query_stats</span>
          플랫폼 7대 핵심 가동 지표
        </h2>
<span class="text-xs text-slate-400">당일 집계 기준 00:00 ~ 현재</span>
</div>
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
<!-- 1. 전체 회원 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">전체 회원</span>
<span class="material-symbols-outlined text-slate-400 text-lg" data-icon="corporate_fare">corporate_fare</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">1,428<span class="text-xs font-normal text-slate-500 ml-1">개사</span></div>
<div class="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
<span class="material-symbols-outlined text-xs" data-icon="trending_up">trending_up</span>
            +12 today
          </div>
</div>
<!-- 2. 활성 회원 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">활성 회원</span>
<span class="material-symbols-outlined text-blue-600 text-lg" data-icon="person_check">person_check</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">942<span class="text-xs font-normal text-slate-500 ml-1">개사</span></div>
<div class="mt-2 text-[11px] font-normal text-slate-500">
            접속 활성율 <strong class="text-blue-700 font-semibold">66.0%</strong>
</div>
</div>
<!-- 3. 전체 계획서 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">전체 계획서</span>
<span class="material-symbols-outlined text-slate-400 text-lg" data-icon="description">description</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">4,819<span class="text-xs font-normal text-slate-500 ml-1">건</span></div>
<div class="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
<span class="material-symbols-outlined text-xs" data-icon="arrow_upward">arrow_upward</span>
            +45 this week
          </div>
</div>
<!-- 4. 작성중 계획서 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">작성중 계획서</span>
<span class="material-symbols-outlined text-amber-500 text-lg" data-icon="edit_document">edit_document</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">184<span class="text-xs font-normal text-slate-500 ml-1">건</span></div>
<div class="mt-2 text-[11px] font-normal text-slate-500">
            평균 완성도 <span class="font-semibold text-slate-700">68%</span>
</div>
</div>
<!-- 5. 완료 계획서 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">완료 계획서</span>
<span class="material-symbols-outlined text-emerald-600 text-lg" data-icon="task_alt">task_alt</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">4,635<span class="text-xs font-normal text-slate-500 ml-1">건</span></div>
<div class="mt-2 text-[11px] font-medium text-emerald-700">
            적격 통과율 <strong class="font-bold">98.4%</strong>
</div>
</div>
<!-- 6. 전체 수집 공고 -->
<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
<div class="flex items-center justify-between text-slate-500 mb-1.5">
<span class="text-xs font-medium">수집 공고</span>
<span class="material-symbols-outlined text-slate-400 text-lg" data-icon="source">source</span>
</div>
<div class="text-xl font-bold text-slate-900 tracking-tight">12,840<span class="text-xs font-normal text-slate-500 ml-1">건</span></div>
<div class="mt-2 text-[11px] font-medium text-indigo-600">
            당일 신규 +64건
          </div>
</div>
<!-- 7. 미답변 문의 (경고/요망 강조) -->
<div class="col-span-2 sm:col-span-1 bg-amber-50/60 rounded-xl p-3.5 border border-amber-300 shadow-sm flex flex-col justify-between ring-1 ring-amber-400/30 hover:bg-amber-50 transition-all">
<div class="flex items-center justify-between text-amber-900 mb-1.5">
<span class="text-xs font-bold flex items-center gap-1">
<span class="material-symbols-outlined text-sm text-amber-600 animate-bounce" data-icon="warning">warning</span>
              미답변 문의
            </span>
<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">긴급</span>
</div>
<div class="text-xl font-bold text-amber-800 tracking-tight">3<span class="text-xs font-medium text-amber-700 ml-1">건 대기</span></div>
<div class="mt-2 text-[11px] font-semibold text-amber-900 truncate">
            긴급 배정 요망 (1:1 기술문의)
          </div>
</div>
</div>
</section>
<!-- ======================================================================= -->
<!-- 4. 본문 메인 2분할 레이아웃 (좌측 8열 모니터링 / 우측 4열 비즈니스 KPI) -->
<!-- ======================================================================= -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
<!-- ===================================================================== -->
<!-- [좌측 8열 영역 - 실시간 모니터링 테이블 2개]                            -->
<!-- ===================================================================== -->
<div class="lg:col-span-8 space-y-6">
<!-- TABLE A: 최근 가입 회원 (최신 5건) -->
<section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
<div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-slate-600 text-lg" data-icon="person_add">person_add</span>
<h2 class="font-headline text-sm font-bold text-slate-900">최근 가입 회원 현황</h2>
<span class="text-xs text-slate-500 font-normal">실시간 승인 및 사업자등록증 검토 목록</span>
</div>
<a class="text-xs font-semibold text-blue-800 hover:text-blue-900 hover:underline flex items-center gap-0.5" href="/admin/members">
              회원관리 바로가기
              <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
</a>
</div>
<div class="overflow-x-auto">
<table class="w-full text-left border-collapse text-xs">
<thead>
<tr class="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
<th class="py-2.5 px-4">가입일시</th>
<th class="py-2.5 px-4">회사명 (법인)</th>
<th class="py-2.5 px-4">사업자번호</th>
<th class="py-2.5 px-4">담당자 / 직급</th>
<th class="py-2.5 px-4 text-center">회원등급/상태</th>
<th class="py-2.5 px-4 text-center">조달청 연동</th>
<th class="py-2.5 px-4 text-right">관리</th>
</tr>
</thead>
<tbody class="divide-y divide-slate-100 text-slate-700">
<!-- Row 1 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">2025.02.26 16:18</td>
<td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    (주)현대종합이앤씨
                  </td>
<td class="py-3 px-4 font-mono text-slate-600">124-81-99201</td>
<td class="py-3 px-4">박진성 <span class="text-slate-400 text-[11px]">부장 (안전팀)</span></td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      정상인증 완료
                    </span>
</td>
<td class="py-3 px-4 text-center">
<span class="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">연동완료</span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors">
                      상세조회
                    </button>
</td>
</tr>
<!-- Row 2 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">2025.02.26 15:42</td>
<td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    성원토건(주)
                  </td>
<td class="py-3 px-4 font-mono text-slate-600">211-86-45812</td>
<td class="py-3 px-4">이동혁 <span class="text-slate-400 text-[11px]">과장 (공무담당)</span></td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      서류검토중
                    </span>
</td>
<td class="py-3 px-4 text-center">
<span class="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">인증대기</span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors">
                      승인검토
                    </button>
</td>
</tr>
<!-- Row 3 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">2025.02.26 14:15</td>
<td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    대아건설공업(주)
                  </td>
<td class="py-3 px-4 font-mono text-slate-600">107-82-33419</td>
<td class="py-3 px-4">최우진 <span class="text-slate-400 text-[11px]">차장 (현장소장)</span></td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      정상인증 완료
                    </span>
</td>
<td class="py-3 px-4 text-center">
<span class="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">연동완료</span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors">
                      상세조회
                    </button>
</td>
</tr>
<!-- Row 4 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">2025.02.26 11:30</td>
<td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    (주)태양전기설비
                  </td>
<td class="py-3 px-4 font-mono text-slate-600">305-81-78904</td>
<td class="py-3 px-4">정현아 <span class="text-slate-400 text-[11px]">대리 (경영지원)</span></td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      정상인증 완료
                    </span>
</td>
<td class="py-3 px-4 text-center">
<span class="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">연동완료</span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors">
                      상세조회
                    </button>
</td>
</tr>
<!-- Row 5 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">2025.02.26 09:24</td>
<td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    삼보인프라엔지니어링
                  </td>
<td class="py-3 px-4 font-mono text-slate-600">138-85-11234</td>
<td class="py-3 px-4">김도균 <span class="text-slate-400 text-[11px]">이사 (기술총괄)</span></td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      정상인증 완료
                    </span>
</td>
<td class="py-3 px-4 text-center">
<span class="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">연동완료</span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors">
                      상세조회
                    </button>
</td>
</tr>
</tbody>
</table>
</div>
</section>
<!-- TABLE B: 최근 작성 안전보건관리계획서 (최신 5건) -->
<section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
<div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-slate-600 text-lg" data-icon="assignment_turned_in">assignment_turned_in</span>
<h2 class="font-headline text-sm font-bold text-slate-900">최근 작성 안전보건관리계획서 실시간 현황</h2>
<span class="text-xs text-slate-500 font-normal">공공 발주처 심사 적격성 평가 및 작성 진행도</span>
</div>
<span class="text-xs text-slate-400">자동 검증 엔진 v3.4 활성화</span>
</div>
<div class="overflow-x-auto">
<table class="w-full text-left border-collapse text-xs">
<thead>
<tr class="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
<th class="py-2.5 px-4">작성일시</th>
<th class="py-2.5 px-4">공고번호 / 공사명</th>
<th class="py-2.5 px-4">발주처</th>
<th class="py-2.5 px-4">작성기업 / 담당</th>
<th class="py-2.5 px-4">진행률</th>
<th class="py-2.5 px-4 text-center">검증 상태 배지</th>
<th class="py-2.5 px-4 text-right">규격검토</th>
</tr>
</thead>
<tbody class="divide-y divide-slate-100 text-slate-700">
<!-- Plan 1 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">16:22:04</td>
<td class="py-3 px-4">
<div class="font-semibold text-slate-900 truncate max-w-[200px]">고양창릉 A-4BL 아파트 건설공사 2공구</div>
<div class="text-[11px] font-mono text-slate-400">202502-LH-00418</div>
</td>
<td class="py-3 px-4 font-medium text-slate-800">한국토지주택공사</td>
<td class="py-3 px-4">
<div class="font-medium text-slate-800">(주)현대종합이앤씨</div>
<div class="text-[11px] text-slate-400">박진성 부장</div>
</td>
<td class="py-3 px-4">
<div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
<div class="bg-emerald-600 h-full rounded-full" style="width: 100%"></div>
</div>
<span class="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">100% 완료</span>
</td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      검증완료 100% (LH)
                    </span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2 py-1 text-slate-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors">
                      즉시 확인
                    </button>
</td>
</tr>
<!-- Plan 2 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">16:11:32</td>
<td class="py-3 px-4">
<div class="font-semibold text-slate-900 truncate max-w-[200px]">평택-오송 2복선화 노반신설 제3공구</div>
<div class="text-[11px] font-mono text-slate-400">202502-KR-00912</div>
</td>
<td class="py-3 px-4 font-medium text-slate-800">국가철도공단</td>
<td class="py-3 px-4">
<div class="font-medium text-slate-800">성원토건(주)</div>
<div class="text-[11px] text-slate-400">이동혁 과장</div>
</td>
<td class="py-3 px-4">
<div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
<div class="bg-blue-600 h-full rounded-full" style="width: 85%"></div>
</div>
<span class="text-[10px] text-blue-700 font-bold mt-0.5 inline-block">85% 진행중</span>
</td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      작성중 85%
                    </span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2 py-1 text-slate-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors">
                      전문검토 배정
                    </button>
</td>
</tr>
<!-- Plan 3 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">15:49:10</td>
<td class="py-3 px-4">
<div class="font-semibold text-slate-900 truncate max-w-[200px]">마곡도시개발사업지구 10-2단지 건설공사</div>
<div class="text-[11px] font-mono text-slate-400">202502-SH-00129</div>
</td>
<td class="py-3 px-4 font-medium text-slate-800">서울주택도시공사</td>
<td class="py-3 px-4">
<div class="font-medium text-slate-800">대아건설공업(주)</div>
<div class="text-[11px] text-slate-400">최우진 차장</div>
</td>
<td class="py-3 px-4">
<div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
<div class="bg-indigo-600 h-full rounded-full" style="width: 95%"></div>
</div>
<span class="text-[10px] text-indigo-700 font-bold mt-0.5 inline-block">심사 제출</span>
</td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      심사제출완료 (SH)
                    </span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2 py-1 text-slate-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors">
                      즉시 확인
                    </button>
</td>
</tr>
<!-- Plan 4 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">14:50:33</td>
<td class="py-3 px-4">
<div class="font-semibold text-slate-900 truncate max-w-[200px]">서해선 홍성~송산 전철전력 설비신설</div>
<div class="text-[11px] font-mono text-slate-400">202502-KR-00441</div>
</td>
<td class="py-3 px-4 font-medium text-slate-800">국가철도공단</td>
<td class="py-3 px-4">
<div class="font-medium text-slate-800">(주)태양전기설비</div>
<div class="text-[11px] text-slate-400">정현아 대리</div>
</td>
<td class="py-3 px-4">
<div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
<div class="bg-emerald-600 h-full rounded-full" style="width: 100%"></div>
</div>
<span class="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">100% 통과</span>
</td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      검증완료 (철도공단)
                    </span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2 py-1 text-slate-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors">
                      즉시 확인
                    </button>
</td>
</tr>
<!-- Plan 5 -->
<tr class="hover:bg-slate-50/80 transition-colors">
<td class="py-3 px-4 font-mono text-slate-500 text-[11px]">13:12:00</td>
<td class="py-3 px-4">
<div class="font-semibold text-slate-900 truncate max-w-[200px]">고속국도 제29호선 세종-포천 안전시설개선공사</div>
<div class="text-[11px] font-mono text-slate-400">202502-EX-00239</div>
</td>
<td class="py-3 px-4 font-medium text-slate-800">한국도로공사</td>
<td class="py-3 px-4">
<div class="font-medium text-slate-800">삼보인프라엔지니어링</div>
<div class="text-[11px] text-slate-400">김도균 이사</div>
</td>
<td class="py-3 px-4">
<div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
<div class="bg-amber-500 h-full rounded-full" style="width: 40%"></div>
</div>
<span class="text-[10px] text-amber-700 font-bold mt-0.5 inline-block">40% 진행</span>
</td>
<td class="py-3 px-4 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                      작성중 40%
                    </span>
</td>
<td class="py-3 px-4 text-right">
<button class="px-2 py-1 text-slate-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors">
                      전문검토 배정
                    </button>
</td>
</tr>
</tbody>
</table>
</div>
</section>
</div>
<!-- ===================================================================== -->
<!-- [우측 4열 영역 - 연동 현황 및 비즈니스 KPI 위젯]                       -->
<!-- ===================================================================== -->
<div class="lg:col-span-4 space-y-6">
<!-- PANEL C: 공공 발주처 API 연동 현황 (Live Integration Status) -->
<section class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
<div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
<div class="flex items-center gap-1.5">
<span class="material-symbols-outlined text-blue-900 text-lg" data-icon="cloud_sync">cloud_sync</span>
<h2 class="font-headline text-sm font-bold text-slate-900">공공 발주처 API 연동</h2>
</div>
<span class="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">전체 정상 가동률 99.8%</span>
</div>
<div class="space-y-2.5 text-xs">
<!-- G2B 나라장터 -->
<div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-slate-300 transition-colors">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
<div>
<div class="font-semibold text-slate-900 flex items-center gap-1">
                    조달청 나라장터 (G2B)
                    <span class="text-[10px] text-slate-500 font-normal">OpenAPI v2</span>
</div>
<div class="text-[11px] text-slate-500">동기화: 2분 전 • 응답속도 <strong class="text-emerald-700">180ms</strong></div>
</div>
</div>
<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">정상 가동</span>
</div>
<!-- LH e-Bid -->
<div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-slate-300 transition-colors">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
<div>
<div class="font-semibold text-slate-900">한국토지주택공사 (LH) e-Bid</div>
<div class="text-[11px] text-slate-500">동기화: 5분 전 • 응답속도 210ms</div>
</div>
</div>
<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">정상 가동</span>
</div>
<!-- KR 국가철도공단 -->
<div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-slate-300 transition-colors">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
<div>
<div class="font-semibold text-slate-900">국가철도공단 KR-eProc</div>
<div class="text-[11px] text-slate-500">동기화: 8분 전 • 응답속도 195ms</div>
</div>
</div>
<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">정상 가동</span>
</div>
<!-- SH 서울주택도시공사 (점검 알림 / 트래픽 제어) -->
<div class="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
<div>
<div class="font-semibold text-slate-900 flex items-center gap-1">
                    서울주택도시공사 (SH)
                    <span class="text-[10px] text-amber-700 font-bold">트래픽 제어중</span>
</div>
<div class="text-[11px] text-slate-500">동기화: 14분 전 • 발주처 정기점검 예고</div>
</div>
</div>
<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">점검 알림</span>
</div>
<!-- 한국도로공사 -->
<div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-slate-300 transition-colors">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
<div>
<div class="font-semibold text-slate-900">한국도로공사 Hi-Pass 공고</div>
<div class="text-[11px] text-slate-500">동기화: 3분 전 • 응답속도 240ms</div>
</div>
</div>
<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">정상 가동</span>
</div>
</div>
<!-- OpenAPI 헬스체크 게이지 & 미니 그래프 -->
<div class="mt-4 pt-3 border-t border-slate-100">
<div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
<span>OpenAPI 게이트웨이 부하율</span>
<span class="font-semibold text-slate-800">28.4% (안정)</span>
</div>
<div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
<div class="bg-blue-600 h-full" style="width: 28.4%"></div>
<div class="bg-amber-400 h-full" style="width: 5%"></div>
</div>
<div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
<span>평균 TPS: 142 req/s</span>
<span>최근 24시간 장애: 0건</span>
</div>
</div>
</section>
<!-- PANEL D: 구독 / 결제 / 쿠폰 KPI 위젯 -->
<section class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
<div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
<div class="flex items-center gap-1.5">
<span class="material-symbols-outlined text-blue-900 text-lg" data-icon="payments">payments</span>
<h2 class="font-headline text-sm font-bold text-slate-900">구독 및 결제 지표 (SaaS KPI)</h2>
</div>
<span class="text-[11px] text-slate-400 font-mono">2025.02 MTD</span>
</div>
<div class="space-y-3">
<!-- 1) 유료 구독 전환율 -->
<div class="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
<div class="flex items-center justify-between text-xs">
<span class="text-slate-600 font-medium">유료 구독 전환율 (SaaS)</span>
<span class="text-emerald-700 font-semibold text-[11px] flex items-center">
<span class="material-symbols-outlined text-xs" data-icon="north_east">north_east</span>
                  +2.1% MoM
                </span>
</div>
<div class="text-lg font-bold text-slate-900 mt-1">18.4%</div>
<div class="text-[11px] text-slate-500 mt-0.5">
                월간 활성 유료 기업: <strong class="text-slate-800">264개사</strong> (전월비 +18개사)
              </div>
</div>
<!-- 2) 무통장입금 확인 SLA -->
<div class="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
<div class="flex items-center justify-between text-xs">
<span class="text-slate-600 font-medium">무통장입금 확인 소요시간 (SLA)</span>
<span class="text-blue-700 font-semibold text-[11px]">자동 대조 94%</span>
</div>
<div class="text-lg font-bold text-slate-900 mt-1">평균 14분</div>
<div class="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                현재 미처리 건수: <strong class="underline font-bold">2건</strong> (입금자명 불일치 대조 요망)
              </div>
</div>
<!-- 3) 프로모션 쿠폰 상환율 -->
<div class="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
<div class="flex items-center justify-between text-xs">
<span class="text-slate-600 font-medium">프로모션 쿠폰 상환율</span>
<span class="text-slate-700 font-semibold text-[11px]">412 / 656건 사용</span>
</div>
<div class="text-lg font-bold text-slate-900 mt-1">62.8%</div>
<div class="text-[11px] text-slate-500 mt-0.5">
                적격심사 대비 수수료 감면 프로모션
              </div>
</div>
<!-- 결제 수단별 비중 미니 프로그레스 바 -->
<div class="pt-2">
<div class="flex items-center justify-between text-[11px] text-slate-500 mb-1">
<span>결제 수단 비중</span>
<span>법인카드 68% | 계좌이체 28% | 기타 4%</span>
</div>
<div class="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
<div class="bg-blue-800 h-full" style="width: 68%" title="법인카드 68%"></div>
<div class="bg-blue-400 h-full" style="width: 28%" title="세금계산서/무통장 28%"></div>
<div class="bg-slate-300 h-full" style="width: 4%" title="기타 4%"></div>
</div>
</div>
<!-- 결제 오류 알림 내역 1건 -->
<div class="mt-2 p-2 rounded bg-slate-100 border border-slate-200 flex items-center justify-between text-[11px]">
<span class="text-slate-600 flex items-center gap-1">
<span class="material-symbols-outlined text-emerald-600 text-sm" data-icon="check_circle">check_circle</span>
                최근 비정상 결제/오류
              </span>
<span class="text-slate-500 font-medium">1건 발생 (즉시 정상 재처리 완료)</span>
</div>
</div>
</section>
</div>
</div>
</main>
<!-- ========================================================================= -->
<!-- 5. SHARED COMPONENT: Footer (통합보안관제 Admin Footer)                    -->
<!-- ========================================================================= -->
<footer class="bg-slate-950 dark:bg-black border-t border-slate-800 dark:border-slate-900 mt-auto">
<div class="w-full px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 mx-auto max-w-7xl">
<!-- Footer Copyright Text -->
<div class="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
<span class="font-headline text-xs font-semibold text-slate-300 flex items-center gap-1.5">
<span class="material-symbols-outlined text-sm text-blue-400" data-icon="security">security</span>
          ALLCARE Safety Platform Ops
        </span>
<span class="hidden sm:inline text-slate-700">|</span>
<p class="font-body text-xs text-slate-400 dark:text-slate-500">
          © 2025 ALLCARE Safety Platform. B2B Security Operations &amp; Compliance Monitoring Console. All rights reserved.
        </p>
</div>
<!-- Mandatory Links from JSON -->
<nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-body text-xs text-slate-400 dark:text-slate-500">
<a class="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1" href="#">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          보안 관제 상태: 정상(99.99%)
        </a>
<a class="text-slate-400 hover:text-slate-200 transition-colors" href="#">
          ISMS-P 인증 현황
        </a>
<a class="text-slate-400 hover:text-slate-200 transition-colors" href="#">
          접속 로그 보안 정책
        </a>
<a class="text-slate-400 hover:text-slate-200 transition-colors" href="#">
          시스템 비상 연락망
        </a>
</nav>
</div>
</footer>
<!-- Micro-Interactions Script -->
`;

const SCRIPT_admin = `

    document.addEventListener('DOMContentLoaded', () => {
      // Periodic subtle flash simulation for live data updates
      const liveDot = document.querySelector('.animate-ping');
      if (liveDot) {
        liveDot.setAttribute('title', '실시간 소켓 연결 정상 수신 중');
      }
    });
  
`;

export default function Page() {
  return <StitchScreen html={HTML_admin} script={SCRIPT_admin} />;
}
