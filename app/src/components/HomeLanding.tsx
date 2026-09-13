"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LANDING_HTML_TOP = `
<!-- 1. TopNavBar (Shared Component Anchor) -->
<header class="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm transition-all duration-200">
  <div class="flex justify-between items-center max-w-7xl mx-auto px-6 h-16 w-full">
    <!-- Brand Logo -->
    <a class="flex items-center gap-2.5 group" href="/">
      <img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-9 h-9 object-contain transition-transform group-hover:scale-105"/>
      <span class="font-headline text-xl font-bold tracking-tight text-primary">올케어안전플랫폼</span>
      <span class="hidden sm:inline-block text-[11px] font-semibold text-primary px-2 py-0.5 bg-primary-soft rounded-full tracking-wide">공공입찰 B2B</span>
    </a>
    <!-- Desktop Navigation Links -->
    <nav class="hidden md:flex items-center space-x-8">
      <a class="text-primary font-bold border-b-2 border-primary pb-1 font-label text-sm transition-colors" href="#search-section">공고 검색</a>
      <a class="text-text-secondary font-medium hover:text-text transition-colors font-label text-sm" href="#features-section">서비스 소개</a>
      <a class="text-text-secondary font-medium hover:text-text transition-colors font-label text-sm" href="#how-it-works">이용 가이드</a>
      <a class="text-text-secondary font-medium hover:text-text transition-colors font-label text-sm" href="#preview-widget">내 문서함</a>
      <a class="text-text-secondary font-medium hover:text-text transition-colors font-label text-sm" href="#cta-section">도입 문의</a>
    </nav>
    <!-- Desktop Trailing Actions -->
    <div class="hidden md:flex items-center space-x-4">
      <a class="text-sm font-label font-medium text-text-secondary hover:text-primary px-3 py-2 transition-colors" href="/login">로그인</a>
      <a class="text-sm font-label font-semibold text-white bg-orange-700 hover:bg-orange-800 px-4 py-2 rounded-lg shadow-sm transition-all hover:shadow active:opacity-90" href="#cta-section">무료로 시작하기</a>
    </div>
    <!-- Mobile Hamburger Button -->
    <button aria-label="메뉴 열기" class="md:hidden p-2 rounded-lg text-text hover:bg-surface-alt transition-colors focus:outline-none" id="mobileMenuBtn">
      <span class="material-symbols-outlined text-2xl">menu</span>
    </button>
  </div>
  <!-- Mobile Navigation Drawer -->
  <div class="hidden md:hidden border-b border-border bg-white px-6 py-4 space-y-3" id="mobileMenu">
    <a class="block py-2 text-primary font-bold border-l-4 border-primary pl-2 text-sm" href="#search-section">공고 검색</a>
    <a class="block py-2 text-text-secondary hover:text-primary font-medium text-sm pl-3" href="#features-section">서비스 소개</a>
    <a class="block py-2 text-text-secondary hover:text-primary font-medium text-sm pl-3" href="#how-it-works">이용 가이드</a>
    <a class="block py-2 text-text-secondary hover:text-primary font-medium text-sm pl-3" href="#preview-widget">내 문서함</a>
    <div class="pt-3 border-t border-border flex flex-col gap-2">
      <a class="w-full text-center py-2 text-sm font-medium text-text border border-border rounded-lg" href="/login">로그인</a>
      <a class="w-full text-center py-2 text-sm font-semibold text-white bg-orange-700 rounded-lg shadow-sm" href="#cta-section">무료로 시작하기</a>
    </div>
  </div>
</header>
<!-- Notice Disclaimer (Trust Protocol) -->
<aside class="bg-primary-soft/80 border-b border-primary/10 text-xs text-primary py-1.5 px-6 text-center font-label font-medium">
  <span class="inline-flex items-center gap-1.5">
    <span class="material-symbols-outlined text-sm">info</span>
    본 서비스는 조달청 나라장터 공공데이터포털 API 연동 및 산업안전보건법 제67조 관련 표준 지침을 준수합니다.
  </span>
</aside>
`;

const LANDING_HTML_BOTTOM = `
<!-- 4. How It Works (4 Steps) -->
<section class="py-16 lg:py-24 bg-[#f8fafc]" id="how-it-works">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center max-w-3xl mx-auto mb-16">
      <div class="inline-flex items-center gap-1 text-xs font-bold text-primary tracking-widest uppercase mb-2">PROCESS WORKFLOW</div>
      <h2 class="font-headline text-2xl lg:text-3xl font-bold text-primary tracking-tight mb-4">누구나 쉽게 끝내는 4단계 자동화 작성 프로세스</h2>
      <p class="text-text-secondary text-sm lg:text-base">수백 페이지에 달하는 발주기관 과업지시서 분석부터 제출용 공문 규격 출력까지 올케어안전플랫폼이 완벽하게 가이드합니다.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface p-6 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-all relative group">
        <div class="w-12 h-12 rounded-lg bg-primary-soft text-primary font-headline font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">01</div>
        <h3 class="font-headline font-bold text-lg text-primary mb-2">공고 검색</h3>
        <p class="text-xs text-text-secondary leading-relaxed font-body">나라장터 입찰공고 번호 또는 공고명을 입력하면 발주처, 공사예산, 공종 분류, 특별조건 등 입찰 메타 정보를 실시간으로 자동 연동합니다.</p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-text-muted gap-1"><span class="material-symbols-outlined text-sm text-primary">hub</span>조달청 API 1초 자동 연동</div>
      </div>
      <div class="bg-surface p-6 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-all relative group">
        <div class="w-12 h-12 rounded-lg bg-primary-soft text-primary font-headline font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">02</div>
        <h3 class="font-headline font-bold text-primary text-lg mb-2">요구사항 자동분석</h3>
        <p class="text-xs text-text-secondary leading-relaxed font-body">LH, SH, 도로공사 등 각 발주처별 고유 안전지침 및 최신 법령(중대재해처벌법, 산업안전보건법) 가이드라인을 AI가 자동 매칭하여 추출합니다.</p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-text-muted gap-1"><span class="material-symbols-outlined text-sm text-primary">psychology</span>발주처 전용 지침 100% 반영</div>
      </div>
      <div class="bg-surface p-6 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-all relative group">
        <div class="w-12 h-12 rounded-lg bg-primary-soft text-primary font-headline font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">03</div>
        <h3 class="font-headline font-bold text-primary text-lg mb-2">단계별 작성 가이드</h3>
        <p class="text-xs text-text-secondary leading-relaxed font-body">현장 인원 규모 및 공종 장비에 적합한 위험성평가표, 안전관리조직도, 비상조치 매뉴얼 세부 데이터를 양식 누락 없이 간편하게 기입합니다.</p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-text-muted gap-1"><span class="material-symbols-outlined text-sm text-primary">checklist</span>서식 누락 사전 방지</div>
      </div>
      <div class="bg-surface p-6 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-all relative group">
        <div class="w-12 h-12 rounded-lg bg-primary-soft text-primary font-headline font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">04</div>
        <h3 class="font-headline font-bold text-primary text-lg mb-2">PDF·HWPX·DOCX 즉시 출력</h3>
        <p class="text-xs text-text-secondary leading-relaxed font-body">공공기관 전자입찰 제출 규격에 부합하는 결격 없는 서류로 원클릭 변환되며, 인쇄용 고해상도 PDF 및 수정 가능한 한글(HWPX)·DOCX 파일로 제공됩니다.</p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-text-muted gap-1"><span class="material-symbols-outlined text-sm text-primary">download_for_offline</span>나라장터 직제출 최적화</div>
      </div>
    </div>
  </div>
</section>
<!-- 5. Key Features Highlight (3 Bento Cards) -->
<section class="py-16 lg:py-24 bg-white border-t border-border" id="features-section">
  <div class="max-w-7xl mx-auto px-6">
    <div class="max-w-3xl mb-12">
      <div class="text-xs font-bold text-primary uppercase tracking-widest mb-1.5 font-label">CORE ADVANTAGES</div>
      <h2 class="font-headline text-2xl lg:text-3xl font-bold text-primary tracking-tight mb-3">신뢰할 수 있는 건설 공공입찰 전문 솔루션</h2>
      <p class="text-text-secondary text-sm">단순한 범용 문서 작성기가 아닌, 건설 실무진과 공공입찰 심사관의 눈높이에 맞춘 특화 엔진입니다.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-surface-alt rounded-2xl p-8 border border-border flex flex-col justify-between hover:border-primary/50 transition-all">
        <div>
          <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-6 shadow-sm"><span class="material-symbols-outlined text-2xl">sync_alt</span></div>
          <h3 class="font-headline text-xl font-bold text-primary mb-3">실시간 나라장터 연동</h3>
          <p class="text-text-secondary text-sm leading-relaxed mb-6 font-body">공고 취소, 정정공고, 질의회신에 따른 과업변경 지침을 실시간 트래킹합니다. 최신 변경사항을 놓쳐 적격심사에서 탈락하는 리스크를 사전에 완벽히 차단합니다.</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-border/80 text-xs font-label text-text-secondary space-y-2">
          <div class="flex items-center justify-between"><span class="font-medium text-text">공공데이터 실시간 폴링</span><span class="text-success font-semibold">정상 작동</span></div>
        </div>
      </div>
      <div class="bg-surface-alt rounded-2xl p-8 border border-border flex flex-col justify-between hover:border-primary/50 transition-all">
        <div>
          <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-6 shadow-sm"><span class="material-symbols-outlined text-2xl">account_tree</span></div>
          <h3 class="font-headline text-xl font-bold text-primary mb-3">공고별 요구항목 자동 매칭</h3>
          <p class="text-text-secondary text-sm leading-relaxed mb-6 font-body">한국토지주택공사(LH), 한국도로공사, 국가철도공단 등 주요 공공 발주기관마다 상이한 안전보건 평가 양식을 데이터베이스화하여 1:1로 매핑합니다.</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-border/80 text-xs font-label text-text-secondary space-y-2">
          <div class="flex items-center justify-between"><span class="text-text-muted">적격심사 가점 항목 분석</span><span class="text-success font-semibold">완벽 검증 지원</span></div>
        </div>
      </div>
      <div class="bg-surface-alt rounded-2xl p-8 border border-border flex flex-col justify-between hover:border-primary/50 transition-all">
        <div>
          <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-6 shadow-sm"><span class="material-symbols-outlined text-2xl">picture_as_pdf</span></div>
          <h3 class="font-headline text-xl font-bold text-primary mb-3">PDF·HWPX·DOCX 즉시 다운로드</h3>
          <p class="text-text-secondary text-sm leading-relaxed mb-6 font-body">발주처 전자입찰 시스템에 바로 첨부 가능한 표준 고해상도 PDF, 한글 프로그램 호환 HWPX, 수정 가능한 DOCX 양식을 제한 없이 다운로드할 수 있습니다.</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-border/80 text-xs font-label text-text-secondary space-y-2">
          <div class="flex items-center justify-between"><span class="font-medium text-text">지원 포맷</span><span class="font-mono text-primary font-semibold">PDF, HWPX, DOCX</span></div>
        </div>
      </div>
    </div>
  </div>
</section>
<!-- 7. Final Call to Action Band -->
<section class="py-16 lg:py-20 bg-primary text-white relative overflow-hidden" id="cta-section">
  <div class="absolute inset-0 bg-[radial-gradient(#335384_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none"></div>
  <div class="relative max-w-5xl mx-auto px-6 text-center">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-medium mb-6 border border-white/15"><span class="material-symbols-outlined text-sm">lock</span>공공 입찰 규격 100% 보증제 운영</div>
    <h2 class="font-headline text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-tight mb-4">복잡한 공공 입찰 안전보건관리계획서,<br class="hidden sm:inline"/>이제 10분 만에 완성하세요</h2>
    <p class="text-slate-300 text-xs sm:text-base leading-relaxed mb-8 max-w-xs sm:max-w-none mx-auto sm:whitespace-nowrap">지금 바로 무료로 가입하고, 실시간 나라장터 공고에 맞는 안전보건관리계획서를 자동으로 완성해 보세요.</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
      <a class="w-full sm:w-auto px-7 py-3.5 bg-white text-primary hover:bg-slate-100 rounded-lg text-sm font-label font-bold shadow-lg flex items-center justify-center gap-2 transition-all" href="/login"><span>지금 바로 시작하기 (무료 체험)</span><span class="material-symbols-outlined text-lg">bolt</span></a>
      <a class="w-full sm:w-auto px-6 py-3.5 bg-primary-strong/70 hover:bg-primary-strong text-white border border-white/20 rounded-lg text-sm font-label font-medium flex items-center justify-center gap-1.5 transition-all" href="/legal?tab=customer-service"><span class="material-symbols-outlined text-lg">support_agent</span><span>도입 문의 상담</span></a>
    </div>
    <div class="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-300 font-label">
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-success-soft">done_all</span>별도 프로그램 설치 없는 웹 기반 SaaS</span>
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-success-soft">done_all</span>안전관리 전문가 상시 검토 지원</span>
    </div>
  </div>
</section>
<!-- 8. Footer (Shared Component Anchor) -->
<footer class="w-full bg-surface-alt border-t border-border flat no-shadows">
  <div class="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border">
      <div class="flex items-center gap-2">
        <img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-7 h-7 object-contain"/>
        <span class="font-headline text-base font-bold text-text">올케어안전플랫폼</span>
      </div>
      <nav class="flex flex-wrap gap-x-6 gap-y-2 text-xs font-body">
        <a class="text-text-muted hover:text-text transition-colors" href="/legal?tab=terms">이용약관</a>
        <a class="text-text font-semibold hover:text-text transition-colors" href="/legal?tab=privacy">개인정보처리방침</a>
        <a class="text-text-muted hover:text-text transition-colors" href="/legal?tab=customer-service">고객지원센터</a>
        <a class="text-text-muted hover:text-text transition-colors" href="/legal?tab=refund-policy">환불규정</a>
      </nav>
    </div>
    <div class="pt-4 border-t border-border/80 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-text-muted font-body">
      <p>© 2026 올케어안전플랫폼. All rights reserved. 본 서비스에서 제공하는 공고 및 계획서 양식은 관련 법령 및 발주처 지침을 준수합니다.</p>
    </div>
  </div>
</footer>
`;

export type LandingAnnouncement = {
  id: string;
  title: string;
  agency: string;
  announcement_number: string;
  deadline: string;
  base_amount: number | null;
  trade_type: string | null;
  awarded: boolean | null;
  winner_name: string | null;
  winner_amount: number | null;
  award_status: "provisional" | "confirmed" | null;
};

function formatAmount(amount: number | null): string {
  if (!amount) return "비공개";
  return `${amount.toLocaleString("ko-KR")}원`;
}


const CHECK_ITEMS = [
  { label: "안전보건관리체계 수립 및 조직도", pages: "12P" },
  { label: "공종별 위험성평가 실시계획", pages: "24P" },
  { label: "산업재해 예방조치 및 비상연락망", pages: "8P" },
];

// 홈 화면 히어로의 미리보기 카드: 실제 데이터가 아닌 데모 애니메이션이지만,
// 검증 항목이 순차적으로 실시간으로 채워지는 것처럼 보이도록 루프를 돈다.
function LiveDemoCard() {
  const [step, setStep] = useState(0); // 0: 분석중 -> 1,2,3: 항목 순차 표시 -> 4: 완료, 홀드

  useEffect(() => {
    const STEP_DELAY = 700;
    const HOLD_DELAY = 3200;
    const timer = setTimeout(
      () => setStep((s) => (s >= CHECK_ITEMS.length + 1 ? 0 : s + 1)),
      step === 0 ? STEP_DELAY : step > CHECK_ITEMS.length ? HOLD_DELAY : STEP_DELAY
    );
    return () => clearTimeout(timer);
  }, [step]);

  const doneCount = Math.max(0, Math.min(step, CHECK_ITEMS.length));
  const percent = Math.round((doneCount / CHECK_ITEMS.length) * 100);
  const complete = doneCount >= CHECK_ITEMS.length;

  return (
    <div className="relative w-full max-w-md h-[550px] bg-white border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded bg-primary-soft text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">description</span>
          </span>
          <div>
            <div className="text-xs text-text-muted font-mono">제출서류 서식 제14호</div>
            <div className="text-sm font-bold text-text">안전보건관리계획서 (최종본)</div>
          </div>
        </div>
        {complete ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-soft text-success">
            <span className="material-symbols-outlined text-xs">check</span>
            작성 완료
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            실시간 분석중
          </span>
        )}
      </div>
      <div className="bg-surface-alt rounded-lg p-3.5 border border-border/80 space-y-2 mb-4 text-xs font-label">
        <div className="flex justify-between">
          <span className="text-text-muted">공고번호</span>
          <span className="font-mono font-semibold text-text">202502-89211-00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">발주기관</span>
          <span className="font-semibold text-primary">한국토지주택공사 (LH)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">공사분야</span>
          <span className="text-text">건축공사업 / 복합공종</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">제출규격</span>
          <span className="text-text">LH 적격심사 안전보건평가 지침서 v4.2</span>
        </div>
      </div>
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="font-semibold text-text flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-primary">tune</span>필수 적합성 검증
          </span>
          <span className="font-bold text-success">{percent}% 충족</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-orange-700 h-full rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="space-y-2 mb-5">
        <div className="text-xs font-bold text-text-secondary tracking-wide uppercase font-label">발주처 필수항목 검증 현황</div>
        {CHECK_ITEMS.map((item, i) => {
          const done = i < doneCount;
          return (
            <div
              key={item.label}
              className={`flex items-center justify-between p-2 rounded border text-xs transition-all duration-500 ${
                done ? "bg-[#f8fafc] border-slate-200/60 opacity-100" : "bg-slate-50 border-slate-100 opacity-40"
              }`}
            >
              <div className="flex items-center gap-2">
                {done ? (
                  <span
                    className="material-symbols-outlined text-success text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
                )}
                <span className="text-text font-medium">{item.label}</span>
              </div>
              <span className="text-[11px] text-text-muted font-mono">{done ? `${item.pages} / 적합` : "검증중..."}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-text-muted flex items-center gap-1 font-label">
          <span className="material-symbols-outlined text-sm">verified</span>
          {complete ? "전자서명 인가 승인" : "실시간 자동 검증 진행중"}
        </span>
        <button className="text-xs font-semibold text-primary hover:text-primary-strong flex items-center gap-1 bg-primary-soft hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
          <span className="material-symbols-outlined text-sm">download</span>미리보기 PDF (2.4MB)
        </button>
      </div>
    </div>
  );
}

export default function HomeLanding({
  announcements,
  totalCount,
  tabCounts,
}: {
  announcements: LandingAnnouncement[];
  totalCount: number;
  tabCounts: { label: string; count: number }[];
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [heroQuery, setHeroQuery] = useState("");

  const filtered = useMemo(() => {
    const list = activeTab ? announcements.filter((a) => a.trade_type === activeTab) : announcements;
    return list.slice(0, 3);
  }, [announcements, activeTab]);

  useEffect(() => {
    const root = topRef.current;
    if (!root) return;

    const mobileBtn = root.querySelector<HTMLButtonElement>("#mobileMenuBtn");
    const mobileMenu = root.querySelector<HTMLDivElement>("#mobileMenu");
    const onMobileToggle = () => mobileMenu?.classList.toggle("hidden");
    mobileBtn?.addEventListener("click", onMobileToggle);

    return () => {
      mobileBtn?.removeEventListener("click", onMobileToggle);
    };
  }, []);

  const goToAnnouncements = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = heroQuery.trim();
    router.push(q ? `/announcements?q=${encodeURIComponent(q)}` : "/announcements");
  };

  return (
    <div>
      <div ref={topRef} dangerouslySetInnerHTML={{ __html: LANDING_HTML_TOP }} />

      <section className="relative overflow-hidden pt-12 pb-20 lg:py-24 bg-gradient-to-b from-white to-[#f8fafc]">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-soft border border-primary/15 text-primary text-xs font-semibold mb-6 shadow-2xs">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span>나라장터 실시간 연동 공공 발주처 특화 자동화</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-[42px] leading-snug font-bold text-primary tracking-tight mb-6">
              <span className="block">공고에 맞는 안전보건관리계획서,</span>
              <span className="block mt-3 sm:mt-4">
                <span className="text-primary underline decoration-primary/20 decoration-4 underline-offset-8">
                  자동으로 완성하세요
                </span>
              </span>
            </h1>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl">
              나라장터 입찰공고 번호만 입력하면 복잡한 발주처별 안전지침과 서식을 인공지능이 자동 분석하여, 결격 없는 공공 제출용 맞춤형 안전보건관리계획서를 생성합니다.
            </p>
            <div className="w-full max-w-2xl bg-white p-3 rounded-xl border border-border shadow-md hover:border-primary/40 transition-all mb-4">
              <form className="flex flex-col sm:flex-row gap-2.5" onSubmit={goToAnnouncements}>
                <div className="relative flex-1 flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-text-muted text-xl">search</span>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-[#f8fafc] border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                    placeholder="나라장터 공고번호, 공고명 일부, 또는 발주기관명을 입력하세요"
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                  />
                </div>
                <button
                  className="px-6 py-3 bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white font-label font-semibold text-sm rounded-lg shadow flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150"
                  type="submit"
                >
                  <span>계획서 작성 조회</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </form>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-text-muted font-label">
              <span className="text-text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-success">check_circle</span>
                LH·SH·철도공단 서식 완벽 대응
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-primary font-medium">평균 작성 소요시간 12분</span>
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <LiveDemoCard />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white border-t border-border" id="search-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1.5 font-label">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                조달청 나라장터 실시간 연동
              </div>
              <h2 className="font-headline text-2xl lg:text-3xl font-bold text-primary tracking-tight">
                안전보건관리계획서 제출 대상 공고
              </h2>
            </div>
            <p className="text-text-secondary text-sm max-w-md">
              개찰이 완료되어 안전보건관리계획서 작성이 가능한 공고 {totalCount.toLocaleString()}건이 등록되어 있습니다. 즉시 서식을 연동하여 계획서를 작성하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-border pb-3">
            <button
              onClick={() => setActiveTab(null)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                activeTab === null ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:bg-surface-alt hover:text-text font-medium"
              }`}
            >
              전체 ({totalCount.toLocaleString()})
            </button>
            {tabCounts.map((t) => (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.label)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  activeTab === t.label ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:bg-surface-alt hover:text-text font-medium"
                }`}
              >
                {t.label} ({t.count.toLocaleString()})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a) => {
              return (
                <div
                  key={a.id}
                  className="bg-surface rounded-xl border border-border p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary border border-primary/10">
                        {a.agency}
                      </span>
                      {a.award_status === "provisional" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md text-warn bg-warn-soft">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          낙찰 유력(1순위)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md text-success bg-success-soft">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          낙찰확정
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline font-bold text-base text-text group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {a.title}
                    </h3>
                    <div className="text-xs text-text-muted font-mono mb-4">공고번호: {a.announcement_number}</div>
                    <div className="space-y-2 py-3 border-y border-border/80 text-xs font-label mb-4">
                      <div className="flex justify-between">
                        <span className="text-text-muted">기초금액</span>
                        <span className="font-bold text-text">{formatAmount(a.base_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">마감(개찰)일</span>
                        <span className="text-text font-medium">{a.deadline}</span>
                      </div>
                    </div>
                    {a.awarded && (
                      <div className={`text-[11px] font-medium mb-4 ${a.award_status === "provisional" ? "text-warn" : "text-success"}`}>
                        {a.award_status === "provisional" ? "1순위 업체" : "낙찰자"}: {a.winner_name ?? "-"} ·{" "}
                        {a.award_status === "provisional" ? "투찰금액" : "낙찰금액"}:{" "}
                        {a.winner_amount ? `${a.winner_amount.toLocaleString("ko-KR")}원` : "-"}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary-soft text-primary px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-xs">task_alt</span>
                        안전보건관리계획서 필수 서식 포함
                      </span>
                    </div>
                  </div>
                  <a
                    href="/announcements"
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold font-label flex items-center justify-center gap-1.5 transition-all shadow-xs active:opacity-95"
                  >
                    <span>계획서 작성 시작</span>
                    <span className="material-symbols-outlined text-sm">edit_document</span>
                  </a>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-text-muted text-sm">
                {activeTab ? `현재 "${activeTab}" 분류의 등록된 공고가 없습니다.` : "현재 등록된 공고가 없습니다."}
              </div>
            )}
          </div>
          <div className="mt-6 text-center text-xs text-text-muted font-label">
            * 위 공고 리스트는 조달청 나라장터 낙찰정보 실시간 연계 기준이며, 낙찰(개찰)이 확정된 순서로 표시됩니다.
          </div>
        </div>
      </section>

      <div ref={bottomRef} dangerouslySetInnerHTML={{ __html: LANDING_HTML_BOTTOM }} />
    </div>
  );
}
