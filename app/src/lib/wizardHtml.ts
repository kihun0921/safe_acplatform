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

export type WizardMemberRow = { name: string; company: string; ceoName?: string } | null;

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
<label class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft border border-primary/20 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary/10 transition" title="현장설명서·공사개요 PDF에서 공정 목록을 자동으로 뽑아 행으로 추가합니다">
<span class="material-symbols-outlined text-base" data-icon="upload_file">upload_file</span>
<span data-process-extract-label-text>현장설명서/공사개요 첨부해 공정 자동추출</span>
<input accept="application/pdf" class="hidden" data-process-extract-input type="file"/>
</label>
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
<table class="min-w-[1320px] text-left text-xs border-collapse" data-risk-table>
<thead>
<tr class="bg-neutral-100 text-neutral-700 border-b border-neutral-200 font-semibold">
<th class="p-3 w-12 text-center">No</th>
<th class="p-3 w-28">세부공정명</th>
<th class="p-3 w-20">위험분류</th>
<th class="p-3 min-w-[180px]">유해·위험요인</th>
<th class="p-3 min-w-[160px]">현재의 안전보건조치</th>
<th class="p-3 w-14 text-center">빈도</th>
<th class="p-3 w-14 text-center">강도</th>
<th class="p-3 w-14 text-center">위험성</th>
<th class="p-3 min-w-[200px]">위험성 감소대책</th>
<th class="p-3 w-16 text-center">개선후 위험성</th>
<th class="p-3 w-20">개선예정일</th>
<th class="p-3 w-20">개선완료일</th>
<th class="p-3 w-24">개선여부확인</th>
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
<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">선택항목 1 / 2 활성화</span>
</div>
<div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
<!-- Card 1: 건설기계·장비 안전관리 (ON) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-white hover:border-neutral-300 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-primary-soft text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="precision_manufacturing">precision_manufacturing</span>
</span>
<span class="text-xs font-bold text-neutral-900">1. 건설기계·장비 안전검사 관리</span>
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
<!-- Card 2: 협력업체 안전보건 협의체 (OFF - Disabled State) -->
<div class="rounded-xl border border-neutral-200 p-4 bg-neutral-50/70 opacity-75 hover:opacity-100 transition">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2">
<span class="w-7 h-7 rounded bg-neutral-200 text-neutral-500 flex items-center justify-center">
<span class="material-symbols-outlined text-lg" data-icon="groups">groups</span>
</span>
<span class="text-xs font-bold text-neutral-600">2. 하도급 협력업체 협의체 운영</span>
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

// 박스+연결선 형태의 조직도/비상대책반 다이어그램에 쓰는 공용 박스 한 칸.
// findLabel()(wizardExport.ts)은 입력요소의 조상 중 "직계 자식"으로 <label>을
// 가진 첫 조상을 찾으므로, 역할명을 <p>로만 적으면 라벨이 매칭되지 않아 (전용
// 추출 함수 없이 범용 경로를 타는 다이어그램의 경우) 다운로드 문서에서 성명·
// 연락처 값이 통째로 누락된다 — 성명/연락처 입력을 각각 별도 wrapper로 감싸고
// 그 안에 (숨김) <label>을 직계 자식으로 둔다.
function buildDiagramBoxHtml(idPrefix: string, key: string, role: string): string {
  const roleOneLine = role.replace(/\n/g, " ");
  return `<div class="border-2 border-neutral-300 rounded-lg bg-white px-3 py-2 text-center shadow-xs min-w-[150px]">
<p class="text-[11px] font-bold text-neutral-800 whitespace-pre-line leading-tight mb-1.5">${escapeHtmlPolicy(
    role
  )}</p>
<div class="mb-1">
<label class="sr-only" for="wizard-field-${idPrefix}-${key}-name">${escapeHtmlPolicy(roleOneLine)} 성명</label>
<input id="wizard-field-${idPrefix}-${key}-name" data-org-diagram-field class="w-full text-xs text-center border border-neutral-300 rounded px-2 py-1" type="text" placeholder="성명"/>
</div>
<div>
<label class="sr-only" for="wizard-field-${idPrefix}-${key}-contact">${escapeHtmlPolicy(roleOneLine)} 연락처</label>
<input id="wizard-field-${idPrefix}-${key}-contact" data-phone-format data-org-diagram-field class="w-full text-xs text-center border border-neutral-300 rounded px-2 py-1" type="text" inputmode="numeric" placeholder="연락처"/>
</div>
</div>`;
}
const DIAGRAM_V_LINE = `<div class="w-px h-4 bg-neutral-300 mx-auto"></div>`;

// "안전보건관리 조직구성"(현장 조직도) — 직책은 실제 표준 조직도 그대로 고정값이고
// 성명·연락처만 입력할 수 있다. 다운로드 문서는 wizardExport.ts의 extractOrgChartData가
// wizard-field-org-* 고정 id로 직접 읽어 별도 박스+연결선 다이어그램을 그리므로(이
// 섹션은 export route의 excludeIds에 포함되어 범용 표 추출을 타지 않음), 화면
// 쪽도 표 대신 같은 박스+연결선 다이어그램으로 보여준다.
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
  const [siteManager, safetyManager, supervisor, team1, team2] = ORG_CHART_ROLES;

  const orgDiagram = `<div class="flex flex-col items-center gap-0 py-2">
${buildDiagramBoxHtml("org", siteManager.key, siteManager.role)}
${DIAGRAM_V_LINE}
${buildDiagramBoxHtml("org", safetyManager.key, safetyManager.role)}
${DIAGRAM_V_LINE}
${buildDiagramBoxHtml("org", supervisor.key, supervisor.role)}
${DIAGRAM_V_LINE}
<div class="flex flex-wrap justify-center gap-4">
${buildDiagramBoxHtml("org", team1.key, team1.role)}
${buildDiagramBoxHtml("org", team2.key, team2.role)}
</div>
</div>`;

  return `<!-- ════════ SECTION: 안전보건관리 조직구성 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-org_chart">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅰ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건관리 조직구성</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">현장 사업소 조직도(임무 및 비상연락망 포함) — 직책은 표준 조직도에 맞춰 고정되어 있고, 성명·연락처만 입력하면 됩니다.</p>
${orgDiagram}
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

// "유해·위험 기계·기구·물질의 방호조치 및 관리계획" — 실제 LH 샘플(화성동탄(2),
// 40~90p)은 기계·기구/차량계 건설기계·하역운반기계/유해·위험물질(MSDS) 3개
// 카테고리마다 (1) 항목별 체크리스트 개요표 + (2) 항목 하나하나의 세부실행계획
// 페이지로 구성돼 있다(경쟁사 서식처럼 표 하나에 다 욱여넣지 않음). 분량이
// 항목당 1페이지씩이라 위저드에는 개요표만 두고, 항목별 "상세 작성" 버튼을
// 누르면 그 항목 전용 팝업(모달)에서 세부실행계획(항목마다 4칸 + 관계법령
// 비고)을 작성하도록 한다 — 위험성평가 실시규정과 같은 팝업 패턴이지만, 이번엔
// 팝업이 섹션당 하나가 아니라 "항목마다 하나"다.
type HazardItem = {
  key: string;
  name: string;
  safetyCheck: string;
  ppe: string;
  education: string;
  etc: string;
  note: string;
};

type HazardSubstanceItem = {
  key: string;
  name: string;
  ppe: string;
  education: string;
  signage: string;
  etc: string;
  note: string;
};

const HAZARD_MACHINERY_ITEMS: HazardItem[] = [
  {
    key: "grinder",
    name: "핸드그라인더",
    safetyCheck:
      "1. 방호장치(덮개) 안전시설 설치\n2. 현장소장, 관리감독자에 의해 매일 작업 전 숫돌 날의 비산을 방지하기 위한 방호장치(덮개)의 적정설치 여부(180도 이내) 등을 반드시 점검\n3. 작업불편 등의 이유로 덮개를 해체하여 사용하는 경향이 있으나 해체사용 절대 금지하도록 점검 및 교육 철저\n4. 방호장치인 덮개의 고장, 훼손, 파손, 기능상실 및 숫돌의 마모상태, 안전사용 상태 등 매월 1회 이상 점검 및 이상발견 시 필요한 조치",
    ppe:
      "1. 보호구 지급 관리대장 운영\n2. 작업 중 관리감독자 등에 의해 보호구 착용 상태의 수시 확인점검 및 미착용 근로자 착용조치(불응 시 퇴출조치)\n3. 작업 시작 전 관리감독자(작업반장 등)에 의해 TBM 점검 등을 통하여 보호구 적정 지급 및 착용상태(보안경, 안전화, 안전모, 안전장갑, 방진마스크 등)를 반드시 확인한 후 작업\n4. 작업불편에 의한 착용기피 절대 금지, 미착용 근로자에 대해서는 작업배제",
    education:
      "1. 기초안전보건교육, 연삭기 취급근로자에 대해서 안전사용방법, 보호구 착용방법 착용중요성, 기능, 보호능력 등에 대하여 관계근로자 교육실시\n2. 취급근로자 정기·특별·일일교육 등 법정교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험성평가 반드시 반영\n3. 연삭기 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리\n4. 시정조치 불응 근로자 퇴출조치",
    note: "산업안전보건기준에 관한 규칙 187조·32조 / 산업안전보건법 29조",
  },
  {
    key: "cutter",
    name: "고속절단기",
    safetyCheck:
      "1. 방호장치(덮개) 안전시설 설치\n2. 현장소장, 관리감독자에 의해 매일 작업 전 방호장치(덮개)의 적정설치 여부(180도 이내) 등을 반드시 점검\n3. 작업불편 등의 이유로 덮개를 해체하여 사용하는 경향이 있으나 해체사용 절대 금지하도록 점검 및 교육 철저\n4. 방호장치인 덮개의 고장, 훼손, 파손, 기능상실 및 숫돌의 마모상태, 안전사용상태 등 매월 1회 이상 점검 및 이상발견 시 필요한 조치",
    ppe:
      "1. 보호구 지급 관리대장 운영\n2. 작업 중 관리감독자 등에 의해 보호구 착용 상태의 수시 확인점검 및 미착용 근로자 착용조치(불응 시 퇴출조치)\n3. 작업 시작 전 관리감독자(작업반장 등)에 의해 TBM 점검 등을 통하여 보호구 적정 지급 및 착용상태(보안경, 안전화, 안전모, 안전장갑, 방진마스크 등)를 반드시 확인한 후 작업\n4. 작업불편에 의한 착용기피 절대 금지, 미착용 근로자에 대해서는 작업배제",
    education:
      "1. 기초안전보건교육, 취급근로자에 대해서 안전사용방법, 보호구 착용방법 착용중요성, 기능, 보호능력 등에 대하여 관계근로자 교육실시\n2. 취급근로자 정기·특별·일일교육 등 법정교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험성평가 반드시 반영\n3. 마모상태, 시험운전 여부 등을 사용 전에 반드시 점검\n4. 작업 중 사용회전속도 초과금지, 덮개 해체상태 등을 수시 확인점검. 이상 발견 시 덮개 재설치, 정비 등 필요한 조치\n5. 시정조치 불응 근로자 퇴출조치",
    note: "산업안전보건기준에 관한 규칙 187조·32조 / 산업안전보건법 29조",
  },
  {
    key: "welder",
    name: "용접기",
    safetyCheck:
      "1. 방호장치(자동전격방지장치) 안전시설 설치\n2. 현장소장, 관리감독자에 의해 매일 작업 전 방호장치(자동전격방지장치)의 설치 및 정상작동 여부 등을 점검\n3. 방호장치인 자동전격방지장치의 고장, 훼손, 파손, 기능상실 발생 시 즉시 신규제품 교체설치",
    ppe:
      "1. 보호구(용접장갑, 보안경, 보안면, 보호의 등) 지급 및 관리대장 운영\n2. 작업 중 관리감독자 등에 의해 보호구 착용 상태의 수시 확인점검 및 미착용 근로자 착용조치(불응 시 퇴출조치)\n3. 작업 시작 전 관리감독자(작업반장 등)에 의해 TBM 점검 등을 통하여 보호구 적정 지급 및 착용상태 등을 반드시 확인한 후 작업\n4. 작업불편에 의한 착용기피 절대 금지, 미착용 근로자에 대해서는 작업배제",
    education:
      "1. 기초안전보건교육, 취급근로자에 대해서 안전사용방법, 보호구 착용방법 착용중요성, 기능, 보호능력 등에 대하여 관계근로자 교육실시\n2. 취급근로자 정기·특별·일일교육 등 법정교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험성평가 반드시 반영\n3. 누전차단기, 접지, 가설전선 피복 손상 유무 등 작업 전 반드시 점검하고 이상 발견 시 정비 등 즉시 필요한 조치\n4. MSDS 자료 및 경고표지 부착",
    note: "산업안전보건기준에 관한 규칙 187조·32조 / 산업안전보건법 29조",
  },
  {
    key: "rebar-bender",
    name: "철근 절곡기",
    safetyCheck:
      "1. 동력전달 구동부에 덮개 또는 울, 비상정지스위치 등의 방호장치 설치 후 작업\n2. 현장소장, 관리감독자에 의해 매일 사용 전·중·후 덮개 또는 울, 비상정지 스위치 등의 적정설치 여부와 해체 여부를 수시 점검하고, 작업불편 등의 이유로 덮개를 해체하여 사용하는 경향이 없도록 철저하게 관리\n3. 덮개 또는 울의 고장, 훼손, 파손, 기능상실, 안전사용 상태 등 매월 1회 이상 점검 및 이상발견 시 필요한 조치",
    ppe:
      "1. 보호구(안전화, 안전모, 귀마개 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 보호구 착용 상태의 수시 확인점검 및 미착용 근로자 반드시 착용 조치\n3. 작업 불편에 의한 착용기피 현상이 있으므로 미착용 근로자 없도록 철저하게 관리(불응 시 퇴출조치)",
    education:
      "1. 철근절곡기 취급근로자에 대해서 안전사용방법, 방호장치의 종류 및 기능, 보호구 착용방법, 보호능력 등에 대하여 일일교육, 정기교육, 특별교육 등 법정교육 반드시 실시\n2. 매일 작업 시작 전 TBM 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험점에서 근접작업 금지조치\n3. 비정상 작업 시 전원차단 조치\n4. 전원케이블의 손상여부 확인\n5. 전원 연결 시 누전차단기 설치 및 접지 상태를 확인\n6. 회전체 등 위험부분 근접작업 금지\n7. 조정 또는 준비 작업 중 풋 스위치에서 발을 제거 후 작업\n8. 불량품, 이물질 제거작업 시 전원차단\n9. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건법 제35조·규칙 105조·106조 / 산업안전보건기준에 관한 규칙 32조 / 산업안전보건법 29조·규칙 제92조",
  },
  {
    key: "hand-breaker",
    name: "핸드브레이커\n(햄머드릴)",
    safetyCheck:
      "1. 안전 방호시설 설치\n2. 관리감독자, 현장소장에 의해 핸드브레이커 반입 시 금속제 외함 접지설치상태, 정상 작동상태 등 작업 전에 반드시 점검확인하고, 정상적으로 작동되지 않은 장비에 대해서는 절대 반입사용 금지, 정비 조치\n3. 사용 중에도 관리감독자에 의해 매일 수시 순회점검을 통하여 안전하게 사용하고 있는지의 여부를 확인하고, 불안전하게 사용 시에는 즉시 개선조치 시행",
    ppe: "1. 보호구(안전장갑, 안전모, 보안경 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 현장소장에 의해 안전사용방법 등에 대해서 TBM, 위험성평가 내용 등을 주지\n4. 취급 근로자에 대해서 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 작업 시 작업지휘자 배치\n3. 현장소장은 작업 시작 전까지 작업장 및 작업통로의 장애물 방치상태, 정리정돈 상태 등 점검\n4. 안전장갑, 안전모 등 보호구 지급 및 착용조치",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "air-compressor",
    name: "에어 콤프레샤\n(공기압축기)",
    safetyCheck:
      "1. 공기압력 자동조절기, 안전밸브, 회전부위 덮개 또는 울 등의 방호장치에 대해 작업시작 전 점검\n2. 현장소장, 관리감독자에 의해 매일 방호장치 정상기능 유지상태, 호스 바닥 방치상태, 오일량, 안전사용상태, 원동기·축이음·벨트·풀리의 회전 부위에 덮개 또는 울 등 설치상태 등을 수시 확인 및 이상 발견 시 즉시 필요한 조치",
    ppe:
      "1. 보호구(안전화, 안전모, 방진마스크 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 보호구 착용 상태의 수시 확인점검 및 미착용 근로자 반드시 착용 조치\n3. 작업 불편에 의한 착용기피 현상이 있으므로 미착용 근로자 없도록 철저하게 관리(불응 시 퇴출조치)",
    education:
      "1. 공기압축기 취급근로자에 대해서 안전사용방법, 방호장치의 종류 및 기능, 보호구 착용방법, 보호능력 등에 대하여 일일교육, 정기교육, 특별교육 등 법정교육 반드시 실시\n2. 매일 작업 시작 전 TBM 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 소음 진동유무 확인 및 조치\n3. 호스 밟지 않도록 정리정돈, 안전통로 확보, 운전자 주의운전\n4. 화물자동차 후진 시 충돌 예방위해 유도 신호수 배치\n5. 회전체 등 위험부분 덮개 반드시 설치\n6. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건법 제35조·규칙 87조 / 산업안전보건기준에 관한 규칙 32조 / 산업안전보건법 29조·규칙 제92조",
  },
];

const HAZARD_VEHICLE_ITEMS: HazardItem[] = [
  {
    key: "forklift",
    name: "지게차\n(하역운반기계)",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 관리감독자, 현장소장, 안전관리자 등에 의해 지게차 등 하역운반기계의 사용 전 방호장치(전조등, 후미등, 헤드가드, 후진경보기, 경광등, 백레스트, 안전대 등)를 적절하게 갖추었는지, 정상기능이 유지되는지를 반드시 작업 전에 점검확인하고, 갖추지 않은 하역운반기계에 대해서는 절대 반입금지 조치\n3. 관리감독자 등에 의해 지게차 등 하역운반기계 사용 중에도 방호장치의 해체 여부, 정상기능 작동상태, 안전사용 상태 등 매월 1회 이상 점검 및 이상발견 시 필요한 조치",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 현장소장 및 관리감독자, 안전관리자에 의해 매일 작업 시작 전 지게차 등 하역운반기계에 대하여 안전사용방법, 운행경로, 방호장치의 종류 및 기능, 보호구 착용, 재해사례 등에 대한 안전교육 실시 후 작업\n4. 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 특별교육(2시간), 일일교육(건진법) 등 안전관계 법령에서 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 작업계획서 작성하고, 내용을 해당 근로자에 알림\n5. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 179~183조 참고 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "mobile-crane",
    name: "이동식 크레인",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 관리감독자, 안전관리자 등에 의해 이동식크레인 반입 시마다 방호장치(과부하방지장치, 권과방지장치, 비상정지장치, 제동장치 등)를 적절하게 갖추었는지, 정상 기능이 유지되는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 이동식 크레인에 대해서는 절대 반입사용 금지조치\n3. 이동식 크레인 사용 중에도 매월 1회 이상 정기 점검을 통하여 방호장치의 기능이 정상적으로 작동하는지의 여부를 확인하고, 고장 시에나 미사용 시에는 즉시 개선조치 시행",
    ppe:
      "1. 보호구 지급 관리대장 운영\n2. 작업 중 관리감독자 등에 의해 보호구 착용상태의 수시 점검 및 착용조치\n3. 관리감독자, 안전관리자, 현장소장 등에 의해 매일 작업 전 TBM 등을 통하여 보호구 지급 및 올바른 착용상태(안전화, 안전모 등) 확인한 후 작업\n4. 미착용 근로자에 대해서는 작업배제 조치 강력 시행",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 안전작업 계획서 내용에 대한 운전원, 근로자 등에게 특별교육(2시간) 실시\n4. 특수형태 근로종사자 등에게 안전관계 법령에서 정한 특별교육(2시간) 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 134조·32조 / 건설기술진흥법시행령 103조·산업안전보건법 29조",
  },
  {
    key: "excavator-breaker",
    name: "굴착기\n대형 브레이커",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 관리감독자, 현장소장, 안전관리자 등에 의해 굴착기 등 차량계건설기계 반입 시 방호장치인 전조등, 후미등, 후사경, 제동장치, 후방카메라, 후진경보장치, 협착방지봉, 안전핀, 헤드가드 등을 갖추었는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 장비나 기능이 정상적으로 작동되지 않은 장비에 대해서는 절대 반입사용 금지, 정비 조치\n3. 굴착기 사용 중에도 매월 1회 이상 관리감독자에 의해 정기점검을 통하여 방호장치가 정상적으로 작동하는지의 여부를 확인하고, 고장 시에나 미사용 시에는 즉시 개선조치 시행",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 현장소장에 의해 차량계건설기계 작업계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등)에 대해 운전원 등 관계 근로자 안전교육(2시간), 일일교육, TBM 실시\n4. 특수형태 근로종사자에 대해서 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 사전조사를 실시하고, 그 결과를 고려하여 차량계건설기계 작업계획서 작성, 교육 및 그 계획에 따라 작업 실시\n5. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "concrete-pump",
    name: "콘크리트 펌프카",
    safetyCheck:
      "1. 후진경보음, 브레이크, 아웃트리거, 후진방지스토퍼 등 방호장치 설치\n2. 관리감독자, 현장소장 등에 의해 방호장치를 갖추었는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 장비나 기능이 정상적으로 작동되지 않은 장비에 대해서는 절대 반입사용 금지, 정비 조치\n3. 펌프카 사용 중에도 관리감독자에 의해 매월 1회 이상 정기점검을 통하여 방호장치가 정상적으로 작동하는지의 여부를 확인하고, 고장 시에나 미사용 시에는 즉시 개선조치 시행",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 작업 시작 전 현장소장에 의해 펌프카 등 차량계건설기계 작업계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등)에 대해 운전원 등 관계 근로자 안전교육(2시간), 일일교육, TBM 실시\n2. 특수형태 근로종사자(펌프카 소유자에 의한 운전)에 대해서 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 펌프카 사용 시 주변 충돌 예방위한 접근금지 표지판 설치, 접근금지 방지책 설치, 안전수칙 게시\n2. 유도자 배치하여 신호 유도하에 작업\n3. 난간 등에서 작업하는 근로자가 호스의 요동·선회로 인하여 추락하는 위험을 방지하기 위한 안전난간 설치\n4. 붐을 조정하는 경우에는 주변의 전선 등에 의한 위험을 예방하기 위한 적절한 조치 실시\n5. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "안전보건기준에관한규칙 제622조 등 / 산업안전보건기준에 관한 규칙 335조",
  },
  {
    key: "mixer-truck",
    name: "콘크리트 믹서트럭",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 콘크리트 믹서트럭 반입 시 현장소장, 안전관리자, 관리감독자 등에 의해 방호장치(전조등, 후미등, 후사경, 제동장치, 후방카메라, 후진경보장치, 경보음 등)를 갖추었는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 장비나 정상기능이 유지되지 않은 트럭에 대해서는 절대 반입사용 금지조치\n3. 콘크리트 믹서트럭 사용 중에도 관리감독자에 의해 매월 1회 이상 정기점검을 통하여 방호장치가 정상적으로 작동하고 있는지의 여부를 확인하고, 고장 시에나 미사용, 난폭운전 시에는 즉시 개선조치 시행",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 현장소장, 관리감독자에 의해 매일 콘크리트 믹서트럭 등 차량계건설기계 작업계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등), 산업안전보건기준에 관한 규칙, 설계도서 등에 대해 운전원 등 관계 근로자에게 일일교육, TBM 실시 후 작업\n4. 특수형태 근로종사자에 대해서 특별교육(2시간) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 사전조사를 실시하고, 그 결과를 고려하여 차량계건설기계 작업계획서 작성, 교육 및 그 계획에 따라 작업 실시\n5. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "cargo-truck",
    name: "화물자동차",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 화물자동차 임대사용 시 현장소장, 안전관리자, 관리감독자 등에 의해 안전방호장치(운행기록장치, 첨단안전장치, 후방카메라, 경보장치, 제동장치, 센서 작동여부, 차로이탈경고장치, 전조등, 후미등, 후진경보장치, 안전벨트 부착 등) 적정 설치 및 정상작동상태, 화물자동차의 제원, 성능, 적재기준, 불법개조 유무, 면허 유자격 여부 등을 사용 전에 반드시 확인점검하고, 갖추지 않은 화물차나 정상기능이 유지되지 않은 화물자동차에 대해서는 절대 반입사용 금지조치\n3. 화물자동차 운행 중에도 관리감독자에 의해 매월 1회 이상 정기점검을 통하여 방호장치 및 각종 기능 정상작동 여부, 운행속도 준수, 안전운행수칙 준수 등 안전운행 여부를 반드시 확인점검하고, 고장 시에나 미사용, 난폭운전 시에는 즉시 필요한 개선조치(정비, 수리, 안전운행, 보호구 착용, 퇴출조치 등) 시행",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 현장소장, 관리감독자에 의해 운전원에게 매일 화물자동차 등 운반하역기계의 작업계획서 내용(운행경로, 종류 및 능력, 안전운행방법 등), 산업안전보건기준에 관한 규칙, 안전운행수칙 등에 대해 일일교육 및 TBM 실시\n4. 특수형태 근로종사자(화물자동차 소유자에 의한 운전)에 대해서 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 화물 적재 시 한쪽으로 치우치지 않도록 적재\n5. 화물 붕괴 또는 낙하에 의한 위험을 방지하기 위하여 화물에 로프를 거는 등 필요한 조치\n6. 운전자의 시야를 가리지 않도록 적재\n7. 최대 적재량 초과적재 금지\n8. 바닥과 적재함의 짐 윗면 간을 안전하게 오르내리기 위한 승강설비 설치\n9. 꼬임이 끊어지거나 심하게 손상된 섬유로프 사용금지\n10. 화물자동차 적재함에 근로자 탑승 절대 금지\n11. 화물자동차에서 화물을 내리는 작업을 하는 경우에는 그 작업을 하는 근로자에게 쌓여있는 화물의 중간에서 화물을 빼내기 절대금지\n12. 적재 후 안전적재상태 반드시 점검 및 조치 후 운반\n13. 적재함에서 내리기 작업 중 추락예방 위해 보조용 안전작업발판 및 안전대 등 보호구 착용(가장자리)\n14. 지게차 등 하역운반기계 하역 시 작업구역 설정(접근방지휀스 등), 관계근로자 외 출입금지 조치\n15. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 197조·198조·95조·173조·187~190조",
  },
  {
    key: "dump-truck",
    name: "덤프트럭",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 덤프트럭 반입 시 현장소장, 안전관리자, 관리감독자 등에 의해 방호장치(전조등, 후미등, 후사경, 제동장치, 후방카메라, 후진경보장치, 경보음 등)의 부착상태를 사용 전에 점검하고, 부착되지 않거나 정상기능이 유지되지 않은 덤프트럭에 대해서는 절대 반입사용 금지조치\n3. 덤프트럭 사용 중에도 관리감독자에 의해 매월 1회 이상 정기점검을 통하여 방호장치의 정상작동여부를 점검하고, 고장 시에나 미사용, 난폭운전 시에는 즉시 개선조치 시행",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 기초안전보건교육\n2. 일용근무자 특별교육 – 유해하거나 위험한 작업에 채용하거나 그 작업으로 작업내용을 변경할 때\n3. 작업 시작 전 현장소장에 의해 매일 덤프트럭 안전운행계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등), 산업안전보건기준에 관한 규칙 등 관계 근로자에게 일일교육, TBM 실시\n4. 특수형태 근로종사자에 대해서 특별교육(2시간) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 덤프트럭 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리\n5. 운행계획서 내용을 해당 운전원 및 관계 근로자 전원에게 반드시 알려주어 안전운행 실시\n6. 적재함 덮개 반드시 덮고 운행\n7. 최대 적재량 초과적재 금지\n8. 과속금지, 운행속도 지정하여 운행",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "roller",
    name: "로울러\n(다짐기계)",
    safetyCheck:
      "1. 현장소장, 관리감독자, 안전관리자 등에 의해 롤러기계의 방호장치(후방카메라, 후진 및 접근 시 경보장치, 협착방지봉, 경보장치 등)를 갖추었는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 장비나 기능이 정상적으로 작동되지 않은 장비에 대해서는 절대 반입사용 금지, 정비 조치\n2. 다짐 작업 시에도 관리감독자에 의해 매월 1회 이상 정기점검을 통하여 방호장치가 정상적으로 작동하는지의 여부를 확인하고, 고장 시에나 미사용 시에는 즉시 개선조치 시행(수리, 부착, 교체 등)",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 작업 시작 전 현장소장, 관리감독자에 의해 롤러 다짐기계의 작업계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등)에 대해 운전원 등 관계 근로자 특별교육(2시간), 일일교육, TBM 실시\n2. 특수형태 근로종사자(다짐기계 소유자에 의한 운전) 등에 의한 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 추가교육 실시\n3. 교육 시 안전보건공단 자료를 활용하여 사망재해 사례, 포장공사(다짐) 안전작업지침 등을 이용하여 실질적이고 실효적인 교육 실시(형식적 교육 탈피)",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 현장소장 등은 작업 시작 전까지 롤러기에 의한 충돌, 협착 등의 위험을 방지하기 위하여 작업장의 지형, 지반 및 지층 상태 등에 대한 사전조사를 실시하고, 그 결과를 고려하여 롤러기에 대한 차량계건설기계 작업계획서 작성, 그 계획에 따라 작업 실시, 내용 근로자 주지\n3. 관리대장 작성(종류, 구입일, 현장 반입일, 검교정일, 점검 및 수리일, 수리 내역, 사용년수, 담당자 등) 및 관리",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "paver",
    name: "아스팔트 휘니셔",
    safetyCheck:
      "1. 차량방호안전시설 설치\n2. 아스팔트 휘니셔 반입 시 현장소장, 관리감독자, 안전관리자 등에 의해 방호장치를 갖추었는지의 여부를 사용 전에 반드시 점검확인하고, 갖추지 않은 장비나 기능이 정상적으로 작동되지 않은 장비에 대해서는 절대 반입사용 금지, 정비 조치\n3. 사용 중에도 관리감독자에 의해 매일 수시 순회점검을 통하여 주행장치, 원동기, 유압장치, 조종장치, 작업장치, 각종 스위치 및 조종레버, 조향핸들, 계기장치가 정상적으로 작동하는지의 여부를 확인하고, 고장 시에나 미사용 시에는 즉시 개선조치",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 작업 시작 전 현장소장, 관리감독자에 의해 아스팔트 휘니셔의 작업계획서 내용(운행경로, 종류 및 능력, 안전작업방법 등)에 대해 운전원 등 관계 근로자 일일교육, TBM 실시\n2. 특수형태 근로종사자(아스팔트 휘니셔 소유자에 의한 운전) 등에 의한 특별교육(2시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 법령에 정한 추가교육 실시\n3. 교육 시 안전보건공단 자료를 활용하여 사망재해 사례, 굴착기 안전작업지침 등 실질적이고 실효적인 교육 실시(형식적 교육 탈피)",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 현장소장은 작업 시작 전까지 아스팔트 휘니셔 포장작업 근로자의 위험을 방지하기 위하여 포장구간 사전조사를 실시하고, 그 결과를 고려하여 작업계획서 작성, 그 계획에 따라 작업 실시\n3. 작업계획서 내용을 해당 근로자에게 교육 등의 방법으로 반드시 알려주고 작업을 실시",
    note: "산업안전보건기준에 관한 규칙 197조·198조 / 건설기술진흥법시행령 103조·산업안전보건법 29조 / 규칙 38조",
  },
  {
    key: "water-truck",
    name: "살수차",
    safetyCheck:
      "1. 살수차량 방호안전시설 설치\n2. 살수차 임대사용 시 현장소장, 안전관리자, 관리감독자 등에 의해 안전방호장치(운행기록장치, 첨단안전장치, 후방카메라, 경보장치, 제동장치, 센서 작동여부, 차로이탈경고장치, 전조등, 후미등, 후진경보장치, 안전벨트 부착 등) 적정 설치 및 정상작동상태, 제원, 성능, 적재기준, 불법 개조유무, 면허 유자격 여부 등을 사용 전에 반드시 확인점검하고, 갖추지 않은 살수차나 정상기능이 유지되지 않은 살수차에 대해서는 절대 반입사용 금지조치\n3. 살수차 운행 중에도 관리감독자에 의해 매일 수시 순회점검을 통하여 방호장치 및 각종 기능 정상작동 여부 점검",
    ppe: "1. 보호구(안전모, 안전화 등) 지급 및 착용관리\n2. 작업 중 관리감독자 등에 의해 착용상태 수시 확인, 미착용 근로자 작업배제",
    education:
      "1. 작업 전 신규채용자 교육\n2. 작업 시작 전 현장소장, 관리감독자에 의해 운전원에게 매일 살수차 등 운반하역기계의 작업계획서 내용(운행경로, 종류 및 능력, 안전운행방법 등), 산업안전보건기준에 관한 규칙, 안전운행수칙 등에 대해 일일교육 및 TBM 실시\n3. 특수형태 근로종사자(화물자동차 소유자에 의한 운전)에 대해서 특별교육(2시간) 및 정기교육(분기별 6시간), 기초안전보건교육(4시간, 신규채용), 일일교육(건진법) 등 산업안전보건법령에 규정한 추가교육 실시",
    etc:
      "1. 경고표지 부착 및 안전수칙 게시\n2. 위험구간 작업 시 유도자 배치\n3. 신호방법 및 신호할 사람 지정\n4. 최대 적재량 초과금지\n5. 바닥과 적재함 안전하게 오르내리기 위한 승강설비 설치\n6. 탑승좌석 이외 절대 탑승금지",
    note: "산업안전보건기준에 관한 규칙 197조·198조·173조·187~190조 / 규칙 제95조",
  },
];

const HAZARD_SUBSTANCE_ITEMS: HazardSubstanceItem[] = [
  {
    key: "paint-thinner",
    name: "페인트, 신나",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 페인트·신나 취급 전 취급 근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "페인트·신나 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "cement",
    name: "시멘트",
    ppe: "1. 호흡용 보호구: 방진마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "현장소장, 안전관리자 등에 의해 시멘트 취급 전 취급근로자(미장공 등)에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "시멘트 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "dust",
    name: "분진\n(금속·광물·목재·섬유 등)",
    ppe: "1. 호흡용 보호구: 방진마스크\n2. 눈 보호구: 밀폐형 보안경",
    education:
      "현장소장, 안전관리자 등에 의해 분진작업장 작업 전 취급 근로자에 대한 호흡용 보호구 사용방법, 작업장 환기방법, 분진의 유해성 및 대처방법, 분진발생 재료의 취급 시 주의사항 등 내실 있는 교육실시(2시간 이상)",
    signage: "분진발생 작업장에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "1. 국소배기장치, 전체환기장치, 습기유지설비 설치 등 환기설비 설치하여 신선한 공기 공급\n2. 작업 전 매일 작업장 청소",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "noise",
    name: "과도한 소음",
    ppe: "1. 귀 보호구: 귀마개, 귀덮개",
    education:
      "현장소장, 안전관리자 등에 의해 과도한 소음작업장 작업 전 취급 근로자에 대한 귀 보호용 보호구 사용방법, 소음의 유해성 및 대처방법, 소음발생 기계기구의 취급 시 주의사항 등 내실 있는 교육실시(2시간 이상)",
    signage: "소음발생 작업장에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "1. 소음발생 기계기구의 소음원 제거조치\n2. 관계 근로자의 소음수준 등에 적합한 방음용 보호구 선택 착용하고 KC인증마크 반드시 확인",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "welding-fume",
    name: "용접 흄",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "현장소장, 안전관리자 등에 의해 용접봉 취급 전 취급 근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "용접 시 용접장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "oxygen",
    name: "산소",
    ppe: "1. 호흡용 보호구: 송기마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 산소 취급 전 취급근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "산소 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "acetylene",
    name: "아세틸렌",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 아세틸렌 취급 전 취급근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "아세틸렌 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "stripper",
    name: "박리제",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 박리제 취급 전 취급 근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "박리제 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "primer",
    name: "프라이머",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 프라이머(방수액) 취급 전 취급근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "프라이머 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "gasoline",
    name: "휘발유",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 휘발유 취급 전 취급근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "휘발유 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
  {
    key: "diesel",
    name: "경유",
    ppe: "1. 호흡용 보호구: 송기마스크, 방독마스크\n2. 눈 보호구: 밀폐형 보안경\n3. 손 보호구: 보호장갑\n4. 신체 보호: 보호의",
    education:
      "안전관리자 등에 의해 경유 취급 전 취급근로자에 대한 MSDS 내용, 유해성 및 위험성, 구성성분 및 함유량, 응급조치요령, 누출 시 대처방법, 취급 시 주의사항, 인체에 미치는 영향, 물리화학적 특성, 보호구 착용 등 내실 있는 교육실시(2시간 이상)",
    signage: "경유 취급 보관 시 보관장소에 경고표지(안전보건표지) 및 안전수칙 부착",
    etc: "물질안전보건자료(MSDS)를 보관장소(위험물 저장소 등), 사용장소 등에 부착하여 안전보건 확보",
    note: "물질안전보건자료에 관한 기준(고용노동부고시 제2020-130호)",
  },
];

// 항목을 추가·삭제할 수 있어야 하므로(회원 요청), 위험성평가 표(riskTemplates.ts)와
// 같은 원리로 "행" 단위 데이터 모델로 통일한다 — 개요표의 체크박스와 팝업의
// 세부실행계획 텍스트를 한 벌로 묶은 HazardRow가 문서마다 몇 개든 자유롭게
// 추가·삭제될 수 있다. 위 HAZARD_MACHINERY_ITEMS 등 원본 데이터는 그대로 두고,
// 이 행 모델로 변환해 최초 진입 시 기본값으로 채워 넣는다.
type HazardRow = {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  details: Record<string, string>;
  note: string;
};

type HazardColumn = { key: string; label: string };

const HAZARD_MC_CHECK_COLUMNS: HazardColumn[] = [
  { key: "safetyCheck", label: "안전점검" },
  { key: "ppe", label: "보호구 지급·착용" },
  { key: "education", label: "안전보건 교육" },
  { key: "signage", label: "안전보건 표지부착" },
  { key: "etc", label: "기타 대책" },
];
const HAZARD_MC_DETAIL_FIELDS: HazardColumn[] = [
  { key: "safetyCheck", label: "안전점검" },
  { key: "ppe", label: "보호구 지급·착용" },
  { key: "education", label: "안전보건교육" },
  { key: "etc", label: "안전보건표지부착·안전수칙게시 및 기타 대책" },
];
const HAZARD_SB_CHECK_COLUMNS: HazardColumn[] = [
  { key: "localExhaust", label: "국소배기 장치 설치" },
  { key: "ppe", label: "보호구 지급·착용" },
  { key: "education", label: "안전보건 교육" },
  { key: "signage", label: "안전보건 표지부착" },
  { key: "etc", label: "기타 대책" },
];
const HAZARD_SB_DETAIL_FIELDS: HazardColumn[] = [
  { key: "ppe", label: "보호구 지급·착용" },
  { key: "education", label: "안전보건교육" },
  { key: "signage", label: "안전보건표지부착·안전수칙게시" },
  { key: "etc", label: "기타 대책(물질안전보건자료(MSDS) 부착 등)" },
];

function hazardItemToRow(item: HazardItem): HazardRow {
  return {
    id: item.key,
    name: item.name.replace(/\n/g, " "),
    checks: { safetyCheck: true, ppe: true, education: true, signage: true, etc: true },
    details: { safetyCheck: item.safetyCheck, ppe: item.ppe, education: item.education, etc: item.etc },
    note: item.note,
  };
}

function hazardSubstanceItemToRow(item: HazardSubstanceItem): HazardRow {
  return {
    id: item.key,
    name: item.name.replace(/\n/g, " "),
    checks: { localExhaust: true, ppe: true, education: true, signage: true, etc: true },
    details: { ppe: item.ppe, education: item.education, signage: item.signage, etc: item.etc },
    note: item.note,
  };
}

function buildHazardRowHtml(modalPrefix: string, row: HazardRow, checkColumns: HazardColumn[]): string {
  const id = escapeHtmlPolicy(row.id);
  const checks = checkColumns
    .map(
      (c) =>
        `<td class="p-2 text-center"><input class="rounded text-primary focus:ring-primary h-4 w-4" data-hazard-check="${c.key}" type="checkbox"${
          row.checks[c.key] ? " checked" : ""
        }/></td>`
    )
    .join("\n");
  return `<tr class="hover:bg-neutral-50/80 transition" data-hazard-id="${id}">
<td class="p-2">
<input class="w-full text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded px-2 py-1.5" data-hazard-field="name" placeholder="항목명" type="text" value="${escapeHtmlPolicy(
    row.name
  )}"/>
</td>
${checks}
<td class="p-2 text-center whitespace-nowrap">
<button class="text-xs font-semibold text-primary hover:underline" data-open-modal="${modalPrefix}-${id}" type="button">상세 작성</button>
<button class="ml-2 align-middle text-neutral-400 hover:text-status-danger transition" data-hazard-delete title="항목 삭제" type="button">
<span class="material-symbols-outlined text-base">delete</span>
</button>
</td>
</tr>`;
}

function buildHazardRowModalHtml(modalPrefix: string, row: HazardRow, detailFields: HazardColumn[]): string {
  const modalKey = `${modalPrefix}-${escapeHtmlPolicy(row.id)}`;
  const fieldsHtml = detailFields
    .map(({ key, label }) => {
      const value = row.details[key] ?? "";
      const rowsAttr = Math.min(14, Math.max(3, value.split("\n").length + 1));
      return `<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">${escapeHtmlPolicy(label)}</label>
<textarea class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 leading-relaxed" data-hazard-field="detail-${key}" rows="${rowsAttr}">${escapeHtmlPolicy(
        value
      )}</textarea>
</div>`;
    })
    .join("\n");
  const noteRows = Math.min(6, Math.max(2, row.note.split("\n").length + 1));

  return `<div class="hidden fixed inset-0 z-[70] bg-black/50 flex justify-center p-4 md:p-8 overflow-y-auto" data-modal="${modalKey}" data-modal-backdrop="${modalKey}">
<div class="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl my-4 md:my-8">
<div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
<h3 class="font-headline font-bold text-sm text-neutral-900" data-hazard-modal-title>${escapeHtmlPolicy(row.name || "새 항목")} — 세부 실행계획</h3>
<button class="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500" data-modal-close="${modalKey}" type="button">
<span class="material-symbols-outlined text-lg">close</span>
</button>
</div>
<div class="p-6 space-y-4">
${fieldsHtml}
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">비고(관계법령)</label>
<textarea class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 leading-relaxed" data-hazard-field="note" rows="${noteRows}">${escapeHtmlPolicy(
    row.note
  )}</textarea>
</div>
</div>
<div class="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-3 flex justify-end rounded-b-2xl">
<button class="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition" data-modal-close="${modalKey}" type="button">완료</button>
</div>
</div>
</div>`;
}

// 항목 추가 시 클라이언트 JS가 그대로 복제해 새 행+팝업 쌍을 만들 수 있도록,
// id="__NEW__"인 빈 행/팝업 템플릿을 <template> 태그로 감싸 심어둔다. <template>
// 내부는 cheerio(export 추출)와 실제 DOM(querySelectorAll) 모두에서 일반
// 자손으로 취급되지 않으므로, 값이 비어 있는 이 템플릿이 출력물에 새어나가거나
// field-N 자동저장 대상에 잡히는 사고가 나지 않는다.
function buildHazardCategorySectionHtml(params: {
  sectionId: string;
  modalPrefix: string;
  roman: string;
  title: string;
  itemColumnLabel: string;
  description: string;
  checkColumns: HazardColumn[];
  detailFields: HazardColumn[];
  rows: HazardRow[];
}): string {
  const { sectionId, modalPrefix, roman, title, itemColumnLabel, description, checkColumns, detailFields, rows } = params;
  const rowsHtml = rows.map((row) => buildHazardRowHtml(modalPrefix, row, checkColumns)).join("\n");
  const modalsHtml = rows.map((row) => buildHazardRowModalHtml(modalPrefix, row, detailFields)).join("\n");

  const blankRow: HazardRow = {
    id: "__NEW__",
    name: "",
    checks: Object.fromEntries(checkColumns.map((c) => [c.key, true])),
    details: Object.fromEntries(detailFields.map((f) => [f.key, ""])),
    note: "",
  };
  const rowTemplateHtml = `<template data-hazard-row-template>${buildHazardRowHtml(modalPrefix, blankRow, checkColumns)}</template>`;
  const modalTemplateHtml = `<template data-hazard-modal-template>${buildHazardRowModalHtml(modalPrefix, blankRow, detailFields)}</template>`;
  const checkHeaders = checkColumns.map((c) => `<th class="p-2 text-center">${escapeHtmlPolicy(c.label)}</th>`).join("\n");

  return `<!-- ════════ SECTION: ${title} ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-${sectionId}" data-hazard-section="${sectionId}" data-hazard-modal-prefix="${modalPrefix}">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">${roman}</span>
<h2 class="font-headline font-bold text-base text-neutral-900">${title}</h2>
</div>
<div class="p-6">
<p class="text-xs text-neutral-500 mb-3">${description}</p>
<div class="flex justify-end mb-2">
<button class="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/10 px-3 py-1.5 rounded-lg transition border border-primary/20" data-hazard-add type="button">
<span class="material-symbols-outlined text-sm">add</span>
                  항목 추가
                </button>
</div>
<div class="overflow-x-auto border border-neutral-200 rounded-lg">
<table class="min-w-[720px] w-full text-left text-xs border-collapse" data-hazard-table>
<thead>
<tr class="bg-neutral-100 text-neutral-700 border-b border-neutral-200 font-semibold">
<th class="p-2">${itemColumnLabel}</th>
${checkHeaders}
<th class="p-2 text-center">관리</th>
</tr>
</thead>
<tbody class="divide-y divide-neutral-100" data-hazard-tbody>
${rowsHtml}
</tbody>
</table>
</div>
</div>
${modalsHtml}
${rowTemplateHtml}
${modalTemplateHtml}
</section>
`;
}

function buildHazardMachineryNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-hazard_machinery">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">위험기계·기구별 관리계획</span>
</div>
</a>
`;
}

function buildHazardVehicleNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-hazard_vehicle">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">차량계 건설기계·하역운반기계 관리계획</span>
</div>
</a>
`;
}

function buildHazardSubstanceNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-hazard_substance">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">유해·위험물질(MSDS) 관리계획</span>
</div>
</a>
`;
}

// "안전점검·안전순찰·안전검사 등의 안전보건활동 계획" 중 "안전점검 및 일일
// 순회계획"(실제 LH 샘플 화성동탄(2) 91~93p, "5.1 공정별 안전점검 계획") —
// 회원 요청대로 고정값 서식이다. TBM 절차(준비·실행·환류)는 법정 표준 문구라
// 읽기전용 텍스트로, 작업 전·중·후·특별점검 항목표는 실제 항목 그대로 고정된
// 표(입력요소 없음)로 보여준다. wizardExport.ts의 테이블 추출은 <td> 안에
// input/textarea/select가 없으면 그 셀의 순수 텍스트를 그대로 읽으므로, 이런
// 완전 정적 표도 별도 export 코드 없이 다운로드 문서에 그대로 반영된다.
function dipReadonlyBlock(label: string, text: string): string {
  const rows = Math.min(20, Math.max(3, text.split("\n").length + 1));
  return `<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">${escapeHtmlPolicy(label)}</label>
<textarea readonly class="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 leading-relaxed" rows="${rows}">${escapeHtmlPolicy(
    text
  )}</textarea>
</div>`;
}

const DAILY_INSPECTION_TBM_INTRO =
  "회의준비: 위험성평가 결과, 현장 내 사건사고, 안전지침, 보호구 착용상태 확인 등\n" +
  "이행계획: 전 작업자에게 안전보건 자료를 제공하고 건강상태, 위험성평가 내용, 현장 내 사건사고, 보호구 착용상태 등을 확인하여 위험요인예방대책을 확인";

const DAILY_INSPECTION_TBM_PREP =
  "TBM 전달자료 작성 및 내용 숙지\n" +
  "① 위험성평가 결과(유해위험요인 및 개선대책 등)\n" +
  "② 사건사고 보고서\n" +
  "③ 안전작업 지침 및 규정\n" +
  "④ 보호구 확보\n" +
  "⑤ 당일 작업과 관련 안전교육 자료\n" +
  "⑥ 당일 안전작업계획서, 안전지침 등 자료";

const DAILY_INSPECTION_TBM_EXECUTE =
  "1. 작업자 건강 상태 확인(과도한 음주, 37℃ 이상 체온, 약물 복용 여부, 혈압, 당뇨 등 이상유무)\n" +
  "2. 위험성평가 내용(당일 작업과 관련한 파악된 유해위험요인 및 개선대책 등)\n" +
  "3. 안전모(턱끈 포함), 안전화, 안전대 등 보호구의 올바른 착용여부\n" +
  "4. 당일 작업내용/위험요인/안전작업절차 및 안전작업계획서/안전대책 등 근로자 교육·공유·전달\n" +
  "5. 작업자가 TBM 내용 숙지하였는지 확인(외국인 포함 시 통·번역 등 효과적인 전달 방안 마련)\n" +
  "6. 위험요인, 불안전한 상태 발견 시 행동요령 확인: ① 멈춘다(Stop) → ② 확인한다(Look) → ③ 평가한다(Assess) → ④ 관리한다(Manage)";

const DAILY_INSPECTION_TBM_FEEDBACK =
  "1. 작업자의 불만, 질문, 제안사항 검토\n" +
  "2. 위험성평가 결과 개선대책의 이행여부 확인 및 불이행 시 원인/대책\n" +
  "3. 당일 작업과 관련된 안전교육 실효성 검증\n" +
  "4. TBM 결과의 충실한 기록·보관\n" +
  "5. 관련 조치 결과 피드백";

const DAILY_INSPECTION_TABLE_ROWS: { type: string; frequency: string; items: string; checker: string }[] = [
  {
    type: "작업 전",
    frequency: "매일",
    items:
      "1. 안전보호구 지급 및 착용유무 확인(착용 불응자 작업배제 조치)\n" +
      "2. 안전체조 실시\n" +
      "3. 근로자의 건강상태 확인\n" +
      "4. 신규자 및 숙련공의 작업조 구성확인\n" +
      "5. 선 안전조치 시행 확인\n" +
      "6. TBM 준비 및 실행\n" +
      "7. 위험성평가결과 유해위험요인 및 개선내용 확인\n" +
      "8. 기타 유해위험요인, 기계기구의 방호장치 부착",
    checker: "관리감독자\n안전담당자",
  },
  {
    type: "작업 중",
    frequency: "수시",
    items:
      "1. 안전보호구 착용상태 확인\n" +
      "2. 공정별 화재, 폭발, 질식, 중독, 붕괴, 추락, 낙하, 감전 등 대형사고 존재여부 및 안전작업 상태\n" +
      "3. 위험기계기구의 안전사용 상태\n" +
      "4. 위험성평가 결과 개선내용 이행상태\n" +
      "5. 안전수칙, 안전작업계획서, 설계도서, 안전관계법령 준수상태\n" +
      "6. 안전시설물 설치 및 관리상태\n" +
      "7. 기타 유해위험요인 안전확보 상태",
    checker: "관리감독자\n안전담당자",
  },
  {
    type: "작업 후",
    frequency: "매일",
    items:
      "1. 금일 및 명일 불안전요소에 대한 안전대책 강구\n" +
      "2. 공사 현장 내 정리정돈 상태\n" +
      "3. 기계기구의 안전보관상태\n" +
      "4. 안전시설물의 제거 또는 훼손상태\n" +
      "5. 기타 유해위험요인",
    checker: "관리감독자\n안전담당자",
  },
  {
    type: "특별점검",
    frequency: "수시",
    items:
      "1. 재해발생 원인 및 개선대책 강구 및 적용상태\n" +
      "2. 보호구 착용상태\n" +
      "3. 화재, 폭발, 질식, 중독, 붕괴, 추락, 낙하, 감전 등 대형사고 존재여부 및 안전작업 상태\n" +
      "4. 기타 유해위험요인 등",
    checker: "관리감독자\n안전담당자",
  },
];

function buildDailyInspectionPlanNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-daily_inspection_plan">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">안전점검 및 일일 순회계획</span>
</div>
</a>
`;
}

function buildDailyInspectionPlanSectionHtml(): string {
  const tbmBlocks = [
    dipReadonlyBlock("가. 작업 전 TBM 개요", DAILY_INSPECTION_TBM_INTRO),
    dipReadonlyBlock("준비 단계", DAILY_INSPECTION_TBM_PREP),
    dipReadonlyBlock("실행 단계", DAILY_INSPECTION_TBM_EXECUTE),
    dipReadonlyBlock("환류 단계", DAILY_INSPECTION_TBM_FEEDBACK),
  ].join("\n");

  const tableRows = DAILY_INSPECTION_TABLE_ROWS.map(
    ({ type, frequency, items, checker }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap">${escapeHtmlPolicy(
      type
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top whitespace-nowrap">${escapeHtmlPolicy(frequency)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top whitespace-pre-line">${escapeHtmlPolicy(items)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(checker).replace(/\n/g, "<br/>")}</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 안전점검 및 일일 순회계획 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-daily_inspection_plan">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅲ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전점검 및 일일 순회계획</h2>
</div>
<div class="p-6 space-y-5">
<p class="text-xs text-neutral-500">산업안전보건법령에 따른 표준 절차·점검항목으로 고정되어 있으며, 별도 입력 없이 그대로 다운로드 문서에 포함됩니다.</p>
${tbmBlocks}
<div>
<p class="font-bold text-neutral-800 mb-2">나. 작업 전·중·후 안전점검 및 모니터링</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[10%]">종류</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[8%]">횟수</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">안전점검 항목</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[14%]">실시 및 조치상태 확인자</th>
</tr>
</thead>
<tbody>
${tableRows}
</tbody>
</table>
<p class="text-[11px] text-neutral-400 mt-2">※ 보호구 미착용 근로자 또는 착용 불응자에 대해서는 퇴출 등 강력조치</p>
</div>
</div>
</section>
`;
}

// "중점 위험작업허가제(PTW)" — 실제 LH 샘플 화성동탄(2) 33~37p("2. 안전작업(화기
// 작업, 굴착작업, 고소작업, 중장비작업 등)에 관한 작업계획")을 회원 요청대로
// 고정값 서식으로 반영한다. 위저드에 원래 있던 Stitch 데모 카드("1. 안전점검 및
// 일일 순회계획", "2. 중점 위험작업허가제(PTW)")는 가짜 예시값("안전총괄부장
// 김안전" 등)이었고, 이 실제 고정값 서식과 내용이 겹친다는 지적을 받아
// buildWizardHtml 안에서 그 두 카드를 제거하고(중복 제거) 이 서식 하나로
// 통일했다 — "표시는 두 곳, 값은 하나만 고정으로 불러온다" 대신 애초에
// 중복 자체를 없애는 방향을 택함.
function buildPtwPlanNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-ptw_plan">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">중점 위험작업허가제(PTW)</span>
</div>
</a>
`;
}

const PTW_TARGET_WORK_TEXT =
  "다음의 유해·위험작업은 안전작업허가서 발급 대상이다.\n" +
  "○ 유해·위험물질이 들어있거나 들어있었던 용기, 펌프 또는 배관 등과 같은 기기의 개방 또는 분해 시\n" +
  "○ 인화성물질 주변 용접·절단 또는 불티 등이 발생하는 화기작업 시\n" +
  "○ 굴착작업 시\n" +
  "○ 충전부작업 시\n" +
  "○ 고소작업 시\n" +
  "○ 열차충돌 우려작업 시(위험지역에서 시행하는 작업)\n" +
  "○ 방사능 사용작업 시 등\n" +
  "○ 밀폐공간 출입 시\n" +
  "○ 위험지역 내에서의 내연기관 운전 시\n" +
  "○ 중장비 사용작업 시\n" +
  "※ 관련근거: 도급사업 안전보건관리 운영 매뉴얼(고용노동부), KOSHA GUIDE 안전작업허가지침(한국산업안전보건공단)";

const PTW_PURPOSE_TEXT =
  "목적: 유해·위험도가 상대적으로 높은 작업에 대해 작업 전에 유해·위험성을 파악하여 제거 또는 차단할 수 있는 체제를 구축(작업허가제)하여 근원적인 안전성을 확보한다.\n\n" +
  "해당공사 허가대상 작업 종류:\n" +
  "○ 인화성물질 주변 용접·절단 또는 불티 등이 발생하는 화기작업 시\n" +
  "○ 굴착작업 시\n" +
  "○ 고소작업 시\n" +
  "○ 중장비 사용작업 시";

const PTW_PROCESS_TEXT =
  "① 위험성평가 실시 → ② 작업허가서 승인요청(수급인, 작성자는 작업 1~2일 전까지 현장소장 또는 공사감독원 제출) → ③ 작업허가서 승인(작업 전까지 승인) → ④ 작업실시(승인조건에 따른 작업 실시) → ⑤ 작업허가 준수확인(허가내용 미준수 시 작업중지)\n" +
  "※ 작업허가제 대상 확인은 수시로 실시한다.";

const PTW_IMPLEMENTATION_TEXT =
  "1. 작업허가 전 확인점검: 이행주체 등은 허가서를 작성·검토·승인(발급) 단계에 따라 허가대상 작업종류, 현장여건, 공종별 특성, 안전작업계획서, 설계도서, 위험성평가 결과서, 안전보건관계 법령, 현장 확인 등을 통하여 허가작업 대상과 안전조치 사항을 반드시 확인·점검\n" +
  "2. 승인(발급): 현장소장 또는 공사감독원은 내용이 적절하다고 판단 시 작업 전일까지 작업허가서를 승인\n" +
  "3. 보충작업 확인·점검: 보충작업을 병행하여 수행하는 경우에는 각 보충 작업별 전문지식을 갖춘 자나 관계 전문가, 관계 경력근로자 등이 참여하여 확인·점검 실시\n" +
  "4. 입회: 작업의 위험 정도, 규모 및 복잡성에 따라 작업 중에 특별히 안전관리가 필요하다고 판단될 경우 공사감독자(감리)가 입회하여 제반 안전요구사항에 대한 조치를 확인\n" +
  "5. 연장: 작업이 허가시간 이후까지 연장될 경우에는 발급자 또는 업무를 위임받은 자가 작업 현장을 재확인한 후 허가서에 명시된 사항과 일치하는지 등을 파악하고 안전하다는 판단에 따라 안전작업허가서의 작업시간을 연장하고 서명\n" +
  "6. 이행여부 확인 및 조치: 작업허가서에 의해 작업하고 있는지의 여부와 안전보건을 담보하고 있는지를 작업 전·중·후에 반드시 확인점검하고, 미이행 시 즉시 필요한 조치(공사중지, 자원의 지원, 추가 개선조치, 기술적 지도조언, 퇴출 등) 강력 시행\n" +
  "7. 모니터링 피드백 실시: 해당작업 종료 시에는 반드시 재해발생 여부, 허가서 내용의 적정성, 실행의 실효성, 경제성, 위험성평가(최초, 수시) 시 추가 반영사항, 기타 안전보건 확보에 관한 내용 등을 모니터링 분석하여 추후 위험작업 허가 시 반영";

const PTW_ARCHIVE_TEXT =
  "허가서 사본 1부를 해당작업 관계자 전원의 경유(공람)를 통하여 작업 현장에 게시하여 안전작업 관리하고, 관련 기록 등은 현장에 보관하되 준공 시에는 본사로 이관하여 1년간 보관한다.";

const PTW_FORM_NOTE_TEXT =
  "위험작업 허가서(일일/연장)에는 신청인·허가기간·위험작업 종류(화기/밀폐공간/정전/굴착/고소/중량물 등)·작업개요·안전조치 요구사항 체크리스트(작업구역 설정, 가스농도 측정, 환기·조명·소화기 등 장비, 화재감시자 배치, 가스농도 측정결과 등)·작성자/검토자/승인자 서명란을 포함한다.\n" +
  "연장 시에는 연장 허가기간과 연장사유, 일자별 검토자·승인자 서명란을 추가로 기재한다.\n" +
  "※ 실제 작업 시 현장에서 작성하여 첨부하는 서식입니다.";

const PTW_ROLE_ROWS: { role: string; text: string }[] = [
  {
    role: "허가서 작성자",
    text:
      "직영 해당공사 관리감독자 및 협력회사(하도급) 관리감독자는 등록된 서식에 의거 작성하되, 작성 전 허가대상 작업종류, 현장여건, 공종별 특성, 안전작업계획서, 설계도서, 재해사례, 공종별 작업지침(안전보건공단 지침), 위험성평가서(최초, 수시), 안전보건관계법령 등과 현장 검토확인을 거쳐 성실하게 작성하며, 최소한 작업시작 전일까지 검토자에게 제출한다. 작업허가서의 효력이 발생되는 시점부터 종료될 때까지 안전하게 작업을 수행할 수 있도록 작업허가서에 의거 관리하고, 공사 종료 시 적정성에 대한 모니터링 후 기록보관하며, 해당작업 시작 전에 관계 근로자를 대상으로 작업허가서 내용에 대한 TBM, 사전교육을 실시한다.",
  },
  {
    role: "허가서 검토자",
    text:
      "원도급 업체의 해당 공사팀장 및 안전보건관리자(선임 시)는 작성자가 제출한 허가서에 대하여 가능한 조속한 시일 내에 적정성을 검토하여 현장소장 또는 공사감독원(현장소장 경유)에게 승인(발급) 요청하되, 적정성 검토 시 해당 작업에서 요구되는 전체적인 요구사항에 대한 조치 반영 등을 정밀하게 검토하여야 하고, 미흡사항 발견 시 추가요구 반영하여 근원적인 안전성을 확보한다. 해당작업 수행 중 수시로 순회점검 등을 통하여 허가서의 이행(안전조치 요구사항 등) 여부를 확인점검하고, 미이행 시 이행에 필요한 추가조치(자원의 지원, 기술적인 지도조언 등)를 권고한다.",
  },
  {
    role: "승인(발급)자",
    text:
      "허가서 최종 발급은 현장소장 또는 공사감독원이 승인한다. 현장소장은 작업허가에 관한 작성, 검토, 승인(발급), 이행여부 확인점검 및 조치, 연장, 모니터링, 기록유지 등 허가에 관한 전반적인 책임을 진다.",
  },
];

function buildPtwPlanSectionHtml(): string {
  const readonlyBlocks = [
    dipReadonlyBlock("안전작업허가서 발급 대상 유해·위험작업(참고사항)", PTW_TARGET_WORK_TEXT),
    dipReadonlyBlock("2.1 안전작업 목적 / 허가대상 작업 종류", PTW_PURPOSE_TEXT),
    dipReadonlyBlock("2.2 안전작업 허가 업무흐름(허가절차)", PTW_PROCESS_TEXT),
    dipReadonlyBlock("2.3-다. 안전작업 허가 이행계획", PTW_IMPLEMENTATION_TEXT),
    dipReadonlyBlock("2.3-라. 허가서 경유·게시·보관계획", PTW_ARCHIVE_TEXT),
    dipReadonlyBlock("2.4 안전작업허가서 양식 안내", PTW_FORM_NOTE_TEXT),
  ].join("\n");

  const roleRows = PTW_ROLE_ROWS.map(
    ({ role, text }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap">${escapeHtmlPolicy(
      role
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(text)}</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 중점 위험작업허가제(PTW) ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-ptw_plan">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅲ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">중점 위험작업허가제(PTW)</h2>
</div>
<div class="p-6 space-y-5">
<p class="text-xs text-neutral-500">산업안전보건법령 및 KOSHA GUIDE에 따른 표준 절차·항목으로 고정되어 있으며, 별도 입력 없이 그대로 다운로드 문서에 포함됩니다.</p>
${readonlyBlocks}
<div>
<p class="font-bold text-neutral-800 mb-2">2.3-나. 이행주체 지정 및 역할</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[16%]">구분</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">역할</th>
</tr>
</thead>
<tbody>
${roleRows}
</tbody>
</table>
</div>
</div>
</section>
`;
}

// "보호구 지급 및 착용확인 절차" — 실제 LH 샘플 화성동탄(2) 96p("5.3 보호구 지급 및
// 착용확인 절차")의 품목·대상작업·유지관리·착용확인 절차를 그대로 반영하되, 원본의
// 지급 예정수량(현장마다 다른 값)은 고정하지 않고 실제 입력 가능한 칸으로 바꿨다 —
// 기존에는 이 절이 발주처 표준서식의 범용 sections(label+textarea) 항목이라 수량이
// "(수량 미입력)"이라는 고정 문구로만 표시되고 실제로 입력할 방법이 없었다는 지적을
// 받아, 품목별 고정 표는 그대로 두고 수량 칸만 실제 <input>으로 바꿔 해결했다.
const PROTECTION_EQUIPMENT_ITEMS: { name: string; target: string; examplePlaceholder: string }[] = [
  {
    name: "안전모\n(근로자 1인별 지급, 훼손 시 추가지급)",
    target: "물체가 떨어지거나 날아올 위험 또는 근로자가 추락할 위험이 있는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 100",
  },
  {
    name: "안전대\n(안전대 부착설비 포함)",
    target: "높이 또는 깊이 2미터 이상의 추락할 위험이 있는 장소에서 하는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 20",
  },
  {
    name: "안전화\n(지급 후 최소 3개월 경과자 추가지급)",
    target: "물체의 낙하·충격, 감전 또는 정전기의 대전에 의한 위험이 있는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 50",
  },
  {
    name: "보안경\n(눈, 안면 보호)",
    target: "물체가 흩날릴 위험이 있는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 20",
  },
  {
    name: "보안면\n(눈 보호 등)",
    target: "용접 시 불꽃이나 물체가 흩날릴 위험이 있는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 5",
  },
  {
    name: "절연장갑\n(절연보호구, 손 감전예방)",
    target: "감전의 위험이 있는 작업. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 20",
  },
  {
    name: "방진마스크\n(코로나 포함, 호흡기질환 예방)",
    target: "분진이 심하게 발생하는 하역작업, 코로나바이러스 예방. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 300",
  },
  {
    name: "신호수용 반사조끼\n(신호수, 유도자)",
    target: "차량계 건설기계 및 하역운반기계 등 신호수. 해당 전 근로자에게 지급",
    examplePlaceholder: "예: 5",
  },
];

const PROTECTION_EQUIPMENT_MAINTENANCE_TEXT =
  "1. 관리감독자에 의해 보호구의 성능이 상시 적절하게 유지 관리될 수 있도록 수시 확인점검\n" +
  "2. 심하게 훼손되거나 정상기능 상실, 노후화, 내용년수 경과(2년) 등 불량보호구에 대한 폐기조치\n" +
  "3. 관리감독자에 의해 보호구의 분실을 예방하고, 온도(4℃~28℃)·진동·먼지·습도(50% 이하)·부식으로부터 보호되어 정밀·정확도가 안정되게 유지될 수 있도록 적합한 환경에서 보관관리\n" +
  "4. 보관 시 고온다습한 곳이나 직사광선이 비치는 장소에는 보관금지\n" +
  "5. 가능한 근로자 개인이 휴대하면서 취급 및 관리하도록 유도, 교육\n" +
  "6. 보호구의 착용률을 높이기 위하여 가능한 근로자 개인이 직접 구입하여 사용하게 함(추후 구입비용 지급)";

const PROTECTION_EQUIPMENT_CONFIRM_TEXT =
  "1. 현장소장, 안전관리자, 관리감독자 등에 의해 매일 순회점검, TBM, 안전교육 등을 통하여 상시 착용하도록 조치하고, 작업 전·중·후 상시적으로 착용한 상태에서 작업할 수 있도록 점검확인.\n" +
  "2. 미착용 근로자 발생 시 즉시 착용토록 조치하고, 지속·반복적으로 미착용 근로자 발생 시 강력하게 작업배제 조치 등 시행.\n" +
  "3. 특히, 안전모 턱끈·안전대는 반드시 착용 조치.";

function buildProtectionEquipmentNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-protection_equipment">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  02
                </span>
<span class="group-hover:text-neutral-900">보호구 지급 및 착용확인 절차</span>
</div>
</a>
`;
}

function buildProtectionEquipmentSectionHtml(savedQuantities: Record<string, string>): string {
  const itemRows = PROTECTION_EQUIPMENT_ITEMS.map(({ name, target, examplePlaceholder }, i) => {
    const saved = escapeHtmlPolicy(savedQuantities[String(i)] ?? "");
    return `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-pre-line w-[18%]">${escapeHtmlPolicy(
      name
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[14%]">
<div class="flex items-center gap-1">
<input type="text" inputmode="numeric" data-ppe-qty="${i}" class="w-16 text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1 text-neutral-900" placeholder="${escapeHtmlPolicy(
      examplePlaceholder
    )}" value="${saved}"/>
<span class="text-neutral-500">개</span>
</div>
</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(target)}</td>
</tr>`;
  }).join("\n");

  const readonlyBlocks = [
    dipReadonlyBlock("유지 및 관리계획", PROTECTION_EQUIPMENT_MAINTENANCE_TEXT),
    dipReadonlyBlock("지급·착용확인 절차", PROTECTION_EQUIPMENT_CONFIRM_TEXT),
  ].join("\n");

  return `<!-- ════════ SECTION: 보호구 지급 및 착용확인 절차 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-protection_equipment">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅲ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">보호구 지급 및 착용확인 절차</h2>
</div>
<div class="p-6 space-y-5">
<p class="text-xs text-neutral-500">품목·대상작업은 산업안전보건기준에 관한 규칙에 따른 표준 항목으로 고정되어 있으며, 지급 예정수량만 현장 실정에 맞게 직접 입력합니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">품명</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">지급 예정수량</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">지급계획 및 대상</th>
</tr>
</thead>
<tbody>
${itemRows}
</tbody>
</table>
${readonlyBlocks}
</div>
</section>
`;
}

// "Ⅳ. 중대산업재해 등 비상 상황시 조치계획" — 실제 LH 샘플 화성동탄(2) 109~121p.
// 1) 비상대책반 구성은 다이어그램(박스+연결선) 형태로 직책은 고정, 성명·연락처만
// 입력한다(기존 org_chart와 동일하게 개수 고정이라 field-N 인덱스 대상이어도
// 무방). 2) 유관기관 비상연락체계는 프로젝트마다 실제 관할 기관·번호가 전혀
// 다르므로(예: 화성 현장의 관할 경찰서 번호를 다른 지역 현장에 고정값으로 넣으면
// 오히려 잘못된 정보가 된다) riskRows와 동일한 방식으로 항목을 자유롭게
// 추가·삭제할 수 있게 하고, 112/119처럼 전국 공통인 번호만 기본값으로 채운다.
// 3) 나머지(비상사태 대응계획, 발생유형별 대응 시나리오, 재해조사 및 대책수립,
// 발생보고, 처리계통도, 응급처치요령)는 산업안전보건법령에 따른 표준 절차라
// 고정 서식이다. 기존 base 템플릿의 "sec-emergency"(Stitch 데모 카드 — "AI 현장
// 반경 5km 이내 지정 응급의료기관 자동 연동" 등 가짜 내용)와 겹치므로, 이 플래그를
// 켜는 발주처는 반드시 disabled_common_sections에 "emergency"를 추가해 그 데모
// 카드를 꺼야 한다(seed-agency-templates.mjs 참고).
const EMERGENCY_TEAM_ROLES: { key: string; role: string }[] = [
  { key: "chief", role: "대책반장\n(현장소장)" },
  { key: "safety-manager", role: "안전관리자\n(안전보건협의체 팀장)" },
  { key: "control-team", role: "통제반\n(품질1팀 팀장)" },
  { key: "rescue-team", role: "구조·후송·복구반\n(공사팀 팀장)" },
  { key: "support-team", role: "지원반\n(품질2팀 팀장)" },
];

export interface EmergencyContactRow {
  id: string;
  name: string;
  department: string;
  phone: string;
}

// 112/119는 전국 공통이라 기본값으로 채우고, 나머지는 현장마다 실제 관할 기관·
// 번호가 달라 이름만 카테고리로 안내하고 번호는 빈 칸으로 둔다(잘못된 지역 기관의
// 번호가 고정값으로 들어가면 실제 비상시 오히려 위험하다).
const DEFAULT_EMERGENCY_CONTACTS: EmergencyContactRow[] = [
  { id: "ec-1", name: "발주처 담당 사업본부", department: "", phone: "" },
  { id: "ec-2", name: "관할 지방고용노동관서", department: "건설산재예방감독과", phone: "" },
  { id: "ec-3", name: "관할 시·구청", department: "안전건설과", phone: "" },
  { id: "ec-4", name: "관할 경찰서", department: "", phone: "112" },
  { id: "ec-5", name: "관할 소방서", department: "", phone: "119" },
  { id: "ec-6", name: "안전보건공단 관할 지역본부", department: "건설안전부", phone: "" },
  { id: "ec-7", name: "관할 지정 응급의료기관", department: "", phone: "" },
  { id: "ec-8", name: "원도급사 본사", department: "", phone: "" },
  { id: "ec-9", name: "재해예방기관 및 감리", department: "협력업체", phone: "" },
];

function buildEmergencyContactRowHtml(row: EmergencyContactRow): string {
  return `<tr data-emergency-contact-id="${escapeHtmlPolicy(row.id)}">
<td class="p-2"><input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-emergency-contact-field="name" placeholder="기관명 (예: OO경찰서)" type="text" value="${escapeHtmlPolicy(
    row.name
  )}"/></td>
<td class="p-2"><input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-emergency-contact-field="department" placeholder="담당부서/구분" type="text" value="${escapeHtmlPolicy(
    row.department
  )}"/></td>
<td class="p-2"><input class="w-full text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1.5" data-emergency-contact-field="phone" data-phone-format placeholder="전화번호" type="text" inputmode="numeric" value="${escapeHtmlPolicy(
    row.phone
  )}"/></td>
<td class="p-2 text-center">
<button class="text-neutral-400 hover:text-status-danger transition" data-emergency-contact-delete type="button" title="행 삭제">
<span class="material-symbols-outlined text-lg">delete</span>
</button>
</td>
</tr>`;
}

const EMERGENCY_RESPONSE_PROCEDURE_TEXT =
  "① 작업중지 → ② 근로자 등 종사자 대피 및 구호조치 → ③ 추가 피해 방지 조치 → ④ 현장조사 및 관계기관 신고 → ⑤ 위험요인 제거 → ⑥ 확인 및 기록보관 → ⑦ 발생 원인분석 및 대책 수립 → ⑧ 비상대응 모의훈련 실시";

const EMERGENCY_TEAM_DUTIES_TEXT =
  "1) 통제반: 재해상황 파악 및 비상연락망 관련 기관 통보, 전 종사자에게 방송시설·무전기·핸드폰 등을 이용한 전파 및 공유, 작업중지 및 근로자 대피 지원\n" +
  "2) 구조·후송·복구반: 작업중지, 근로자 대피, 119 및 지정병원 신고·후송, 2차 재해 예방조치(출입통제, 신호수 배치 등) 및 현장보존, 재해자 구호조치(의식유무 확인, 심폐소생, 지혈, 보온조치, 구조 등), 추가 피해방지 조치(원인조사 및 대책강구, 공유), CCTV·사진·동영상 촬영 등 증거자료 확보\n" +
  "3) 지원반: 작업중지 및 근로자 대피 지원, 인력·장비지원 등 공사팀 행정지원, 안전한 장소 지정 및 대피 지원, 위험요인 제거에 대한 지도·조언, 고용노동부 및 대표이사 보고, 재해 원인조사 및 재발방지 대책 수립, 복구에 필요한 인력·장비 확보, 피해자 가족 연락 및 합의";

const EMERGENCY_WORK_STOP_TEXT =
  "현장소장은 다음 상황 발생 시 신속하게 작업을 중지한다.\n" +
  "1) 중대재해 및 중대산업재해 발생 시\n" +
  "2) 재해가 발생할 급박한 위험상황 발생 시\n" +
  "3) 근로자 등 종사자에 의한 작업중지 또는 요청 시\n" +
  "4) 기타 작업 중지할 상황 발생 시";

const EMERGENCY_EVACUATION_TEXT =
  "1) 현장소장은 비상사태 발생 시 종사자의 추가피해를 예방하기 위하여 안내방송·확성기·수신호·핸드폰·비상연락체계·SNS(카톡·문자)·무전기 등을 이용하여 사전 지정된 안전한 장소에 신속하게 대피하도록 조치한다.\n" +
  "2) 현장소장은 중대산업재해 피재자 발생 시 즉시 119 구조대에 신고하고, 의식상태 확인, 호흡 정지 여부 확인 및 심폐소생술 실시, 지혈, 보온조치, 골절 시 부목고정, 전원차단, 질식 시 공기호흡기 착용 후 구조, 출입통제 등 적절한 구호조치를 취한다.\n" +
  "3) 건축물의 붕괴 등으로 추가 피해가 예상되는 경우에는 직접적인 구호조치를 보류하고 출입통제 등 필요한 조치를 한 후, 추가 피해가 예상되지 않음을 확인한 후 구호조치를 실시한다.";

const EMERGENCY_ADDITIONAL_PREVENTION_TEXT =
  "1) 비상사태 발생 장소나 2차 재해가 발생할 위험장소, 급박한 위험이 있는 장소 등에 종사자 등이 출입할 수 없도록 출입금지방지책(휀스, 안전난간, 로프 등) 및 출입금지용 경고표지판 등 안전시설물을 설치한다.\n" +
  "2) 안전시설물 설치와 별도로 안전한 장소에 신호수를 배치하여 비상사태의 추이 관찰과 보고, 종사자들의 위험장소 접근통제 등 비상업무를 수행할 수 있도록 조치한다.";

const EMERGENCY_INVESTIGATION_REPORT_TEXT =
  "1) 현장소장은 비상사태 발생 시 신속한 대응과 상황전파, 추가피해 최소화, 응급구호 및 복구 등을 위하여 사고의 개요·종류·발생장소·재해자 정보·피해상황·발생원인 및 대책 등을 조사하여 관계기관(발주처, 119소방서, 경찰서, 고용노동부, 근로복지공단, 본사 대표이사 등)에 신고한다.\n" +
  "2) 필요하다고 판단 시 종사자 이외의 인근 주민이나 대중에게도 SNS(단톡, 밴드, 문자, 홈페이지, 블로그 등), 안내방송, 핸드폰, 무전기 등 통신시설을 이용하여 공유한다.";

const EMERGENCY_HAZARD_REMOVAL_TEXT =
  "1) 위험요인의 제거는 근본적인 제거와 대체를 원칙으로 하되, 불가피할 경우에는 공학적 통제와 행정적 통제, 개인 보호구 지급 및 착용 순서로 조치한다.\n" +
  "2) 현장에 존재하는 유해위험에 대한 사고 가능성 차단 및 피해 최소화 조치: 통로·계단·기계기구에 의한 위험, 인화성 물질 등 위험정도 파악 및 확인·개선, 가스·분진·미스트·산소결핍 등 유해요인 노출수준 파악·개선, 사고 위험이 높은 작업은 관리감독자를 지정하여 관리감독하에 작업 실시.";

const EMERGENCY_RECORD_AND_ANALYSIS_TEXT =
  "가. 확인 및 기록보관: 현장소장은 위험요인을 완벽하게 제거한 후 추가적인 피해를 초래하지 않는 경우에만 작업을 진행하고, 사진 등 증거자료를 보관한다.\n" +
  "나. 발생 원인분석 및 대책수립: 현장소장은 사고조사 결과에 따라 정확하고 객관적으로 원인분석 및 대책을 수립하여 이행하고, 재발방지를 위해 안전교육·협의체 회의·위험성평가·합동점검·TBM 등을 통해 동종 및 유사재해를 예방한다. 대표이사는 동종·유사 비상사태가 재발하지 않도록 회사 시공 전 현장에 전파 교육한다.";

const EMERGENCY_DRILL_PLAN_TEXT =
  "[조치계획 요약] 중대재해 및 급박한 위험상황 발생 시 즉시 작업을 중지하고 근로자를 안전한 장소로 대피시킨 후, 119 신고 및 구호조치, 위험요인 제거, 관계기관(발주처·지방고용노동관서 등) 신고, 원인분석 및 재발방지대책 수립 순으로 대응한다.\n" +
  "가. 원·하수급인 모든 근로자, 특수형태근로자 등 모든 종사자를 대상으로 모의훈련 계획을 수립하고 누락 인원이 발생하지 않도록 1주일 이전에 알려주고 실시한다.\n" +
  "나. 모의훈련은 반기(상반기 1.1~6.30, 하반기 7.1~12.31) 1회 이상 주기적으로 실시하고 실시결과서를 작성하여 현장에 보관한다.\n" +
  "다. 모의훈련 실시시간은 1회당 최소 4시간 이상 실시한다.\n" +
  "라. 모의훈련은 재해 발생 유형별로 피해 최소화를 위한 비상대응절차(발생유형별 비상대응절차 시나리오 참조)를 구비하고 훈련을 실시한다.";

interface EmergencyScenario {
  title: string;
  prevention: string;
  steps: { stage: string; detail: string }[];
}

const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    title: "1) 굴착기·덤프트럭·지게차 등에 의한 충돌·협착",
    prevention:
      "충돌 위험 관리: 굴착기·크레인·덤프트럭·지게차 등 차량계 건설기계 통행로와 종사자 통행로 구분 및 신호수 배치, 작업계획서 작성 및 작업 전 근로자 교육, 유자격자 운전.\n" +
      "협착 위험 관리: 기어·롤러 등 물림점 방호덮개 설치, 회전체 취급 작업 시 면장갑 착용 금지, 차량계 하역운반기계 고장 시 정차 후 전문가 연락, 작업 절차 준수.",
    steps: [
      { stage: "① 비상상황 인지", detail: "충돌 혹은 협착 사고 상황 인지, 사내방송·비상경보로 전파 및 지원요청" },
      { stage: "② 작업중지 및 대피·상황전파", detail: "해당 설비 운전 정지 및 피해자 구조, 작업중지·대피 지시, 종사자 의식 상태 확인, 119 신고/대표이사 보고, 중대재해 시 지방고용노동청 등 신고" },
      { stage: "③ 2차 사고 예방조치", detail: "전원 차단(대상 기계 전원 공급 차단), 안전휀스 등 출입금지 조치, 통제표지판 설치, 신호수 배치" },
      { stage: "④ 피해자 구조 및 응급조치", detail: "피해자 구조 및 응급조치(전원 미차단 상태 구조활동 금지), 상태에 따른 응급조치(심폐소생술, 안정 유지, 지혈)" },
      { stage: "⑤ 피해자 후송·외부기관 연계", detail: "119 등 외부구조기관 인계 및 후송(사고 상황 설명), 재해자 가족 연락" },
      { stage: "⑥ 현장 보존조치", detail: "작업장 통제(출입금지), 사고조사 시작 전까지 현장 보존, CCTV 확보·사진 촬영 등 증거 보존" },
      { stage: "⑦ 위험요인 제거 및 추가피해 방지조치", detail: "지방고용노동청·안전보건공단·경찰 등 조사 협조, 사고조사 TFT 구성 및 원인분석·재발방지 대책 수립, 위험성평가 반영·근로자 교육·현장 안전보건 활동 수평 전개, 타 현장 사고사례 전파 공유" },
    ],
  },
  {
    title: "2) 추락",
    prevention:
      "설계·시공 시 작업발판 설치, 개구부 최소화, 위험성평가 실시를 통한 추락위험 장소 최소화. 추락 위험 장소에 안전난간·덮개·추락방호망(Safety net) 설치, 시스템비계 활용. 작업 전 안전대 부착설비와 추락방호망 점검, 안전대 착용 지시, 추락위험 표지판 설치. 모든 작업자는 언제나 안전모·안전대 등 보호구 착용.",
    steps: [
      { stage: "① 비상상황 인지", detail: "작업자 추락 확인, 사내방송·비상경보로 전파 및 지원요청, 안전대 매달림·방망 걸침 여부 확인" },
      { stage: "② 작업중지 및 대피·상황전파", detail: "작업중지·대피 지시, 상황 전파(장소, 피해상황), 119 신고, 중대재해 시 지방고용노동청 등 신고" },
      { stage: "③ 2차 사고 예방조치", detail: "추가 추락·추락방지시설 붕괴 우려 시 출입금지, 통제표지판 설치, 신호수 배치" },
      { stage: "④ 피해자 구조 및 응급조치", detail: "구조장비·이동식크레인·고소작업대 등으로 신속한 구조, 호흡정지 확인·심폐소생술·지혈·기도확보·보온조치·골절 시 부목고정" },
      { stage: "⑤ 피해자 후송·외부기관 연계", detail: "119 등 외부구조기관 인계 및 후송, 재해자 가족 연락" },
      { stage: "⑥ 현장 보존조치", detail: "작업장 통제, 현장 보존, CCTV·사진 촬영 등 증거 보존" },
      { stage: "⑦ 위험요인 제거 및 추가피해 방지조치", detail: "유관 조사기관 협조, 사고조사 TFT 구성 및 원인분석·재발방지 대책 수립, 위험성평가 반영·교육·수평 전개, 사고사례 전파 공유" },
    ],
  },
  {
    title: "3) 낙하·비래",
    prevention:
      "설계·시공 시 낙하위험 최소화, 위험성평가 실시를 통한 낙하위험 장소 최소화. 낙하 위험 장소에 낙하물방지망·방호선반·수직보호망·낙하위험지역 출입금지 방지책 등 설치. 작업 전 낙하방지시설 점검 및 안전모 착용 지시, 낙하위험 표지판 설치, 낙하위험지역 감시인 배치. 모든 작업자는 언제나 안전모·안전대 등 보호구 착용.",
    steps: [
      { stage: "① 비상상황 인지", detail: "낙하·비래 피해 작업자 상태 확인, 사내방송·비상경보로 전파 및 지원요청, 단순 낙하물 부딪힘/중량물 깔림 여부 확인" },
      { stage: "② 작업중지 및 대피·상황전파", detail: "작업중지·대피 지시, 상황 전파, 119 신고/대표이사 보고, 중대재해 시 지방고용노동청 등 신고" },
      { stage: "③ 2차 사고 예방조치", detail: "추가 낙하·비래 요소 발생 예상 시 출입금지, 통제표지판 설치, 신호수 배치" },
      { stage: "④ 피해자 구조 및 응급조치", detail: "구조장비·이동식크레인 등으로 신속한 구조, 상태에 따른 심폐소생술·지혈·기도확보·안정 유지" },
      { stage: "⑤ 피해자 후송·외부기관 연계", detail: "119 등 외부구조기관 인계 및 후송, 재해자 가족 연락" },
      { stage: "⑥ 현장 보존조치", detail: "작업장 통제, 현장 보존, CCTV·사진 촬영 등 증거 보존" },
      { stage: "⑦ 위험요인 제거 및 추가피해 방지조치", detail: "유관 조사기관 협조, 사고조사 TFT 구성 및 원인분석·재발방지 대책 수립, 위험성평가 반영·교육·수평 전개, 사고사례 전파 공유" },
    ],
  },
  {
    title: "4) 화재·폭발",
    prevention:
      "화기작업 시 내부 인화성 물질 및 인근 가연물 제거, 비가연성 자재로 대체. 용접작업 시 용접불티 비산방지덮개 또는 방화포 설치. 화기작업 시 가스·분진 농도 측정 및 주기적 확인, 화재감시인 배치. 개인 보호구: 제전작업복 착용, 가스검지기 휴대, 방폭공구 사용. 정기적인 소화훈련 실시, 인화성 가스·산소 사용 용접·용단·가열 작업 시 취업제한 확인.",
    steps: [
      { stage: "① 비상상황 인지", detail: "유증기 발생·냄새 감지, 인화성 물질 발화/폭발, 화재경보기 동작 시 사내방송·비상경보로 전파 및 지원요청" },
      { stage: "② 작업중지 및 대피·상황전파", detail: "작업중지 지시 및 상황전파, 초기진화 실패 시 대피, 119 신고/대표이사 보고, 중대재해 시 지방고용노동청 등 신고" },
      { stage: "③ 2차 사고 예방조치", detail: "인화성 물질 공급 차단(밸브 잠금, 안전한 장소 이동, 전기 차단), 출입금지·통제표지판 설치, 신호수 배치" },
      { stage: "④ 진화·구조 및 응급조치", detail: "관리감독자 판단하 진화·대피·구조장비 투입, 소화기/소화전으로 진화 가능 시 진화 후 불가 시 신속 대피, 심폐소생술·안정 유지·불필요한 이동 금지" },
      { stage: "⑤ 피해자 후송·외부기관 연계", detail: "119 등 외부구조기관 인계 및 후송, 재해자 가족 연락" },
      { stage: "⑥ 현장 보존조치", detail: "작업장 통제, 현장 보존, CCTV·사진 촬영 등 증거 보존" },
      { stage: "⑦ 위험요인 제거 및 추가피해 방지조치", detail: "유관 조사기관 협조, 사고조사 TFT 구성 및 원인분석·재발방지 대책 수립, 위험성평가 반영·교육·수평 전개, 사고사례 전파 공유" },
    ],
  },
  {
    title: "5) 감전",
    prevention:
      "전기기계기구 취급 시 감전 위험이 없도록 작업방법 개선, 전기기계기구 대체사용, 위험성평가 실시를 통한 감전위험 최소화. 접지 설치 및 접지저항 측정, 누전차단기 설치 및 수시 작동여부 점검, 피복 절연조치, 습윤지역 제거, 가설전선 공중거치 설치. 작업 전 감전예방시설 점검. 개인보호구: 감전방지용 안전화·안전모·절연장갑 등 착용.",
    steps: [
      { stage: "① 비상상황 인지", detail: "누전·잔류전기·충전부 접촉으로 감전, 전기 충격으로 인한 부상, 사내방송·비상경보로 전파 및 지원요청" },
      { stage: "② 작업중지 및 대피·상황전파", detail: "작업중지·대피 지시, 상황 전파, 119 신고/대표이사 보고, 중대재해 시 지방고용노동청 등 신고" },
      { stage: "③ 2차 사고 예방조치", detail: "전원 차단(2차 감전 방지 방법으로 전원 공급 차단), 필요 시 전원 차단 요청, 전도체 제거" },
      { stage: "④ 피해자 구조 및 응급조치", detail: "피해자 구조 및 응급조치(전원 미차단 상태 구조활동 금지), 심폐소생술·안정 유지·불필요한 이동 금지" },
      { stage: "⑤ 피해자 후송·외부기관 연계", detail: "119 등 외부구조기관 인계 및 후송, 재해자 가족 연락" },
      { stage: "⑥ 현장 보존조치", detail: "작업장 통제, 현장 보존, CCTV·사진 촬영 등 증거 보존" },
      { stage: "⑦ 위험요인 제거 및 추가피해 방지조치", detail: "유관 조사기관 협조, 사고조사 TFT 구성 및 원인분석·재발방지 대책 수립, 위험성평가 반영·교육·수평 전개, 사고사례 전파 공유" },
    ],
  },
];

const EMERGENCY_INCIDENT_ANALYSIS_TEXT =
  "가. 재해 원인조사: 재해발생(경미한 반복적 재해, 아차사고 포함) 시 재해발생 개요(6하 원칙), 피재자 인적사항, 피해상황 및 전망, 목격자 진술서 및 증빙사진, 재해발생 원인(기계설비 문제점, 작업환경, 관리상 문제점 등)을 포함하여 철저히 분석·조사한다. 조사 방법은 4M 분석(Man·Machine·Media·Management)과 6하원칙(5W1H) 등 다양한 방법을 적용한다.\n" +
  "나. 대책수립: 재해발생 원인을 4M 등으로 철저히 분석한 후 유해위험요인의 제거·대체, 통제(공학적·행정적), 개인 보호구 착용 순서로 근본적 대책을 수립하며, 현장실무자·종사자·건설안전기술사 등 전문가 의견을 수렴한다.\n" +
  "다. 전파 교육: 대표이사는 재해원인 및 대책을 회사 시공 전 건설현장에 전파 교육하고, 현장소장은 재해사례를 위험성평가·순회점검·종사자 교육·유해위험요인 확인 및 개선 절차에 반영한다.\n" +
  "라. 안전사고 발생 시 응급조치: 즉시 119 구조대에 신고하고, 도착 전 의식상태 확인·호흡정지 여부 확인 및 심폐소생술 실시·지혈·보온조치·골절 시 부목고정 등 적절한 응급처치를 취한다. 출혈 시 압박붕대로 지혈하고 부상부위를 심장보다 높게 유지하며, 의식이 없는 경우 평평한 바닥에 눕히고 필요 시 심폐소생술을 실시한다.";

const EMERGENCY_REPORTING_ROWS: { category: string; agency: string; method: string; content: string }[] = [
  {
    category: "재해발생\n(사망, 3일 이상 휴업 부상재해)",
    agency: "발주청 및 인허가기관",
    method: "지체 없이 전화·팩스 등의 방법으로 보고",
    content: "사고발생 일시 및 장소, 사고발생 경위, 조치사항, 향후 조치계획 등",
  },
  {
    category: "중대재해\n(사망 등)",
    agency: "현장 소재지 관할 지방노동관서",
    method: "지체 없이 전화·팩스 등의 방법으로 보고",
    content: "발생개요 및 피해상황, 조치 및 전망, 그 밖의 중요한 사항 등",
  },
  {
    category: "부상재해\n(3일 이상의 휴업 부상)",
    agency: "현장 소재지 관할 지방노동관서",
    method: "발생일로부터 1개월 이내",
    content: "산업재해 조사표에 의거 팩스, 우편, 직접방문 등의 방법으로 보고",
  },
  {
    category: "재해발생 보상신고\n(사망, 4일 이상 요양)",
    agency: "관할 근로복지공단",
    method: "3년 이내(근로자가 신청)",
    content: "신속한 치료와 보상을 목적으로 피재자 등에게 관할 근로복지공단에 산재요양신청서(유족급여신청 포함) 제출을 안내하고, 추후 근로복지공단 확인요청 시 신속하게 동의",
  },
];

const EMERGENCY_PROCESS_FLOW_TEXT =
  "① 119 신고, 병원 응급신고 → ② 작업중지 → ③ 근로자 등 종사자 대피 및 구호조치 → ④ 보고 → ⑤ 위험요인의 제거, 작업중지 해제요청 → ⑥ 추가 피해 방지를 위한 조치(원인 및 대책수립, 공유) → ⑦ 합의 및 전파교육\n" +
  "[보고 대상] 발주처(관할 사업본부) / 지방고용노동청 / 본사 대표이사 / 경찰서 / 소방서\n" +
  "※ 산업안전보건법 제54조의 중대재해가 발생하여 해당 작업을 중지시키고 근로자를 안전한 장소에 대피시킨 때에는 지체 없이 발생개요, 피해상황, 조치 및 전망 등을 관할 지방고용노동관서와 발주처 및 대표이사에게 신속하게 보고한다.";

const EMERGENCY_FIRST_AID_TEXT =
  "1) 재해발생 등 비상시 즉시 119 구조대에 신고하고, 119 구조대가 도착하기 전 피재자에 대한 의식상태 확인, 호흡 정지 여부 확인 및 심폐소생술 실시, 지혈, 보온조치, 골절 시 부목고정 등의 적절한 응급처치를 취해야 하며, 대응 시나리오와 교육훈련에 따라 차분하고 신속하게 대응한다.\n" +
  "2) 출혈 시 과다출혈을 예방하기 위해 출혈 주변부 소독 후 압박붕대로 지혈하고 부상 부위를 심장 높이보다 위로 유지한다.\n" +
  "3) 질식 등 의식이 없는 경우 환자를 평평한 바닥에 눕히고 심정지 또는 호흡이 비정상적인 경우 심폐소생술을 실시한다.";

function buildEmergencyPlanNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-emergency_plan">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  04
                </span>
<span class="group-hover:text-neutral-900">중대산업재해 등 비상 상황시 조치계획</span>
</div>
</a>
`;
}

function buildEmergencyPlanSectionHtml(emergencyContactRows: EmergencyContactRow[] | undefined): string {
  const [chief, safetyManager, controlTeam, rescueTeam, supportTeam] = EMERGENCY_TEAM_ROLES;

  const orgDiagram = `<div class="flex flex-col items-center gap-0 py-2">
${buildDiagramBoxHtml("emteam", chief.key, chief.role)}
${DIAGRAM_V_LINE}
${buildDiagramBoxHtml("emteam", safetyManager.key, safetyManager.role)}
${DIAGRAM_V_LINE}
<div class="flex flex-wrap justify-center gap-4">
${buildDiagramBoxHtml("emteam", controlTeam.key, controlTeam.role)}
${buildDiagramBoxHtml("emteam", rescueTeam.key, rescueTeam.role)}
${buildDiagramBoxHtml("emteam", supportTeam.key, supportTeam.role)}
</div>
${DIAGRAM_V_LINE}
<div class="border border-dashed border-neutral-300 rounded-lg bg-neutral-50 px-4 py-2 text-center text-[11px] font-semibold text-neutral-600">
협력업체, 근로자
</div>
</div>`;

  const contactRows = (emergencyContactRows?.length ? emergencyContactRows : DEFAULT_EMERGENCY_CONTACTS)
    .map(buildEmergencyContactRowHtml)
    .join("\n");
  const blankContact = buildEmergencyContactRowHtml({ id: "", name: "", department: "", phone: "" });

  const scenarioBlocks = EMERGENCY_SCENARIOS.map((scenario) => {
    const stepRows = scenario.steps
      .map(
        (s) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap w-[22%]">${escapeHtmlPolicy(
          s.stage
        )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(s.detail)}</td>
</tr>`
      )
      .join("\n");
    return `<div class="border border-neutral-200 rounded-lg p-4 space-y-3">
<p class="font-bold text-neutral-800">${escapeHtmlPolicy(scenario.title)}</p>
${dipReadonlyBlock("비상상황 사전대비(위험요인 예방조치)", scenario.prevention)}
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[22%]">비상상황 진행단계</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">세부 조치사항</th>
</tr>
</thead>
<tbody>
${stepRows}
</tbody>
</table>
</div>`;
  }).join("\n");

  const reportingRows = EMERGENCY_REPORTING_ROWS.map(
    (r) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-pre-line w-[16%]">${escapeHtmlPolicy(
      r.category
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[18%]">${escapeHtmlPolicy(r.agency)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[20%]">${escapeHtmlPolicy(r.method)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(r.content)}</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 중대산업재해 등 비상 상황시 조치계획 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-emergency_plan">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅳ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">중대산업재해 등 비상 상황시 조치계획</h2>
</div>
<div class="p-6 space-y-6">
<p class="text-xs text-neutral-500">산업안전보건법령에 따른 표준 절차로 대부분 고정되어 있으며, 비상대책반 성명·연락처와 유관기관 비상연락체계만 실제 입력합니다.</p>
<div>
<p class="font-bold text-neutral-800 mb-2">1. 비상 대책반 구성</p>
${orgDiagram}
</div>
<div>
<div class="flex items-center justify-between mb-2">
<p class="font-bold text-neutral-800">유관기관 및 도급·수급업체 상호간 비상연락체계</p>
<button class="text-xs font-semibold text-primary hover:underline flex items-center gap-1" data-emergency-contact-add type="button">
<span class="material-symbols-outlined text-base">add_circle</span>기관 추가
</button>
</div>
<p class="text-[11px] text-neutral-500 mb-2">현장 소재지에 맞는 관할 기관명·담당부서·전화번호를 직접 입력하고, 필요한 기관은 자유롭게 추가·삭제하세요.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden" data-emergency-contact-table>
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-2 py-2 font-bold text-neutral-700 border-b border-neutral-200">기관명</th>
<th class="text-left px-2 py-2 font-bold text-neutral-700 border-b border-neutral-200">담당부서/구분</th>
<th class="text-left px-2 py-2 font-bold text-neutral-700 border-b border-neutral-200">전화번호</th>
<th class="text-center px-2 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-12">관리</th>
</tr>
</thead>
<tbody data-emergency-contact-tbody>
${contactRows}
</tbody>
</table>
<template data-emergency-contact-row-template>${blankContact}</template>
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">2. 비상사태 발생유형별 비상대응계획 수립 및 사후조치</p>
${[
    dipReadonlyBlock("가. 비상사태 발생 시 대응절차", EMERGENCY_RESPONSE_PROCEDURE_TEXT),
    dipReadonlyBlock("나. 대응 조직 구성원별 책임과 권한(업무분장)", EMERGENCY_TEAM_DUTIES_TEXT),
    dipReadonlyBlock("다. 작업중지", EMERGENCY_WORK_STOP_TEXT),
    dipReadonlyBlock("라. 대피 및 구호조치", EMERGENCY_EVACUATION_TEXT),
    dipReadonlyBlock("마. 추가피해 방지조치", EMERGENCY_ADDITIONAL_PREVENTION_TEXT),
    dipReadonlyBlock("바. 사후조사 및 관계기관 신고", EMERGENCY_INVESTIGATION_REPORT_TEXT),
    dipReadonlyBlock("사. 위험요인의 제거", EMERGENCY_HAZARD_REMOVAL_TEXT),
    dipReadonlyBlock("아·자. 확인 및 기록보관 / 발생 원인분석 및 대책수립", EMERGENCY_RECORD_AND_ANALYSIS_TEXT),
    dipReadonlyBlock("3. 비상대책-중대산업재해 조치계획 및 모의훈련 실시", EMERGENCY_DRILL_PLAN_TEXT),
  ].join("\n")}
</div>
<div class="space-y-3">
<p class="font-bold text-neutral-800">4. 발생유형별 비상대응절차(시나리오)</p>
${scenarioBlocks}
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">5. 재해조사 및 대책수립</p>
${dipReadonlyBlock("재해원인조사(4M 분석)·대책수립·전파교육·응급조치", EMERGENCY_INCIDENT_ANALYSIS_TEXT)}
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">6. 발생보고</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">구분</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">보고기관</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">보고방법(기한)</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">보고 내용</th>
</tr>
</thead>
<tbody>
${reportingRows}
</tbody>
</table>
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">7. 사고발생 시 처리계통도</p>
${dipReadonlyBlock("처리 흐름 및 보고대상", EMERGENCY_PROCESS_FLOW_TEXT)}
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">8. 비상 시 응급처치 요령</p>
${dipReadonlyBlock("응급처치 요령", EMERGENCY_FIRST_AID_TEXT)}
</div>
</div>
</section>
`;
}

// "안전보건협의체 회의계획" — 산업안전보건법 제64조 제1항에 따른 안전보건에 관한
// 협의체 운영 실무를 실시주기·참석대상·주요 안건 표로 고정 서식화했다. 참석대상은
// 기존 sections의 범용 "safety_council" 항목(council_members 필드)에 이미 있던
// 실제 명단 구성과 동일하게 맞췄고, 주요 안건은 그 항목의 council_meeting_plan
// 필드에 있던 문구를 표로 재구성했다(해당 필드는 표와 중복되므로 제거함).
const COUNCIL_MEETING_ATTENDEES =
  "현장소장, 관리감독자, 작업반장, 협력업체 현장소장 및 관리감독자, 근로자대표";
const COUNCIL_MEETING_AGENDA =
  "· 안전보건경영방침 및 목표 달성 모니터링\n" +
  "· 안전보건관련 규정의 효율적인 작동상태 확인\n" +
  "· 중대재해처벌법·산업안전보건법·건설기술진흥법 등 준수여부 확인\n" +
  "· 유해위험요인의 제거·대체 및 통제 방안 검토\n" +
  "· 인력 및 예산 등 자원지원 방안\n" +
  "· 평가 및 개선활동 결과내용 검토\n" +
  "· 종사자 의견청취";
const COUNCIL_MEETING_ROWS: { category: string; frequency: string; attendees: string; agenda: string }[] = [
  {
    category: "정기 간담회",
    frequency: "현장소장 주재, 매월 2회 이상",
    attendees: COUNCIL_MEETING_ATTENDEES,
    agenda: COUNCIL_MEETING_AGENDA,
  },
  {
    category: "수시 간담회",
    frequency: "현장소장이 필요하다고 판단 시",
    attendees: COUNCIL_MEETING_ATTENDEES,
    agenda: COUNCIL_MEETING_AGENDA,
  },
];
const COUNCIL_MEETING_FOLLOWUP_TEXT =
  "결정사항 즉시 실행, 전 조직 전파 및 공유, 경영방침·목표·계획에 반영";

function buildCouncilMeetingPlanNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-council_meeting_plan">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  05
                </span>
<span class="group-hover:text-neutral-900">안전보건협의체 회의계획</span>
</div>
</a>
`;
}

function buildCouncilMeetingPlanSectionHtml(): string {
  const rows = COUNCIL_MEETING_ROWS.map(
    ({ category, frequency, attendees, agenda }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-nowrap w-[12%]">${escapeHtmlPolicy(
      category
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[20%]">${escapeHtmlPolicy(frequency)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[24%]">${escapeHtmlPolicy(attendees)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top whitespace-pre-line">${escapeHtmlPolicy(agenda)}</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 안전보건협의체 회의계획 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-council_meeting_plan">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅴ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건협의체 회의계획</h2>
</div>
<div class="p-6 space-y-4">
<p class="text-xs text-neutral-500">산업안전보건법 제64조 제1항에 따른 표준 운영 방식으로 고정되어 있으며, 별도 입력 없이 그대로 다운로드 문서에 포함됩니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">구분</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">실시주기</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">참석대상</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">주요 안건</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
${dipReadonlyBlock("사후관리", COUNCIL_MEETING_FOLLOWUP_TEXT)}
</div>
</section>
`;
}

// "안전보건관리비 집행 청렴서약서" — 실제 LH 샘플 화성동탄(2) 123p("2. 안전보건관리비
// 집행 청렴서약서")의 정식 서약서 양식(제목 + 서약 조항 4개 + 서명란)으로 고정
// 서식화했다. 서약 조항은 산업안전보건법령·고시 기준 표준 문구라 고정이고, 공사명·
// 발주처·상호(회사명)·대표자는 사업개요/회원 정보에서 자동으로 채워 넣는다(각각
// doc.title/doc.agency/members.company/members.ceo_name) — 대표자 정보가 없는
// 회원(ceo_name 미입력)은 빈 칸으로 두고 직접 입력하게 한다. 현장대리인은 실제
// 작성자가 대표자와 다를 수 있어 회원 이름을 기본값으로만 채우고 자유롭게 수정할
// 수 있게 한다.
const INTEGRITY_PLEDGE_CLAUSES_TEXT =
  "당사는 본 공사를 수행함에 있어 「산업안전보건법」 제72조, 동법 시행규칙 제89조 및 고용노동부 고시 「건설업 산업안전보건관리비 계상 및 사용기준」을 철저히 준수하며, 계상된 안전보건관리비를 투명하고 공정하게 집행할 것을 다음과 같이 엄중히 서약합니다.\n" +
  "1. 목적 외 사용 금지 및 정당 집행: 법령에서 정한 용도(근로자 안전장구, 안전시설비, 안전진단비, 건강관리비 등) 외의 타 목적으로 전용·유용하거나 부당하게 집행하지 않습니다.\n" +
  "2. 정산 증빙서류의 정직성 확보: 세금계산서, 거래명세서, 지급노무비 내역, 안전장구 지급대장, 현장 사진 등 제반 증빙을 허위 작성하거나 부풀리지 않으며, 실제 집행된 내역만을 사실대로 제출하겠습니다.\n" +
  "3. 발주처 감독 및 시정요구 준수: 안전보건관리비 집행 실태 점검 및 정산 검토 시 관련 자료를 성실히 제출하고, 부적정 집행 지적 시 즉시 시정 및 반납 조치하겠습니다.\n" +
  "4. 위반 시 불이익 감수: 목적 외 사용, 허위 청구 등 불법·부당행위가 확인될 경우 관련 법령 및 계약조건에 따른 감액, 환수, 입찰참가자격 제한, 영업정지 등 어떠한 처분도 이의 없이 감수하겠습니다.";

function buildIntegrityPledgeNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-integrity_pledge">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  06
                </span>
<span class="group-hover:text-neutral-900">안전보건관리비 집행 청렴서약서</span>
</div>
</a>
`;
}

function buildIntegrityPledgeSectionHtml(
  projectTitle: string,
  agencyName: string,
  memberCompany: string,
  memberCeoName: string,
  memberName: string
): string {
  return `<!-- ════════ SECTION: 안전보건관리비 집행 청렴서약서 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-integrity_pledge">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅴ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">안전보건관리비 집행 청렴서약서</h2>
</div>
<div class="p-6 space-y-4">
<p class="text-xs text-neutral-500">서약 조항은 관계법령·고시 기준 표준 문구로 고정되어 있으며, 공사명·발주처·상호·대표자는 사업개요와 회원 정보에서 자동으로 채워집니다. 현장대리인 등 필요한 부분은 직접 수정하세요.</p>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">공사명</label>
<input class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="${projectTitle}"/>
</div>
<div>
<label class="block text-xs font-bold text-neutral-700 mb-1">발주처</label>
<input class="w-full text-xs bg-neutral-100/70 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900" type="text" value="${agencyName}"/>
</div>
</div>
${dipReadonlyBlock("서약 내용", INTEGRITY_PLEDGE_CLAUSES_TEXT)}
<div>
<p class="text-xs text-neutral-700 mb-2">위와 같이 서약합니다.</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<tbody>
<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-bold text-neutral-700 bg-neutral-50 w-[16%]">상호(법인명)</td>
<td class="px-3 py-2 border-b border-neutral-100"><input class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" value="${memberCompany}"/></td>
<td class="px-3 py-2 border-b border-neutral-100 font-bold text-neutral-700 bg-neutral-50 w-[16%]">대표자</td>
<td class="px-3 py-2 border-b border-neutral-100"><input class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" placeholder="대표자 성명" type="text" value="${memberCeoName}"/></td>
</tr>
<tr>
<td class="px-3 py-2 font-bold text-neutral-700 bg-neutral-50">현장대리인</td>
<td class="px-3 py-2" colspan="3"><input class="w-full text-xs border border-neutral-300 rounded px-2 py-1.5" type="text" value="${memberName}"/></td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
`;
}

// "적격업체(관계수급인) 선정 평가기준" — 실제 LH 샘플 화성동탄(2) 124~125p("3.
// 적격업체(관계수급인) 선정 평가기준")의 평가항목·배점표와 평가등급·처리기준표를
// 그대로 고정 서식화했다. 배점·등급기준 전부 표준 기준이라 별도 입력 항목은 없다.
const SUBCONTRACTOR_EVAL_PURPOSE_TEXT =
  "안전보건 역량을 갖춘 협력업체(관계수급인)를 선정하고, 산업재해 발생 이력 등 결격사유가 있는 부적격업체를 사전에 배제하기 위함";

const SUBCONTRACTOR_EVAL_SCORE_ROWS: { item: string; detail: string; score: string; evidence: string }[] = [
  {
    item: "안전보건관리체계\n(20점)",
    detail: "안전관리자·보건관리자 선임 여부, 안전보건 경영방침 수립·게시 여부, 안전보건 조직체계 구축 여부",
    score: "20",
    evidence: "선임신고증, 경영방침 게시사진 등",
  },
  {
    item: "산업재해발생률\n(25점)",
    detail: "최근 3년간 동종업종 평균재해율 대비 신청업체 재해율\n(평균 이하: 25점, 평균~150%: 15점, 150% 초과: 5점)",
    score: "25",
    evidence: "산업재해율조회결과(고용노동부)",
  },
  {
    item: "중대재해 발생이력\n(15점)",
    detail: "최근 3년간 중대재해(사망·중대산업재해) 발생 여부\n(무: 15점, 유: 0점)",
    score: "15",
    evidence: "중대재해 발생 확인서, 관계기관 조회",
  },
  {
    item: "안전보건교육체계\n(15점)",
    detail: "정기 안전보건교육 계획 수립 여부 및 최근 1년간 법정교육 이수율\n(90% 이상: 15점, 70~90%: 10점, 70% 미만: 5점)",
    score: "15",
    evidence: "교육계획서, 이수현황표",
  },
  {
    item: "안전보건경영시스템인증\n(10점)",
    detail: "ISO45001, KOSHA-MS 등 안전보건경영시스템 인증 보유 여부\n(보유: 10점, 미보유: 0점)",
    score: "10",
    evidence: "인증서 사본",
  },
  {
    item: "법령준수/결격사유\n(15점)",
    detail: "입찰참가자격제한, 영업정지, 부정당업자 제재 등 결격사유 해당 여부\n(무: 15점, 유: 0점 및 선정 제외)",
    score: "15",
    evidence: "청렴서약서, 제재현황 조회",
  },
];

const SUBCONTRACTOR_EVAL_GRADE_ROWS: { result: string; grade: string; action: string }[] = [
  {
    result: "90점 이상",
    grade: "우수업체",
    action: "협력업체 등록 시 가점 부여 및 물량배정 시 우선 고려",
  },
  {
    result: "70~89점",
    grade: "적격",
    action: "계약체결 가능. 단, 미흡 평가항목에 대해 개선요청서 발부 및 이행확인",
  },
  {
    result: "70점 미만",
    grade: "부적격",
    action:
      "원칙적으로 계약체결 제한. 불가피한 경우 개선계획서 제출 및 현장소장 승인 후 조건부 계약, 계약 후 1개월 이내 재평가",
  },
  {
    result: "중대재해 이력 유(有) 또는 결격사유 해당",
    grade: "선정 제외",
    action: "총점과 관계없이 원칙적으로 선정 대상에서 제외(발주자·현장 안전관리 총괄책임자 협의 시 예외)",
  },
];

const SUBCONTRACTOR_EVAL_TIMING_TEXT =
  "계약체결 전 1회 실시(신규평가)하며, 도급기간이 1년 이상인 경우 매년 1회 이상 재평가한다. 평가는 현장소장이 실시하고 안전관리자가 검토·보좌한다.";

const SUBCONTRACTOR_EVAL_RECORDKEEPING_TEXT =
  "평가표, 확인서류 사본 등 평가 관련 기록은 계약기간 종료 후 3년간 현장에 보관한다.";

function buildSubcontractorEvaluationNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-subcontractor_evaluation">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  07
                </span>
<span class="group-hover:text-neutral-900">적격업체(관계수급인) 선정 평가기준</span>
</div>
</a>
`;
}

function buildSubcontractorEvaluationSectionHtml(): string {
  const scoreRows = SUBCONTRACTOR_EVAL_SCORE_ROWS.map(
    ({ item, detail, score, evidence }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top whitespace-pre-line w-[16%]">${escapeHtmlPolicy(
      item
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top whitespace-pre-line">${escapeHtmlPolicy(detail)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top text-center w-[8%]">${escapeHtmlPolicy(score)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[20%]">${escapeHtmlPolicy(evidence)}</td>
</tr>`
  ).join("\n");

  const gradeRows = SUBCONTRACTOR_EVAL_GRADE_ROWS.map(
    ({ result, grade, action }) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top w-[22%]">${escapeHtmlPolicy(
      result
    )}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[14%]">${escapeHtmlPolicy(grade)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(action)}</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 적격업체(관계수급인) 선정 평가기준 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-subcontractor_evaluation">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅴ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">적격업체(관계수급인) 선정 평가기준</h2>
</div>
<div class="p-6 space-y-5">
<p class="text-xs text-neutral-500">평가항목·배점·등급기준은 표준 기준으로 고정되어 있으며, 별도 입력 없이 그대로 다운로드 문서에 포함됩니다.</p>
${dipReadonlyBlock("가. 평가목적", SUBCONTRACTOR_EVAL_PURPOSE_TEXT)}
<div>
<p class="font-bold text-neutral-800 mb-2">나. 평가항목 및 배점표(100점 만점)</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">평가항목(배점)</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">세부 평가내용</th>
<th class="text-center px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">배점</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">확인(증빙)서류</th>
</tr>
</thead>
<tbody>
${scoreRows}
<tr>
<td class="px-3 py-2 font-bold text-neutral-800 bg-neutral-50" colspan="2">합계</td>
<td class="px-3 py-2 font-bold text-neutral-800 bg-neutral-50 text-center">100점</td>
<td class="px-3 py-2 bg-neutral-50"></td>
</tr>
</tbody>
</table>
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">다. 평가등급 및 처리기준</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">평가결과</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">등급</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">처리기준</th>
</tr>
</thead>
<tbody>
${gradeRows}
</tbody>
</table>
</div>
${dipReadonlyBlock("라. 평가시기 및 주체", SUBCONTRACTOR_EVAL_TIMING_TEXT)}
${dipReadonlyBlock("마. 증빙서류 보관", SUBCONTRACTOR_EVAL_RECORDKEEPING_TEXT)}
</div>
</section>
`;
}

// "종사자(관계수급인) 안전보건 관리비용 기준" — 실제 LH 샘플 화성동탄(2) 126~127p
// ("5. 종사자(관계수급인) 안전보건 관리비용 기준")를 고정 서식화했다. 실제 금액은
// 현장마다 다르므로: 1) 산업안전보건관리비는 이미 계산된 계상요율 추정치
// (contractAmount×2.93%, 사업개요의 도급공사비 기준 — 사업개요 탭의 계상 안전보건
// 관리비와 동일한 값)를 기본값으로 채워 넣고 직접 수정 가능하게 하며, 2) 안전관리비
// (건설기술진흥법) 세부 8개 항목 + 예비 안전관리비는 사업개요에서 가져올 수 있는
// 값이 없어(공사종류별 세부 견적이 필요) 직접 입력하게 하되, 합계는 항목 입력값의
// 합으로 항상 자동 계산한다(화면에서는 WizardScreen.tsx가 입력 즉시 재계산하고,
// 다운로드 문서는 이 함수가 저장된 값으로 서버에서 다시 계산해 넣는다 — 위험성평가
// 표의 위험성(빈도×강도) 자동계산과 동일한 패턴).
const SAFETY_COST_LEGAL_BASIS_TEXT =
  "산업안전보건법 제72조(산업안전보건관리비) 및 건설기술진흥법 제63조(안전관리비) – 발주처 현장설명서 붙임 「안전관리비 세부현황」 기준";

const SAFETY_COST_INDUSTRIAL_BASIS_TEXT =
  "Min[① (재료비+직접노무비)×2.37%×1.2, ② (재료비+직접노무비+지급자재비/1.1)×2.37%]";

const SAFETY_COST_ENGINEERING_BASIS_TEXT =
  "건설기술진흥법 시행령 제98조에 따른 8개 세부항목 합계(예비 안전관리비 포함) – 아래 다. 세부내역 참조";

const SAFETY_COST_ITEMS: { label: string }[] = [
  { label: "1. 정기안전점검비" },
  { label: "2. 정기안전점검비(건설기계, 가설구조물)" },
  { label: "3. 가설구조물의 구조적 안전성 확인에 필요한 비용" },
  { label: "4. 안전관리계획 작성 및 검토비용" },
  { label: "5. 발파굴착 등의 건설공사로 인한 주변 건축물 등의 피해방지대책 비용" },
  { label: "6. 공사장 주변의 통행안전관리대책 비용" },
  { label: "7. 계측장비, 폐쇄회로 텔레비전 등 안전모니터링 장치의 설치·운용 비용" },
  { label: "8. 무선설비 및 무선통신을 이용한 건설공사 현장의 안전관리체계 구축·운용 비용" },
];

const SAFETY_COST_DISTRIBUTION_TEXT =
  "1) 위 산업안전보건관리비는 원도급사가 관계수급인의 공사금액 비율 또는 실제 투입인원·작업기간 비율에 따라 배분하며, 고위험작업(굴착, 흙막이가시설, 고소작업, 밀폐공간, 중장비 사용 등)에 참여하는 관계수급인에는 위험도 가중치(1.2배~1.5배)를 적용하여 우선 배분한다.\n" +
  "2) 관계수급인은 배분받은 금액을 산업안전보건관리비 사용기준상 8개 사용항목(안전관리자 등 인건비, 안전시설비, 개인보호구, 안전보건교육비 및 행사비, 근로자 건강장해 예방비, 건설재해예방 기술지도비, 본사 사용비, 스마트 안전장비 등) 범위 내에서만 사용한다.\n" +
  "3) 위 안전관리비(건설기술진흥법)는 정기안전점검·가설구조물 안전성확인·안전관리계획 작성·통행안전관리대책·계측 및 CCTV 모니터링·무선안전관리체계 등 현장 전체의 공통 안전관리에 원도급사가 직접 집행하며, 관계수급인에게 개별 배분하지 않는다. 다만 그 효과(CCTV 모니터링, 통행안전관리대책 등)는 관계수급인 소속 근로자를 포함한 현장 전체 종사자에게 동일하게 적용된다.";

const SAFETY_COST_USAGE_EXAMPLE_TEXT =
  "· 개인보호구(안전모·안전화·안전대·마스크 등): 관계수급인 투입인원 기준 1인당 지급수량에 따라 지급하며, 마모·손상 시 즉시 재지급한다.\n" +
  "· 안전시설물(안전난간, 방호망, 낙하물방지망, 개구부 덮개 등): 공정별 소요수량을 산출하여 실제 설치비용을 반영한다.\n" +
  "· 안전보건교육비: 관계수급인 소속 근로자의 1인당 교육시간 기준 강사료·교재비를 반영한다.\n" +
  "· 특수건강진단비: 유해인자 취급 근로자를 대상으로 실비를 반영한다.";

const SAFETY_COST_EXECUTION_TEXT =
  "1) 관계수급인은 매월 안전보건관리비 사용내역서를 작성하여 원도급사에 제출하고, 원도급사는 이를 취합·정산한다.\n" +
  "2) 공정률별 최소 사용기준(공정률 50~70% 미만: 50% 이상, 70~90% 미만: 70% 이상, 90% 이상: 90% 이상)을 준수하며, 미달 시 사유서를 제출하고 익월 집행계획에 반영한다.\n" +
  "3) 예비 안전관리비는 향후 반영·집행될 경우 내역상 안전관리비를 우선 사용한 후, 감독(관)의 사전승인을 득하여 사용하고 반드시 사후정산한다.\n" +
  "4) 목적 외 사용, 미달 집행 등이 확인될 경우 시정조치를 요구하고 재사용을 명한다.\n" +
  "※ 상기 금액은 발주처 현장설명서 붙임 「안전관리비 세부현황」에 반영된 금액을 기준으로 작성하며, 계약체결·설계변경 등에 따라 금액이 변경될 경우 이를 재확인하여 반영한다.";

function buildSafetyCostNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-safety_cost">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  08
                </span>
<span class="group-hover:text-neutral-900">종사자(관계수급인) 안전보건 관리비용 기준</span>
</div>
</a>
`;
}

function buildSafetyCostSectionHtml(
  safetyCostAmounts: Record<string, string>,
  defaultIndustrialAmount: number | null
): string {
  const parseAmount = (v: string | undefined): number => {
    const n = Number((v ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const industrialValue = safetyCostAmounts.industrial ?? (defaultIndustrialAmount ? String(defaultIndustrialAmount) : "");
  const itemValues = SAFETY_COST_ITEMS.map((_, i) => safetyCostAmounts[String(i)] ?? "");
  const reserveValue = safetyCostAmounts.reserve ?? "0";
  const engineeringTotal =
    itemValues.reduce((sum, v) => sum + parseAmount(v), 0) + parseAmount(reserveValue);

  const itemRows = SAFETY_COST_ITEMS.map(
    ({ label }, i) => `<tr>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(label)}</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[22%]">
<input type="text" inputmode="numeric" data-safety-cost-item="${i}" class="w-full text-xs text-right bg-white border border-neutral-300 rounded-lg px-2 py-1.5" placeholder="0" value="${escapeHtmlPolicy(
      itemValues[i]
    )}"/>
</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top w-[16%] text-neutral-500">원</td>
</tr>`
  ).join("\n");

  return `<!-- ════════ SECTION: 종사자(관계수급인) 안전보건 관리비용 기준 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-safety_cost">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅴ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">종사자(관계수급인) 안전보건 관리비용 기준</h2>
</div>
<div class="p-6 space-y-5">
<p class="text-xs text-neutral-500">항목·산정기준·사용기준은 표준 문구로 고정되어 있으며, 산업안전보건관리비는 사업개요의 도급공사비를 기준으로 자동 계산된 추정치가 채워집니다. 실제 계상금액과 세부내역 금액은 발주처 현장설명서 기준으로 직접 입력·수정하세요.</p>
${dipReadonlyBlock("가. 법적 근거", SAFETY_COST_LEGAL_BASIS_TEXT)}
<div>
<p class="font-bold text-neutral-800 mb-2">나. 본 공사 계상현황</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[22%]">구분</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[22%]">반영금액(원)</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">산정기준 / 비고</th>
</tr>
</thead>
<tbody>
<tr>
<td class="px-3 py-2 border-b border-neutral-100 font-medium text-neutral-800 align-top">산업안전보건관리비<br/>(산업안전보건법)</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">
<input type="text" inputmode="numeric" data-safety-cost-industrial class="w-full text-xs text-right bg-white border border-neutral-300 rounded-lg px-2 py-1.5" placeholder="0" value="${escapeHtmlPolicy(
    industrialValue
  )}"/>
</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">${escapeHtmlPolicy(SAFETY_COST_INDUSTRIAL_BASIS_TEXT)}</td>
</tr>
<tr>
<td class="px-3 py-2 align-top font-medium text-neutral-800">안전관리비<br/>(건설기술진흥법)</td>
<td class="px-3 py-2 align-top">
<input type="text" readonly data-safety-cost-engineering-total class="w-full text-xs text-right bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-1.5 font-semibold text-neutral-700" value="${engineeringTotal.toLocaleString(
    "ko-KR"
  )}"/>
</td>
<td class="px-3 py-2 align-top">${escapeHtmlPolicy(SAFETY_COST_ENGINEERING_BASIS_TEXT)}</td>
</tr>
</tbody>
</table>
</div>
<div>
<p class="font-bold text-neutral-800 mb-2">다. 안전관리비(건설기술진흥법) 세부내역</p>
<table class="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden table-fixed">
<thead>
<tr class="bg-neutral-100">
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200">세부 항목</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[22%]">반영금액</th>
<th class="text-left px-3 py-2 font-bold text-neutral-700 border-b border-neutral-200 w-[16%]">비고</th>
</tr>
</thead>
<tbody>
${itemRows}
<tr>
<td class="px-3 py-2 border-b border-neutral-100 align-top">· 예비 안전관리비</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top">
<input type="text" inputmode="numeric" data-safety-cost-reserve class="w-full text-xs text-right bg-white border border-neutral-300 rounded-lg px-2 py-1.5" placeholder="0" value="${escapeHtmlPolicy(
    reserveValue
  )}"/>
</td>
<td class="px-3 py-2 border-b border-neutral-100 align-top text-neutral-500">붙임 기준</td>
</tr>
<tr>
<td class="px-3 py-2 font-bold text-neutral-800 bg-neutral-50">합 계</td>
<td class="px-3 py-2 bg-neutral-50">
<input type="text" readonly data-safety-cost-engineering-total class="w-full text-xs text-right bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-1.5 font-bold text-neutral-800" value="${engineeringTotal.toLocaleString(
    "ko-KR"
  )}"/>
</td>
<td class="px-3 py-2 bg-neutral-50"></td>
</tr>
</tbody>
</table>
</div>
${dipReadonlyBlock("라. 종사자(관계수급인) 배분 및 사용기준", SAFETY_COST_DISTRIBUTION_TEXT)}
${dipReadonlyBlock("마. 세부 사용항목별 기준(예시)", SAFETY_COST_USAGE_EXAMPLE_TEXT)}
${dipReadonlyBlock("바. 집행 및 확인절차", SAFETY_COST_EXECUTION_TEXT)}
</div>
</section>
`;
}

// "재해발생 수준" — 자유 서술 대신 증빙자료(이미지) 첨부 방식으로 바꿨다. 산재
// 요양승인확인서·산업재해율 조회결과는 필수, 안전보건경영시스템 인증서는 있는
// 경우에만 첨부한다. 각 자료는 안전보건 경영방침 이미지 첨부와 동일한 방식으로
// Storage(accident-level-attachments 버킷)에 올리고, 다운로드 문서(DOCX/PDF)에는
// 첨부된 이미지 그대로 한 페이지씩 삽입된다(미첨부 항목은 생략). HWPX는 표·이미지를
// 지원하지 않는 생성기라 첨부 여부만 문구로 표시한다.
export const ACCIDENT_LEVEL_SLOTS: { key: string; label: string; required: boolean }[] = [
  { key: "accident_report", label: "산재요양승인확인서", required: true },
  { key: "accident_rate", label: "산업재해율 조회결과", required: true },
  { key: "iso_cert", label: "안전보건경영시스템 인증서", required: false },
];

function buildAccidentLevelUploadsNavHtml(): string {
  return `<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-accident_level">
<div class="flex items-center gap-2">
<span class="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-mono">
                  09
                </span>
<span class="group-hover:text-neutral-900">재해발생 수준</span>
</div>
</a>
`;
}

function buildAccidentLevelUploadsSectionHtml(
  attachments: Record<string, string | null | undefined>,
  imageUrls: Record<string, string | null | undefined>
): string {
  const slotsHtml = ACCIDENT_LEVEL_SLOTS.map(({ key, label, required }) => {
    const path = attachments[key] ?? "";
    const url = imageUrls[key] ?? "";
    const hasImage = Boolean(url);
    return `<div class="border border-neutral-200 rounded-lg p-4" data-accident-slot="${key}" data-accident-slot-path="${escapeHtmlPolicy(
      path
    )}">
<div class="flex items-center justify-between mb-2">
<p class="font-bold text-neutral-800 text-sm">${escapeHtmlPolicy(label)}${required ? "" : " (해당 시 첨부)"}</p>
</div>
<input type="file" accept="image/png,image/jpeg" data-accident-image-input class="text-xs" />
<div class="mt-3 ${hasImage ? "" : "hidden"}" data-accident-image-preview-wrap>
<img data-accident-image-preview src="${escapeHtmlPolicy(url)}" class="max-w-full max-h-[420px] rounded-lg border border-neutral-200" alt="${escapeHtmlPolicy(
      label
    )}"/>
<button type="button" data-accident-image-remove class="mt-2 text-xs text-rose-600 hover:underline">삭제</button>
</div>
<p class="text-[11px] text-neutral-400 mt-1" data-accident-image-status>${
      hasImage ? "업로드된 자료가 저장되어 있습니다." : "아직 업로드된 자료가 없습니다(미첨부 시 없는 것으로 처리됩니다)."
    }</p>
</div>`;
  }).join("\n");

  return `<!-- ════════ SECTION: 재해발생 수준 ════════ -->
<section class="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden scroll-mt-[196px]" id="sec-accident_level">
<div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2.5">
<span class="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center">Ⅵ</span>
<h2 class="font-headline font-bold text-base text-neutral-900">재해발생 수준</h2>
</div>
<div class="p-6 space-y-4">
<p class="text-xs text-neutral-500">각 증빙자료를 이미지(PNG/JPG)로 첨부하세요. 첨부된 자료는 다운로드 문서에 그대로 한 페이지씩 포함되며, 첨부하지 않은 항목은 없는 것으로 처리됩니다.</p>
${slotsHtml}
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
  safetyPolicyImageUrl?: string | null,
  accidentLevelImageUrls?: Record<string, string | null | undefined>
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
  const memberCeoName = escapeHtml(member?.ceoName?.trim() || "");
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
    (agencyTemplate?.show_risk_assessment_rules ? 1 : 0) +
    (agencyTemplate?.show_hazard_management ? 3 : 0) +
    (agencyTemplate?.show_daily_inspection_plan ? 1 : 0) +
    (agencyTemplate?.show_ptw_plan ? 1 : 0) +
    (agencyTemplate?.show_protection_equipment_plan ? 1 : 0) +
    (agencyTemplate?.show_emergency_plan ? 1 : 0) +
    (agencyTemplate?.show_council_meeting_plan ? 1 : 0) +
    (agencyTemplate?.show_integrity_pledge ? 1 : 0) +
    (agencyTemplate?.show_subcontractor_evaluation ? 1 : 0) +
    (agencyTemplate?.show_safety_cost_plan ? 1 : 0) +
    (agencyTemplate?.show_accident_level_uploads ? 1 : 0);

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
  // "유해·위험 기계·기구·물질의 방호조치 및 관리계획" — 기계·기구/차량계건설기계·
  // 하역운반기계/유해·위험물질(MSDS) 3개 절을 한 세트로 켠다(실제 LH 샘플에서도
  // 세 절이 항상 함께 다뤄지는 하나의 장이라 플래그도 하나로 묶는다).
  const hazardMachineryNavHtml = agencyTemplate?.show_hazard_management ? buildHazardMachineryNavHtml() : "";
  const hazardVehicleNavHtml = agencyTemplate?.show_hazard_management ? buildHazardVehicleNavHtml() : "";
  const hazardSubstanceNavHtml = agencyTemplate?.show_hazard_management ? buildHazardSubstanceNavHtml() : "";
  // 항목을 추가·삭제할 수 있어야 하므로(위험성평가 표와 동일한 이유로) 문서마다
  // documents.content에 실제 행 배열을 저장한다 — 아직 한 번도 저장된 적 없으면
  // (신규 문서) 원본 데이터를 기본값으로 채운다.
  const hazardMachineryRows =
    (doc.content?.hazardMachineryRows as HazardRow[] | undefined) ?? HAZARD_MACHINERY_ITEMS.map(hazardItemToRow);
  const hazardVehicleRows =
    (doc.content?.hazardVehicleRows as HazardRow[] | undefined) ?? HAZARD_VEHICLE_ITEMS.map(hazardItemToRow);
  const hazardSubstanceRows =
    (doc.content?.hazardSubstanceRows as HazardRow[] | undefined) ?? HAZARD_SUBSTANCE_ITEMS.map(hazardSubstanceItemToRow);
  const hazardMachinerySectionHtml = agencyTemplate?.show_hazard_management
    ? buildHazardCategorySectionHtml({
        sectionId: "hazard_machinery",
        modalPrefix: "haz-mc",
        roman: "Ⅱ",
        title: "위험기계·기구별 관리 및 세부실행계획",
        itemColumnLabel: "기계·기구명",
        description:
          '항목별로 안전점검·보호구·교육·표지부착 등 적용 여부만 체크하고, "상세 작성" 버튼을 누르면 항목 전용 팝업에서 실제 세부실행계획을 작성합니다. 현장에 없는 장비는 삭제하고, 목록에 없는 장비는 "항목 추가"로 새로 넣을 수 있습니다.',
        checkColumns: HAZARD_MC_CHECK_COLUMNS,
        detailFields: HAZARD_MC_DETAIL_FIELDS,
        rows: hazardMachineryRows,
      })
    : "";
  const hazardVehicleSectionHtml = agencyTemplate?.show_hazard_management
    ? buildHazardCategorySectionHtml({
        sectionId: "hazard_vehicle",
        modalPrefix: "haz-vh",
        roman: "Ⅱ",
        title: "차량계 건설기계·하역운반기계별 관리 및 세부실행계획",
        itemColumnLabel: "차량계 건설기계·하역운반기계명",
        description:
          '항목별로 안전점검·보호구·교육·표지부착 등 적용 여부만 체크하고, "상세 작성" 버튼을 누르면 항목 전용 팝업에서 실제 세부실행계획을 작성합니다. 현장에 없는 장비는 삭제하고, 목록에 없는 장비는 "항목 추가"로 새로 넣을 수 있습니다.',
        checkColumns: HAZARD_MC_CHECK_COLUMNS,
        detailFields: HAZARD_MC_DETAIL_FIELDS,
        rows: hazardVehicleRows,
      })
    : "";
  const hazardSubstanceSectionHtml = agencyTemplate?.show_hazard_management
    ? buildHazardCategorySectionHtml({
        sectionId: "hazard_substance",
        modalPrefix: "haz-sb",
        roman: "Ⅱ",
        title: "유해·위험물질(MSDS)별 관리 및 세부실행계획",
        itemColumnLabel: "유해·위험물질명",
        description:
          '물질별로 국소배기·보호구·교육·표지부착 등 적용 여부만 체크하고, "상세 작성" 버튼을 누르면 물질 전용 팝업에서 실제 세부실행계획(MSDS 기반)을 작성합니다. 현장에서 쓰지 않는 물질은 삭제하고, 목록에 없는 물질은 "항목 추가"로 새로 넣을 수 있습니다.',
        checkColumns: HAZARD_SB_CHECK_COLUMNS,
        detailFields: HAZARD_SB_DETAIL_FIELDS,
        rows: hazardSubstanceRows,
      })
    : "";
  const dailyInspectionPlanNavHtml = agencyTemplate?.show_daily_inspection_plan
    ? buildDailyInspectionPlanNavHtml()
    : "";
  const dailyInspectionPlanSectionHtml = agencyTemplate?.show_daily_inspection_plan
    ? buildDailyInspectionPlanSectionHtml()
    : "";
  const ptwPlanNavHtml = agencyTemplate?.show_ptw_plan ? buildPtwPlanNavHtml() : "";
  const ptwPlanSectionHtml = agencyTemplate?.show_ptw_plan ? buildPtwPlanSectionHtml() : "";
  const ppeQuantities = (doc.content?.ppeQuantities as Record<string, string> | undefined) ?? {};
  const protectionEquipmentNavHtml = agencyTemplate?.show_protection_equipment_plan
    ? buildProtectionEquipmentNavHtml()
    : "";
  const protectionEquipmentSectionHtml = agencyTemplate?.show_protection_equipment_plan
    ? buildProtectionEquipmentSectionHtml(ppeQuantities)
    : "";
  const emergencyContactRows = doc.content?.emergencyContactRows as EmergencyContactRow[] | undefined;
  const emergencyPlanNavHtml = agencyTemplate?.show_emergency_plan ? buildEmergencyPlanNavHtml() : "";
  const emergencyPlanSectionHtml = agencyTemplate?.show_emergency_plan
    ? buildEmergencyPlanSectionHtml(emergencyContactRows)
    : "";
  const councilMeetingPlanNavHtml = agencyTemplate?.show_council_meeting_plan
    ? buildCouncilMeetingPlanNavHtml()
    : "";
  const councilMeetingPlanSectionHtml = agencyTemplate?.show_council_meeting_plan
    ? buildCouncilMeetingPlanSectionHtml()
    : "";
  const integrityPledgeNavHtml = agencyTemplate?.show_integrity_pledge ? buildIntegrityPledgeNavHtml() : "";
  const integrityPledgeSectionHtml = agencyTemplate?.show_integrity_pledge
    ? buildIntegrityPledgeSectionHtml(projectTitle, agencyName, memberCompany, memberCeoName, memberName)
    : "";
  const subcontractorEvaluationNavHtml = agencyTemplate?.show_subcontractor_evaluation
    ? buildSubcontractorEvaluationNavHtml()
    : "";
  const subcontractorEvaluationSectionHtml = agencyTemplate?.show_subcontractor_evaluation
    ? buildSubcontractorEvaluationSectionHtml()
    : "";
  const safetyCostAmounts = (doc.content?.safetyCostAmounts as Record<string, string> | undefined) ?? {};
  const safetyCostNavHtml = agencyTemplate?.show_safety_cost_plan ? buildSafetyCostNavHtml() : "";
  const safetyCostSectionHtml = agencyTemplate?.show_safety_cost_plan
    ? buildSafetyCostSectionHtml(safetyCostAmounts, safetyBudget)
    : "";
  const accidentLevelAttachments =
    (doc.content?.accidentLevelAttachments as Record<string, string | null> | undefined) ?? {};
  const accidentLevelUploadsNavHtml = agencyTemplate?.show_accident_level_uploads
    ? buildAccidentLevelUploadsNavHtml()
    : "";
  const accidentLevelUploadsSectionHtml = agencyTemplate?.show_accident_level_uploads
    ? buildAccidentLevelUploadsSectionHtml(accidentLevelAttachments, accidentLevelImageUrls ?? {})
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
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${hazardMachineryNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${hazardVehicleNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${hazardSubstanceNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${dailyInspectionPlanNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${ptwPlanNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${protectionEquipmentNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${emergencyPlanNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${councilMeetingPlanNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${integrityPledgeNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${subcontractorEvaluationNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${safetyCostNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
    )
    .replace(
      '<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">',
      `${accidentLevelUploadsNavHtml}<a class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition group" href="#sec-risk">`
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
${managementPolicySectionHtml}${orgChartSectionHtml}${roleResponsibilitiesSectionHtml}${educationPlanSectionHtml}${hazardMachinerySectionHtml}${hazardVehicleSectionHtml}${hazardSubstanceSectionHtml}${dailyInspectionPlanSectionHtml}${ptwPlanSectionHtml}${protectionEquipmentSectionHtml}${emergencyPlanSectionHtml}${councilMeetingPlanSectionHtml}${integrityPledgeSectionHtml}${subcontractorEvaluationSectionHtml}${safetyCostSectionHtml}${accidentLevelUploadsSectionHtml}<!-- ════════ SECTION Ⅱ: 안전보건관리체계 및 위험성평가 ════════ -->`
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
    commonLabels.hazard_machinery = "위험기계·기구별 관리계획";
    commonLabels.hazard_vehicle = "차량계 건설기계·하역운반기계 관리계획";
    commonLabels.hazard_substance = "유해·위험물질(MSDS) 관리계획";
    commonLabels.daily_inspection_plan = "안전점검 및 일일 순회계획";
    commonLabels.ptw_plan = "중점 위험작업허가제(PTW)";
    commonLabels.protection_equipment = "보호구 지급 및 착용확인 절차";
    commonLabels.emergency_plan = "중대산업재해 등 비상 상황시 조치계획";
    commonLabels.council_meeting_plan = "안전보건협의체 회의계획";
    commonLabels.integrity_pledge = "안전보건관리비 집행 청렴서약서";
    commonLabels.subcontractor_evaluation = "적격업체(관계수급인) 선정 평가기준";
    commonLabels.safety_cost = "종사자(관계수급인) 안전보건 관리비용 기준";
    if (agencyTemplate.show_accident_level_uploads) commonLabels.accident_level = "재해발생 수준";
    html = applySectionOrder(html, agencyTemplate.section_order, extraLabels, commonLabels);
  }

  return html;
}
