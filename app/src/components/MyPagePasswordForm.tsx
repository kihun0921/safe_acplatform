"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MyPagePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const matchStatus =
    !next && !confirm
      ? { label: "비밀번호 확인 필요", cls: "text-slate-400" }
      : next === confirm && next.length >= 8
      ? { label: "일치합니다", cls: "text-emerald-600" }
      : next !== confirm
      ? { label: "비밀번호가 일치하지 않습니다", cls: "text-rose-600" }
      : { label: "8자 이상 입력해 주세요", cls: "text-amber-600" };

  const submit = async () => {
    if (!current) {
      alert("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (next.length < 8 || next !== confirm) {
      alert("새 비밀번호를 8자 이상으로 정확히 두 번 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      // Supabase는 "현재 비밀번호"를 직접 검증하는 API가 없어서, 재로그인으로
      // 현재 비밀번호가 맞는지 먼저 확인한 뒤에만 실제 변경을 진행한다.
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthError) {
        alert("현재 비밀번호가 올바르지 않습니다.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        alert(`비밀번호 변경 실패: ${error.message}`);
        return;
      }
      alert("비밀번호가 변경되었습니다.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="pb-4 border-b border-slate-200">
        <h3 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1e3a5f] text-xl">lock_reset</span>
          비밀번호 변경
        </h3>
      </div>
      <div className="pt-5 space-y-4">
        <div className="max-w-md">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">현재 비밀번호</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="현재 사용 중인 비밀번호"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">새 비밀번호</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="새 비밀번호 입력"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="새 비밀번호 재입력"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-[11px] text-slate-500">8자 이상, 영문/숫자/특수문자 조합 권장</span>
          <span className={`text-xs font-semibold ${matchStatus.cls}`}>{matchStatus.label}</span>
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#16304d] disabled:opacity-60"
        >
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </div>
    </div>
  );
}
