"use client";

import { useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (opts: { customerKey: string }) => {
        requestPayment: (opts: {
          method: "CARD";
          amount: { currency: "KRW"; value: number };
          orderId: string;
          orderName: string;
          customerName: string;
          successUrl: string;
          failUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

export default function CardPaymentButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const pay = async () => {
    if (!window.TossPayments) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/toss/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`결제 시작 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }

      const toss = window.TossPayments(CLIENT_KEY);
      const payment = toss.payment({ customerKey: memberId });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: data.amount },
        orderId: data.orderId,
        orderName: data.orderName,
        customerName: data.customerName,
        successUrl: `${window.location.origin}/subscription/card-success`,
        failUrl: `${window.location.origin}/subscription/card-fail`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제창을 여는 중 오류가 발생했습니다.";
      if (!message.includes("USER_CANCEL")) alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" onReady={() => setSdkReady(true)} />
      <button
        onClick={pay}
        disabled={loading || !sdkReady}
        className="w-full bg-[#3182f6] text-white text-sm font-bold px-4 py-3 rounded-lg disabled:opacity-60"
      >
        {loading ? "처리 중..." : sdkReady ? "카드로 결제하기" : "결제 모듈 로딩 중..."}
      </button>
    </>
  );
}
