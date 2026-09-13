import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import SyncNowButton from "@/components/SyncNowButton";

const AGENCY_LABEL: Record<string, string> = {
  pps: "조달청 (나라장터)",
  dapa: "방위사업청",
  kepco: "한국전력공사",
  ex: "한국도로공사",
};

const DOC_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  in_progress: { label: "작성중", className: "bg-blue-50 text-blue-800 border-blue-200" },
  completed: { label: "완료", className: "bg-emerald-50 text-emerald-800 border-emerald-300" },
};

const MEMBER_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "활성", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "비활성", className: "bg-slate-100 text-slate-600 border-slate-200" },
  suspended: { label: "정지", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalDocuments },
    { count: inProgressDocuments },
    { count: completedDocuments },
    { count: totalAnnouncements },
    { count: pendingInquiries },
    { data: recentMembers },
    { data: recentDocuments },
    { data: credentials },
    { data: lastRuns },
    { count: activeSubscriptions },
    { count: pendingBankTransfers },
    { data: coupons },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("announcements").select("*", { count: "exact", head: true }),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("members").select("*").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("documents")
      .select("*, members(name, company)")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase.from("api_credentials").select("*").order("agency"),
    supabase.from("sync_log").select("*").order("ran_at", { ascending: false }).limit(1),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("method", "bank_transfer")
      .eq("status", "pending"),
    supabase.from("coupons").select("status"),
  ]);

  const latestRun = lastRuns?.[0];
  const usedCoupons = (coupons ?? []).filter((c) => c.status === "used").length;
  const totalCoupons = coupons?.length ?? 0;
  const couponRate = totalCoupons ? Math.round((usedCoupons / totalCoupons) * 1000) / 10 : 0;

  const kpis = [
    { label: "전체 회원", value: totalMembers ?? 0, unit: "개사", icon: "corporate_fare" },
    { label: "활성 회원", value: activeMembers ?? 0, unit: "개사", icon: "person_check" },
    { label: "전체 계획서", value: totalDocuments ?? 0, unit: "건", icon: "description" },
    { label: "작성중 계획서", value: inProgressDocuments ?? 0, unit: "건", icon: "edit_document" },
    { label: "완료 계획서", value: completedDocuments ?? 0, unit: "건", icon: "task_alt" },
    { label: "수집 공고", value: totalAnnouncements ?? 0, unit: "건", icon: "source" },
    { label: "미답변 문의", value: pendingInquiries ?? 0, unit: "건", icon: "warning", warn: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="dashboard" />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-headline text-xl font-bold text-slate-900">통합 운영 대시보드</h1>
            <p className="text-xs text-slate-500 mt-1">실 DB 조회 기준 — 새로고침할 때마다 최신 값으로 갱신됩니다.</p>
          </div>
          <SyncNowButton />
        </div>

        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`rounded-xl p-3.5 border shadow-sm flex flex-col justify-between ${
                  k.warn && k.value > 0
                    ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium">{k.label}</span>
                  <span
                    className={`material-symbols-outlined text-lg ${k.warn && k.value > 0 ? "text-amber-600" : "text-slate-400"}`}
                  >
                    {k.icon}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 tracking-tight">
                  {k.value.toLocaleString()}
                  <span className="text-xs font-normal text-slate-500 ml-1">{k.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <h2 className="font-headline text-sm font-bold text-slate-900">최근 가입 회원</h2>
                <a className="text-xs font-semibold text-blue-800 hover:underline" href="/admin/members">
                  회원관리 바로가기
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                      <th className="py-2.5 px-4">가입일시</th>
                      <th className="py-2.5 px-4">회사명</th>
                      <th className="py-2.5 px-4">담당자</th>
                      <th className="py-2.5 px-4">권한</th>
                      <th className="py-2.5 px-4 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(recentMembers ?? []).map((m) => {
                      const st = MEMBER_STATUS_LABEL[m.status] ?? MEMBER_STATUS_LABEL.active;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(m.created_at).toLocaleString("ko-KR")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{m.company}</td>
                          <td className="py-3 px-4">{m.name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                m.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {m.role === "admin" ? "관리자" : "일반회원"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.className}`}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(recentMembers ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400">
                          가입된 회원이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <h2 className="font-headline text-sm font-bold text-slate-900">최근 작성 안전보건관리계획서</h2>
                <a className="text-xs font-semibold text-blue-800 hover:underline" href="/documents">
                  전체 문서함
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                      <th className="py-2.5 px-4">수정일시</th>
                      <th className="py-2.5 px-4">공사명</th>
                      <th className="py-2.5 px-4">발주처</th>
                      <th className="py-2.5 px-4">작성기업</th>
                      <th className="py-2.5 px-4">진행률</th>
                      <th className="py-2.5 px-4 text-center">상태</th>
                      <th className="py-2.5 px-4 text-right">바로가기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(recentDocuments ?? []).map((d) => {
                      const st = DOC_STATUS_LABEL[d.status] ?? DOC_STATUS_LABEL.in_progress;
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(d.updated_at).toLocaleString("ko-KR")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 truncate max-w-[200px]">{d.title}</td>
                          <td className="py-3 px-4 text-slate-700">{d.agency ?? "-"}</td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800">{d.members?.company ?? "-"}</div>
                            <div className="text-[11px] text-slate-400">{d.members?.name ?? "-"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${d.status === "completed" ? "bg-emerald-600" : "bg-blue-600"}`}
                                style={{ width: `${d.percent_complete}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold mt-0.5 inline-block">
                              {d.percent_complete}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.className}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              className="px-2 py-1 text-blue-800 hover:bg-blue-50 rounded border border-slate-200 transition-colors"
                              href={`/documents/${d.id}/wizard`}
                            >
                              열기
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {(recentDocuments ?? []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          작성된 계획서가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h2 className="font-headline text-sm font-bold text-slate-900">공공 발주처 API 연동</h2>
                <a href="/admin/api" className="text-[11px] font-semibold text-blue-800 hover:underline">
                  자세히
                </a>
              </div>
              <div className="space-y-2.5 text-xs">
                {(credentials ?? []).map((c) => (
                  <div
                    key={c.agency}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{AGENCY_LABEL[c.agency] ?? c.agency}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.last_sync_at ? `동기화: ${new Date(c.last_sync_at).toLocaleString("ko-KR")}` : "동기화 이력 없음"}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status === "active" ? "연동됨" : "대기"}
                    </span>
                  </div>
                ))}
                {(credentials ?? []).length === 0 && <p className="text-slate-400 text-center py-6">등록된 API 없음</p>}
              </div>
              {latestRun && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  마지막 전체 동기화: {new Date(latestRun.ran_at).toLocaleString("ko-KR")}
                  {typeof latestRun.result?.upserted === "number" && ` · ${latestRun.result.upserted}건 반영`}
                </div>
              )}
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h2 className="font-headline text-sm font-bold text-slate-900">구독 및 결제 지표</h2>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="text-slate-600 text-xs font-medium">활성 유료 구독</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{activeSubscriptions ?? 0}개사</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">무통장입금 확인 대기</span>
                    <a href="/admin/payments" className="text-blue-800 hover:underline text-[11px] font-semibold">
                      확인하기
                    </a>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{pendingBankTransfers ?? 0}건</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">쿠폰 상환율</span>
                    <a href="/admin/coupons" className="text-blue-800 hover:underline text-[11px] font-semibold">
                      쿠폰관리
                    </a>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{couponRate}%</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {usedCoupons} / {totalCoupons}건 사용
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
