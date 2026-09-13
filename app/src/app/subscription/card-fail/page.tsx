"use client";

import { useSearchParams } from "next/navigation";

export default function CardFailPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-sm w-full">
        <p className="text-rose-600 font-bold mb-2">결제 실패</p>
        <p className="text-xs text-slate-500 mb-4">{message}</p>
        <a href="/subscription" className="text-xs text-[#1e3a5f] font-semibold underline">
          구독 페이지로 돌아가기
        </a>
      </div>
    </div>
  );
}
