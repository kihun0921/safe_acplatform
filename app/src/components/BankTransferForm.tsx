"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BankTransferForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [depositorName, setDepositorName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!depositorName.trim()) {
      alert("입금자명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositorName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`신청 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert("입금 신청이 완료되었습니다. 관리자 확인 후 구독이 활성화됩니다.");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => alert("토스페이먼츠 연동 키가 아직 등록되지 않아 카드결제는 준비 중입니다.")}
          className="flex-1 bg-[#1e3a5f] text-white text-sm font-bold py-2.5 rounded-lg"
        >
          카드로 결제
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm font-bold py-2.5 rounded-lg"
        >
          무통장입금 신청
        </button>
      </div>
      {open && (
        <div className="bg-slate-50 rounded-lg p-4 flex flex-col gap-2 text-xs">
          <div className="text-slate-600 leading-relaxed">
            입금 계좌: <b className="text-slate-900">우리은행 1005-804-614327</b> (예금주: 올케어솔루션 주식회사)
            <br />
            입금 확인 후 관리자가 수동으로 구독을 활성화합니다.
          </div>
          <div className="flex gap-2">
            <input
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="입금자명"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={submit}
              disabled={loading}
              className="bg-[#1e3a5f] text-white text-xs font-bold px-4 rounded-lg disabled:opacity-60"
            >
              {loading ? "신청 중..." : "입금 신청 완료"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
