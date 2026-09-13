"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type Method = "card" | "bank" | "coupon";

export default function DocumentPaywall({
  documentId,
  price,
  onClose,
}: {
  documentId: string;
  price: number;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [method, setMethod] = useState<Method>("card");
  const [cardLoading, setCardLoading] = useState(false);
  const [depositorName, setDepositorName] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [code, setCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const payWithCard = async () => {
    if (!window.TossPayments) return;
    setCardLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pay/toss/checkout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`결제 시작 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }

      const toss = window.TossPayments(CLIENT_KEY);
      const payment = toss.payment({ customerKey: documentId });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: data.amount },
        orderId: data.orderId,
        orderName: data.orderName,
        customerName: data.customerName,
        successUrl: `${window.location.origin}/documents/${documentId}/pay/success`,
        failUrl: `${window.location.origin}/documents/${documentId}/pay/fail`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제창을 여는 중 오류가 발생했습니다.";
      if (!message.includes("USER_CANCEL")) alert(message);
    } finally {
      setCardLoading(false);
    }
  };

  const submitBankTransfer = async () => {
    if (!depositorName.trim()) {
      alert("입금자명을 입력해 주세요.");
      return;
    }
    setBankLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pay/bank-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositorName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`신청 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert("입금 신청이 완료되었습니다. 관리자 확인 후 다운로드가 가능합니다.");
      onClose?.();
      router.refresh();
    } finally {
      setBankLoading(false);
    }
  };

  const redeemCoupon = async () => {
    if (!code.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, documentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`등록 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      alert("쿠폰이 등록되었습니다. 다운로드가 가능합니다.");
      onClose?.();
      router.refresh();
    } finally {
      setCouponLoading(false);
    }
  };

  const tabs: { key: Method; label: string; icon: string }[] = [
    { key: "card", label: "카드결제", icon: "credit_card" },
    { key: "bank", label: "무통장입금", icon: "account_balance" },
    { key: "coupon", label: "쿠폰 등록", icon: "confirmation_number" },
  ];

  return (
    <div id="document-paywall" className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <Script src="https://js.tosspayments.com/v2/standard" onReady={() => setSdkReady(true)} />

      {/* 헤더: 아이콘 + 제목 + 닫기 버튼을 한 줄에 배치 — 카드 바깥으로 튀어나오지 않으므로 잘리지 않는다 */}
      <div className="flex items-start gap-3 px-6 pt-6 pb-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-600 text-xl">lock</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base text-slate-900">다운로드 잠금 해제가 필요합니다</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            결제 완료 또는 쿠폰 등록 즉시 HWPX · DOCX · PDF 다운로드가 가능합니다.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      <div className="px-6 pb-2">
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">다운로드 잠금해제 가격</span>
          <span className="text-lg font-bold text-slate-900">{price.toLocaleString("ko-KR")}원</span>
        </div>
      </div>

      {/* 결제 수단 탭 */}
      <div className="px-6 mt-4">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMethod(tab.key)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                method === tab.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {method === "card" && (
          <button
            onClick={payWithCard}
            disabled={cardLoading || !sdkReady}
            className="w-full bg-[#3182f6] hover:bg-[#1b64da] text-white text-sm font-bold py-3 rounded-xl disabled:opacity-60 transition-colors"
          >
            {cardLoading ? "처리 중..." : sdkReady ? `${price.toLocaleString("ko-KR")}원 카드로 결제하기` : "결제 모듈 로딩 중..."}
          </button>
        )}

        {method === "bank" && (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              입금 계좌: <b className="text-slate-900">우리은행 1005-804-614327</b>
              <br />
              예금주: 올케어솔루션 주식회사
              <br />
              입금 확인 후 관리자가 수동으로 다운로드를 활성화합니다.
            </div>
            <div className="flex gap-2">
              <input
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="입금자명을 입력하세요"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
              <button
                onClick={submitBankTransfer}
                disabled={bankLoading}
                className="bg-[#1e3a5f] hover:bg-[#16304d] text-white text-sm font-bold px-5 rounded-xl disabled:opacity-60 transition-colors"
              >
                {bankLoading ? "신청 중..." : "신청 완료"}
              </button>
            </div>
          </div>
        )}

        {method === "coupon" && (
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="쿠폰 코드 입력"
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
            <button
              onClick={redeemCoupon}
              disabled={couponLoading}
              className="bg-[#1e3a5f] hover:bg-[#16304d] text-white text-sm font-bold px-5 rounded-xl disabled:opacity-60 transition-colors"
            >
              {couponLoading ? "처리 중..." : "등록"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
