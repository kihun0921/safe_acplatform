"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 전국 공사입찰공고 전체를 훑는 작업이라 완료까지 몇 분(길면 10분 이상)
  // 걸릴 수 있다 — 버튼 클릭에 그 시간만큼 응답을 묶어 두면 Nginx/Node
  // 타임아웃에 걸려 실제로는 서버에서 계속 진행 중인데도 화면엔 실패한 것처럼
  // 보이는 문제가 있었다. 이제 서버가 "시작했다"는 응답만 즉시 주고 실제
  // 수집·저장은 백그라운드에서 계속 진행하므로, 여기서도 응답을 기다리지 않고
  // 바로 안내만 띄운다 — 완료 여부는 몇 분 후 새로고침해서 확인한다.
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-announcements", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`동기화 시작 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert(data.message ?? "동기화를 시작했습니다. 완료까지 몇 분 정도 걸릴 수 있습니다.");
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
      {loading ? "시작하는 중..." : "지금 동기화"}
    </button>
  );
}
