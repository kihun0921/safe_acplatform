import StitchScreen from "@/components/StitchScreen";

const HTML_not_found = `
<!-- 심플한 공개 헤더 (로고만) -->
  <header class="w-full border-b border-border bg-surface/90 backdrop-blur-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center">
      <a href="/" class="flex items-center gap-2.5 text-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md">
        <!-- 브랜드 심볼 (방패형 안전 마크) -->
        <img src="/logo.png" alt="올케어안전플랫폼 로고" class="w-8 h-8 object-contain"/>
        <div class="flex items-baseline gap-1.5">
          <span class="text-lg font-bold tracking-tight text-primary">올케어안전플랫폼</span>
          <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">공공조달 B2B</span>
        </div>
      </a>
    </div>
  </header>

  <!-- 메인 중앙 정렬 404 안내 콘텐츠 (최소한의 구성) -->
  <main class="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
    <div class="max-w-md mx-auto flex flex-col items-center">
      
      <!-- 부드러운 상태 인디케이터 아이콘 -->
      <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-6 ring-8 ring-slate-50">
        <i class="fa-solid fa-file-circle-exclamation text-2xl text-slate-500"></i>
      </div>

      <!-- 404 큰 숫자 -->
      <h1 class="text-7xl md:text-8xl font-black text-primary tracking-tight leading-none mb-4 font-sans select-none">
        404
      </h1>

      <!-- 제목 -->
      <h2 class="text-2xl md:text-3xl font-bold text-text mb-3 tracking-tight">
        페이지를 찾을 수 없습니다
      </h2>

      <!-- 짧은 안내문 -->
      <p class="text-text-secondary text-sm md:text-base leading-relaxed mb-8 max-w-sm">
        요청하신 페이지의 주소가 변경되었거나 삭제되어<br class="hidden sm:inline">
        현재 접근할 수 없습니다. 입력하신 주소를 다시 확인해 주세요.
      </p>

      <!-- 액션 버튼 영역: 홈으로 돌아가기 -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        <a href="#" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all duration-150 shadow-sm shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <i class="fa-solid fa-house text-xs"></i>
          <span>홈으로 돌아가기</span>
        </a>
      </div>

      <!-- 신속 문의 보조 링크 (미니멀) -->
      <div class="mt-8 pt-6 border-t border-border w-full flex items-center justify-center gap-4 text-xs text-text-muted">
        <span>고객센터 안내 <strong class="font-semibold text-text-secondary">1544-0000</strong></span>
        <span class="text-slate-300">|</span>
        <a href="#" class="hover:text-primary transition-colors underline-offset-4 hover:underline">이전 페이지로</a>
      </div>

    </div>
  </main>

  <!-- 미니멀 카피라이트 푸터 -->
  <footer class="w-full border-t border-border bg-surface-alt/50 py-4">
    <div class="max-w-7xl mx-auto px-6 text-center text-xs text-text-muted">
      &copy; 2025 올케어안전플랫폼. All rights reserved.
    </div>
  </footer>
`;

const SCRIPT_not_found = `

`;

export default function NotFound() {
  return <StitchScreen html={HTML_not_found} script={SCRIPT_not_found} />;
}
