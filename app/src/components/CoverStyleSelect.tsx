"use client";

import { COVER_STYLES } from "@/lib/agencyTemplates";

export default function CoverStyleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">
        표지 양식 (다운로드 문서 맨 앞장에 붙는 표지 레이아웃)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
      >
        {COVER_STYLES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-400">
        아직 이 발주처의 실제 표지 샘플이 없다면 &quot;범용 표지&quot;를 두세요. 실제 표지 샘플을
        받으면 개발팀이 전용 레이아웃을 추가해 드립니다.
      </p>
    </div>
  );
}
