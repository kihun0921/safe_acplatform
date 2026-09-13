"use client";

import { useEffect, useState } from "react";
import DocumentPaywall from "./DocumentPaywall";

// WizardScreen(별도 컴포넌트 트리, 계획서 원본 HTML을 다루는 순수 DOM 이벤트 기반
// 코드)이 잠긴 다운로드 버튼 클릭을 감지하면 이 커스텀 이벤트를 쏘고, 여기서
// 받아서 팝업을 띄운다 — 두 컴포넌트가 직접 props로 연결되어 있지 않아
// window 커스텀 이벤트로 느슨하게 연결한다.
export const OPEN_PAYWALL_EVENT = "open-document-paywall";

export default function DocumentPaywallModal({ documentId, price }: { documentId: string; price: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_PAYWALL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PAYWALL_EVENT, onOpen);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setOpen(false)}
          aria-label="닫기"
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 z-10"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
        <DocumentPaywall documentId={documentId} price={price} />
      </div>
    </div>
  );
}
