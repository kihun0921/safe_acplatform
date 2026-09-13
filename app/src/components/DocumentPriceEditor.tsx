"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DocumentPriceEditor({ documentId, price }: { documentId: string; price: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(price));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      alert("올바른 금액을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`저장 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 text-xs">
      <span className="material-symbols-outlined text-indigo-700 text-lg">admin_panel_settings</span>
      <span className="font-bold text-indigo-900">건당 다운로드 가격 (관리자 설정)</span>
      <input
        type="number"
        min={0}
        step={1000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border border-indigo-300 rounded-lg px-2 py-1.5 w-32 text-right font-mono"
      />
      <span className="text-indigo-700">원</span>
      <button
        onClick={save}
        disabled={saving}
        className="ml-1 bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
      <span className="text-indigo-500 ml-2">기본 50,000원 · LH 등 서식이 복잡한 발주처는 최대 500,000원 권장</span>
    </div>
  );
}
