import {
  classifyConstructionType,
  buildRiskRowsHtml,
  buildRiskRowTemplateHtml,
  buildRiskLibrarySelectHtml,
  buildRiskFilterTabsHtml,
  buildInitialRiskRows,
  scaleFieldFor,
  type RiskRow,
} from "@/lib/riskTemplates";
import { pickAnnouncementPdf } from "@/lib/extractBusinessOverview";
import {
  buildTemplateSectionsHtml,
  buildTemplateTocHtml,
  removeDisabledCommonSections,
  applyOverviewLabel,
  insertCoverNavAndSection,
  applySectionOrder,
  COMMON_SECTIONS,
  type AgencyTemplateRow,
} from "@/lib/agencyTemplates";

// Shared between the wizard screen (src/app/documents/[id]/wizard/page.tsx) and the
// document export routes (src/app/api/documents/[id]/export/*): both need the exact
// same "real data substituted into the Stitch mockup HTML" output, so the whole
// HTML_documents_wizard template plus the substitution logic lives here once.
export type WizardDocRow = {
  id: string;
  title: string | null;
  agency: string | null;
  content: Record<string, unknown> | null;
  template_id?: string | null;
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
<button class="text-xs font-medium text-neutral-500 hover:text-neutral-900 px-2.5 py-1.5 rounded border border-neutral-200 hover:bg-neutral-100 transition duration-150" data-logout type="button">
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
__TEMPLATE_SELECT__
</div>
</div>
<!-- Right: Primary Actions -->
<div class="flex items-center gap-3">
__ANNOUNCEMENT_PDF_LINK__
<button class="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition shadow-xs" data-preview-format="pdf" type="button">
<span class="material-symbols-outlined text-base text-neutral-500" data-icon="visibility">visibility</span>
          PDF 미리보기
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
<!-- Ⅰ. 사업개요 (기본 진입 시 첫 화면 — ACTIVE) -->
<a class="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold bg-primary-soft text-primary border-l-4 border-primary transition shadow-xs" href="#sec-overview">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-status-successSoft text-status-success flex items-center justify-center">
<span class="material-symbols-outlined text-sm" data-icon="check">check</span>
</span>
<span>Ⅰ. 사업개요 및 기본정보</span>
</div>
<span class="text-[11px] text-primary font-mono font-bold">100%</span>
</a>
<!-- Ⅱ. 안전보건관리체계 -->
<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900 font-semibold">Ⅱ. 관리체계 및 위험성평가</span>
</div>
<span class="text-[11px] text-neutral-400 font-mono">85% 진행</span>
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
<span id="attachments-active-count" class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">3종 활성</span>
</a>
__TEMPLATE_TOC_ITEMS__
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
<input id="wizard-field-project-name" class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-semibold focus:outline-none cursor-default" readonly="" type="text" value="화성태안3지구 복합커뮤니티센터 신축공사"/>
</div>
<!-- 발주기관 -->
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">발주기관 (공공기관/지자체)</label>
<div class="relative">
<input id="wizard-field-agency" class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none cursor-default" readonly="" type="text" value="한국토지주택공사 화성사업본부"/>
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
<input id="wizard-field-period-start" class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2025-04-01"/>
<span class="text-neutral-400 text-xs">~</span>
<input id="wizard-field-period-end" class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2026-09-30"/>
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
<input id="wizard-field-contract-amount" class="text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 font-mono text-neutral-900" type="text" value="4,850,000,000 원"/>
<input id="wizard-field-safety-budget" class="text-xs bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 font-mono text-neutral-800 font-semibold" readonly="" type="text" value="142,105,000 원 (계상)"/>
</div>
</div>
<!-- 대지위치 및 연면적 -->
<div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
<div class="md:col-span-2">
<label class="block text-xs font-bold text-neutral-700 mb-1">현장 소재지 (대지위치)</label>
<input id="wizard-field-site-location" class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="경기도 화성시 안녕동 160-2 일원 (태안3지구 근린공원 내)"/>
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
<button class="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg cursor-not-allowed" disabled title="AI 기반 자동 추출은 준비 중입니다" type="button">
<span class="material-symbols-outlined text-base" data-icon="auto_awesome">auto_awesome</span>
<span>첨부도면/시방서 기반 AI 위험성 자동 추출 (준비 중)</span>
</button>
</div>
</div>
<div class="p-6 space-y-5">
<!-- Filter Bar & DB Import Button -->
<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
<div class="flex items-center gap-2">
<span class="text-xs font-bold text-neutral-700">집중관리 대상공종:</span>
<div class="inline-flex rounded-lg border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium" data-risk-tabs>
__RISK_FILTER_TABS__
</div>
</div>
<div class="flex items-center gap-2">
__RISK_DB_SELECT__
<button class="text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/10 px-3 py-1.5 rounded-lg transition flex items-center gap-1 border border-primary/20" data-risk-add type="button">
<span class="material-symbols-outlined text-sm" data-icon="add">add</span>
                  위험성평가 행 추가
                </button>
</div>
</div>
<!-- Risk Matrix 5x4 Table -->
<div class="overflow-x-auto border border-neutral-200 rounded-lg">
<table class="w-full text-left text-xs border-collapse" data-risk-table>
<thead>
<tr class="bg-neutral-100 text-neutral-700 border-b border-neutral-200 font-semibold">
<th class="p-3 w-12 text-center">No</th>
<th class="p-3 w-32">공정 및 세부단위작업</th>
<th class="p-3 min-w-[200px]">주요 유해·위험요인 (Hazard)</th>
<th class="p-3 w-28 text-center">현재 위험도 (빈도×강도)</th>
<th class="p-3 min-w-[240px]">발주처 권장 저감대책 및 개선조치</th>
<th class="p-3 w-24 text-center">개선 후 위험도</th>
<th class="p-3 w-24 text-center">조치현황</th>
<th class="p-3 w-12 text-center">관리</th>
</tr>
</thead>
<tbody class="divide-y divide-neutral-200 font-normal">
__RISK_ROWS__
</tbody>
</table>
</div>
__RISK_ROW_TEMPLATE__
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
__TEMPLATE_SECTIONS__
<!-- Spacer for Floating Bar visibility -->
<div class="h-20"></div>
</div>
</div>
</main>
<!-- ================= FLOATING ACTION & PAGE GENERATION DOCK ================= -->
<aside aria-label="문서 저장 및 생성 도크" class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-neutral-200 shadow-lg transition-transform">
<div class="w-full max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
<!-- Left Info: Live Save Status (WizardScreen이 실시간으로 갱신) -->
<div class="flex items-center gap-4 text-xs">
<div class="flex items-center gap-2">
<span class="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
<span id="wizard-dock-save-status" class="font-medium text-neutral-700">자동 저장 대기 중</span>
</div>
</div>
<!-- Right Action Group -->
<div class="flex items-center gap-2.5">
<button class="text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1" data-preview-format="pdf" type="button">
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

const escapeHtmlPolicy = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "Ⅰ.사업개요" 바로 다음에 오는 "안전보건 경영방침 및 목표" 절. 회원사가 자체
// 안전보건경영방침 이미지를 갖고 있으면 그 이미지를 업로드해 그대로 첨부하고
// (WizardScreen.tsx가 Supabase Storage에 올려 documents.content.safetyPolicy에
// 저장), 없으면 이 발주처 표준 문구(회사명만 자동 치환, 음영 박스 2곳만 직접
// 입력)를 쓴다. 두 모드 모두 실제로 선택 가능하도록 탭 버튼과 두 패널을 함께
// 렌더링하고, 현재 저장된 모드에 따라 한쪽만 보이도록 한다.
function buildManagementPolicyNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-management-policy">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">안전보건 경영방침 및 목표</span>
</div>
</a>
`;
}

function buildManagementPolicySectionHtml(params: {
  companyName: string;
  mode: "image" | "standard";
  imageUrl: string | null;
  imagePath: string;
  slogan: string;
  goal: string;
}): string {
  const { companyName, mode, imageUrl, imagePath, slogan, goal } = params;
  const company = escapeHtmlPolicy(companyName || "회사명 미등록");
  const bodyParagraph = `${company} 사업장의 각종 산업재해예방 및 근로자의 생명을 보호하기 위해 사업주와 근로자가 안전보건의무를 이행함으로써 재해없는 일터, 행복하고 건강한 일터를 조성하는 것을 목표로 경영방침, 안전목표 달성을 위해 각자 주어진 업무와 역할을 충실히 수행함으로써 안전문화 정착을 통한 상호협력 및 상생을 통한 지속가능한 기업으로 추구하고자 한다.`;
  const isImage = mode === "image";

  return `<!-- ════════ SECTION: 안전보건 경영방침 및 목표 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-management-policy" data-policy-mode="${mode}" data-policy-image-path="${escapeHtmlPolicy(
    imagePath
  )}">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
<div class="flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅰ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건 경영방침 및 목표</h2>
</div>
</div>
<div class="p-6 space-y-4">
<div class="flex gap-2" data-policy-tabs>
<button type="button" data-policy-tab="image" class="text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
    isImage
      ? "bg-primary text-white border-primary"
      : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
  }">회사 자체 안전보건경영방침 이미지 첨부</button>
<button type="button" data-policy-tab="standard" class="text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
    isImage
      ? "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
      : "bg-primary text-white border-primary"
  }">표준 문구 사용</button>
</div>
<div data-policy-panel="image" ${isImage ? "" : "hidden"}>
<p class="text-[11px] text-neutral-500 mb-2">이미 만들어진 안전보건경영방침 게시물(이미지)이 있으면 그대로 첨부하세요. 다운로드 문서 표지 다음 페이지에 이미지 그대로 삽입됩니다.</p>
<input type="file" accept="image/png,image/jpeg" data-policy-image-input class="text-xs" />
<div class="mt-3 ${imageUrl ? "" : "hidden"}" data-policy-image-preview-wrap>
<img data-policy-image-preview src="${imageUrl ? escapeHtmlPolicy(imageUrl) : ""}" class="max-w-full max-h-[420px] rounded-lg border border-neutral-200" alt="안전보건경영방침"/>
<button type="button" data-policy-image-remove class="mt-2 text-xs text-rose-600 hover:underline">이미지 삭제</button>
</div>
<p class="text-[11px] text-neutral-400 mt-1" data-policy-image-status>${
    imageUrl ? "업로드된 이미지가 저장되어 있습니다." : "아직 업로드된 이미지가 없습니다."
  }</p>
</div>
<div data-policy-panel="standard" ${isImage ? "hidden" : ""}>
<p class="text-center font-bold text-neutral-900 underline mb-4">안전보건 경영방침 및 목표</p>
<p class="font-bold text-neutral-800 underline mb-2">가. 안전보건 경영방침</p>
<div class="bg-neutral-100 border border-neutral-200 rounded-lg py-3 px-4 mb-3">
<input id="wizard-field-policy-slogan" class="w-full text-center text-sm font-bold underline bg-transparent text-neutral-900 focus:outline-none" type="text" value="${escapeHtmlPolicy(
    slogan
  )}"/>
</div>
<p class="text-xs text-neutral-700 leading-relaxed mb-3">${bodyParagraph}</p>
<ul class="text-xs text-neutral-700 leading-relaxed space-y-1 mb-4 list-none">
<li>- 기본과 원칙을 준수하는 안전/보건문화를 정착한다.</li>
<li>- 체계적인 사전 위험성평가와 지속적 개선활동을 통하여 무재해 목표 달성을 실천한다.</li>
<li>- 전 구성원의 능동적 참여, 협력사와의 상생으로 안전하고 쾌적한 작업환경을 조성한다.</li>
</ul>
<p class="font-bold text-neutral-800 underline mb-2">나. 안전보건 목표</p>
<div class="bg-neutral-100 border border-neutral-200 rounded-lg py-3 px-4">
<input id="wizard-field-policy-goal" class="w-full text-center text-sm font-bold bg-transparent text-neutral-900 focus:outline-none" type="text" value="${escapeHtmlPolicy(
    goal
  )}"/>
</div>
</div>
</div>
</section>
`;
}

// "안전보건관리 조직구성"(현장 조직도) — 직책은 실제 표준 조직도 그대로 고정값이고
// 성명·연락처만 입력할 수 있다. 표(<table>) 형태로 만들어 두면 wizardExport.ts의
// 위험성평가 표와 동일한 방식(셀 안의 input을 값으로 읽음)으로 별도 코드 없이
// 자동으로 다운로드 문서에도 표 그대로 출력된다.
const ORG_CHART_ROLES: { key: string; role: string }[] = [
  { key: "site-manager", role: "안전보건관리책임자(현장소장)" },
  { key: "safety-manager", role: "안전관리자(안전담당자)" },
  { key: "supervisor", role: "관리감독자" },
  { key: "team1", role: "작업 1팀장" },
  { key: "team2", role: "작업 2팀장" },
];

function buildOrgChartNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-org_chart">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">안전보건관리 조직구성</span>
</div>
</a>
`;
}

function buildOrgChartSectionHtml(): string {
  const rows = ORG_CHART_ROLES.map(
    ({ key, role }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-middle">${role}</td>
<td class="px-3 py-2 border-b border-neutral-100"><input id="wizard-field-org-${key}-name" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" placeholder="성명"/></td>
<td class="px-3 py-2 border-b border-neutral-100"><input id="wizard-field-org-${key}-contact" data-phone-format class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" inputmode="numeric" placeholder="연락처 (하이픈 자동 입력)"/></td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 안전보건관리 조직구성 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-org_chart">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅰ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건관리 조직구성</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">현장 사업소 조직도(임무 및 비상연락망 포함) — 직책은 표준 조직도에 맞춰 고정되어 있고, 성명·연락처만 입력하면 됩니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
<thead>
<tr class="bg-neutral-50">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">직책</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">성명</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">연락처</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</section>
`;
}

// "구성원별 안전보건 관리 역할" — 회원이 실제 제출했던 서식(구분/주요업무/비고,
// 헤드라인 음영)을 그대로 재현한다. 경쟁사 서식과 비교해 중복 내용을 하나로
// 통합한 문구를 "주요업무" 칸에 기본값으로 채워 넣고, 구분(직책)은 고정값,
// 비고는 빈 칸으로 시작한다.
const ROLE_RESPONSIBILITIES: { key: string; role: string; duties: string }[] = [
  {
    key: "ceo",
    role: "대표이사",
    duties:
      "1. 안전보건경영시스템 운영 관련 관계자 권한 부여(업무분장·지휘감독·예산집행 등) 및 확인\n" +
      "2. 안전보건 경영방침 및 목표 설정, 계획 승인\n" +
      "3. 조직 구성, 인력·안전보건관리비·시설·장비 등 자원의 지원\n" +
      "4. 이사회 보고 및 승인\n" +
      "5. 시스템 평가 및 지속적인 개선\n" +
      "6. 안전보건에 관한 최종 의사결정 및 산업재해 예방 총괄",
  },
  {
    key: "hq-safety-dept",
    role: "본사 안전보건관리부서\n(관리팀 안전담당)",
    duties:
      "1. 안전보건 경영시스템 제·개정, 실무, 검토, 품의, 등록, 배포, 실행, 이행상태 점검 및 총괄 관리\n" +
      "2. 안전보건 경영방침·목표·계획 수립 및 대표이사 보고\n" +
      "3. 현장 안전보건 확산 분위기 조성 및 지원, 순회 점검\n" +
      "4. 안전보건 인력 및 시설·예산 편성, 집행 감독, 기록 보관\n" +
      "5. 안전보건교육 계획수립·집행 지원, 협의회 등 법정회의 지원\n" +
      "6. 사고 재발방지대책 수립 및 전파교육\n" +
      "7. 중대재해처벌법 등 안전보건관계법령에 따른 이행업무 지원",
  },
  {
    key: "site-manager",
    role: "안전보건관리책임자\n(현장소장)",
    duties:
      "1. 사업장의 산업재해 예방계획의 수립에 관한 사항\n" +
      "2. 안전보건관리규정의 작성 및 변경에 관한 사항\n" +
      "3. 안전보건교육에 관한 사항\n" +
      "4. 작업환경측정 등 작업환경의 점검 및 개선에 관한 사항\n" +
      "5. 근로자의 건강진단 등 건강관리에 관한 사항\n" +
      "6. 산업재해의 원인 조사 및 재발 방지대책 수립에 관한 사항\n" +
      "7. 산업재해에 관한 통계의 기록·유지에 관한 사항\n" +
      "8. 안전장치 및 보호구 구입 시 적격품 여부 확인에 관한 사항\n" +
      "9. 그 밖에 근로자의 유해·위험 방지조치에 관한 사항으로서 고용노동부령으로 정하는 사항\n" +
      "10. 본사 안전보건 전담부서의 지도·조언에 대한 성실한 협조 및 대표이사 부여 권한의 행사·보고",
  },
  {
    key: "supervisor",
    role: "관리감독자",
    duties:
      "1. 지휘·감독하는 작업과 관련된 기계·기구 또는 설비의 안전·보건 점검 및 이상 유무 확인\n" +
      "2. 소속 근로자의 작업복·보호구 및 방호장치의 점검과 그 착용·사용에 관한 교육·지도\n" +
      "3. 산업재해에 관한 보고 및 이에 대한 응급조치\n" +
      "4. 작업 정리·정돈 및 통로 확보에 대한 확인·감독\n" +
      "5. 위험성평가에 관한 유해·위험요인의 파악 및 개선조치 시행에 대한 참여\n" +
      "6. 사업장 순회점검 지도 및 조치 건의\n" +
      "7. 소속 근로자 등 관계자 직접 지휘·감독, 교육, 의견 청취 및 조치\n" +
      "8. 그 밖에 안전 및 보건에 관한 사항으로서 고용노동부령으로 정하는 사항",
  },
  {
    key: "safety-manager",
    role: "안전관리자",
    duties:
      "1. 산업안전보건위원회 또는 안전 및 보건에 관한 노사협의체에서 심의·의결한 업무와 해당 사업장의 안전보건관리규정 및 취업규칙에서 정한 업무\n" +
      "2. 위험성평가에 관한 보좌 및 지도·조언\n" +
      "3. 안전인증대상기계 등과 자율안전확인대상기계 등 구입 시 적격품 선정에 관한 보좌 및 지도·조언\n" +
      "4. 해당 사업장 안전교육계획의 수립 및 안전교육 실시에 관한 보좌 및 지도·조언\n" +
      "5. 사업장 순회점검, 지도 및 조치 건의\n" +
      "6. 산업재해 발생의 원인 조사·분석 및 재발 방지를 위한 기술적 보좌 및 지도·조언\n" +
      "7. 산업재해에 관한 통계의 유지·관리·분석을 위한 보좌 및 지도·조언\n" +
      "8. 법 또는 법에 따른 명령으로 정한 안전에 관한 사항의 이행에 관한 보좌 및 지도·조언\n" +
      "9. 업무 수행 내용의 기록·유지\n" +
      "10. 현장소장 보좌 및 관리감독자·근로자에 대한 지도·조언, 위험성평가 자료 확보 및 정보제공\n" +
      "11. 안전관리자 직무수행(산업안전보건법 제17조, 같은 법 시행령 제18조)",
  },
  {
    key: "safety-officer",
    role: "안전보건담당자\n(안전관리자 미선임 시)",
    duties:
      "※ 안전관리자 미선임 수급사는 안전보건관리담당자를 선임하여 아래 업무를 수행한다.\n" +
      "1. 안전보건교육 실시에 관한 보좌 및 지도·조언\n" +
      "2. 위험성평가에 관한 보좌 및 지도·조언\n" +
      "3. 작업환경측정 및 개선에 관한 보좌 및 지도·조언\n" +
      "4. 각종 건강진단에 관한 보좌 및 지도·조언\n" +
      "5. 산업재해 발생의 원인 조사, 산업재해 통계의 기록 및 유지를 위한 보좌 및 지도·조언\n" +
      "6. 안전장치 및 보호구 구입 시 적격품 선정에 관한 보좌 및 지도·조언",
  },
];

function buildRoleResponsibilitiesNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-role_responsibilities">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">구성원별 안전보건 관리 역할</span>
</div>
</a>
`;
}

function buildRoleResponsibilitiesSectionHtml(): string {
  const rows = ROLE_RESPONSIBILITIES.map(({ key, role, duties }) => {
    const roleHtml = escapeHtmlPolicy(role).replace(/\n/g, "<br/>");
    const rowCount = Math.min(14, Math.max(4, duties.split("\n").length + 1));
    return `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap">${roleHtml}</td>
<td class="px-3 py-2 border-b border-neutral-100"><textarea id="wizard-field-role-${key}-duties" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="${rowCount}" placeholder="주요업무·책임과 권한을 입력하세요">${escapeHtmlPolicy(
      duties
    )}</textarea></td>
<td class="px-3 py-2 border-b border-neutral-100 align-top"><input id="wizard-field-role-${key}-note" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" placeholder="비고"/></td>
</tr>`;
  }).join("\n");

  return `<!-- ════════ SECTION: 구성원별 안전보건 관리 역할 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-role_responsibilities">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅰ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">구성원별 안전보건 관리 역할</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">구성원별 안전보건 관리 역할(책임과 권한 및 주요업무) — 구분(직책)은 고정되어 있고, 주요업무는 표준 문구가 채워져 있어 그대로 두거나 현장 실정에 맞게 고쳐 쓰면 됩니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[16%]">구분</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">주요업무</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[14%]">비고</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</section>
`;
}

// "안전보건교육 계획" — 경쟁사 서식(종류/대상/교육시간/교육강사/교육내용/교육교재)과
// 실제 LH 샘플(화성동탄(2), 23~27p "1.2 교육종류 등") 내용을 통합한 표준 문구다.
// 종류(교육명)는 고정값, 나머지 칸은 표준 문구가 채워진 채로 수정 가능하다.
const EDUCATION_PLAN_ROWS: {
  key: string;
  category: string;
  target: string;
  hours: string;
  instructor: string;
  content: string;
  material: string;
}[] = [
  {
    key: "manager-appointment",
    category: "안전보건관리책임자\n직무교육",
    target: "현장소장",
    hours: "선임일로부터 3개월 이내 6시간",
    instructor: "교육기관(전문강사)",
    content: "1. 현장소장의 직무내용\n2. 산업안전보건법령에 관한 사항 등",
    material: "유인물",
  },
  {
    key: "supervisor-regular",
    category: "관리감독자\n정기교육",
    target: "현장소속 관리감독자",
    hours: "매월 분산실시(연 16시간, 반기 8시간)",
    instructor: "자체 교육장\n(현장소장 또는 외부강사)",
    content:
      "1. 산업안전보건법령에 관한 사항\n2. 작업안전지도요령에 관한 사항\n3. 기계·기구 또는 설비의 안전·보건점검에 관한 사항\n4. 관리감독자의 역할과 임무에 관한 사항",
    material: "유인물",
  },
  {
    key: "special-worker",
    category: "특수형태근로종사자\n특별교육",
    target: "건설기계 운전원",
    hours: "채용 시마다 2시간",
    instructor: "자체 교육장\n(현장소장·관리감독자·안전관리자)",
    content:
      "1. 산업안전 및 사고 예방에 관한 사항\n2. 유해·위험 작업환경 관리에 관한 사항\n3. 기계·기구의 위험성과 작업순서 및 동선에 관한 사항\n4. 보호구 착용에 관한 사항",
    material: "유인물",
  },
  {
    key: "msds",
    category: "화학물질(MSDS)\n취급근로자 교육",
    target: "취급 근로자",
    hours: "취급 전 1시간",
    instructor: "자체 교육장\n(현장소장·관리감독자·안전관리자)",
    content:
      "1. 대상화학물질의 명칭(또는 제품명)\n2. 물리적 위험성 및 건강 유해성\n3. 취급상의 주의사항\n4. 적절한 보호구\n5. 응급조치 요령 및 사고 시 대처방법",
    material: "유인물",
  },
  {
    key: "risk-assessment",
    category: "위험성평가 교육",
    target: "평가 담당자",
    hours: "착공 전 4시간",
    instructor: "교육기관(전문강사)",
    content: "1. 위험성평가 종류 및 절차\n2. 위험성평가 진행방법 및 위험성 결정\n3. 감소대책의 수립방법 등",
    material: "유인물",
  },
  {
    key: "daily-tbm",
    category: "일일 안전교육\n(TBM)",
    target: "전 근로자",
    hours: "매일 10분 이상",
    instructor: "자체 교육장\n(현장소장·관리감독자·안전관리자)",
    content: "1. 당일 작업의 공법 이해\n2. 시공상세도면에 따른 세부 시공순서 및 시공기술상의 주의사항\n3. 안전보건에 관한 사항 등",
    material: "유인물",
  },
  {
    key: "regular",
    category: "근로자\n정기안전보건교육",
    target: "전 근로자",
    hours: "매월 25일 2시간 이상",
    instructor: "자체 교육장\n(현장소장·관리감독자·안전관리자)",
    content:
      "1. 산업안전보건법령에 관한 사항\n2. 작업공정의 유해·위험에 관한 사항\n3. 안전작업방법에 관한 사항\n4. 보호구/안전장치 취급과 사용에 관한 사항\n5. 안전사고사례 및 산업재해예방 대책에 관한 사항",
    material: "유인물",
  },
  {
    key: "new-hire",
    category: "신규채용자교육\n(기초안전보건교육)",
    target: "신규채용자\n작업내용변경작업자",
    hours: "신규채용 시 4시간\n작업내용변경 시 1시간",
    instructor: "교육기관(전문강사)\n자체 교육장",
    content:
      "1. 산업안전보건법령에 관한 사항\n2. 작업 안전방법에 관한 사항\n3. 기계·기구 또는 설비의 안전·취급방법\n4. 보호구 착용 및 취급방법\n5. 근로자의 의무에 관한 사항",
    material: "유인물",
  },
  {
    key: "special-safety",
    category: "특별안전보건교육",
    target: "유해·위험작업자",
    hours: "유해·위험작업 시 2시간",
    instructor: "자체 교육장\n(현장소장·관리감독자·안전관리자)",
    content:
      "1. 유해·위험공종에 따른 표준작업방법 및 안전작업방법에 관한 사항\n2. 특별안전교육 대상 작업별 세부내용에 관한 사항",
    material: "유인물",
  },
];

function buildEducationPlanNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-education_plan">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">안전보건교육 계획</span>
</div>
</a>
`;
}

function buildEducationPlanSectionHtml(): string {
  const rows = EDUCATION_PLAN_ROWS.map(({ key, category, target, hours, instructor, content, material }) => {
    const categoryHtml = escapeHtmlPolicy(category).replace(/\n/g, "<br/>");
    const contentRowCount = Math.min(10, Math.max(3, content.split("\n").length + 1));
    return `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap">${categoryHtml}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top"><textarea id="wizard-field-edu-${key}-target" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="2">${escapeHtmlPolicy(
      target
    )}</textarea></td>
<td class="px-3 py-2 border-b border-neutral-100 align-top"><textarea id="wizard-field-edu-${key}-hours" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="2">${escapeHtmlPolicy(
      hours
    )}</textarea></td>
<td class="px-3 py-2 border-b border-neutral-100 align-top"><textarea id="wizard-field-edu-${key}-instructor" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="2">${escapeHtmlPolicy(
      instructor
    )}</textarea></td>
<td class="px-3 py-2 border-b border-neutral-100"><textarea id="wizard-field-edu-${key}-content" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="${contentRowCount}">${escapeHtmlPolicy(
      content
    )}</textarea></td>
<td class="px-3 py-2 border-b border-neutral-100 align-top"><input id="wizard-field-edu-${key}-material" class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" value="${escapeHtmlPolicy(
      material
    )}"/></td>
</tr>`;
  }).join("\n");

  return `<!-- ════════ SECTION: 안전보건교육 계획 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-education_plan">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅱ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건교육 계획</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">교육 종류별 대상·교육시간·교육강사·교육내용·교육교재 — 종류(교육명)는 고정되어 있고, 나머지 칸은 표준 문구가 채워져 있어 그대로 두거나 현장 실정에 맞게 고쳐 쓰면 됩니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[13%]">종류</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[13%]">대상</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[14%]">교육시간</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[15%]">교육강사</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">교육내용</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[9%]">교육교재</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</section>
`;
}

// "위험성평가 실시규정" — 산업안전보건법 제36조에 따른 실시규정 전문(붙임1, 실제 LH
// 샘플 화성동탄(2) 131~145p)과 서식 2종(교육일지/회의록)을 팝업(모달)에서 작성한다.
// 15페이지 분량이라 위저드 본문에 그대로 펼쳐 두면 스크롤이 지나치게 길어지므로,
// 본문에는 안내문구 + "작성하기" 버튼만 두고 실제 내용은 모달 안에 둔다. 전문
// 대부분은 법정 표준 문구라 읽기전용(textarea readonly)으로 넣어 두고, 실제로
// 채워야 하는 값(제·개정일, 승인자/검토자/작성자 성명, 조직 담당자 성명)만 입력
// 가능하게 한다. wizardExport.ts의 일반 라벨+값 추출(findLabel/fieldValue)을 그대로
// 타므로 별도 export 코드가 필요 없다 — <div><label>...</label><input|textarea>...
// 패턴(라벨이 입력요소의 직계 형제)만 지키면 자동으로 문서에 포함된다.
function raRField(id: string, label: string, value: string, opts: { type?: string; placeholder?: string } = {}): string {
  const { type = "text", placeholder = "" } = opts;
  return `<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">${escapeHtmlPolicy(label)}</label>
<input id="${id}" class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="${type}" value="${escapeHtmlPolicy(
    value
  )}" placeholder="${escapeHtmlPolicy(placeholder)}"/>
</div>`;
}

function raRReadonlyBlock(label: string, text: string): string {
  const rows = Math.min(30, Math.max(6, text.split("\n").length + 1));
  return `<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">${escapeHtmlPolicy(label)}</label>
<textarea readonly class="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 leading-relaxed" rows="${rows}">${escapeHtmlPolicy(
    text
  )}</textarea>
</div>`;
}

const RISK_ASSESSMENT_RULES_BLOCK_1_TEXT =
  "1. 목적\n" +
  "본 규정은 산업안전보건법 제36조에 따라 현장에서 유해·위험요인에 대한 실태를 파악하고 이를 평가하여 관리·개선하는 등 재해를 예방하기 위하여 위험성평가에 관한 조직의 구성, 역할과 책임, 평가대상, 근로자 참여, 실시시기, 절차, 방법 등에 대한 기준을 제시하고, 현장에서 발생하는 위험요인을 사전에 제거함으로써 안전하고 쾌적한 작업환경을 유지하는 데 그 목적이 있다.\n\n" +
  "2. 적용범위\n" +
  "이 규정은 회사에서 시공하는 본 현장에 적용한다.\n\n" +
  "3. 용어의 정의\n" +
  "3.1 위험성평가: 현장소장이 스스로 유해·위험요인을 파악하고 해당 유해·위험요인의 위험성 수준을 결정하여, 위험성을 낮추기 위한 적절한 조치를 마련하고 실행하는 과정을 말한다.\n" +
  "3.2 유해·위험요인: 유해·위험을 일으킬 잠재적 가능성이 있는 것의 고유한 특징이나 속성을 말한다.\n" +
  "3.3 위험성: 유해·위험요인이 사망, 부상 또는 질병으로 이어질 수 있는 가능성과 중대성 등을 고려한 위험의 정도를 말한다.\n" +
  "3.4 허용가능 위험성: 허용할 수 있는 수준으로 감소된 위험성을 말한다.\n" +
  "3.5 허용불가 위험성: 허용할 수 없는 수준의 위험으로 감소대책이 필요한 위험성을 말한다.\n" +
  "3.6 위험성 감소대책 수립 및 실행: 위험성 결정 결과 허용 불가능한 위험성을 합리적으로 실천 가능한 범위에서 가능한 한 낮은 수준으로 감소시키기 위한 대책을 수립하고 실행하는 것을 말한다.";

const RISK_ASSESSMENT_RULES_BLOCK_2_TEXT =
  "4. 조직의 구성\n" +
  "안전보건관리책임자(안전보건총괄책임자, 현장소장) 아래 안전관리자(팀장)를 두고, 공무팀·공사팀(관리감독자)·품질팀 팀장과 협력업체·근로자가 위험성평가에 참여하는 안전보건협의체 구조로 운영한다. 구성원 성명은 아래 입력값을 따른다.\n\n" +
  "5. 역할과 책임\n" +
  "5.1 현장소장\n" +
  "가. 위험성평가의 실시 및 실시에 관한 총괄관리\n" +
  "나. 관리감독자 등에게 위험성평가 실무에 관한 권한 부여\n" +
  "다. 위험성평가 결과의 개선대책 이행 및 이행상태 확인\n" +
  "라. 위험성평가 관련 업무분장 및 조정, 예산집행 승인\n" +
  "마. 위험성평가 후 개선에 필요한 초과예산의 승인요청\n" +
  "바. 위험성평가 실시규정 작성 및 기타 위험성평가에 관한 사항\n\n" +
  "5.2 관리감독자(공사팀장, 반장 등)\n" +
  "가. 위험성평가(최초, 정기, 수시, 상시)의 계획수립, 회의실시, 평가실시 등 평가실무 진행\n" +
  "나. 외주 협력업체의 위험성평가서 검토 및 개선\n" +
  "다. 근로자 등 종사자 참여 독려, 지도, 지원\n" +
  "라. 유해위험요인 파악, 위험성 결정, 개선대책 수립 및 개선확인\n" +
  "마. 위험성평가에 관한 Feed-Back, 관련문서 및 기록 보관\n\n" +
  "5.3 안전관리자\n" +
  "가. 현장소장 보좌\n" +
  "나. 관리감독자 및 근로자 등 종사자에 대한 협조 및 지도, 조언, 지원\n" +
  "다. 위험성평가 관련 자료확보 및 정보제공, 관계자 교육\n" +
  "라. 순회점검 및 개선대책 이행여부 확인\n" +
  "마. 위험성평가 시 참여 및 Feed-Back 협조\n" +
  "바. 감소대책 이행에 필요한 예산집행 등\n\n" +
  "5.4 근로자 등 종사자\n" +
  "가. 유해·위험요인의 위험성 수준을 판단하는 기준(위험성평가 규정 등)을 마련하는 데 참여\n" +
  "나. 유해·위험요인별로 허용가능한 위험성 수준을 정하거나 변경 시 참여\n" +
  "다. 유해·위험요인 파악 시 참여\n" +
  "라. 유해·위험요인의 위험성이 허용 가능한 수준인지 여부를 결정하는 데 참여\n" +
  "마. 위험성 감소대책을 수립하고 실행하는 데 참여\n" +
  "바. 위험성 감소대책 개선 여부를 확인하는 데 참여\n" +
  "사. Feed-Back 협조";

const RISK_ASSESSMENT_RULES_BLOCK_3_TEXT =
  "6. 위험성평가 실시주체 및 평가대상\n" +
  "6.1 실시주체\n" +
  "가. 현장소장은 현장에 대해 스스로 유해·위험요인을 파악하고 이를 평가하여 관리·개선하는 등 본 규정에서 정한 절차와 방법 등에 따라 위험성평가를 실시하여야 한다.\n" +
  "나. 현장소장은 하도급(수급사업주) 업체에서 실시한 공종별 위험성평가서를 반드시 제출받아 검토해야 하고, 개선할 사항이 있는 경우에는 이를 개선하게 하는 등 근본적인 안전보건 확보를 위해 노력해야 한다.\n\n" +
  "6.2 평가대상\n" +
  "가. 전 공종에 대한 모든 유해·위험요인을 대상으로 위험성평가를 실시해야 한다.\n" +
  "나. 산업안전보건기준에 관한 규칙 내용과 작업 중 근로자에게 노출된 것이 확인되었거나 노출될 것이 합리적으로 예견 가능한 모든 유해·위험요인 및 부상 또는 질병으로 이어질 가능성이 있었던 상황(“아차사고” 등)을 경험 또는 확인한 경우에는 반드시 평가대상에 포함하되, 매우 경미한 부상 및 질병만을 초래할 것으로 명백히 예상되는 유해·위험요인은 평가 대상에서 제외할 수 있다.\n\n" +
  "7. 근로자 참여\n" +
  "가. 현장소장은 위험성평가를 실시할 때 다음에 해당하는 경우 해당 작업에 종사하는 근로자를 반드시 참여시켜야 한다.\n" +
  "  1) 유해·위험요인의 위험성 수준을 판단하는 기준을 마련하고(위험성평가 규정 작성 등), 유해·위험요인별로 허용 가능한 위험성 수준을 정하거나 변경하는 경우\n" +
  "  2) 해당 건설현장의 유해·위험요인을 파악하는 경우\n" +
  "  3) 유해·위험요인의 위험성이 허용 가능한 수준인지 여부를 결정하는 경우\n" +
  "  4) 위험성 감소대책을 수립하여 실행하는 경우\n" +
  "  5) 위험성 감소대책 실행 및 개선 여부를 확인하는 경우\n" +
  "나. 현장소장은 해당 작업에 종사하는 근로자를 참여시킬 경우에는 가능한 최소경력 5년 이상의 경력 근로자를 참여시켜 평가를 진행해야 한다.";

const RISK_ASSESSMENT_RULES_BLOCK_4_TEXT =
  "8.1 위험성평가 종류 및 실시시기\n" +
  "가. 최초 위험성평가: 현장소장은 건설공사 실착공일로부터 1개월이 되는 날까지 위험성평가의 대상이 되는 모든 작업공종을 대상으로 최초 위험성평가를 실시해야 한다.\n" +
  "나. 수시 위험성평가: 사업장 건설물의 설치·이전·변경·해체, 기계·기구·설비·원재료 등의 신규 도입 또는 변경, 정비·보수, 작업방법·절차의 신규 도입 또는 변경, 중대산업사고 또는 산업재해(휴업 이상) 발생 등 추가적인 유해·위험요인이 생기는 경우 해당 유해·위험요인에 대해 실시한다. 중대산업사고·산업재해 발생 시에는 작업을 재개하기 전에 실시한다.\n" +
  "다. 정기 위험성평가: 최초 위험성평가 결과의 적정성을 1년마다 정기적으로 재검토(수시 위험성평가 결과가 있으면 함께 재검토)하고, 허용 가능한 수준이 아니라고 검토된 유해·위험요인에 대해서는 위험성 감소대책을 수립하여 실행한다.\n" +
  "라. 상시 위험성평가: 매월 1회 이상 근로자 제안제도·아차사고 확인·순회점검 등을 통해 유해·위험요인을 발굴하여 위험성결정 및 감소대책을 수립·실행하고, 매주 안전보건관리책임자·안전관리자·관리감독자 등이 그 결과를 논의·공유하며, 매 작업일 작업 전 안전점검회의(TBM)를 통해 근로자와 공유한다. 상시평가를 이행하는 경우 수시·정기평가를 실시하지 않을 수 있다.\n\n" +
  "8.2 위험성평가 절차\n" +
  "가. 절차: ① 사전준비 → ② 유해·위험요인 파악 → ③ 위험성 결정 → ④ 위험성 감소대책 수립 및 실행·개선확인 → ⑤ 실시내용 및 결과에 관한 기록 및 보존 (공사금액 1억원 미만인 경우 ①호 생략 가능)\n" +
  "나. 사전준비: 작업표준·작업절차, 기계·기구·설비 사양서·물질안전보건자료(MSDS), 공정 흐름과 작업 주변 환경, 혼재작업의 위험성, 재해사례·재해통계, 작업환경측정결과·건강진단결과, 설계도서·안전보건관계법령 등 안전보건정보를 조사·검토한다.\n" +
  "다. 유해·위험요인 파악: 사업장 순회점검, 근로자 상시 제안, 설문조사·인터뷰, 안전보건 자료(MSDS·작업환경측정·특수건강진단 결과 등), 안전보건 체크리스트 등의 방법 중 하나 이상(특별한 사정이 없으면 순회점검 포함)을 사용한다.\n" +
  "라. 위험성 결정: 파악된 유해·위험요인이 근로자에게 노출되었을 때의 위험성 수준(빈도×강도)을 판단 기준에 따라 결정하고, 허용 가능한 위험성 수준인지 여부를 결정한다.\n" +
  "마. 위험성 감소대책 수립·실행 및 개선확인: 허용 불가위험으로 판단된 경우 ① 위험한 작업의 폐지·변경, 유해·위험물질 대체 등 본질적 제거·저감조치 → ② 연동장치·환기장치·추락 및 낙하물 방지시설 등 공학적 대책 → ③ 작업절차서 정비, 교육·점검 강화 등 관리적 대책 → ④ 개인용 보호구 사용 순으로 대책을 수립·실행하고, 실행 후 위험성이 허용 가능한 수준인지 확인하며, 수준에 이르지 않으면 추가 감소대책을 수립·실행한다. 중대재해 우려가 있어 대책 실행에 많은 시간·비용이 필요한 경우 즉시 잠정조치를 시행하고 대표이사에게 자원을 요청한다. 감소대책 실행 및 개선 여부는 관리감독자와 근로자를 통해 반드시 확인·기록·보존한다.\n" +
  "바. 감소대책 수립 시 우선순위: 위험작업 폐지·대체를 통한 본질적 제거 → 인터록·안전장치·방호문·국소배기장치 등 공학적 저감 → 작업매뉴얼 정비·출입금지/작업허가 등 관리적 방법 → 개인보호구 사용(최종 수단) 순으로 고려한다.\n" +
  "사. 위험성평가의 공유: 근로자가 종사하는 작업과 관련된 유해·위험요인, 위험성 결정 결과, 감소대책과 실행계획·실행여부, 근로자 준수·주의사항 등을 게시·주지하고, 중대재해로 이어질 수 있는 유해·위험요인은 작업 전 안전점검회의(TBM)를 통해 상시 주지시킨다.\n\n" +
  "8.3 위험성평가 방법\n" +
  "빈도(가능성)와 강도(중대성)를 곱하여 위험성의 크기(1~9)를 산출하는 빈도·강도법을 사용한다. [빈도] 1일 1회 이상 빈번=3, 1주일 1회 가끔=2, 3개월 1회 이하 거의 없음=1. [강도] 사망·장애=3, 휴업 필요=2, 치료 불필요=1. 위험성 수준 6~9(고)는 허용 불가능(개선대책 반드시 마련), 3~5(중)는 허용 불가능(공학적·관리적 대책 마련), 1~2(저)는 허용 가능(현재상태 유지 또는 필요시 개선)으로 판정한다. 위험성 결정은 재해사례·안전관계법령 등 객관적 자료와 건설안전 전문가 의견을 반영하여 신중히 한다. 위험성평가서 양식에는 공정명, 유해·위험요인 파악, 개선 전·후 위험성(빈도·강도·위험성), 개선대책, 개선 예정일·완료일, 확인자(관리감독자·근로자) 등을 반드시 포함한다.\n\n" +
  "8.4 위험성평가 교육 및 컨설팅\n" +
  "현장소장은 위험성평가를 실시하는 구성원 전원(안전보건관리책임자, 안전관리자, 관리감독자, 해당 작업 근로자 등)에게 실시 전 2시간 이상 필요한 교육을 실시하고 기록을 유지·관리해야 한다. 교육강사는 안전보건공단·재해예방기관 등 전문기관이나 산업안전지도사·건설안전기술사 등 안전보건전문가에게 위탁할 수 있다. 외부교육 이수자나 관련 전공자는 필요한 부분만 교육하거나 생략할 수 있으며, 산업안전·보건 전문가 또는 전문기관의 컨설팅을 받을 수 있다.\n\n" +
  "8.5 위험성평가 시 유의사항\n" +
  "현장소장(안전보건관리책임자)이 전 과정을 총괄 관리감독하고, 안전관리자는 현장소장을 보좌하며 관리감독자·근로자에게 지도·조언·정보제공을 한다. 관리감독자는 유해위험요인 파악, 위험성 결정, 감소대책 수립·실행, 개선확인, 평가서 공유, 기록보존 등 실무를 수행한다. 기계·기구·설비 관련 평가 시에는 전문지식을 갖춘 사람과 경력 근로자(최소 5년 이상)를 반드시 참여시킨다. 안전보건관리자 선임의무가 없는 현장은 관리감독자 등을 지정하여 해당 역할을 수행하게 한다. 산업안전보건공단 위험성평가 지원시스템(kras.kosha.or.kr)을 활용할 수 있으며, 과거 사망재해 사례와 아차사고, 산업안전보건기준에 관한 규칙 반영 사항은 반드시 포함한다. 개선대책 실행 후에는 관리감독자와 근로자가 개선여부를 확인·서명하고 차기 평가에 반영(Feed-back)한다. 감소대책 수립 시에는 새로운 위험성 발생 여부, 근거 불분명한 조치로 위험성을 낮게 판단하지 않는지, 작업성·생산성·품질에 지장이 없는지를 확인하고, 현장의 노하우와 아이디어를 적극 활용한다.";

const RISK_ASSESSMENT_RULES_BLOCK_5_TEXT =
  "9. 점검 및 개선활동\n" +
  "가. 위험성평가의 이행에 대한 점검은 위험성평가 담당자(관리감독자, 안전관리자, 근로자) 및 이행책임자(현장소장)가 수시로 확인하여야 한다.\n" +
  "나. 이행 점검결과 미이행 사항이나 추가적 유해·위험요인이 발견된 경우 즉시 시정조치를 하여야 하며, 시정조치 내용은 차기 위험성평가에 반영되도록 하여야 한다.\n\n" +
  "10. 기록 및 보존\n" +
  "현장소장은 산업안전보건법 제36조제3항에 따라 위험성평가의 결과와 조치사항을 기록·보존할 때 다음 사항을 포함하여야 하며, 위험성평가를 완료한 날부터 3년간 보존해야 한다.\n" +
  "① 위험성평가 대상의 유해·위험요인\n" +
  "② 위험성 결정의 내용\n" +
  "③ 위험성 결정에 따른 조치의 내용\n" +
  "④ 위험성평가를 위해 사전조사한 안전보건정보\n" +
  "⑤ 그 밖에 건설현장에서 필요하다고 정한 사항";

const RISK_ASSESSMENT_RULES_FORM_1_TEXT =
  "【서식 1】 위험성평가 교육일지\n" +
  "교육대상: 위험성평가 참여자(현장소장, 관리감독자, 근로자 등)\n" +
  "교육내용: 1. 위험성평가를 위한 사업주의 방침과 목표  2. 위험성평가 추진방법 및 내용  3. 위험성평가 절차(사전준비→유해위험요인 파악→위험성 결정→개선대책 수립·실행)  4. 기록  5. 위험성평가 실시시기 및 범위 등\n" +
  "기재항목: 현장명, 교육장소, 교육일시, 교육강사, 참여자 직책·성명·서명, 사진\n" +
  "※ 실제 교육 실시 시 현장에서 작성하여 첨부하는 서식입니다.";

const RISK_ASSESSMENT_RULES_FORM_2_TEXT =
  "【서식 2】 위험성평가 회의록\n" +
  "평가종류: 최초위험성평가\n" +
  "안건: 위험성평가 실시규정 및 최초위험성평가서 작성 등\n" +
  "협의사항: 1. 위험성평가 실시규정의 검토·작성  2. 위험성평가 실시에 따른 책임과 역할 부여  3. 단위 공종별 유해위험요인 파악 및 위험성 결정  4. 개선대책 강구, 대책 실행방법 및 확인  5. 기록의 유지  6. 위험성평가 관련 관심사항 토론 등\n" +
  "기재항목: 현장명, 회의장소, 회의일시, 참여자 직책·성명·서명, 사진\n" +
  "※ 실제 회의 실시 시 현장에서 작성하여 첨부하는 서식입니다.";

function buildRiskAssessmentRulesNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk_assessment_rules">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  07
                </span>
<span class="group-hover:text-neutral-900">위험성평가 실시규정</span>
</div>
</a>
`;
}

function buildRiskAssessmentRulesSectionHtml(params: { projectTitle: string; reviewerDefaultName: string }): string {
  const { projectTitle, reviewerDefaultName } = params;

  const editableFieldsHtml = [
    raRField("wizard-field-rar-site-name", "현장명", projectTitle),
    raRField("wizard-field-rar-issue-date", "제·개정일", "", { type: "date" }),
    raRField("wizard-field-rar-approver-name", "승인자(대표이사) 성명", "", { placeholder: "대표이사 성명" }),
    raRField("wizard-field-rar-reviewer-name", "검토자(현장대리인) 성명", reviewerDefaultName),
    raRField("wizard-field-rar-preparer-name", "작성자(안전관리자) 성명", "", { placeholder: "안전관리자 성명" }),
    raRField("wizard-field-rar-participant-note", "참여자(근로자)", "참여예정"),
    raRField("wizard-field-rar-org-general-name", "조직 - 공무팀장 성명", ""),
    raRField("wizard-field-rar-org-construction-name", "조직 - 공사팀장(관리감독자 겸임) 성명", ""),
    raRField("wizard-field-rar-org-quality-name", "조직 - 품질팀장 성명", ""),
  ].join("\n");

  const readonlyBlocksHtml = [
    raRReadonlyBlock("1~3. 목적·적용범위·용어의 정의", RISK_ASSESSMENT_RULES_BLOCK_1_TEXT),
    raRReadonlyBlock("4~5. 조직의 구성·역할과 책임", RISK_ASSESSMENT_RULES_BLOCK_2_TEXT),
    raRReadonlyBlock("6~7. 실시주체 및 평가대상·근로자 참여", RISK_ASSESSMENT_RULES_BLOCK_3_TEXT),
    raRReadonlyBlock("8. 위험성평가의 실시 (종류·시기/절차/방법/교육/유의사항)", RISK_ASSESSMENT_RULES_BLOCK_4_TEXT),
    raRReadonlyBlock("9~10. 점검 및 개선활동·기록 및 보존", RISK_ASSESSMENT_RULES_BLOCK_5_TEXT),
    raRReadonlyBlock("서식 1. 위험성평가 교육일지 (양식 안내)", RISK_ASSESSMENT_RULES_FORM_1_TEXT),
    raRReadonlyBlock("서식 2. 위험성평가 회의록 (양식 안내)", RISK_ASSESSMENT_RULES_FORM_2_TEXT),
  ].join("\n");

  return `<!-- ════════ SECTION: 위험성평가 실시규정 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-risk_assessment_rules">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅶ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">위험성평가 실시규정</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">산업안전보건법 제36조에 따른 위험성평가 실시규정 전문(붙임1)과 서식 2종입니다. 대부분 법정 표준 문구라 그대로 다운로드 문서에 포함되고, 제·개정일과 담당자 성명 등 몇 가지만 입력하면 됩니다. 분량이 많아 팝업에서 작성합니다.</p>
<button type="button" data-open-modal="risk-assessment-rules" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition">
<span class="material-symbols-outlined text-sm">edit_document</span>
위험성평가 실시규정 작성하기
</button>
</div>
<div data-modal="risk-assessment-rules" data-modal-backdrop="risk-assessment-rules" class="hidden fixed inset-0 z-[70] bg-black/50 flex justify-center p-4 md:p-8 overflow-y-auto">
<div class="relative bg-white w-full max-w-3xl rounded-2xl shadow-xl my-4 md:my-8">
<div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
<h3 class="font-headline font-bold text-sm text-neutral-900">위험성평가 실시규정 (붙임1) 작성</h3>
<button type="button" data-modal-close="risk-assessment-rules" class="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500">
<span class="material-symbols-outlined text-lg">close</span>
</button>
</div>
<div class="p-6 space-y-5">
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
${editableFieldsHtml}
</div>
<div class="border-t border-neutral-200 pt-5 space-y-4">
<p class="text-[11px] text-neutral-400">아래 규정 전문은 법정 표준 문구로 읽기 전용입니다(수정 불가). 그대로 다운로드 문서(붙임1)에 포함됩니다.</p>
${readonlyBlocksHtml}
</div>
</div>
<div class="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-3 flex justify-end rounded-b-2xl">
<button type="button" data-modal-close="risk-assessment-rules" class="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition">완료</button>
</div>
</div>
</div>
</section>
`;
}

export function buildWizardHtml(
  doc: WizardDocRow,
  announcement: WizardAnnouncementRow,
  pdfOverview: PdfOverview | undefined,
  member?: WizardMemberRow,
  viewerIsAdmin?: boolean,
  agencyTemplate?: AgencyTemplateRow | null,
  availableTemplates?: { id: string; name: string }[],
  safetyPolicyImageUrl?: string | null
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

  // "서식 가이드 검토" 버튼: 실제로는 나라장터 공고문 원문 PDF(발주처가 배포한 실
  // 첨부파일)를 새 탭에서 열어준다. 공고 연동 문서가 아니거나 PDF 첨부가 없으면
  // 버튼 자체를 표시하지 않는다(가짜로 눌리는 버튼을 두지 않기 위함).
  const announcementPdfUrl = announcement ? pickAnnouncementPdf(announcement.attachments) : null;
  const announcementPdfLinkHtml = announcementPdfUrl
    ? `<a href="${escapeHtml(announcementPdfUrl)}" target="_blank" rel="noopener noreferrer" class="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition shadow-xs"><span class="material-symbols-outlined text-base text-neutral-500">menu_book</span>공고문 원문 보기</a>`
    : "";

  const constructionType = classifyConstructionType(doc.title ?? "");
  const scaleField = scaleFieldFor(constructionType);
  // 위험성평가 행은 실제로 추가·삭제·수정 가능한 데이터라서 documents.content.riskRows에
  // 저장된 실제 값을 사용한다(없으면 자동분류 공종의 표준 3항목을 출발점으로 보여줌 —
  // wizard/page.tsx가 첫 로드 시 이 출발점 값을 그대로 content에 저장해 둔다).
  const riskRows = ((doc.content?.riskRows as RiskRow[] | undefined) ?? buildInitialRiskRows(constructionType));
  const riskRowsHtml = buildRiskRowsHtml(riskRows);
  const riskRowTemplateHtml = buildRiskRowTemplateHtml();
  const riskDbSelectHtml = buildRiskLibrarySelectHtml();
  const riskFilterTabsHtml = buildRiskFilterTabsHtml(riskRows);

  const adminReturnLinkHtml = viewerIsAdmin
    ? `<a href="/admin" class="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 transition-colors"><span class="material-symbols-outlined text-sm">admin_panel_settings</span>관리자 화면으로</a>`
    : "";

  // 발주처 표준서식(agency_templates)에 정의된 추가 목차/입력항목 — 항상 공통 6대
  // 목차 "뒤"에 이어붙여서, 기존 필드들의 DOM 순서(자동저장 인덱스 기준)가 절대
  // 바뀌지 않도록 한다.
  const templateSections = agencyTemplate?.sections ?? [];
  const disabledCommonSections = agencyTemplate?.disabled_common_sections ?? [];
  const visibleCommonCount = 6 - disabledCommonSections.length;
  const templateSectionsHtml = buildTemplateSectionsHtml(templateSections);
  // 공통 6대 목차의 01~06 배지는 고정 텍스트라 일부를 꺼도 다시 매겨지지 않으므로,
  // 추가 목차 번호는 (꺼진 개수와 무관하게) 항상 7부터 시작해 배지 번호가 절대
  // 겹치지 않게 한다.
  const templateTocHtml = buildTemplateTocHtml(templateSections, 7);
  const totalSectionCount =
    visibleCommonCount +
    templateSections.length +
    (agencyTemplate?.show_management_policy ? 1 : 0) +
    (agencyTemplate?.show_org_chart ? 1 : 0) +
    (agencyTemplate?.show_role_responsibilities ? 1 : 0) +
    (agencyTemplate?.show_education_plan ? 1 : 0) +
    (agencyTemplate?.show_risk_assessment_rules ? 1 : 0);

  // 표준서식 선택 드롭다운: 이 문서의 발주처(agency)에 실제로 등록된 표준서식이
  // 있을 때만 선택지를 보여준다(현재는 LH만 프로토타입으로 등록됨). 선택을
  // 바꾸면 WizardScreen이 PATCH 후 새로고침해 여기서 만든 추가 섹션을 반영한다.
  const templateOptions = availableTemplates ?? [];
  const selectedTemplateId = doc.template_id ?? "";
  const templateSelectHtml =
    templateOptions.length > 0
      ? `<select aria-label="발주처 표준 서식 선택" data-template-select class="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary">
<option value=""${selectedTemplateId ? "" : " selected"}>${agencyName} 표준 서식 (공통)</option>
${templateOptions
  .map(
    (t) =>
      `<option value="${escapeHtml(t.id)}"${t.id === selectedTemplateId ? " selected" : ""}>${escapeHtml(t.name)}</option>`
  )
  .join("\n")}
</select>`
      : `<span aria-label="발주처 표준 서식" class="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-neutral-400">description</span>${agencyName} 표준 서식</span>`;

  // "안전보건 경영방침 및 목표": 회사별로 이미지 첨부/표준 문구 중 어느 쪽을 쓰는지,
  // 이미지가 있다면 그 URL은 documents.content.safetyPolicy에 저장되고, 페이지 서버
  // 컴포넌트가 매번 새 서명 URL을 만들어 safetyPolicyImageUrl로 넘겨준다.
  const safetyPolicyRaw = (doc.content?.safetyPolicy ?? {}) as { mode?: string; imagePath?: string };
  const safetyPolicyMode: "image" | "standard" = safetyPolicyRaw.mode === "image" ? "image" : "standard";
  const managementPolicyNavHtml = agencyTemplate?.show_management_policy ? buildManagementPolicyNavHtml() : "";
  const managementPolicySectionHtml = agencyTemplate?.show_management_policy
    ? buildManagementPolicySectionHtml({
        companyName: member?.company ?? "",
        mode: safetyPolicyMode,
        imageUrl: safetyPolicyImageUrl ?? null,
        imagePath: safetyPolicyRaw.imagePath ?? "",
        slogan: "안전보건 경영시스템 정착 : 재해없는 일터/행복하고 건강한 일터",
        goal: "중대재해 ZERO, 일반재해 3건",
      })
    : "";
  const orgChartNavHtml = agencyTemplate?.show_org_chart ? buildOrgChartNavHtml() : "";
  const orgChartSectionHtml = agencyTemplate?.show_org_chart ? buildOrgChartSectionHtml() : "";
  const roleResponsibilitiesNavHtml = agencyTemplate?.show_role_responsibilities
    ? buildRoleResponsibilitiesNavHtml()
    : "";
  const roleResponsibilitiesSectionHtml = agencyTemplate?.show_role_responsibilities
    ? buildRoleResponsibilitiesSectionHtml()
    : "";
  const educationPlanNavHtml = agencyTemplate?.show_education_plan ? buildEducationPlanNavHtml() : "";
  const educationPlanSectionHtml = agencyTemplate?.show_education_plan ? buildEducationPlanSectionHtml() : "";
  const riskAssessmentRulesNavHtml = agencyTemplate?.show_risk_assessment_rules
    ? buildRiskAssessmentRulesNavHtml()
    : "";
  // projectTitle/memberName은 이미 escapeHtml()이 적용된 채로 템플릿에 raw 삽입되는
  // 값이라, escapeHtmlPolicy()를 한 번 더 거치는 raRField()에 그대로 넘기면 "&" 등이
  // 이중 이스케이프된다 — 여기서는 원본 값을 따로 계산해서 넘긴다.
  const riskAssessmentRulesSectionHtml = agencyTemplate?.show_risk_assessment_rules
    ? buildRiskAssessmentRulesSectionHtml({
        projectTitle: (doc.title ?? "").replace(/\s*계획서$/, "").trim() || "안전보건관리계획서",
        reviewerDefaultName: member?.name?.trim() || "",
      })
    : "";

  let html = HTML_documents_wizard
    .replace("__ADMIN_RETURN_LINK__", adminReturnLinkHtml)
    .replace("__ANNOUNCEMENT_PDF_LINK__", announcementPdfLinkHtml)
    .replace("__TEMPLATE_SELECT__", templateSelectHtml)
    .replace("__TEMPLATE_TOC_ITEMS__", templateTocHtml)
    .replace("__TEMPLATE_SECTIONS__", templateSectionsHtml)
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${managementPolicyNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${orgChartNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${roleResponsibilitiesNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${educationPlanNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-attachments">',
      `${riskAssessmentRulesNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-attachments">`
    )
    .replace("6개 대분류", `${totalSectionCount}개 대분류`)
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
    .replace("LH 적격심사 가점 요건 충족", `${agencyName} 적격심사 가점 요건 충족`)
    .replace("발주처(LH) 안전관리 가이드라인 2025 개정판 연동 중:", `발주처(${agencyName}) 안전관리 가이드라인 연동 중:`)
    .replace('value="화성태안3지구 복합커뮤니티센터 신축공사"', `value="${projectTitle}"`)
    .replace('value="한국토지주택공사 화성사업본부"', `value="${agencyName}"`)
    .replace("LH 공사계약 일반조건 필수 구비 서류 (조직표 자동 랜더링)", `${agencyName} 공사계약 일반조건 필수 구비 서류 (조직표 자동 랜더링)`)
    // 공사기간은 실제로는 "착공일로부터 90일" 같은 자유서식 문구로 공고되는 경우가
    // 대부분이라(정확한 시작/종료일이 별도 필드로 나오지 않음), 두 개의 date input을
    // 하나의 텍스트 입력으로 바꿔 공고문 PDF에서 뽑은 원문 그대로 보여준다.
    .replace(
      '<input id="wizard-field-period-start" class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2025-04-01"/>\n<span class="text-neutral-400 text-xs">~</span>\n<input id="wizard-field-period-end" class="text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-800 flex-1" type="date" value="2026-09-30"/>\n<span class="text-[11px] text-neutral-500 whitespace-nowrap font-medium">(18개월)</span>',
      `<input id="wizard-field-period" class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="${contractPeriod}" placeholder="공고문 자동분석 결과가 없어 직접 입력이 필요합니다"/>`
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
<textarea id="wizard-field-main-content" class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" rows="2" placeholder="공고문 자동분석 결과가 없어 직접 입력이 필요합니다">${mainContent}</textarea>
</div>
</div>
</div>
</section>
${managementPolicySectionHtml}${orgChartSectionHtml}${roleResponsibilitiesSectionHtml}${educationPlanSectionHtml}<!-- ════════ SECTION Ⅱ: 안전보건관리체계 및 위험성평가 ════════ -->`
    )
    .replace(
      '<!-- ════════ SECTION Ⅵ: 기타사항 및 별첨문서 선택 (부록) ════════ -->',
      `${riskAssessmentRulesSectionHtml}<!-- ════════ SECTION Ⅵ: 기타사항 및 별첨문서 선택 (부록) ════════ -->`
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

  html = html
    .replace("__RISK_FILTER_TABS__", riskFilterTabsHtml)
    .replace("__RISK_DB_SELECT__", riskDbSelectHtml)
    .replace("__RISK_ROWS__", riskRowsHtml)
    .replace("__RISK_ROW_TEMPLATE__", riskRowTemplateHtml);

  if (disabledCommonSections.length > 0) {
    html = removeDisabledCommonSections(html, disabledCommonSections);
  }

  html = applyOverviewLabel(html, agencyTemplate?.overview_label);
  if (agencyTemplate?.show_cover_nav) {
    html = insertCoverNavAndSection(html);
  }
  if (agencyTemplate?.section_order?.length) {
    const extraLabels = Object.fromEntries(templateSections.map((s) => [s.id, s.label]));
    // 소제목 목록에는 로마숫자를 다시 넣지 않으므로(대제목에서 한 번만 보여줌),
    // 공통 섹션의 원래 라벨("Ⅰ. 사업개요 및 기본정보" 등)에서 로마숫자 접두어를
    // 뗀 순수 제목만 쓴다. overview는 overview_label로 이미 재정의됐으면 그 값을 쓴다.
    const commonLabels: Record<string, string> = Object.fromEntries(
      COMMON_SECTIONS.map((s) => [s.key, s.label.replace(/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]\.\s*/, "")])
    );
    if (agencyTemplate.overview_label?.trim()) commonLabels.overview = agencyTemplate.overview_label.trim();
    commonLabels["management-policy"] = "안전보건 경영방침 및 목표";
    commonLabels.org_chart = "안전보건관리 조직구성";
    commonLabels.role_responsibilities = "구성원별 안전보건 관리 역할";
    commonLabels.education_plan = "안전보건교육 계획";
    commonLabels.risk_assessment_rules = "위험성평가 실시규정";
    html = applySectionOrder(html, agencyTemplate.section_order, extraLabels, commonLabels);
  }

  return html;
}
