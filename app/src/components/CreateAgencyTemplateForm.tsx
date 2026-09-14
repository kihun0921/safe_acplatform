"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AgencyTemplateSectionsBuilder from "./AgencyTemplateSectionsBuilder";
import CoverStyleSelect from "./CoverStyleSelect";
import type { AgencyTemplateSection } from "@/lib/agencyTemplates";

export default function CreateAgencyTemplateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agency, setAgency] = useState("");
  const [name, setName] = useState("");
  const [sections, setSections] = useState<AgencyTemplateSection[]>([]);
  const [disabledCommon, setDisabledCommon] = useState<string[]>([]);
  const [coverStyle, setCoverStyle] = useState("generic");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setAgency("");
    setName("");
    setSections([]);
    setDisabledCommon([]);
    setCoverStyle("generic");
  };

  const submit = async () => {
    if (!agency.trim() || !name.trim()) {
      alert("발주처명과 서식명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agency-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agency, name, sections, disabledCommonSections: disabledCommon, coverStyle }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`생성 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      reset();
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
        className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2.5 rounded-lg mb-6"
      >
        + 새 발주처 표준서식 추가
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-bold text-sm text-slate-900 mb-3">새 발주처 표준서식</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">
            발주처명 (documents.agency 값과 정확히 일치해야 매칭됩니다)
          </label>
          <input
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="예: 한국전력공사"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">서식명 (드롭다운에 표시될 이름)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 한국전력공사 표준 서식 2025"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4">
        <CoverStyleSelect value={coverStyle} onChange={setCoverStyle} />
      </div>

      <AgencyTemplateSectionsBuilder
        sections={sections}
        disabledCommon={disabledCommon}
        onChange={({ sections: s, disabledCommon: d }) => {
          setSections(s);
          setDisabledCommon(d);
        }}
      />

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={submit}
          disabled={loading}
          className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {loading ? "생성 중..." : "생성"}
        </button>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-slate-500 hover:underline"
        >
          취소
        </button>
      </div>
    </div>
  );
}
