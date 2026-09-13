import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import SitePageEditor from "@/components/SitePageEditor";

export default async function AdminSitePagesPage() {
  const supabase = await createClient();
  const { data: pages } = await supabase.from("site_pages").select("*");
  const ORDER = ["terms", "privacy", "refund-policy", "customer-service"];
  pages?.sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="site-pages" />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">사이트관리</h1>
        <p className="text-sm text-slate-500 mb-6">
          이용약관, 개인정보처리방침 등 정적 페이지 내용을 관리합니다. 저장 즉시 회원 화면에 반영됩니다.
        </p>
        {(pages ?? []).map((page) => (
          <SitePageEditor key={page.slug} page={page} />
        ))}
      </main>
    </div>
  );
}
