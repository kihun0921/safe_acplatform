"use client";

import { useState } from "react";
import { COMMON_SECTIONS, type AgencyTemplateField, type AgencyTemplateSection } from "@/lib/agencyTemplates";

let uid = 0;
const nextId = () => `f${Date.now()}_${uid++}`;

export default function AgencyTemplateSectionsBuilder({
  sections,
  disabledCommon,
  onChange,
}: {
  sections: AgencyTemplateSection[];
  disabledCommon: string[];
  onChange: (next: { sections: AgencyTemplateSection[]; disabledCommon: string[] }) => void;
}) {
  const [localSections, setLocalSections] = useState(sections);
  const [localDisabled, setLocalDisabled] = useState(disabledCommon);

  const emit = (nextSections: AgencyTemplateSection[], nextDisabled: string[]) => {
    setLocalSections(nextSections);
    setLocalDisabled(nextDisabled);
    onChange({ sections: nextSections, disabledCommon: nextDisabled });
  };

  const toggleCommon = (key: string) => {
    const next = localDisabled.includes(key) ? localDisabled.filter((k) => k !== key) : [...localDisabled, key];
    emit(localSections, next);
  };

  const addSection = () => {
    emit([...localSections, { id: nextId(), label: "", fields: [] }], localDisabled);
  };

  const updateSection = (idx: number, patch: Partial<AgencyTemplateSection>) => {
    const next = localSections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    emit(next, localDisabled);
  };

  const removeSection = (idx: number) => {
    emit(
      localSections.filter((_, i) => i !== idx),
      localDisabled
    );
  };

  const addField = (sectionIdx: number) => {
    const field: AgencyTemplateField = { key: nextId(), label: "", type: "text", placeholder: "" };
    updateSection(sectionIdx, { fields: [...localSections[sectionIdx].fields, field] });
  };

  const updateField = (sectionIdx: number, fieldIdx: number, patch: Partial<AgencyTemplateField>) => {
    const fields = localSections[sectionIdx].fields.map((f, i) => (i === fieldIdx ? { ...f, ...patch } : f));
    updateSection(sectionIdx, { fields });
  };

  const removeField = (sectionIdx: number, fieldIdx: number) => {
    updateSection(sectionIdx, { fields: localSections[sectionIdx].fields.filter((_, i) => i !== fieldIdx) });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          공통 6대 목차 사용 여부 (해제하면 이 서식에서는 해당 목차가 아예 보이지 않습니다)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMON_SECTIONS.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!localDisabled.includes(s.key)}
                onChange={() => toggleCommon(s.key)}
                className="rounded text-[#1e3a5f]"
              />
              <span className={localDisabled.includes(s.key) ? "text-slate-400 line-through" : "text-slate-700"}>
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-500">
            발주처 전용 추가 목차 (공통 목차 뒤에 이어붙습니다)
          </label>
          <button
            onClick={addSection}
            type="button"
            className="text-xs font-semibold text-[#1e3a5f] hover:underline"
          >
            + 목차 추가
          </button>
        </div>

        {localSections.length === 0 && (
          <p className="text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg px-3 py-4 text-center">
            추가 목차가 없습니다. 공통 6대 목차만 사용합니다.
          </p>
        )}

        <div className="space-y-4">
          {localSections.map((section, sIdx) => (
            <div key={section.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={section.label}
                  onChange={(e) => updateSection(sIdx, { label: e.target.value })}
                  placeholder="목차명 (예: 작업투입 인력 인적사항)"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <button
                  onClick={() => removeSection(sIdx)}
                  type="button"
                  className="text-xs text-rose-600 hover:underline shrink-0"
                >
                  목차 삭제
                </button>
              </div>

              <div className="space-y-2">
                {section.fields.map((field, fIdx) => (
                  <div key={field.key} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={field.label}
                        onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                        placeholder="필드명 (예: 안전취약근로자 현황)"
                        className="flex-1 min-w-[160px] border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(sIdx, fIdx, { type: e.target.value as "text" | "textarea" })}
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs"
                      >
                        <option value="text">한 줄 입력</option>
                        <option value="textarea">여러 줄 입력</option>
                      </select>
                      <input
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(sIdx, fIdx, { placeholder: e.target.value })}
                        placeholder="입력 안내문구(선택)"
                        className="flex-1 min-w-[160px] border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      />
                      <button
                        onClick={() => removeField(sIdx, fIdx)}
                        type="button"
                        className="text-[11px] text-rose-500 hover:underline shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                    <textarea
                      value={field.default ?? ""}
                      onChange={(e) => updateField(sIdx, fIdx, { default: e.target.value })}
                      placeholder="사전 작성 문구(초안) — 회원이 빈 칸이 아니라 이 문구/형식을 바로 고쳐 쓸 수 있도록 미리 채워 넣을 내용"
                      rows={3}
                      className="w-full border border-dashed border-slate-300 rounded px-2.5 py-1.5 text-xs bg-slate-50/60"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => addField(sIdx)}
                type="button"
                className="mt-2 text-[11px] font-semibold text-[#1e3a5f] hover:underline"
              >
                + 필드 추가
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
