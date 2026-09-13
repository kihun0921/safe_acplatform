import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import MemberStatusSelect from "@/components/MemberStatusSelect";
import MemberRoleSelect from "@/components/MemberRoleSelect";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="members" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-6">회원 관리 ({members?.length ?? 0}명)</h1>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">담당자</th>
                <th className="text-left px-4 py-3">회사명</th>
                <th className="text-left px-4 py-3">이메일</th>
                <th className="text-left px-4 py-3">연락처</th>
                <th className="text-left px-4 py-3">권한</th>
                <th className="text-left px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.company}</td>
                  <td className="px-4 py-3 text-slate-500">{m.email}</td>
                  <td className="px-4 py-3 text-slate-500">{m.phone}</td>
                  <td className="px-4 py-3">
                    <MemberRoleSelect memberId={m.id} role={m.role} isSelf={m.id === user?.id} />
                  </td>
                  <td className="px-4 py-3">
                    <MemberStatusSelect memberId={m.id} status={m.status} />
                  </td>
                </tr>
              ))}
              {(members ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
