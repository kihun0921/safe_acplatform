import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

const NAV = [
  { key: "dashboard", label: "대시보드", href: "/admin" },
  { key: "members", label: "회원관리", href: "/admin/members" },
  { key: "api", label: "API관리", href: "/admin/api" },
  { key: "payments", label: "결제관리", href: "/admin/payments" },
  { key: "coupons", label: "쿠폰관리", href: "/admin/coupons" },
  { key: "inquiries", label: "문의관리", href: "/admin/inquiries" },
  { key: "agency-templates", label: "표준서식관리", href: "/admin/agency-templates" },
  { key: "site-pages", label: "사이트관리", href: "/admin/site-pages" },
] as const;

export default async function AdminHeader({ active }: { active?: (typeof NAV)[number]["key"] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "관리자";
  let email = "";
  if (user) {
    const { data: member } = await supabase.from("members").select("name").eq("id", user.id).single();
    if (member) name = member.name;
    email = user.email ?? "";
  }

  return (
    <header className="bg-slate-900 text-slate-100 font-body text-sm font-medium tracking-tight docked full-width top-0 border-b border-slate-800 shadow-sm sticky z-50">
      <div className="flex justify-between items-center w-full px-6 py-3 max-w-full">
        <div className="flex items-center gap-6">
          <a className="font-headline text-lg font-bold text-white flex items-center gap-2 tracking-tight" href="/admin">
            <img src="/logo.png" alt="올케어안전플랫폼 로고" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-2">
              <span>올케어안전플랫폼 Admin Console</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700/80">
                공공인증형
              </span>
            </div>
          </a>
          <nav className="hidden md:flex items-center space-x-1 ml-4 text-xs font-semibold">
            {NAV.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={
                  active === item.key
                    ? "text-white font-bold border-b-2 border-white pb-1 px-3 py-2"
                    : "text-slate-400 font-medium hover:text-slate-200 transition-colors px-3 py-2 rounded-md hover:bg-slate-800/60"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>보안관제정상</span>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block mx-1" />
          <div className="flex items-center gap-3 pl-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-600">
                {name.slice(0, 2)}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200 leading-none">{name}</div>
                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{email}</div>
              </div>
            </div>
            <LogoutButton
              className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition active:scale-95"
              redirectTo="/admin/login"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
