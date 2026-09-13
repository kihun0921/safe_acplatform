import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import SyncNowButton from "@/components/SyncNowButton";

const AGENCY_LABEL: Record<string, string> = {
  pps: "조달청 (나라장터)",
  dapa: "방위사업청",
  kepco: "한국전력공사",
  ex: "한국도로공사",
  lh: "한국토지주택공사(LH)",
  kwater: "한국수자원공사",
  kogas: "한국가스공사",
};

export default async function AdminApiPage() {
  const supabase = await createClient();
  const { data: credentials } = await supabase.from("api_credentials").select("*").order("agency");
  const { data: lastRuns } = await supabase
    .from("sync_log")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(5);

  const { count: totalAnnouncements } = await supabase
    .from("announcements")
    .select("*", { count: "exact", head: true });

  const latest = lastRuns?.[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="api" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-2xl font-bold text-slate-900">발주처 API 연동 관리</h1>
            <p className="text-sm text-slate-500 mt-1">
              전체 공고 {totalAnnouncements ?? 0}건 등록됨
              {latest && ` · 마지막 동기화 ${new Date(latest.ran_at).toLocaleString("ko-KR")}`}
            </p>
          </div>
          <SyncNowButton />
        </div>

        {latest && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 text-xs">
            <div className="font-bold text-slate-700 mb-2">최근 동기화 결과</div>
            <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[11px]">
              {JSON.stringify(latest.result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">발주처</th>
                <th className="text-left px-4 py-3">엔드포인트</th>
                <th className="text-left px-4 py-3">인증키</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">최근 동기화</th>
              </tr>
            </thead>
            <tbody>
              {(credentials ?? []).map((c) => (
                <tr key={c.agency} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{AGENCY_LABEL[c.agency] ?? c.agency}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.api_endpoint}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.api_key}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status === "active" ? "연동됨" : "대기"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString("ko-KR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          KEPCO/EX는 별도 포털 키가 등록되면 자동으로 활성화됩니다. LH는 data.go.kr 활용신청이 &quot;중지&quot;
          상태라 재활성화가 필요합니다.
        </p>
      </main>
    </div>
  );
}
