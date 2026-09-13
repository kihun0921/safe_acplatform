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

export default function DocumentPaywall({ documentId, price }: { documentId: string; price: number }) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [depositorName, setDepositorName] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
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
      setBankOpen(false);
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
      router.refresh();
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div id="document-paywall" className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-4">
      <Script src="https://js.tosspayments.com/v2/standard" onReady={() => setSdkReady(true)} />
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-amber-700 text-lg">lock</span>
        <h2 className="font-bold text-sm text-amber-900">다운로드 하려면 결제 또는 쿠폰 등록이 필요합니다</h2>
      </div>
      <p className="text-xs text-amber-800 mb-4">
        이 계획서 1건의 다운로드 잠금해제 가격은{" "}
        <strong className="font-bold">{price.toLocaleString("ko-KR")}원</strong>입니다. 결제 완료 또는 쿠폰 등록 즉시
        HWPX/DOCX/PDF 다운로드가 가능합니다.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={payWithCard}
          disabled={cardLoading || !sdkReady}
          className="bg-[#3182f6] text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-60"
        >
          {cardLoading ? "처리 중..." : sdkReady ? "카드로 결제하기" : "결제 모듈 로딩 중..."}
        </button>
        <button
          onClick={() => setBankOpen((v) => !v)}
          className="bg-white border border-slate-300 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-lg"
        >
          무통장입금 신청
        </button>
        <button
          onClick={() => setCouponOpen((v) => !v)}
          className="bg-white border border-slate-300 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-lg"
        >
          쿠폰 등록
        </button>
      </div>

      {bankOpen && (
        <div className="bg-white rounded-lg p-4 flex flex-col gap-2 text-xs mb-2 border border-slate-200">
          <div className="text-slate-600 leading-relaxed">
            입금 계좌: <b className="text-slate-900">우리은행 1005-804-614327</b> (예금주: 올케어솔루션 주식회사)
            <br />
            입금 확인 후 관리자가 수동으로 다운로드를 활성화합니다.
          </div>
          <div className="flex gap-2">
            <input
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="입금자명"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={submitBankTransfer}
              disabled={bankLoading}
              className="bg-[#1e3a5f] text-white text-xs font-bold px-4 rounded-lg disabled:opacity-60"
            >
              {bankLoading ? "신청 중..." : "입금 신청 완료"}
            </button>
          </div>
        </div>
      )}

      {couponOpen && (
        <div className="bg-white rounded-lg p-4 flex gap-2 border border-slate-200">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="쿠폰 코드 입력"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={redeemCoupon}
            disabled={couponLoading}
            className="bg-[#1e3a5f] text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {couponLoading ? "처리 중..." : "등록"}
          </button>
        </div>
      )}
    </div>
  );
}
