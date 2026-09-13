import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function MemberHeader({ active }: { active?: "announcements" | "documents" | "inquiries" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "게스트";
  let company = "";
  if (user) {
    const { data: member } = await supabase
      .from("members")
      .select("name, company")
      .eq("id", user.id)
      .single();
    if (member) {
      displayName = member.name;
      company = member.company;
    }
  }
  const initial = displayName.charAt(0);

  const tabClass = (tab: string) =>
    active === tab
      ? "text-neutral-900 font-bold border-b-2 border-neutral-900 pb-1 flex items-center gap-1.5 transition-colors"
      : "text-neutral-600 hover:text-neutral-900 pb-1 font-medium flex items-center gap-1.5 transition duration-150 ease-in-out";

  return (
    <header className="bg-white docked full-width top-0 sticky z-50 border-b border-neutral-200 shadow-sm transition duration-150 ease-in-out">
      <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a className="flex items-center gap-2.5 group" href="/">
            <img src="/logo.png" alt="올케어안전플랫폼 로고" className="w-9 h-9 object-contain" />
            <div className="flex flex-col">
              <span className="font-headline font-bold text-xl text-neutral-900 tracking-tight">올케어안전플랫폼</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wider -mt-1">ALLCARE SAFETY B2B</span>
            </div>
          </a>
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            <a className={tabClass("announcements")} href="/announcements">
              <span className="material-symbols-outlined text-lg">search</span>
              공고 검색
            </a>
            <a className={tabClass("documents")} href="/documents">
              <span className="material-symbols-outlined text-lg text-slate-400">folder_open</span>
              내 문서함
            </a>
            <a className={tabClass("inquiries")} href="/inquiries">
              <span className="material-symbols-outlined text-lg text-slate-400">support_agent</span>
              고객지원/문의하기
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200">
            <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold font-display">
              {initial}
            </div>
            <span className="text-xs font-semibold text-slate-800 tracking-tight">
              {company ? `${company} ${displayName}` : displayName}
            </span>
          </div>
          <LogoutButton className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-neutral-100 px-2.5 py-1.5 rounded transition duration-150 ease-in-out" />
        </div>
      </div>
    </header>
  );
}
