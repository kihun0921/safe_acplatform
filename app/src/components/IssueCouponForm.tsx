"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IssueCouponForm() {
  const router = useRouter();
  const [source, setSource] = useState("이벤트 무료체험");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<string[]>([]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`발급 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      setIssued(data.codes);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-bold text-sm text-slate-900 mb-3">쿠폰 발급</h2>
      <div className="flex flex-wrap gap-3 items-end mb-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">발급 사유</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option>이벤트 무료체험</option>
            <option>결제 오류 보상</option>
            <option>제휴사 프로모션</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">수량 (최대 100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {loading ? "발급 중..." : "발급하기"}
        </button>
      </div>
      {issued.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono grid grid-cols-4 gap-2">
          {issued.map((c) => (
            <div key={c} className="bg-white border border-slate-200 rounded px-2 py-1 text-center">
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
