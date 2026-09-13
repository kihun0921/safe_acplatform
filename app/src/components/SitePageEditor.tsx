"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SitePage = {
  slug: string;
  title: string;
  body: string;
  updated_at: string;
};

export default function SitePageEditor({ page }: { page: SitePage }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/site-pages/${page.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`저장 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400">/{page.slug}</span>
        <span className="text-xs text-slate-400">
          최근 수정: {new Date(page.updated_at).toLocaleString("ko-KR")}
        </span>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold mb-3"
        placeholder="페이지 제목"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed mb-3"
        placeholder="본문 내용"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-semibold">저장되었습니다.</span>}
      </div>
    </div>
  );
}
