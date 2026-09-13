import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberHeader from "@/components/MemberHeader";
import InquiryForm from "@/components/InquiryForm";

export default async function InquiriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inquiries");

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <MemberHeader active="inquiries" />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-[#1e3a5f] mb-6">문의하기</h1>

        <InquiryForm />

        <div className="mt-8 flex flex-col gap-4">
          {(inquiries ?? []).length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">등록한 문의가 없습니다.</div>
          )}
          {(inquiries ?? []).map((inq) => (
            <div key={inq.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-bold text-sm text-slate-900">{inq.title}</h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    inq.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {inq.status === "answered" ? "답변완료" : "답변대기"}
                </span>
              </div>
              <p className="text-xs text-slate-500 whitespace-pre-line mb-3">{inq.content}</p>
              <div className="text-[11px] text-slate-400 mb-3">
                작성일 {new Date(inq.created_at).toLocaleString("ko-KR")}
              </div>
              {inq.admin_response && (
                <div className="bg-[#eff4fa] rounded-lg p-3 text-xs text-slate-800">
                  <span className="font-bold text-[#1e3a5f]">답변: </span>
                  {inq.admin_response}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
