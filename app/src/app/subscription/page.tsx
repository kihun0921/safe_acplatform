import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberHeader from "@/components/MemberHeader";
import BankTransferForm from "@/components/BankTransferForm";
import CardPaymentButton from "@/components/CardPaymentButton";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "구독중", cls: "bg-emerald-50 text-emerald-700" },
  pending: { label: "결제 확인 대기", cls: "bg-amber-50 text-amber-700" },
  expired: { label: "만료됨", cls: "bg-slate-100 text-slate-500" },
  cancelled: { label: "해지됨", cls: "bg-slate-100 text-slate-500" },
};

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscription");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("member_id", user.id)
    .maybeSingle();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  const statusInfo = subscription ? STATUS_LABEL[subscription.status] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <MemberHeader active="documents" />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-[#1e3a5f] mb-6">구독 관리</h1>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between mb-6">
          <div>
            {statusInfo ? (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.cls}`}>{statusInfo.label}</span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">미구독</span>
            )}
            {subscription?.end_date && (
              <div className="text-xs text-slate-500 mt-2">만료일: {subscription.end_date}</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900">월간 구독</h2>
              <div className="text-2xl font-bold text-[#1e3a5f]">
                50,000<span className="text-sm font-medium text-slate-400"> 원 / 월</span>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <CardPaymentButton memberId={user.id} />
          </div>
          <div className="relative flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">또는</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <BankTransferForm />
        </div>

        <h2 className="text-sm font-bold text-slate-700 mb-3">결제 내역</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">플랜</th>
                <th className="text-left px-4 py-3">금액</th>
                <th className="text-left px-4 py-3">수단</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">신청일</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">월간 구독</td>
                  <td className="px-4 py-3">{p.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">{p.method === "card" ? "카드" : "무통장입금"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "failed" || p.status === "cancelled"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.status === "paid" ? "완료" : p.status === "pending" ? "대기" : p.status === "failed" ? "실패" : "취소"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
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
