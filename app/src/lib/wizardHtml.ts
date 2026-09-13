import { classifyConstructionType, buildRiskRowsHtml, scaleFieldFor } from "@/lib/riskTemplates";

// Shared between the wizard screen (src/app/documents/[id]/wizard/page.tsx) and the
// document export routes (src/app/api/documents/[id]/export/*): both need the exact
// same "real data substituted into the Stitch mockup HTML" output, so the whole
// HTML_documents_wizard template plus the substitution logic lives here once.
export type WizardDocRow = {
  id: string;
  title: string | null;
  agency: string | null;
  content: Record<string, unknown> | null;
};

export type WizardAnnouncementRow = {
  base_amount: number | null;
  winner_amount: number | null;
  awarded: boolean | null;
  site_region: string | null;
  attachments: { name: string; url: string }[] | null;
} | null;

export type PdfOverview = { period: string; location: string; mainContent: string };

export type WizardMemberRow = { name: string; company: string } | null;

const HTML_documents_wizard = `
<!-- ================= TOP NAV BAR (Shared Component JSON Target) ================= -->
<header class="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-50 transition duration-150 ease-in-out">
<div class="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
<!-- Brand & Global Nav Links -->
<div class="flex items-center gap-8">
<a class="flex items-center gap-2 text-neutral-900 tracking-tight" href="/">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-8 h-8 object-contain"/>
<span class="font-headline font-bold text-xl text-neutral-900">올케어안전플랫폼</span>
</a>
<nav class="hidden md:flex items-center gap-6 font-label text-sm">
<a class="text-neutral-600 hover:text-neutral-900 pb-1 font-medium hover:bg-neutral-100 transition-colors px-2 py-1 rounded" href="/announcements">공고 검색</a>
<!-- '내 문서함' is the active parent section for document editor -->
<a class="text-neutral-900 font-bold border-b-2 border-neutral-900 pb-1" href="/documents">내 문서함</a>
<a class="text-neutral-600 hover:text-neutral-900 pb-1 font-medium hover:bg-neutral-100 transition-colors px-2 py-1 rounded" href="/inquiries">고객지원/문의하기</a>
</nav>
</div>
<!-- Right Trailing Controls -->
<div class="flex items-center gap-4">
<!-- Notification Icon -->
<button aria-label="알림 확인" class="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition relative" type="button">
<span class="material-symbols-outlined text-[22px]" data-icon="notifications">notifications</span>
<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-status-danger rounded-full ring-2 ring-white"></span>
</button>
<div class="h-4 w-px bg-neutral-200 hidden sm:block"></div>
<!-- User Identity Badge -->
<div class="flex items-center gap-2.5">
<div class="w-8 h-8 rounded-full bg-primary-soft text-primary font-semibold text-xs flex items-center justify-center border border-primary/20" title="대한종합건설 홍길동 부장 프로필">
            홍
          </div>
<div class="hidden sm:flex flex-col text-left">
<div class="text-xs font-semibold text-neutral-900 leading-tight">대한종합건설 홍길동 부장</div>
<div class="text-[11px] text-neutral-500 font-medium">안전보건총괄책임자</div>
</div>
</div>
<!-- Admin return link (관리자가 다른 회원의 문서를 열람 중일 때만 표시) -->
__ADMIN_RETURN_LINK__
<!-- Logout Button -->
<button class="text-xs font-medium text-neutral-500 hover:text-neutral-900 px-2.5 py-1.5 rounded border border-neutral-200 hover:bg-neutral-100 transition duration-150" type="button">
          로그아웃
        </button>
</div>
</div>
</header>
<!-- ================= SUB-HEADER (Document Wizard Fixed Context Bar) ================= -->
<section class="bg-white border-b border-neutral-200 sticky top-16 z-40 shadow-xs">
<div class="w-full max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
<!-- Left: Document Context & Form Template Switcher -->
<div class="flex items-center flex-wrap gap-3">
<div class="flex items-center gap-2">
<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-status-successSoft text-status-success border border-status-success/30 flex items-center gap-1">
<span class="w-1.5 h-1.5 rounded-full bg-status-success"></span>
            LH v4.2 표준 준수
          </span>
<h1 class="text-sm md:text-base font-bold text-neutral-900 tracking-tight flex items-center gap-1.5 group cursor-pointer hover:text-primary transition">
<span>[202502-89211] 화성태안3지구 복합커뮤니티센터 신축공사 안전보건관리계획서</span>
<span class="material-symbols-outlined text-base text-neutral-400 group-hover:text-primary" data-icon="edit">edit</span>
</h1>
</div>
<div class="hidden lg:flex items-center pl-2 border-l border-neutral-200">
<select aria-label="발주처 표준 서식 선택" class="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary">
<option selected="">한국토지주택공사(LH) 표준 서식 (2025 개정판)</option>
<option>서울주택도시공사(SH) 안전보건관리계획서 표준안</option>
<option>조달청(나라장터) 일반공공시설물 표준</option>
<option>국토교통부 건설안전종합정보망(CSI) 연동서식</option>
</select>
</div>
</div>
<!-- Right: Sync Status & Primary Actions -->
<div class="flex items-center gap-3">
<!-- Live Cloud Sync Indicator -->
<div class="flex items-center gap-1.5 text-xs text-neutral-500 font-medium mr-1">
<span class="relative flex h-2 w-2">
<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
<span class="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
</span>
<span>15초 전 클라우드 자동 저장됨</span>
</div>
<button class="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition shadow-xs" type="button">
<span class="material-symbols-outlined text-base text-neutral-500" data-icon="menu_book">menu_book</span>
          서식 가이드 검토
        </button>
<button class="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition shadow-xs" type="button">
<span class="material-symbols-outlined text-base text-neutral-500" data-icon="visibility">visibility</span>
          PDF 미리보기 <span class="text-[11px] text-neutral-400 font-normal">(2.4MB)</span>
</button>
<button class="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-strong px-3.5 py-1.5 rounded-lg transition shadow-sm" data-export-format="hwpx" type="button">
<span class="material-symbols-outlined text-base" data-icon="cloud_download">cloud_download</span>
<span>HWPX 다운로드</span>
</button>
<button class="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-strong px-3.5 py-1.5 rounded-lg transition shadow-sm" data-export-format="docx" type="button">
<span class="material-symbols-outlined text-base" data-icon="cloud_download">cloud_download</span>
<span>DOCX 다운로드</span>
</button>
<button class="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-strong px-3.5 py-1.5 rounded-lg transition shadow-sm" data-export-format="pdf" type="button">
<span class="material-symbols-outlined text-base" data-icon="picture_as_pdf">picture_as_pdf</span>
<span>PDF 다운로드</span>
</button>
<button class="text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition" type="button">
          임시저장
        </button>
</div>
</div>
</section>
<!-- ================= MAIN WORKSPACE (2-Column Continuous Editor) ================= -->
<main class="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
<div class="flex flex-col lg:flex-row items-start gap-8">
<!-- ---------------- LEFT SIDEBAR: Table of Contents & Compliance Analytics ---------------- -->
<aside class="w-full lg:w-80 shrink-0 lg:sticky lg:top-[188px] lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto space-y-5">
<!-- Document Table of Contents Navigation -->
<div class="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs">
<div class="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
<span class="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
<span class="material-symbols-outlined text-base text-primary" data-icon="list_alt">list_alt</span>
              계획서 필수 목차
            </span>
<span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">6개 대분류</span>
</div>
<nav class="space-y-1">
<!-- Ⅰ. 사업개요 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-overview">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-status-successSoft text-status-success flex items-center justify-center">
<span class="material-symbols-outlined text-sm" data-icon="check">check</span>
</span>
<span class="group-hover:text-neutral-900 font-semibold">Ⅰ. 사업개요 및 기본정보</span>
</div>
<span class="text-[11px] text-neutral-400 font-mono">100%</span>
</a>
<!-- Ⅱ. 안전보건관리체계 (ACTIVE) -->
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold bg-primary-soft text-primary border-l-4 border-primary transition shadow-xs" href="#sec-risk">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span>Ⅱ. 관리체계 및 위험성평가</span>
</div>
<span class="text-[11px] text-primary font-mono font-bold">85% 진행</span>
</a>
<!-- Ⅲ. 현장 안전보건 실행계획 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-execution">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  03
                </span>
<span class="group-hover:text-neutral-900">Ⅲ. 현장 안전보건 실행계획</span>
</div>
<span class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">3/4 On</span>
</a>
<!-- Ⅳ. 현장 운영관리 및 비상대책 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-emergency">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  04
                </span>
<span class="group-hover:text-neutral-900">Ⅳ. 현장 운영 및 비상대책</span>
</div>
<span class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">3/3 On</span>
</a>
<!-- Ⅴ. 재해발생수준 및 안전목표 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-target">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-status-successSoft text-status-success flex items-center justify-center">
<span class="material-symbols-outlined text-sm" data-icon="check">check</span>
</span>
<span class="group-hover:text-neutral-900">Ⅴ. 재해예방 및 안전목표</span>
</div>
<span class="text-[11px] text-status-success font-medium">완료</span>
</a>
<!-- Ⅵ. 기타사항 및 별첨문서 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-attachments">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  06
                </span>
<span class="group-hover:text-neutral-900">Ⅵ. 별첨 서류 및 증빙</span>
</div>
<span class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">3종 활성</span>
</a>
</nav>
</div>
<!-- Progress and Compliance Score Card -->
<div class="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs space-y-4">
<div>
<div class="flex justify-between items-center mb-1.5">
<span class="text-xs font-bold text-neutral-800">문서 완성도 및 적합성</span>
<span class="text-sm font-bold text-primary font-mono">88%</span>
</div>
<div class="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
<div class="bg-primary h-2 rounded-full transition-all duration-500" style="width: 88%;"></div>
</div>
<p class="text-[11px] text-neutral-500 mt-1.5">필수 법적 규정 42항목 중 37개 검증 완료</p>
</div>
<!-- Trust Certificate Badge Box -->
<div class="bg-primary-soft/70 border border-primary/15 rounded-lg p-3">
<div class="flex items-start gap-2">
<span class="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5" data-icon="verified">verified</span>
<div>
<h2 class="text-xs font-bold text-primary leading-snug">LH 적격심사 가점 요건 충족</h2>
<p class="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                  안전보건관리계획서 평가 배점 <strong class="text-primary">최고 등급(가점 2.0점)</strong> 대상 표준 양식에 정확히 부합합니다.
                </p>
</div>
</div>
</div>
<!-- Quick Jump to Incomplete Items -->
<button class="w-full py-2 px-3 border border-dashed border-status-warn/60 bg-status-warnSoft/40 hover:bg-status-warnSoft text-status-warn rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition" type="button">
<span class="material-symbols-outlined text-sm" data-icon="error_outline">error_outline</span>
            미입력 항목 2개 바로가기 (Ⅱ-3, Ⅵ-별첨)
          </button>
</div>
<!-- Consultant Assistance Banner -->
<div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-4 text-white shadow-xs">
<div class="flex items-center gap-2 mb-2">
<span class="material-symbols-outlined text-amber-400 text-lg" data-icon="support_agent">support_agent</span>
<span class="text-xs font-bold text-white tracking-wide">전문 행정안전 컨설턴트 지원</span>
</div>
<p class="text-[11px] text-neutral-300 leading-relaxed">
            LH 및 지자체 인허가 심의위원 출신 전문가가 계획서 제출 전 결격사유를 1:1로 실시간 보완해 드립니다.
          </p>
<button class="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-white/20 transition flex items-center justify-center gap-1" type="button">
            실시간 검토 요청하기
            <span class="material-symbols-outlined text-xs" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
</aside>
<!-- ---------------- RIGHT CONTENT: Continuous Document Editor Sections ---------------- -->
<div class="flex-1 w-full space-y-8 min-w-0">
<!-- Notification Banner: Authority Guideline Notice -->
<div class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
<span class="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5" data-icon="info">info</span>
<div class="text-xs leading-relaxed text-neutral-700">
<span class="font-bold text-primary">발주처(LH) 안전관리 가이드라인 2025 개정판 연동 중:</span>
            시공 중 위험공종이 없거나 현장 여건상 불필요한 세부 조항은 각 카드의 토글 스위치를 해제하시면 출력본에서 자동 제외되며, 계획서 분량이 규정에 맞게 실시간 최적화됩니다.
          </div>
</div>
<!-- ════════ SECTION Ⅰ: 사업개요 및 기본 정보 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-overview">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅰ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">사업개요 및 기본 정보</h2>
<span class="text-xs px-2 py-0.5 rounded-full bg-status-successSoft text-status-success border border-status-success/30 font-medium">연동 완료</span>
</div>
<button class="text-xs font-medium text-primary hover:underline flex items-center gap-1" type="button">
<span class="material-symbols-outlined text-sm" data-icon="refresh">refresh</span>
              나라장터 공고 재동기화
            </button>
</div>
<div class="p-6 space-y-4">
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<!-- 공사명 -->
<div class="md:col-span-2">
<label class="block text-xs font-bold text-neutral-700 mb-1">사업장명 (공사명)</label>
<input class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-semibold focus:outline-none cursor-default" readonly="" type="text" value="화성태안3지구 복합커뮤니티센터 신축공사"/>
</div>
<!-- 발주기관 -->
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">발주기관 (공공기관/지자체)</label>
<div class="relative">
<input class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none cursor-default" readonly="" type="text" value="한국토지주택공사 화성사업본부"/>
<span class="absolute right-2.5 top-2 text-[10px] bg-status-successSoft text-status-success px-1.5 py-0.5 rounded font-medium border border-status-success/20">G2B 연동</span>
</div>
</div>
<!-- 시공사 및 책임자 -->
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">원도급 시공사 / 현장대리인</label>
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-primary focus:border-primary" type="text" value="(주)대한종합건설 / 현장소장 홍길동"/>
</div>
<!-- 공사기간 -->
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">공사기간 (착공 ~ 준공예정)</label>
<div class="flex items-center gap-2">
<input class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2025-04-01"/>
<span class="text-neutral-400 text-xs">~</span>
<input class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2026-09-30"/>
<span class="text-[11px] text-neutral-500 whitespace-nowrap font-medium">(18개월)</span>
</div>
</div>
<!-- 도급 공사금액 및 안전보건관리비 -->
<div>
<div class="flex justify-between items-center mb-1">
<label class="text-xs font-bold text-neutral-700">도급공사비 / 법정 안전보건관리비</label>
<span class="text-[11px] text-primary font-medium">요율 2.93% 자동산출 적용</span>
</div>
<div class="grid grid-cols-2 gap-2">
<input class="text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 font-mono text-neutral-900" type="text" value="4,850,000,000 원"/>
<input class="text-xs bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 font-mono text-neutral-800 font-semibold" readonly="" type="text" value="142,105,000 원 (계상)"/>
</div>
</div>
<!-- 대지위치 및 연면적 -->
<div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
<div class="md:col-span-2">
<label class="block text-xs font-bold text-neutral-700 mb-1">현장 소재지 (대지위치)</label>
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="경기도 화성시 안녕동 160-2 일원 (태안3지구 근린공원 내)"/>
</div>
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">연면적 / 건물 층수</label>
<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="지하 1층, 지상 4층 (연면적 8,940㎡)"/>
</div>
</div>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅱ: 안전보건관리체계 및 위험성평가 ════════ -->
<section class="bg-white rounded-xl border-2 border-primary/40 shadow-sm overflow-hidden scroll-mt-[196px]" id="sec-risk">
<div class="px-6 py-4 border-b border-neutral-200 bg-primary-soft/50 flex flex-wrap items-center justify-between gap-3">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅱ</span>
<div>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건관리체계 및 공종별 위험성평가</h2>
<p class="text-[11px] text-neutral-500 mt-0.5">산업안전보건법 제36조 및 고용노동부 고시 제2023-19호 KRAS 5×4 매트릭스 기준</p>
</div>
</div>
<div class="flex items-center gap-2">
<button class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-white border border-primary/30 hover:bg-primary-soft px-3 py-1.5 rounded-lg shadow-xs transition" type="button">
<span class="material-symbols-outlined text-base text-primary" data-icon="auto_awesome">auto_awesome</span>
<span>첨부도면/시방서 기반 AI 위험성 자동 추출</span>
</button>
</div>
</div>
<div class="p-6 space-y-5">
<!-- Filter Bar & DB Import Button -->
<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
<div class="flex items-center gap-2">
<span class="text-xs font-bold text-neutral-700">집중관리 대상공종:</span>
<div class="inline-flex rounded-lg border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium">
<button class="bg-white text-neutral-900 px-3 py-1 rounded shadow-xs font-semibold" type="button">골조·철근콘크리트</button>
<button class="text-neutral-600 px-3 py-1 hover:text-neutral-900" type="button">가설비계 및 흙막이</button>
<button class="text-neutral-600 px-3 py-1 hover:text-neutral-900" type="button">타워크레인 양중</button>
<button class="text-neutral-600 px-3 py-1 hover:text-neutral-900" type="button">전체보기</button>
</div>
</div>
<div class="flex items-center gap-2">
<button class="text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1" type="button">
<span class="material-symbols-outlined text-sm" data-icon="database">database</span>
                  공공 표준 위험요인 DB 불러오기
                </button>
<button class="text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/10 px-3 py-1.5 rounded-lg transition flex items-center gap-1 border border-primary/20" type="button">
<span class="material-symbols-outlined text-sm" data-icon="add">add</span>
                  위험성평가 행 추가
                </button>
</div>
</div>
<!-- Risk Matrix 5x4 Table -->
<div class="overflow-x-auto border border-neutral-200 rounded-lg">
<table class="w-full text-left text-xs border-collapse">
<thead>
<tr class="bg-neutral-100 text-neutral-700 border-b border-neutral-200 font-semibold">
<th class="p-3 w-12 text-center">No</th>
<th class="p-3 w-32">공정 및 세부단위작업</th>
<th class="p-3 min-w-[200px]">주요 유해·위험요인 (Hazard)</th>
<th class="p-3 w-28 text-center">현재 위험도 (빈도×강도)</th>
<th class="p-3 min-w-[240px]">발주처 권장 저감대책 및 개선조치</th>
<th class="p-3 w-24 text-center">개선 후 위험도</th>
<th class="p-3 w-24 text-center">조치현황</th>
</tr>
</thead>
<tbody class="divide-y divide-neutral-200 font-normal">
<!-- Row 1: High Risk -->
<tr class="hover:bg-neutral-50/80 transition">
<td class="p-3 text-center font-mono text-neutral-500">01</td>
<td class="p-3 font-semibold text-neutral-900">
                      가설공사<br/>
<span class="text-neutral-500 font-normal text-[11px]">강관비계 상부 작업발판 설치</span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      작업발판 미고정 또는 안전난간 미설치 상태에서 이동 중 지상 바닥으로 <strong class="text-status-danger">추락(떨어짐) 위험</strong>
</td>
<td class="p-3 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-status-dangerSoft text-status-danger border border-status-danger/30">
                        상 (4×4=16)
                      </span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      1. 시스템 비계 일체형 선행안전난간대 의무화<br/>
                      2. 안전대 부착설비(수평로프) 설치 후 2인 1조 작업<br/>
                      3. 풍속 10m/s 이상 시 고소작업 즉각 중지
                    </td>
<td class="p-3 text-center font-semibold text-neutral-600">
<span class="px-2 py-0.5 rounded-full text-[11px] bg-status-successSoft text-status-success">하 (2×2=4)</span>
</td>
<td class="p-3 text-center">
<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-800">계획반영</span>
</td>
</tr>
<!-- Row 2: Medium Risk -->
<tr class="hover:bg-neutral-50/80 transition">
<td class="p-3 text-center font-mono text-neutral-500">02</td>
<td class="p-3 font-semibold text-neutral-900">
                      철근콘크리트공사<br/>
<span class="text-neutral-500 font-normal text-[11px]">타워크레인 자재 인양작업</span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      슬링벨트 결속 불량 및 강풍으로 인하여 인양 중 자재가 하부 작업자 머리로 <strong class="text-status-warn">낙하·비래 위험</strong>
</td>
<td class="p-3 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-status-warnSoft text-status-warn border border-status-warn/30">
                        중 (3×3=9)
                      </span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      1. 2줄 걸이 2개소 체결 원칙 준수<br/>
                      2. 인양반경 내 하부출입통제선(폴리스라인) 및 신호수 전담 배치<br/>
                      3. 무선통신 전용채널 지정 운영
                    </td>
<td class="p-3 text-center font-semibold text-neutral-600">
<span class="px-2 py-0.5 rounded-full text-[11px] bg-status-successSoft text-status-success">하 (2×2=4)</span>
</td>
<td class="p-3 text-center">
<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-800">계획반영</span>
</td>
</tr>
<!-- Row 3: Medium Risk -->
<tr class="hover:bg-neutral-50/80 transition">
<td class="p-3 text-center font-mono text-neutral-500">03</td>
<td class="p-3 font-semibold text-neutral-900">
                      토공 및 흙막이<br/>
<span class="text-neutral-500 font-normal text-[11px]">굴착배면 지하수 유출 관리</span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      집중호우 시 토압 증가 및 토사 유실로 인한 <strong class="text-status-warn">흙막이 가시설 붕괴 위험</strong>
</td>
<td class="p-3 text-center">
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-status-warnSoft text-status-warn border border-status-warn/30">
                        중 (3×4=12)
                      </span>
</td>
<td class="p-3 text-neutral-700 leading-relaxed">
                      1. 자동계측기(경사계, 수위계) 매일 모니터링<br/>
                      2. 배면 배수로 정비 및 비상 집수정 수중펌프 2기 상시대기
                    </td>
<td class="p-3 text-center font-semibold text-neutral-600">
<span class="px-2 py-0.5 rounded-full text-[11px] bg-status-successSoft text-status-success">하 (1×3=3)</span>
</td>
<td class="p-3 text-center">
<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-800">계획반영</span>
</td>
</tr>
</tbody>
</table>
</div>
<!-- Bottom Toggle for Sub-clause Inclusion -->
<div class="p-3 bg-neutral-50 rounded-lg flex items-center justify-between border border-neutral-200">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-neutral-500 text-lg" data-icon="tune">tune</span>
<span class="text-xs font-semibold text-neutral-800">별첨 위험성평가 매트릭스(KRAS 표준 5×4 전체 양식) 인쇄물 부록 포함</span>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox"/>
<div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅲ: 현장 안전보건 실행계획 (Card & Toggle Pattern) ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-execution">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅲ</span>
<div>
<h2 class="font-headline font-bold text-base text-neutral-900">현장 안전보건 실행계획</h2>
<p class="text-[11px] text-neutral-500 mt-0.5">발주처 특기시방서에 명시되지 않은 조항은 토글을 꺼서 제외할 수 있습니다.</p>
</div>
</div>
<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">선택항목 3 / 4 활성화</span>
</div>
<div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
<!-- Card 1: 안전점검 및 조치계획 (ON) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-white hover:border-neutral-300 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="fact_check">fact_check</span>
</span>
<span class="text-xs font-bold text-neutral-900">1. 안전점검 및 일일 순회계획</span>
</div>
<!-- Active Toggle -->
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox"/>
<div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div class="space-y-2.5 text-xs">
<div>
<span class="text-neutral-500 block mb-1">점검 주기 설정:</span>
<div class="flex gap-4">
<label class="inline-flex items-center gap-1.5 text-neutral-700">
<input checked="" class="text-primary focus:ring-primary h-3.5 w-3.5" name="insp_cycle" type="radio"/> 일일 순회 (작업 전/후)
                    </label>
<label class="inline-flex items-center gap-1.5 text-neutral-700">
<input class="text-primary focus:ring-primary h-3.5 w-3.5" name="insp_cycle" type="radio"/> 주간 합동점검
                    </label>
</div>
</div>
<div>
<span class="text-neutral-500 block mb-1">총괄점검자 지정:</span>
<input class="w-full text-xs bg-neutral-50 border border-neutral-300 rounded px-2 py-1.5 text-neutral-900" type="text" value="안전총괄부장 김안전 (건설안전기사 보유)"/>
</div>
</div>
</div>
<!-- Card 2: 중점 위험작업 허가제 (PTW) (ON) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-white hover:border-neutral-300 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="assignment_late">assignment_late</span>
</span>
<span class="text-xs font-bold text-neutral-900">2. 중점 위험작업허가제 (PTW)</span>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox"/>
<div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div class="space-y-2 text-xs">
<span class="text-neutral-500 block">허가제 적용 대상 공종:</span>
<div class="grid grid-cols-2 gap-2 text-neutral-700">
<label class="flex items-center gap-1.5"><input checked="" class="rounded text-primary focus:ring-primary h-3.5 w-3.5" type="checkbox"/> 화기작업 (용접·용단)</label>
<label class="flex items-center gap-1.5"><input checked="" class="rounded text-primary focus:ring-primary h-3.5 w-3.5" type="checkbox"/> 밀폐공간 진입작업</label>
<label class="flex items-center gap-1.5"><input checked="" class="rounded text-primary focus:ring-primary h-3.5 w-3.5" type="checkbox"/> 5m 이상 고소작업</label>
<label class="flex items-center gap-1.5"><input checked="" class="rounded text-primary focus:ring-primary h-3.5 w-3.5" type="checkbox"/> 정전·단수 수전작업</label>
</div>
</div>
</div>
<!-- Card 3: 건설기계·장비 안전관리 (ON) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-white hover:border-neutral-300 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="precision_manufacturing">precision_manufacturing</span>
</span>
<span class="text-xs font-bold text-neutral-900">3. 건설기계·장비 안전검사 관리</span>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox"/>
<div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div class="space-y-2 text-xs text-neutral-600">
<p class="leading-relaxed">현장 반입 예정 건설기계 6종(타워크레인, 백호, 이동식크레인 등) 사전 안전등록 서식 연계 완료.</p>
<div class="bg-neutral-50 rounded p-2 border border-neutral-200 font-mono text-[11px] text-neutral-700 flex justify-between">
<span>등록 장비 4대 등록 완료</span>
<span class="text-status-success font-bold">검사증 첨부확인</span>
</div>
</div>
</div>
<!-- Card 4: 협력업체 안전보건 협의체 (OFF - Disabled State) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-neutral-50/70 opacity-75 hover:opacity-100 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-neutral-200 text-neutral-500 flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="groups">groups</span>
</span>
<span class="text-xs font-bold text-neutral-600">4. 하도급 협력업체 협의체 운영</span>
</div>
<!-- Inactive Toggle -->
<label class="relative inline-flex items-center cursor-pointer">
<input class="sr-only peer" type="checkbox"/>
<div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div class="space-y-1 text-xs text-neutral-500">
<p class="leading-relaxed text-neutral-400 italic">
                  * 미적용 상태 (출력물에서 자동 제외됨). 단독 도급 공사이거나 하도급이 없는 경우 꺼둘 수 있습니다.
                </p>
<span class="text-[11px] text-neutral-500 font-medium">활성화 시 월 1회 정기회의록 서식이 부록에 추가됩니다.</span>
</div>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅳ: 현장 운영관리 및 비상대책 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-emergency">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅳ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">현장 운영관리 및 비상대책</h2>
</div>
<span class="text-xs px-2 py-0.5 rounded-full bg-status-successSoft text-status-success border border-status-success/30 font-medium">GIS 병원 연동</span>
</div>
<div class="p-6 space-y-4">
<!-- AI Auto Match Emergency Hospital Banner -->
<div class="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
<div class="flex items-start gap-3">
<span class="w-9 h-9 rounded-lg bg-status-dangerSoft text-status-danger flex items-center justify-center shrink-0 mt-0.5">
<span class="material-symbols-outlined text-xl" data-icon="local_hospital">local_hospital</span>
</span>
<div>
<div class="flex items-center gap-2">
<span class="text-xs font-bold text-neutral-900">AI 현장 반경 5km 이내 지정 응급의료기관 자동 연동</span>
<span class="text-[10px] bg-status-successSoft text-status-success px-1.5 py-0.2 rounded font-mono">11분 거리</span>
</div>
<p class="text-xs text-neutral-600 mt-1">
<strong>화성중앙종합병원 응급의료센터</strong> (화성시 남양읍 남양시장로 45) | 응급실 직통: 031-355-1119 (24시간 외상센터 가동)
                  </p>
</div>
</div>
<button class="text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xs" type="button">
                병원 변경
              </button>
</div>
<!-- Emergency Toggles Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
<div class="p-3 border border-neutral-200 rounded-lg flex items-center justify-between">
<div>
<div class="text-xs font-bold text-neutral-800">비상연락체계 공조망</div>
<div class="text-[11px] text-neutral-500">소방서·경찰서·고용노동부 연계</div>
</div>
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
<div class="p-3 border border-neutral-200 rounded-lg flex items-center justify-between">
<div>
<div class="text-xs font-bold text-neutral-800">개인보호구(PPE) 지급기준</div>
<div class="text-[11px] text-neutral-500">안전모·안전화·스마트에어백 포함</div>
</div>
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
<div class="p-3 border border-neutral-200 rounded-lg flex items-center justify-between">
<div>
<div class="text-xs font-bold text-neutral-800">에너지차단장치 (LOTO)</div>
<div class="text-[11px] text-neutral-500">고압전기·설비정비 잠금장비</div>
</div>
<input class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅴ: 재해발생수준 및 안전목표 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-target">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅴ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">재해예방 및 무재해 안전목표</h2>
</div>
<span class="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">KOSHA-MS 규격</span>
</div>
<div class="p-6 space-y-4">
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">사업장 중점 안전방침 및 목표</label>
<textarea class="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-900 focus:ring-1 focus:ring-primary" rows="3">1. 본 공사 기간 중 '중대산업재해 ZERO' 달성
2. 기본 안전수칙(안전모·안전대 착용) 100% 이행 체계 구축
3. 작업 전 10분 안전미팅(TBM) 전 공종 정착 및 위험요인 사전 제거</textarea>
</div>
<div class="space-y-3">
<label class="block text-xs font-bold text-neutral-700">작업 전 안전점검회의 (TBM) 설정</label>
<div class="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-2">
<div class="flex items-center justify-between">
<span class="text-neutral-700">TBM 일일 실시 사진 첨부 서식:</span>
<span class="text-status-success font-semibold">자동 생성 On</span>
</div>
<div class="flex items-center justify-between">
<span class="text-neutral-700">근로자 전자서명 서식 포함:</span>
<span class="text-neutral-500">QR 모바일 연동</span>
</div>
</div>
<div class="flex items-center gap-2 pt-1">
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" id="chief-sign" type="checkbox"/>
<label class="text-xs font-bold text-neutral-800 cursor-pointer" for="chief-sign">
                    [필수] 총괄안전보건관리책임자(현장소장) 직인 전자 서명 날인 포함
                  </label>
</div>
</div>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅵ: 기타사항 및 별첨문서 선택 (부록) ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-attachments">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅵ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">별첨 서류 및 증빙 첨부파일 선택</h2>
</div>
<span class="text-xs text-neutral-500">제출 규격에 따라 필요한 서류만 체크</span>
</div>
<div class="p-6">
<div class="divide-y divide-neutral-100">
<!-- 별첨 1 -->
<div class="py-3 flex items-center justify-between">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-neutral-400" data-icon="article">article</span>
<div>
<div class="text-xs font-bold text-neutral-800">[별첨 1] 현장 안전보건 조직도 및 비상연락망 체계도</div>
<div class="text-[11px] text-neutral-500">LH 공사계약 일반조건 필수 구비 서류 (조직표 자동 랜더링)</div>
</div>
</div>
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
<!-- 별첨 2 -->
<div class="py-3 flex items-center justify-between">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-neutral-400" data-icon="calculate">calculate</span>
<div>
<div class="text-xs font-bold text-neutral-800">[별첨 2] 산업안전보건관리비 사용계획서 (산출내역표 포함)</div>
<div class="text-[11px] text-neutral-500">고용노동부 고시 제2023-74호 표준 서식 준용</div>
</div>
</div>
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
<!-- 별첨 3 -->
<div class="py-3 flex items-center justify-between">
<div class="flex items-center gap-3 text-neutral-400">
<span class="material-symbols-outlined" data-icon="eco">eco</span>
<div>
<div class="text-xs font-bold text-neutral-600">[별첨 3] 환경관리계획서 (비산먼지 및 소음진동 저감계획)</div>
<div class="text-[11px] text-neutral-400">발주처 특기시방서 요구 시에만 선택 (현재 미포함 권장)</div>
</div>
</div>
<input class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
<!-- 별첨 4 -->
<div class="py-3 flex items-center justify-between">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-neutral-400" data-icon="policy">policy</span>
<div>
<div class="text-xs font-bold text-neutral-800">[별첨 4] 중대재해처벌법 관련 도급인 의무이행 자체점검표</div>
<div class="text-[11px] text-neutral-500">공공발주처 제출 시 신뢰도 가점 우대 권장 항목</div>
</div>
</div>
<input checked="" class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox"/>
</div>
</div>
</div>
</section>
<!-- Spacer for Floating Bar visibility -->
<div class="h-20"></div>
</div>
</div>
</main>
<!-- ================= FLOATING ACTION & PAGE GENERATION DOCK ================= -->
<aside aria-label="문서 저장 및 생성 도크" class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-neutral-200 shadow-lg transition-transform">
<div class="w-full max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
<!-- Left Info: Live Status & Page Estimate -->
<div class="flex items-center gap-4 text-xs">
<div class="flex items-center gap-2">
<span class="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
<span class="font-medium text-neutral-700">실시간 데이터 동기화 완료 <span class="font-mono text-neutral-400">(14:32:10)</span></span>
</div>
<div class="h-3.5 w-px bg-neutral-300 hidden sm:block"></div>
<div class="hidden sm:flex items-center gap-1.5 text-neutral-600">
<span class="material-symbols-outlined text-base text-neutral-400" data-icon="description">description</span>
<span>현재 토글 옵션 적용 시: <strong class="text-neutral-900 font-bold font-mono">총 42페이지</strong> 분량 산출 예상</span>
</div>
</div>
<!-- Right Action Group -->
<div class="flex items-center gap-2.5">
<button class="text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1" type="button">
<span class="material-symbols-outlined text-base" data-icon="preview">preview</span>
          미리보기 PDF
        </button>
<button class="text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-3.5 py-2 rounded-lg transition shadow-xs" type="button">
          임시 저장
        </button>
<button class="text-xs font-bold text-white bg-primary hover:bg-primary-strong px-4 py-2 rounded-lg transition shadow-md flex items-center gap-1.5" data-export-format="hwpx" type="button">
<span class="material-symbols-outlined text-base" data-icon="download_done">download_done</span>
<span>최종 계획서 생성 (HWPX)</span>
</button>
<button class="text-xs font-bold text-white bg-primary hover:bg-primary-strong px-4 py-2 rounded-lg transition shadow-md flex items-center gap-1.5" data-export-format="docx" type="button">
<span class="material-symbols-outlined text-base" data-icon="download_done">download_done</span>
<span>최종 계획서 생성 (DOCX)</span>
</button>
<button class="text-xs font-bold text-white bg-primary hover:bg-primary-strong px-4 py-2 rounded-lg transition shadow-md flex items-center gap-1.5" data-export-format="pdf" type="button">
<span class="material-symbols-outlined text-base" data-icon="download_done">download_done</span>
<span>최종 계획서 생성 (PDF)</span>
</button>
</div>
</div>
</aside>
<!-- ================= FOOTER (Shared Component JSON Target) ================= -->
<footer class="bg-neutral-50 border-t border-neutral-200 mt-auto">
<div class="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-start gap-4">
<!-- Brand & Standard Compliance Disclaimers -->
<div class="space-y-2 max-w-3xl">
<div class="flex items-center gap-2">
<img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-6 h-6 object-contain"/>
<span class="font-headline font-bold text-base text-neutral-900">올케어안전플랫폼</span>
<span class="text-xs text-neutral-400">|</span>
<span class="font-body text-xs text-neutral-500 font-medium">공공입찰 안전보건관리계획서 생성 SaaS 솔루션</span>
</div>
<p class="font-body text-xs text-neutral-500 leading-relaxed">
          © 2025 ALLCARE SAFETY PLATFORM. All rights reserved. * 본 서비스는 나라장터(G2B) 및 공공기관 안전보건관리계획서 표준 규격 가이드를 준수하며, 안내된 공고 데이터는 실무 편의를 위한 연동 데이터입니다.
        </p>
</div>
<!-- Footer Policy Links -->
<div class="flex flex-wrap items-center gap-x-6 gap-y-2 font-body text-xs text-neutral-500">
<a class="text-neutral-500 hover:text-neutral-800 transition-colors" href="/legal">이용약관</a>
<a class="text-neutral-500 hover:text-neutral-800 transition-colors" href="/legal">개인정보처리방침</a>
<a class="text-neutral-500 hover:text-neutral-800 transition-colors" href="#">나라장터 연동 가이드</a>
<a class="text-neutral-500 hover:text-neutral-800 transition-colors font-medium" href="/legal">고객지원센터 1544-0000 (평일 09:00~18:00)</a>
</div>
</div>
</footer>
`;

export const SCRIPT_documents_wizard = `

`;

export function buildWizardHtml(
  doc: WizardDocRow,
  announcement: WizardAnnouncementRow,
  pdfOverview: PdfOverview | undefined,
  member?: WizardMemberRow,
  viewerIsAdmin?: boolean
): string {
  // The wizard's raw HTML was originally a static Stitch mockup for one demo
  // project (LH / 화성태안3지구). Swap in this document's real title/agency, and
  // where we have real data from the linked announcement (실제 나라장터 낙찰/공고
  // 정보), auto-fill 도급공사비/현장소재지, and auto-classify 공종 to recommend
  // real risk-assessment rows — instead of always showing the same demo project.
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const projectTitle = escapeHtml((doc.title ?? "").replace(/\s*계획서$/, "").trim() || "안전보건관리계획서");
  const agencyName = escapeHtml((doc.agency ?? "").trim() || "발주기관");
  const memberName = escapeHtml(member?.name?.trim() || "미등록");
  const memberCompany = escapeHtml(member?.company?.trim() || "회사명 미등록");
  const memberInitial = escapeHtml((member?.name?.trim() || "?").charAt(0));

  // 낙찰이 확정된 공고면 실제 낙찰금액을, 아니면 추정가격(기초금액)을 도급공사비로 사용.
  const contractAmount = announcement?.awarded ? announcement.winner_amount : announcement?.base_amount;
  const contractAmountLabel = announcement?.awarded ? "낙찰금액" : "추정가격(기초금액)";
  // 산업안전보건법 고시 기준 안전보건관리비 계상요율(단순 적용, 실제는 공사종류/규모별 요율표 적용 필요).
  const safetyBudget = contractAmount ? Math.round(contractAmount * 0.0293) : null;
  // 공고문 PDF에서 뽑은 위치가 더 정확하므로(전체 지번 주소) 우선 사용하고, 없으면
  // 나라장터 공고 API의 지역 단위 정보(site_region)로 대체한다.
  const siteLocation = escapeHtml(pdfOverview?.location || announcement?.site_region?.trim() || "");
  const contractPeriod = escapeHtml(pdfOverview?.period ?? "");
  const mainContent = escapeHtml(pdfOverview?.mainContent ?? "");

  const constructionType = classifyConstructionType(doc.title ?? "");
  const scaleField = scaleFieldFor(constructionType);
  const riskRowsHtml = buildRiskRowsHtml(constructionType);

  const adminReturnLinkHtml = viewerIsAdmin
    ? `<a href="/admin" class="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 transition-colors"><span class="material-symbols-outlined text-sm">admin_panel_settings</span>관리자 화면으로</a>`
    : "";

  let html = HTML_documents_wizard
    .replace("__ADMIN_RETURN_LINK__", adminReturnLinkHtml)
    .replace(
      '<div class="w-8 h-8 rounded-full bg-primary-soft text-primary font-semibold text-xs flex items-center justify-center border border-primary/20" title="대한종합건설 홍길동 부장 프로필">\n            홍\n          </div>',
      `<div class="w-8 h-8 rounded-full bg-primary-soft text-primary font-semibold text-xs flex items-center justify-center border border-primary/20" title="${memberCompany} ${memberName} 프로필">${memberInitial}</div>`
    )
    .replace(
      '<div class="text-xs font-semibold text-neutral-900 leading-tight">대한종합건설 홍길동 부장</div>\n<div class="text-[11px] text-neutral-500 font-medium">안전보건총괄책임자</div>',
      `<div class="text-xs font-semibold text-neutral-900 leading-tight">${memberCompany} ${memberName}</div>\n<div class="text-[11px] text-neutral-500 font-medium">안전보건관리책임자</div>`
    )
    .replace(
      'value="(주)대한종합건설 / 현장소장 홍길동"',
      `value="${memberCompany} / 현장대리인 ${memberName}"`
    )
    .replace("LH v4.2 표준 준수", `${agencyName} 표준 준수`)
    .replace(
      "[202502-89211] 화성태안3지구 복합커뮤니티센터 신축공사 안전보건관리계획서",
      `${projectTitle} 안전보건관리계획서`
    )
    .replace("한국토지주택공사(LH) 표준 서식 (2025 개정판)", `${agencyName} 표준 서식`)
    .replace("LH 적격심사 가점 요건 충족", `${agencyName} 적격심사 가점 요건 충족`)
    .replace("발주처(LH) 안전관리 가이드라인 2025 개정판 연동 중:", `발주처(${agencyName}) 안전관리 가이드라인 연동 중:`)
    .replace('value="화성태안3지구 복합커뮤니티센터 신축공사"', `value="${projectTitle}"`)
    .replace('value="한국토지주택공사 화성사업본부"', `value="${agencyName}"`)
    .replace("LH 공사계약 일반조건 필수 구비 서류 (조직표 자동 랜더링)", `${agencyName} 공사계약 일반조건 필수 구비 서류 (조직표 자동 랜더링)`)
    // 공사기간은 실제로는 "착공일로부터 90일" 같은 자유서식 문구로 공고되는 경우가
    // 대부분이라(정확한 시작/종료일이 별도 필드로 나오지 않음), 두 개의 date input을
    // 하나의 텍스트 입력으로 바꿔 공고문 PDF에서 뽑은 원문 그대로 보여준다.
    .replace(
      '<input class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2025-04-01"/>\n<span class="text-neutral-400 text-xs">~</span>\n<input class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2026-09-30"/>\n<span class="text-[11px] text-neutral-500 whitespace-nowrap font-medium">(18개월)</span>',
      `<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="${contractPeriod}" placeholder="공고문 자동분석 결과가 없어 직접 입력이 필요합니다"/>`
    )
    .replace(
      'value="경기도 화성시 안녕동 160-2 일원 (태안3지구 근린공원 내)"',
      `value="${siteLocation}" placeholder="현장 소재지를 입력하세요"`
    )
    .replace(
      '<label class="block text-xs font-bold text-neutral-700 mb-1">연면적 / 건물 층수</label>\n<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="지하 1층, 지상 4층 (연면적 8,940㎡)"/>',
      `<label class="block text-xs font-bold text-neutral-700 mb-1">${scaleField.label}</label>\n<input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="" placeholder="${scaleField.placeholder}"/>`
    )
    .replace(
      '</div>\n</div>\n</section>\n<!-- ════════ SECTION Ⅱ: 안전보건관리체계 및 위험성평가 ════════ -->',
      `<div class="md:col-span-2">
<label class="block text-xs font-bold text-neutral-700 mb-1">공사내용 (주요 공사 개요)</label>
<textarea class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" rows="2" placeholder="공고문 자동분석 결과가 없어 직접 입력이 필요합니다">${mainContent}</textarea>
</div>
</div>
</div>
</section>
<!-- ════════ SECTION Ⅱ: 안전보건관리체계 및 위험성평가 ════════ -->`
    );

  if (contractAmount) {
    html = html
      .replace(
        'value="4,850,000,000 원"',
        `value="${contractAmount.toLocaleString("ko-KR")}원 (${contractAmountLabel})"`
      )
      .replace('value="142,105,000 원 (계상)"', `value="${(safetyBudget ?? 0).toLocaleString("ko-KR")}원 (계상)"`);
  } else {
    html = html
      .replace('value="4,850,000,000 원"', 'value="" placeholder="도급공사비를 입력하세요"')
      .replace('value="142,105,000 원 (계상)"', 'value="" placeholder="자동 계상 대기중"');
  }

  html = html.replace("골조·철근콘크리트", constructionType);

  // 위험성평가 표: 공고 제목 기반으로 자동분류한 공종(constructionType)의 표준 항목으로 교체.
  const riskTbodyStart = html.indexOf('<tbody class="divide-y divide-neutral-200 font-normal">');
  const riskTbodyEnd = html.indexOf("</tbody>", riskTbodyStart);
  if (riskTbodyStart !== -1 && riskTbodyEnd !== -1) {
    const openTag = '<tbody class="divide-y divide-neutral-200 font-normal">';
    html = html.slice(0, riskTbodyStart) + openTag + "\n" + riskRowsHtml + "\n" + html.slice(riskTbodyEnd);
  }

  return html;
}
