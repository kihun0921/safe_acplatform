import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import ConfirmPaymentButton from "@/components/ConfirmPaymentButton";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*, members!payments_member_id_fkey(name, company), documents(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="payments" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-6">결제 관리 ({payments?.length ?? 0}건)</h1>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">회원</th>
                <th className="text-left px-4 py-3">구분</th>
                <th className="text-left px-4 py-3">금액</th>
                <th className="text-left px-4 py-3">수단</th>
                <th className="text-left px-4 py-3">입금자명</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">신청일</th>
                <th className="text-left px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    {p.members?.company} · {p.members?.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.documents?.title ? (
                      <span className="text-xs">건당결제 · {p.documents.title}</span>
                    ) : (
                      <span className="text-xs text-slate-400">월간 구독</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">{p.method === "card" ? "카드" : "무통장입금"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.depositor_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.status === "paid" ? "완료" : "대기"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    {p.method === "bank_transfer" && p.status === "pending" && <ConfirmPaymentButton paymentId={p.id} />}
                  </td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                    결제 내역이 없습니다.
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
