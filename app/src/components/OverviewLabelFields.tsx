"use client";

export default function OverviewLabelFields({
  overviewLabel,
  onOverviewLabelChange,
  showCoverNav,
  onShowCoverNavChange,
}: {
  overviewLabel: string;
  onOverviewLabelChange: (value: string) => void;
  showCoverNav: boolean;
  onShowCoverNavChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">
          &quot;Ⅰ. 사업개요 및 기본정보&quot; 제목 재정의 (선택 — 입력 필드는 그대로, 제목 텍스트만 바뀝니다)
        </label>
        <input
          value={overviewLabel}
          onChange={(e) => onOverviewLabelChange(e.target.value)}
          placeholder="예: 안전보건관리 체계 (비워두면 기본 제목 사용)"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={showCoverNav}
          onChange={(e) => onShowCoverNavChange(e.target.checked)}
        />
        좌측 목차 맨 위에 &quot;표지&quot; 안내 항목 표시 (실제 표지는 자동 생성되며, 이 항목은 그 안내문만 보여줍니다)
      </label>
    </div>
  );
}
