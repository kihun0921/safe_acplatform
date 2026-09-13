import { createClient } from "@/lib/supabase/server";
import LegalTabs from "@/components/LegalTabs";

export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const { data: pages } = await supabase.from("site_pages").select("*");
  const ORDER = ["terms", "privacy", "refund-policy", "customer-service"];
  pages?.sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fa]">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 md:px-8 max-w-7xl mx-auto h-16">
          <a className="flex items-center gap-3 group" href="/">
            <img src="/logo.png" alt="올케어안전플랫폼 로고" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-headline text-xl font-bold tracking-tight text-[#1e3a5f] leading-tight">
                올케어안전플랫폼
              </span>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide">공공입찰 안전 솔루션</span>
            </div>
          </a>
          <a
            className="inline-flex items-center justify-center px-4 py-2 text-xs md:text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#16304d] rounded-lg shadow-sm transition-colors"
            href="/login"
          >
            로그인
          </a>
        </div>
      </header>

      <LegalTabs pages={pages ?? []} initialTab={tab} />

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="w-full px-6 md:px-8 py-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="올케어안전플랫폼 로고" className="w-5 h-5 object-contain" />
              <span className="font-headline text-base font-bold text-[#1e3a5f]">올케어안전플랫폼</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              본 서비스는 공공조달 입찰 안전보건관리계획서 표준화 솔루션입니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
