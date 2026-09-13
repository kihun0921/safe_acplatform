"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InquiryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`등록 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      setTitle("");
      setContent("");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#1e3a5f] text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
      >
        + 새 문의 작성
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="문의 제목"
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="문의 내용을 입력해 주세요."
        rows={4}
        maxLength={1000}
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm resize-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 px-3 py-2">
          취소
        </button>
        <button
          onClick={submit}
          disabled={loading}
          className="bg-[#1e3a5f] text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {loading ? "등록 중..." : "등록"}
        </button>
      </div>
    </div>
  );
}
