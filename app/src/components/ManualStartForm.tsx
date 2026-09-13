"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualStartForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [agency, setAgency] = useState("LH 한국토지주택공사");
  const [customAgency, setCustomAgency] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!title.trim()) {
      alert("공사명을 입력해 주세요.");
      return;
    }
    if (agency === "기타" && !customAgency.trim()) {
      alert("발주기관명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${title} 계획서`, agency: agency === "기타" ? customAgency.trim() : agency }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?next=/announcements");
          return;
        }
        alert(`생성 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.push(`/documents/${data.id}/wizard`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="manual-start" className="bg-[#1e3a5f] border border-[#1e3a5f] rounded-2xl p-6 shadow-md">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
        수동 입력
      </div>
      <h2 className="text-base font-bold text-white mb-1">아직 자동 연동되지 않은 발주처인가요?</h2>
      <p className="text-xs text-slate-300 mb-4">
        LH·K-water·가스공사 등은 공고 정보를 직접 입력해 계획서 작성을 시작할 수 있습니다.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300">
            공사명 <span className="text-amber-300">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: OO변전소 개보수 공사"
            className="border border-white/20 bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300">발주기관</label>
          <select
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="border border-white/20 bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <option>LH 한국토지주택공사</option>
            <option>K-water 한국수자원공사</option>
            <option>한국가스공사</option>
            <option>기타</option>
          </select>
          {agency === "기타" && (
            <input
              type="text"
              value={customAgency}
              onChange={(e) => setCustomAgency(e.target.value)}
              placeholder="발주기관명을 직접 입력하세요"
              className="border border-white/20 bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          )}
        </div>
      </div>
      <button
        onClick={handleStart}
        disabled={loading}
        className="inline-block bg-white text-[#1e3a5f] border-none rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-60 hover:bg-slate-100 transition-colors"
      >
        {loading ? "생성 중..." : "직접 입력해서 시작"}
      </button>
    </div>
  );
}
