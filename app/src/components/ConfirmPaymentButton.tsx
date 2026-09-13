"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!window.confirm("입금을 확인하셨습니까? 확인 시 구독이 즉시 활성화됩니다.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`처리 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={confirm}
      disabled={loading}
      className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
    >
      {loading ? "처리 중..." : "입금 확인"}
    </button>
  );
}
