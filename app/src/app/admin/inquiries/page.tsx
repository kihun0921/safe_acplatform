import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import AdminInquiryRow from "@/components/AdminInquiryRow";

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*, members!inquiries_member_id_fkey(name, company)")
    .order("created_at", { ascending: false });

  const pending = (inquiries ?? []).filter((i) => i.status === "pending");
  const answered = (inquiries ?? []).filter((i) => i.status === "answered");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="inquiries" />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">문의 관리</h1>
        <p className="text-sm text-slate-500 mb-6">
          전체 {inquiries?.length ?? 0}건 · 답변대기 {pending.length}건 · 답변완료 {answered.length}건
        </p>

        <div className="flex flex-col gap-4">
          {(inquiries ?? []).length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">등록된 문의가 없습니다.</div>
          )}
          {(inquiries ?? []).map((inq) => (
            <AdminInquiryRow key={inq.id} inquiry={inq} />
          ))}
        </div>
      </main>
    </div>
  );
}
