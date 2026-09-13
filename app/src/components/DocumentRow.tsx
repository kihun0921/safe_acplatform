"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  title: string;
  agency: string | null;
  status: "in_progress" | "completed";
  percent_complete: number;
  updated_at: string;
};

export default function DocumentRow({ doc }: { doc: Doc }) {
  const router = useRouter();
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${doc.title}"을(를) 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("삭제에 실패했습니다.");
  };

  const redeemCoupon = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`등록 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert("쿠폰이 등록되었습니다.");
      setCouponOpen(false);
      setCode("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-3 hover:bg-slate-50/70 transition-colors">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                doc.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-[#eff4fa] text-[#1e3a5f]"
              }`}
            >
              {doc.status === "completed" ? "완료" : `작성중 ${doc.percent_complete}%`}
            </span>
            {doc.agency && <span className="text-xs text-slate-400">{doc.agency}</span>}
          </div>
          <div className="font-bold text-sm text-slate-900">{doc.title}</div>
          <div className="text-xs text-slate-400 mt-1">
            최근 저장: {new Date(doc.updated_at).toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/documents/${doc.id}/wizard`}
            className="px-3.5 py-2 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold"
          >
            {doc.status === "completed" ? "보기" : "이어서 작성"}
          </a>
          {doc.status === "completed" && (
            <button
              onClick={() => setCouponOpen((v) => !v)}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
            >
              쿠폰 등록
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold"
          >
            삭제
          </button>
        </div>
      </div>
      {couponOpen && (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="쿠폰 코드 입력"
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={redeemCoupon}
            disabled={loading}
            className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
          >
            {loading ? "처리 중..." : "등록"}
          </button>
        </div>
      )}
    </div>
  );
}
