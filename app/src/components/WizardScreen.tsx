"use client";

import { useEffect, useRef, useState } from "react";

type FieldValue = string | boolean;

export default function WizardScreen({
  html,
  script,
  documentId,
  initialFields,
  initialPercent,
  downloadsLocked,
}: {
  html: string;
  script?: string;
  documentId: string;
  initialFields: Record<string, FieldValue>;
  initialPercent: number;
  downloadsLocked?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<Record<string, FieldValue>>({ ...initialFields });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!script) return;
    try {
      new Function(script)();
    } catch (err) {
      console.error("[WizardScreen] inline script failed", err);
    }
  }, [script]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    if (downloadsLocked) {
      root.querySelectorAll<HTMLButtonElement>("[data-export-format]").forEach((btn) => {
        btn.classList.add("opacity-50", "cursor-not-allowed");
        btn.title = "다운로드하려면 결제 또는 쿠폰 등록이 필요합니다";
        const icon = btn.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = "lock";
      });
    }

    const fieldEls = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input:not([type=hidden]), textarea, select"
      )
    );
    fieldEls.forEach((el, i) => {
      el.dataset.wizardKey = `field-${i}`;
      const key = el.dataset.wizardKey;
      const saved = fieldsRef.current[key];
      if (saved === undefined) return;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        el.checked = Boolean(saved);
      } else {
        (el as HTMLInputElement).value = String(saved);
      }
    });

    const computePercent = () => {
      let filled = 0;
      fieldEls.forEach((el) => {
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          if (el.checked) filled += 1;
        } else if ((el as HTMLInputElement).value?.trim()) {
          filled += 1;
        }
      });
      return fieldEls.length ? Math.round((filled / fieldEls.length) * 100) : 0;
    };

    const doSave = async (immediate = false) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const run = async () => {
        setSaving(true);
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: fieldsRef.current, percentComplete: computePercent() }),
          });
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      };
      if (immediate) await run();
      else saveTimer.current = setTimeout(run, 15000);
    };

    const onFieldChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const key = el.dataset.wizardKey;
      if (!key) return;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        fieldsRef.current[key] = el.checked;
      } else {
        fieldsRef.current[key] = (el as HTMLInputElement).value;
      }
      doSave(false);
    };

    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest("button");
      if (!btn || !root.contains(btn)) return;

      const exportFormat = btn.getAttribute("data-export-format");
      if (exportFormat) {
        e.preventDefault();
        if (downloadsLocked) {
          document.getElementById("document-paywall")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        void exportDocument(exportFormat, btn as HTMLButtonElement);
        return;
      }

      const text = (btn.textContent || "").replace(/\s+/g, "");
      if (text.includes("임시저장") || text.includes("최종계획서생성")) {
        doSave(true);
      }
    };

    const exportDocument = async (format: string, btn: HTMLButtonElement) => {
      const originalHtml = btn.innerHTML;
      btn.setAttribute("disabled", "true");
      btn.innerHTML = `<span>생성 중...</span>`;
      try {
        await doSave(true);
        const res = await fetch(`/api/documents/${documentId}/export?format=${format}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 402) {
            alert(data.error ?? "다운로드하려면 결제 또는 쿠폰 등록이 필요합니다.");
            document.getElementById("document-paywall")?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            alert(`문서 생성에 실패했습니다: ${data.error ?? "알 수 없는 오류"}`);
          }
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match ? decodeURIComponent(match[1]) : `document.${format}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        alert("문서 생성 중 오류가 발생했습니다.");
      } finally {
        btn.removeAttribute("disabled");
        btn.innerHTML = originalHtml;
      }
    };

    const onTocClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest("a[href^='#sec-']");
      if (!link || !root.contains(link)) return;
      const id = link.getAttribute("href")?.slice(1);
      const target = id ? root.querySelector(`#${id}`) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    root.addEventListener("input", onFieldChange);
    root.addEventListener("change", onFieldChange);
    root.addEventListener("click", onClick);
    root.addEventListener("click", onTocClick);
    return () => {
      root.removeEventListener("input", onFieldChange);
      root.removeEventListener("change", onFieldChange);
      root.removeEventListener("click", onClick);
      root.removeEventListener("click", onTocClick);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [documentId, downloadsLocked]);

  return (
    <div>
      <div
        className="sticky top-0 z-[60] text-center text-xs py-1"
        style={{ background: saving ? "#fef3c7" : "#dcfce7", color: saving ? "#92400e" : "#15803d" }}
      >
        {saving ? "저장 중..." : savedAt ? `마지막 저장: ${savedAt.toLocaleTimeString("ko-KR")}` : `초기 진행률 ${initialPercent}%`}
      </div>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
