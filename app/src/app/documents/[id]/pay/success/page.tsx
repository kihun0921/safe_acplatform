"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function DocumentPaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-600">결제 승인 처리 중입니다...</p>
        </div>
      }
    >
      <DocumentPaySuccessContent />
    </Suspense>
  );
}

function DocumentPaySuccessContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const paramsValid = Boolean(paymentKey && orderId && amount);

  const [status, setStatus] = useState<"confirming" | "done" | "error">(paramsValid ? "confirming" : "error");
  const [message, setMessage] = useState(paramsValid ? "" : "결제 정보가 올바르지 않습니다.");

  useEffect(() => {
    if (!paramsValid) return;

    fetch(`/api/documents/${params.id}/pay/toss/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "결제 승인 처리에 실패했습니다.");
          return;
        }
        setStatus("done");
        setTimeout(() => router.replace(`/documents/${params.id}/wizard`), 1500);
      })
      .catch(() => {
        setStatus("error");
        setMessage("서버 통신 중 오류가 발생했습니다.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-sm w-full">
        {status === "confirming" && <p className="text-sm text-slate-600">결제 승인 처리 중입니다...</p>}
        {status === "done" && (
          <>
            <p className="text-emerald-600 font-bold mb-2">결제가 완료되었습니다.</p>
            <p className="text-xs text-slate-400">계획서 화면으로 이동합니다...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-rose-600 font-bold mb-2">결제 승인 실패</p>
            <p className="text-xs text-slate-500 mb-4">{message}</p>
            <a href={`/documents/${params.id}/wizard`} className="text-xs text-[#1e3a5f] font-semibold underline">
              계획서 화면으로 돌아가기
            </a>
          </>
        )}
      </div>
    </div>
  );
}
