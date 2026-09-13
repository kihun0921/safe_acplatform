"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-announcements", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`동기화 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert(
        `동기화 완료\nPPS ${data.fetched.pps}건 / DAPA ${data.fetched.dapa}건 조회\n` +
          `저장 ${data.upserted}건, 낙찰매칭 ${data.awardMatched}건`
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={loading}
      className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-60 flex items-center gap-2"
    >
      {loading ? "동기화 중... (몇 분 소요될 수 있음)" : "지금 동기화"}
    </button>
  );
}
