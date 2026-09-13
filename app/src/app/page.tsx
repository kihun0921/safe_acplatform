import { createClient } from "@/lib/supabase/server";
import HomeLanding from "@/components/HomeLanding";

const TABS = ["건축", "토목", "전기", "설비"] as const;

export default async function Home() {
  const supabase = await createClient();

  // 안전보건관리계획서는 실제 시공사(낙찰자)가 확정된 뒤에만 작성할 수 있다 —
  // 개찰(낙찰) 전 공고는 누가 시공할지 자체가 정해지지 않아 계획서 작성 대상이
  // 아니다. 그래서 "실시간 대상 공고"는 입찰 마감을 앞둔 공고가 아니라 낙찰이
  // 확정된 공고만 보여준다.
  const SELECT_COLUMNS =
    "id, title, agency, announcement_number, deadline, base_amount, trade_type, awarded, winner_name, winner_amount, award_status";

  const baseQuery = () =>
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("has_safety_form", true).eq("awarded", true);

  const [{ count: totalCount }, ...tabCounts] = await Promise.all([
    baseQuery(),
    ...TABS.map((t) => baseQuery().eq("trade_type", t)),
  ]);

  const { data: announcements } = await supabase
    .from("announcements")
    .select(SELECT_COLUMNS)
    .eq("has_safety_form", true)
    .eq("awarded", true)
    .order("deadline", { ascending: false })
    .limit(60);

  return (
    <HomeLanding
      announcements={announcements ?? []}
      totalCount={totalCount ?? 0}
      tabCounts={TABS.map((t, i) => ({ label: t, count: tabCounts[i].count ?? 0 }))}
    />
  );
}
