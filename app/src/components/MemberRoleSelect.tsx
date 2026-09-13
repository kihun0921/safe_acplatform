"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL: Record<string, string> = { member: "일반회원", admin: "관리자" };

export default function MemberRoleSelect({
  memberId,
  role,
  isSelf,
}: {
  memberId: string;
  role: "member" | "admin";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(role);
  const [loading, setLoading] = useState(false);

  if (isSelf) {
    return (
      <span
        title="자기 자신의 권한은 변경할 수 없습니다."
        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          current === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {LABEL[current]}
      </span>
    );
  }

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as typeof role;
    if (next === current) return;
    const confirmed = window.confirm(
      next === "admin"
        ? "이 회원을 관리자로 승격하시겠습니까? 관리자 대시보드 전체에 접근할 수 있게 됩니다."
        : "이 관리자를 일반회원으로 강등하시겠습니까? 관리자 권한이 즉시 제거됩니다."
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
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
        current === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
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
