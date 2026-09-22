"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CouponDeleteButton({ id, code, used }: { id: string; code: string; used: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    const confirmMessage = used
      ? `"${code}"는 이미 사용된 쿠폰입니다. 삭제하면 사용 이력도 함께 사라집니다. 정말 삭제하시겠습니까?`
      : `"${code}" 쿠폰을 삭제하시겠습니까?`;
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`삭제 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-xs font-medium text-rose-500 hover:text-rose-700 hover:underline disabled:opacity-50"
      title="쿠폰 삭제"
    >
      {loading ? "삭제 중..." : "삭제"}
    </button>
  );
}
