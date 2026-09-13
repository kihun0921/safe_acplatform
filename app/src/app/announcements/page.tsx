import { createClient } from "@/lib/supabase/server";
import MemberHeader from "@/components/MemberHeader";
import StartWizardButton from "@/components/StartWizardButton";
import ManualStartForm from "@/components/ManualStartForm";

function awardedBadge(awardStatus: string | null) {
  if (awardStatus === "provisional") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
        낙찰 유력(1순위)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
      낙찰확정
    </span>
  );
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();

  // 개찰이 끝나 1순위 업체가 정해지면(award_status='provisional') 발주처가 그 업체로부터
  // 안전보건관리계획서를 제출받아 심사한 뒤 낙찰을 확정한다(award_status='confirmed').
  // 즉 계획서는 낙찰 확정 "전" 개찰 1순위 단계부터 필요하므로, 개찰 전(awarded=false) 공고만
  // 제외하고 개찰 1순위·낙찰 확정 공고를 모두 노출한다.
  let dbQuery = supabase
    .from("announcements")
    .select("*", { count: "exact" })
    .eq("awarded", true)
    .order("deadline", { ascending: false })
    .limit(60);

  if (query) {
    // escape characters that have special meaning in PostgREST's or()/ilike syntax
    const safe = query.replace(/[,()%]/g, " ").trim();
    dbQuery = dbQuery.or(
      `title.ilike.%${safe}%,announcement_number.ilike.%${safe}%,external_no.ilike.%${safe}%,agency.ilike.%${safe}%`
    );
  }

  const { data: announcements, count } = await dbQuery;

  const categories = Array.from(new Set((announcements ?? []).map((a) => a.category)));

  return (
    <div className="min-h-screen bg-slate-50">
      <MemberHeader active="announcements" />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <ManualStartForm />

        <div className="mt-10 mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          조달청 나라장터 실시간 연동
        </div>
        <h1 className="font-headline text-3xl font-bold text-[#1e3a5f] tracking-tight mb-2">
          공고 검색 및 맞춤 안전보건관리계획서 작성
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          개찰이 끝나 1순위 업체가 정해진 공고를 검색하고 원클릭으로 발주처 기준에 맞춘 안전보건관리계획서를 생성하세요. 발주처는
          개찰 1순위 업체로부터 안전보건관리계획서를 제출받아 심사한 뒤 낙찰을 확정하므로, 개찰 1순위 공고와 낙찰 확정 공고가 함께
          표시됩니다. (실 DB 조회 — 현재{" "}
          {count ?? 0}건 {query ? "검색됨" : "등록됨, 최근 개찰·낙찰 순 60건 표시"})
        </p>

        <form method="GET" className="flex gap-2 mb-8 max-w-xl">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="나라장터 공고번호, 공고명 일부, 또는 발주기관명을 입력하세요"
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#172e4c] text-white rounded-lg text-sm font-semibold whitespace-nowrap"
          >
            검색
          </button>
          {query && (
            <a
              href="/announcements"
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              초기화
            </a>
          )}
        </form>

        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-4 py-2 rounded-full text-xs font-semibold bg-[#1e3a5f] text-white">
            전체 {count ?? 0}
          </span>
          {categories.map((cat) => (
            <span
              key={cat}
              className="px-4 py-2 rounded-full text-xs font-medium text-slate-600 bg-white border border-slate-200"
            >
              {cat} {announcements?.filter((a) => a.category === cat).length}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {(announcements ?? []).map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-[#1e3a5f]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#eff4fa] text-[#1e3a5f] border border-[#1e3a5f]/10">
                    {a.agency}
                  </span>
                  {awardedBadge(a.award_status)}
                </div>
                <h3 className="font-headline font-bold text-base text-slate-900 mb-2 line-clamp-2">{a.title}</h3>
                <div className="text-xs text-slate-500 font-mono mb-4">공고번호: {a.announcement_number}</div>
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">기초금액</span>
                    <span className="font-bold text-slate-900">
                      {a.base_amount ? `${a.base_amount.toLocaleString("ko-KR")}원` : "미공개"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">마감(개찰)일</span>
                    <span className="text-slate-900 font-medium">{a.deadline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">공종</span>
                    <span className="text-slate-900">{a.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{a.award_status === "provisional" ? "1순위 업체" : "낙찰"}</span>
                    <span className={`font-semibold ${a.award_status === "provisional" ? "text-amber-700" : "text-emerald-700"}`}>
                      {a.winner_name} ({a.winner_amount ? `${a.winner_amount.toLocaleString("ko-KR")}원` : "-"})
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                      a.has_safety_form ? "bg-[#eff4fa] text-[#1e3a5f]" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {a.has_safety_form ? "샘플 서식 첨부됨" : "샘플 서식 미첨부"}
                  </span>
                </div>
              </div>
              <StartWizardButton
                announcementId={a.id}
                title={`${a.title} 계획서`}
                agency={a.agency}
                className="w-full py-2.5 px-4 bg-[#1e3a5f] hover:bg-[#172e4c] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
              >
                계획서 작성 시작
              </StartWizardButton>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div className="col-span-full text-center py-16 text-slate-400 text-sm">
              {query ? `"${query}"에 대한 검색 결과가 없습니다.` : "등록된 공고가 없습니다."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
