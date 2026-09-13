"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Inquiry = {
  id: string;
  title: string;
  content: string;
  status: "pending" | "answered";
  admin_response: string | null;
  created_at: string;
  members?: { name: string; company: string } | null;
};

export default function AdminInquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!response.trim()) {
      alert("답변 내용을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`답변 등록 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="font-bold text-sm text-slate-900">{inquiry.title}</h3>
          <div className="text-[11px] text-slate-400">
            {inquiry.members?.company} · {inquiry.members?.name} ·{" "}
            {new Date(inquiry.created_at).toLocaleString("ko-KR")}
          </div>
        </div>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            inquiry.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {inquiry.status === "answered" ? "답변완료" : "답변대기"}
        </span>
      </div>
      <p className="text-xs text-slate-600 whitespace-pre-line my-3">{inquiry.content}</p>

      {inquiry.status === "answered" ? (
        <div className="bg-[#eff4fa] rounded-lg p-3 text-xs text-slate-800">
          <span className="font-bold text-[#1e3a5f]">답변: </span>
          {inquiry.admin_response}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="답변을 입력해 주세요"
            rows={3}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs resize-none"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="self-end bg-[#1e3a5f] text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {loading ? "등록 중..." : "답변 등록"}
          </button>
        </div>
      )}
    </div>
  );
}
