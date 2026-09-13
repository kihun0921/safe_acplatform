"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OPEN_PAYWALL_EVENT } from "./DocumentPaywallModal";

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
  const router = useRouter();
  const fieldsRef = useRef<Record<string, FieldValue>>({ ...initialFields });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("#wizard-dock-save-status");
    if (!el) return;
    el.textContent = saving
      ? "저장 중..."
      : savedAt
      ? `마지막 저장: ${savedAt.toLocaleTimeString("ko-KR")}`
      : "자동 저장 대기 중";
  }, [saving, savedAt]);

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

    const fieldEls = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input:not([type=hidden]), textarea, select:not([data-template-select])"
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

    const onTemplateSelectChange = async (e: Event) => {
      const el = e.target as HTMLSelectElement;
      if (!el.matches("[data-template-select]")) return;
      el.setAttribute("disabled", "true");
      try {
        const res = await fetch(`/api/documents/${documentId}/template`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: el.value || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(`표준서식 변경 실패: ${data.error ?? "알 수 없는 오류"}`);
          el.removeAttribute("disabled");
          return;
        }
        // 선택한 표준서식의 추가 목차/입력항목을 반영하려면 화면 전체를 다시
        // 렌더링해야 하므로(서버 컴포넌트가 만드는 HTML 자체가 바뀜) 새로고침한다.
        window.location.reload();
      } catch {
        alert("표준서식 변경 중 오류가 발생했습니다.");
        el.removeAttribute("disabled");
      }
    };

    const onFieldChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (el.matches("[data-template-select]")) return;
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

      if (btn.hasAttribute("data-logout")) {
        e.preventDefault();
        const supabase = createClient();
        void supabase.auth.signOut().then(() => {
          router.push("/");
          router.refresh();
        });
        return;
      }

      const exportFormat = btn.getAttribute("data-export-format");
      const previewFormat = btn.getAttribute("data-preview-format");
      if (exportFormat || previewFormat) {
        e.preventDefault();
        if (downloadsLocked) {
          window.dispatchEvent(new CustomEvent(OPEN_PAYWALL_EVENT));
          return;
        }
        if (previewFormat) {
          // 미리보기는 blob을 fetch해서 새 탭에 옮겨 붙이는 대신, 익스포트
          // API로 직접 새 탭 네비게이션을 시킨다 — 브라우저 내장 PDF 뷰어가
          // 그대로 열어서 보여준다. window.open은 클릭 핸들러 안에서
          // "동기적으로" 호출해야 팝업 차단에 걸리지 않고, 최근 크롬은
          // 다른 탭에서 만든 blob: URL로의 탭 간 이동 자체를 막기도 해서
          // (안 그러면 새 탭이 about:blank로 멈춰버림) 이 방식이 더 안전하다.
          window.open(`/api/documents/${documentId}/export?format=${previewFormat}&preview=1`, "_blank");
          // 방금 수정한 내용이 미리보기에 반영되도록 저장은 백그라운드로 진행.
          void doSave(true);
          return;
        }
        void exportDocument(exportFormat!, btn as HTMLButtonElement);
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
            window.dispatchEvent(new CustomEvent(OPEN_PAYWALL_EVENT));
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

    // 좌측 목차(TOC)의 "현재 보고 있는 섹션" 강조 표시를, 실제 스크롤 위치에 맞춰
    // 동적으로 갱신한다. 화면을 처음 열었을 때는 항상 맨 위(사업개요 및 기본정보)가
    // 보이므로 자연히 그 항목이 강조되고, 스크롤하면 그때그때 보이는 섹션으로 이동한다.
    const tocLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a[href^="#sec-"]'));
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section[id^="sec-"]'));
    const setActiveSection = (id: string) => {
      tocLinks.forEach((a) => {
        const isActive = a.getAttribute("href") === `#${id}`;
        a.classList.toggle("bg-primary-soft", isActive);
        a.classList.toggle("text-primary", isActive);
        a.classList.toggle("border-l-4", isActive);
        a.classList.toggle("border-primary", isActive);
        a.classList.toggle("shadow-xs", isActive);
        a.classList.toggle("font-bold", isActive);
        a.classList.toggle("py-2.5", isActive);
        a.classList.toggle("py-2", !isActive);
        a.classList.toggle("text-neutral-700", !isActive);
        a.classList.toggle("font-medium", !isActive);
        a.classList.toggle("hover:bg-neutral-100", !isActive);
        a.classList.toggle("group", !isActive);
      });
    };

    const visibleSections = new Set<string>();
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target.id);
          else visibleSections.delete(entry.target.id);
        });
        const topMost = sections.find((s) => visibleSections.has(s.id));
        if (topMost) setActiveSection(topMost.id);
      },
      { rootMargin: "-190px 0px -65% 0px", threshold: 0 }
    );
    sections.forEach((s) => sectionObserver.observe(s));

    root.addEventListener("input", onFieldChange);
    root.addEventListener("change", onFieldChange);
    root.addEventListener("change", onTemplateSelectChange);
    root.addEventListener("click", onClick);
    root.addEventListener("click", onTocClick);
    return () => {
      root.removeEventListener("input", onFieldChange);
      root.removeEventListener("change", onFieldChange);
      root.removeEventListener("change", onTemplateSelectChange);
      root.removeEventListener("click", onClick);
      root.removeEventListener("click", onTocClick);
      sectionObserver.disconnect();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [documentId, downloadsLocked, router]);

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
