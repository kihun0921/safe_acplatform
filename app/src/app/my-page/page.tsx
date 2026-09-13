import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MemberHeader from "@/components/MemberHeader";
import MyPageProfileForm from "@/components/MyPageProfileForm";
import MyPageEmailForm from "@/components/MyPageEmailForm";
import MyPagePasswordForm from "@/components/MyPagePasswordForm";

const ROLE_LABEL: Record<string, string> = { member: "일반회원", admin: "관리자" };
const STATUS_LABEL: Record<string, string> = { active: "정상 인증", inactive: "비활성", suspended: "이용 정지" };

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-page");

  const { data: member } = await supabase.from("members").select("*").eq("id", user.id).single();
  if (!member) redirect("/login?next=/my-page");

  const [{ count: inProgressCount }, { count: completedCount }] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("member_id", user.id).eq("status", "in_progress"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("member_id", user.id).eq("status", "completed"),
  ]);

  const initial = member.name.charAt(0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MemberHeader />
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2.5">
            <Link className="hover:text-[#1e3a5f]" href="/">
              홈
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">회원 정보 관리</span>
          </nav>
          <h1 className="font-headline text-2xl font-bold text-slate-900 tracking-tight">회원 정보 관리 (마이페이지)</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">가입 시 등록한 기업/담당자 정보와 계정을 관리합니다.</p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start pb-5 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xl">
                    <span>{initial}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{member.name}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff4fa] text-[#1e3a5f]">
                        {ROLE_LABEL[member.role] ?? member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{member.company}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                      <span className="material-symbols-outlined text-[13px] text-emerald-500">check_circle</span>
                      <span className="text-slate-600 font-medium">계정 상태: {STATUS_LABEL[member.status] ?? member.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="py-4 space-y-2.5 text-xs border-b border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span>회원 권한</span>
                  <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {ROLE_LABEL[member.role] ?? member.role}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>가입일</span>
                  <span className="font-medium text-slate-900">
                    {new Date(member.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>사업자등록번호</span>
                  <span className="font-mono font-medium text-slate-900">{member.registration_number}</span>
                </div>
              </div>

              <div className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#1e3a5f]">description</span>
                    계획서 작성 및 제출 현황
                  </span>
                  <a className="text-[11px] text-[#1e3a5f] hover:underline font-medium" href="/documents">
                    내 문서함 가기
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block">작성 중인 계획서</span>
                    <span className="text-xl font-bold text-[#1e3a5f] mt-1 block">
                      {inProgressCount ?? 0}
                      <span className="text-xs font-normal text-slate-500 ml-1">건</span>
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <span className="text-[11px] text-emerald-700 block">완료</span>
                    <span className="text-xl font-bold text-emerald-700 mt-1 block">
                      {completedCount ?? 0}
                      <span className="text-xs font-normal text-emerald-800 ml-1">건</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8 space-y-6">
            <MyPageProfileForm
              member={{
                name: member.name,
                company: member.company,
                ceo_name: member.ceo_name,
                phone: member.phone,
                registration_number: member.registration_number,
              }}
            />
            <MyPageEmailForm currentEmail={member.email} />
            <MyPagePasswordForm email={member.email} />
          </section>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <img src="/logo.png" alt="올케어안전플랫폼 로고" className="w-6 h-6 object-contain" />
            <span className="font-headline text-base font-bold text-slate-900">올케어안전플랫폼</span>
          </div>
          <div className="flex items-center gap-5">
            <a className="hover:text-[#1e3a5f]" href="/legal">
              이용약관
            </a>
            <a className="hover:text-[#1e3a5f]" href="/legal">
              개인정보처리방침
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
