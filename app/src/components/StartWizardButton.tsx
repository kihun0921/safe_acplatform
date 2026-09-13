"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartWizardButton({
  announcementId,
  title,
  agency,
  className,
  children,
}: {
  announcementId?: string | null;
  title: string;
  agency?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId, title, agency }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/announcements`);
          return;
        }
        alert(`계획서 생성에 실패했습니다: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      router.push(`/documents/${data.id}/wizard`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "생성 중..." : children}
    </button>
  );
}
