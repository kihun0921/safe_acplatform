"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MyPageEmailForm({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      alert("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        alert(`이메일 변경 요청 실패: ${error.message}`);
        return;
      }
      alert("새 이메일 주소로 확인 메일을 보냈습니다. 메일의 링크를 클릭해야 변경이 완료됩니다.");
      setNewEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1e3a5f] text-xl">mark_email_read</span>
          업무용 이메일 계정 관리
        </h3>
      </div>
      <div className="pt-5 space-y-4">
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">현재 로그인 이메일</span>
            <span className="text-sm font-semibold text-slate-900 font-mono mt-0.5 block">{currentEmail}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">새 이메일 주소</label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="새로운 이메일을 입력하세요"
              type="email"
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <button
              onClick={submit}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 text-[#1e3a5f] border border-[#1e3a5f]/30 rounded-lg disabled:opacity-60"
            >
              {loading ? "요청 중..." : "인증메일 발송"}
            </button>
          </div>
          <p className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] leading-relaxed">
            새 이메일 주소로 확인 링크가 발송되며, 인증 완료 후 로그인 계정이 전환됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
