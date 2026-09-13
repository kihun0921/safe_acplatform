"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL: Record<string, string> = { active: "활성", inactive: "비활성", suspended: "정지" };

export default function MemberStatusSelect({
  memberId,
  status,
}: {
  memberId: string;
  status: "active" | "inactive" | "suspended";
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [loading, setLoading] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as typeof status;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`변경 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      setCurrent(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={loading}
      className={`text-[11px] font-bold px-2 py-1 rounded-full border-none ${
        current === "active"
          ? "bg-emerald-50 text-emerald-700"
          : current === "suspended"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {Object.entries(LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
