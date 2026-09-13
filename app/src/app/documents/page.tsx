import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberHeader from "@/components/MemberHeader";
import DocumentRow from "@/components/DocumentRow";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/documents");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("member_id", user.id)
    .order("updated_at", { ascending: false });

  const inProgress = (documents ?? []).filter((d) => d.status === "in_progress");
  const completed = (documents ?? []).filter((d) => d.status === "completed");

  return (
    <div className="min-h-screen bg-slate-50">
      <MemberHeader active="documents" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-[#1e3a5f] mb-6">내 문서함</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs text-slate-500 mb-1">작성중</div>
            <div className="text-2xl font-bold text-[#1e3a5f]">{inProgress.length}건</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs text-slate-500 mb-1">완료</div>
            <div className="text-2xl font-bold text-emerald-700">{completed.length}건</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {(documents ?? []).length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              아직 작성한 계획서가 없습니다.{" "}
              <a href="/announcements" className="text-[#1e3a5f] font-semibold">
                공고 검색에서 시작하기 →
              </a>
            </div>
          )}
          {(documents ?? []).map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      </main>
    </div>
  );
}
