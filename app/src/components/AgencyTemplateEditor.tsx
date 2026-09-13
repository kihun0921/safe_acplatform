"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AgencyTemplate = {
  id: string;
  agency: string;
  name: string;
  sections: unknown[];
};

export default function AgencyTemplateEditor({ template }: { template: AgencyTemplate }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [sectionsText, setSectionsText] = useState(JSON.stringify(template.sections, null, 2));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(sectionsText);
    } catch {
      alert("sections가 올바른 JSON 형식이 아닙니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agency-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sections: parsed }),
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

  const remove = async () => {
    if (!confirm(`"${template.name}" 표준서식을 삭제하시겠습니까? 이 서식을 쓰던 문서는 공통 서식으로 되돌아갑니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/agency-templates/${template.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`삭제 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400">발주처: {template.agency}</span>
        <button onClick={remove} disabled={deleting} className="text-xs text-rose-600 hover:underline disabled:opacity-60">
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold mb-3"
        placeholder="서식명 (예: 한국토지주택공사(LH) 표준 서식 2025)"
      />
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        추가 목차(sections) — JSON 배열, 공통 6대 목차 뒤에 이어붙습니다
      </label>
      <textarea
        value={sectionsText}
        onChange={(e) => setSectionsText(e.target.value)}
        rows={10}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono leading-relaxed mb-3"
      />
      <button
        onClick={save}
        disabled={saving}
        className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
