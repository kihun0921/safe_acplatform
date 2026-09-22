import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import IssueCouponForm from "@/components/IssueCouponForm";
import CouponDeleteButton from "@/components/CouponDeleteButton";

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*, members(name), documents(title)")
    .order("created_at", { ascending: false });

  const unused = (coupons ?? []).filter((c) => c.status === "unused").length;
  const used = (coupons ?? []).filter((c) => c.status === "used").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="coupons" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">쿠폰 관리</h1>
        <p className="text-sm text-slate-500 mb-6">
          전체 {coupons?.length ?? 0}건 · 미사용 {unused}건 · 사용됨 {used}건
        </p>

        <IssueCouponForm />

        <h2 className="text-sm font-bold text-slate-700 mt-8 mb-3">전체 쿠폰 이력</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">코드</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">발급사유</th>
                <th className="text-left px-4 py-3">발급일</th>
                <th className="text-left px-4 py-3">사용회원</th>
                <th className="text-left px-4 py-3">적용문서</th>
                <th className="text-left px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {(coupons ?? []).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "used"
                          ? "bg-emerald-50 text-emerald-700"
                          : c.status === "revoked"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status === "used" ? "사용됨" : c.status === "revoked" ? "취소됨" : "미사용"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.source}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.members?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.documents?.title ?? "-"}</td>
                  <td className="px-4 py-3">
                    <CouponDeleteButton id={c.id} code={c.code} used={c.status === "used"} />
                  </td>
                </tr>
              ))}
              {(coupons ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                    발급된 쿠폰이 없습니다.
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
