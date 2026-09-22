"use client";

import { useState } from "react";
import AgencyTemplateEditor, { type AgencyTemplate } from "./AgencyTemplateEditor";

// 발주처가 하나둘 늘어날 때마다 전체 편집 폼(섹션 구성·표지 스타일·목차 라벨
// 등 항목이 많아 세로로 상당히 김)을 죽 나열해서 보여주면 페이지가 끝없이
// 길어지고 원하는 발주처를 찾기도 번거로웠다 — 발주처 이름을 탭으로 두고
// 선택한 발주처의 편집 폼만 보여주도록 바꿨다.
export default function AgencyTemplateTabs({ templates }: { templates: AgencyTemplate[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(templates[0]?.id);
  const active = templates.find((t) => t.id === activeId) ?? templates[0];

  if (templates.length === 0) {
    return <div className="text-center py-16 text-slate-400 text-sm">등록된 표준서식이 없습니다.</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-colors ${
              t.id === active?.id
                ? "bg-[#1e3a5f] text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {t.agency}
          </button>
        ))}
      </div>
      {active && <AgencyTemplateEditor key={active.id} template={active} />}
    </div>
  );
}
