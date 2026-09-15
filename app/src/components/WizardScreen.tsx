"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OPEN_PAYWALL_EVENT } from "./DocumentPaywallModal";
import { classifyHazardType, suggestFrequencySeverity } from "@/lib/riskTemplates";

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
  const riskSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        "input:not([type=hidden]):not([data-risk-field]):not([data-policy-image-input]):not([data-process-extract-input]), textarea:not([data-risk-field]), select:not([data-template-select]):not([data-risk-field])"
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

    const updateAttachmentsBadge = () => {
      const badge = root.querySelector<HTMLElement>("#attachments-active-count");
      const section = root.querySelector<HTMLElement>("#sec-attachments");
      if (!badge || !section) return;
      const checked = section.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').length;
      badge.textContent = `${checked}종 활성`;
    };
    updateAttachmentsBadge();

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

    // ── 위험성평가 표(Ⅱ. sec-risk): 행 추가/삭제/DB 불러오기/공종 필터, 그리고
    // 행 자체의 실제 자동저장. 행 개수가 언제든 바뀔 수 있어 일반 field-N 자동저장
    // 체계(DOM 순서 기반)에 태우면 다른 필드들의 인덱스가 밀리는 사고가 나므로,
    // documents.content.riskRows에 별도로 통째 저장한다.
    const riskTable = root.querySelector<HTMLTableElement>("table[data-risk-table]");
    const riskTbody = riskTable?.querySelector("tbody") ?? null;
    const riskTemplate = root.querySelector<HTMLTemplateElement>("#risk-row-template");

    const renumberRiskRows = () => {
      if (!riskTbody) return;
      Array.from(riskTbody.querySelectorAll<HTMLElement>("tr[data-risk-id]")).forEach((tr, i) => {
        const noCell = tr.querySelector<HTMLElement>("[data-risk-no]");
        if (noCell) noCell.textContent = String(i + 1).padStart(2, "0");
      });
    };

    const serializeRiskRows = () => {
      if (!riskTbody) return [] as Record<string, string>[];
      return Array.from(riskTbody.querySelectorAll<HTMLElement>("tr[data-risk-id]")).map((tr) => {
        const row: Record<string, string> = { id: tr.dataset.riskId ?? "" };
        tr.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-risk-field]").forEach(
          (el) => {
            const key = el.dataset.riskField;
            if (key) row[key] = el.value;
          }
        );
        return row;
      });
    };

    const saveRiskRows = (immediate = false): Promise<void> => {
      if (riskSaveTimer.current) clearTimeout(riskSaveTimer.current);
      const run = async () => {
        setSaving(true);
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ riskRows: serializeRiskRows() }),
          });
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      };
      if (immediate) return run();
      riskSaveTimer.current = setTimeout(run, 15000);
      return Promise.resolve();
    };

    // src/lib/riskTemplates.ts의 categorizeRiskProcess()와 반드시 같은 규칙을 유지할 것 —
    // 서버가 초기 렌더링 시 매기는 분류와 클라이언트에서 새로 추가한 행의 분류가
    // 어긋나면 필터 탭에서 새 행이 엉뚱하게(혹은 전혀 안) 걸러진다.
    const categorizeRiskProcess = (process: string): string => {
      if (/비계|흙막이|거푸집|동바리|가설/.test(process)) return "가설비계 및 흙막이";
      if (/타워크레인|크레인|양중|인양/.test(process)) return "타워크레인 양중";
      if (/굴착|토공|흙|터파기/.test(process)) return "굴착 및 토공사";
      return "일반공사";
    };

    // save=false로 여러 행을 연달아 추가할 때(예: 첨부파일에서 공정 목록을 한 번에
    // 여러 개 뽑아 넣는 경우) 매 행마다 saveRiskRows(true)로 즉시 저장을 쏘면,
    // 거의 동시에 나간 여러 PATCH 요청의 응답이 네트워크에서 순서가 뒤바뀌어
    // 나중에 추가한 행이 들어있는 스냅샷을 먼저 추가한(행이 더 적은) 스냅샷이
    // 나중에 도착해 덮어써 버리는 사고가 실측으로 확인됐다(merge_document_content가
    // riskRows 배열 자체를 통째로 교체하는 얕은 병합이라 행별로는 병합되지 않음).
    // 그래서 일괄 추가 시에는 DOM에만 반영하고, 호출부가 마지막에 한 번만
    // saveRiskRows(true)를 불러 정확히 하나의 스냅샷만 저장하게 한다.
    const appendRiskRow = (
      fill?: { process?: string; hazard?: string; countermeasure?: string },
      options?: { save?: boolean }
    ) => {
      if (!riskTbody || !riskTemplate) return;
      const fragment = riskTemplate.content.cloneNode(true) as DocumentFragment;
      const tr = fragment.querySelector("tr");
      if (!tr) return;
      tr.dataset.riskId = `risk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (fill) {
        const setVal = (field: string, value: string) => {
          const el = tr.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            `[data-risk-field="${field}"]`
          );
          if (el) el.value = value;
        };
        if (fill.process) setVal("process", fill.process);
        if (fill.hazard) {
          setVal("hazard", fill.hazard);
          const { frequency, severity } = suggestFrequencySeverity(fill.hazard);
          setVal("hazardType", classifyHazardType(fill.hazard));
          setVal("frequency", String(frequency));
          setVal("severity", String(severity));
          setVal("riskScore", String(frequency * severity));
        }
        if (fill.countermeasure) setVal("countermeasure", fill.countermeasure);
        tr.dataset.riskCategory = categorizeRiskProcess(fill.process ?? "");
      }
      riskTbody.appendChild(tr);
      renumberRiskRows();
      if (options?.save !== false) saveRiskRows(true);
    };

    const onRiskDbSelectChange = (e: Event) => {
      const select = e.target as HTMLSelectElement;
      if (!select.matches("[data-risk-db-select]")) return;
      const option = select.selectedOptions[0];
      if (!option || !option.value) return;
      appendRiskRow({
        process: option.dataset.process,
        hazard: option.dataset.hazard,
        countermeasure: option.dataset.countermeasure,
      });
      select.value = "";
    };

    // 현장설명서·공사개요 PDF 첨부 → 서버가 공정 목록을 추출해 돌려주면 그대로
    // 위험성평가 행으로 추가한다. 추출된 유해요인이 있으면(공종을 확신할 수 있는
    // 경우만) appendRiskRow가 빈도·강도·위험분류까지 같이 채워준다.
    const onProcessExtractFileChange = async (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches("[data-process-extract-input]")) return;
      const file = input.files?.[0];
      if (!file) return;
      const labelText = root.querySelector<HTMLElement>("[data-process-extract-label-text]");
      const original = labelText?.textContent ?? "";
      if (labelText) labelText.textContent = "분석 중...";
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/documents/${documentId}/extract-processes`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(`공정 추출 실패: ${data.error ?? "알 수 없는 오류"}`);
          return;
        }
        const processes = (data.processes ?? []) as { process: string; hazard?: string; countermeasure?: string }[];
        if (processes.length === 0) {
          alert(data.error || "문서에서 공정 목록을 찾지 못했습니다. 직접 입력해 주세요.");
          return;
        }
        processes.forEach((p) => appendRiskRow(p, { save: false }));
        await saveRiskRows(true);
        alert(`${processes.length}개 공정을 위험성평가 표에 추가했습니다. 내용을 확인하고 필요에 맞게 수정하세요.`);
      } catch {
        alert("공정 추출 중 오류가 발생했습니다.");
      } finally {
        if (labelText) labelText.textContent = original;
        input.value = "";
      }
    };

    const onRiskTabClick = (tab: HTMLElement) => {
      const category = tab.dataset.riskTab ?? "전체보기";
      const tabs = Array.from(root.querySelectorAll<HTMLElement>("[data-risk-tab]"));
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("bg-white", active);
        t.classList.toggle("text-neutral-900", active);
        t.classList.toggle("shadow-xs", active);
        t.classList.toggle("font-semibold", active);
        t.classList.toggle("text-neutral-600", !active);
      });
      if (!riskTbody) return;
      Array.from(riskTbody.querySelectorAll<HTMLElement>("tr[data-risk-id]")).forEach((tr) => {
        tr.hidden = category !== "전체보기" && tr.dataset.riskCategory !== category;
      });
    };

    // ── 안전보건 경영방침 및 목표(Ⅰ장): 회사가 자체 이미지를 갖고 있으면 첨부,
    // 없으면 표준 문구를 쓴다. mode/이미지 경로는 field-N 자동저장 대상이 아니라
    // documents.content.safetyPolicy에 별도 저장한다(위험성평가 행과 같은 이유).
    const policySection = root.querySelector<HTMLElement>("#sec-management-policy");

    const savePolicyState = async (mode: string, imagePath: string) => {
      setSaving(true);
      try {
        await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ safetyPolicy: { mode, imagePath: imagePath || null } }),
        });
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    };

    const setPolicyTab = (mode: "image" | "standard") => {
      if (!policySection) return;
      policySection.dataset.policyMode = mode;
      policySection.querySelectorAll<HTMLElement>("[data-policy-tab]").forEach((tab) => {
        const active = tab.dataset.policyTab === mode;
        tab.classList.toggle("bg-primary", active);
        tab.classList.toggle("text-white", active);
        tab.classList.toggle("border-primary", active);
        tab.classList.toggle("bg-white", !active);
        tab.classList.toggle("text-neutral-600", !active);
        tab.classList.toggle("border-neutral-300", !active);
      });
      policySection.querySelectorAll<HTMLElement>("[data-policy-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.policyPanel !== mode;
      });
    };

    const onPolicyTabClick = (tab: HTMLElement) => {
      const mode = tab.dataset.policyTab === "image" ? "image" : "standard";
      setPolicyTab(mode);
      void savePolicyState(mode, policySection?.dataset.policyImagePath ?? "");
    };

    const onPolicyImageChange = async (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches("[data-policy-image-input]") || !policySection) return;
      const file = input.files?.[0];
      if (!file) return;
      const status = policySection.querySelector<HTMLElement>("[data-policy-image-status]");
      if (status) status.textContent = "업로드 중...";
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("로그인이 필요합니다.");
        const ext = file.name.split(".").pop() || "png";
        const path = `${documentId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("safety-policy-images")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;

        policySection.dataset.policyImagePath = path;
        const previewWrap = policySection.querySelector<HTMLElement>("[data-policy-image-preview-wrap]");
        const previewImg = policySection.querySelector<HTMLImageElement>("[data-policy-image-preview]");
        if (previewImg) previewImg.src = URL.createObjectURL(file);
        if (previewWrap) previewWrap.classList.remove("hidden");
        if (status) status.textContent = "업로드된 이미지가 저장되어 있습니다.";
        await savePolicyState("image", path);
      } catch (err) {
        if (status) status.textContent = "업로드 실패 — 다시 시도해 주세요.";
        console.error("[WizardScreen] safety policy image upload failed", err);
      } finally {
        input.value = "";
      }
    };

    const onPolicyImageRemove = async () => {
      if (!policySection) return;
      if (!confirm("첨부한 안전보건경영방침 이미지를 삭제하시겠습니까?")) return;
      const path = policySection.dataset.policyImagePath;
      if (path) {
        const supabase = createClient();
        await supabase.storage.from("safety-policy-images").remove([path]).catch(() => {});
      }
      policySection.dataset.policyImagePath = "";
      const previewWrap = policySection.querySelector<HTMLElement>("[data-policy-image-preview-wrap]");
      const previewImg = policySection.querySelector<HTMLImageElement>("[data-policy-image-preview]");
      const status = policySection.querySelector<HTMLElement>("[data-policy-image-status]");
      if (previewImg) previewImg.src = "";
      if (previewWrap) previewWrap.classList.add("hidden");
      if (status) status.textContent = "아직 업로드된 이미지가 없습니다.";
      await savePolicyState("image", "");
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

    // 연락처 입력칸(data-phone-format)은 타이핑 도중 하이픈을 자동으로 넣어준다.
    // 010-XXXX-XXXX(11자리)/일반 국번(10·9자리)/서울(02) 국번을 구분해서 포맷한다.
    const formatPhoneNumber = (raw: string): string => {
      const digits = raw.replace(/\D/g, "").slice(0, 11);
      if (digits.startsWith("02")) {
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
      }
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    };

    const onFieldChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (el instanceof HTMLInputElement && el.matches("[data-phone-format]")) {
        const formatted = formatPhoneNumber(el.value);
        if (formatted !== el.value) el.value = formatted;
      }
      if (el.matches("[data-risk-field]")) {
        const field = el.dataset.riskField;
        if (field === "frequency" || field === "severity") {
          const tr = el.closest<HTMLElement>("tr[data-risk-id]");
          const freqEl = tr?.querySelector<HTMLSelectElement>('[data-risk-field="frequency"]');
          const sevEl = tr?.querySelector<HTMLSelectElement>('[data-risk-field="severity"]');
          const scoreEl = tr?.querySelector<HTMLInputElement>('[data-risk-field="riskScore"]');
          if (freqEl && sevEl && scoreEl) {
            scoreEl.value = String(Number(freqEl.value) * Number(sevEl.value));
          }
        }
        saveRiskRows(false);
        return;
      }
      if (el.matches("[data-template-select]")) return;
      const key = el.dataset.wizardKey;
      if (!key) return;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        fieldsRef.current[key] = el.checked;
        if (el.closest("#sec-attachments")) updateAttachmentsBadge();
      } else {
        fieldsRef.current[key] = (el as HTMLInputElement).value;
      }
      doSave(false);
    };

    const closeModal = (name: string) => {
      const modal = root.querySelector<HTMLElement>(`[data-modal="${name}"]`);
      if (modal) modal.classList.add("hidden");
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 배경(backdrop) 클릭으로 팝업 닫기: 실제 팝업 콘텐츠 위 클릭은 이 요소까지
      // 안 올라오므로(콘텐츠 wrapper가 별도 div), backdrop 자신을 클릭했을 때만 닫는다.
      const backdrop = target?.closest<HTMLElement>("[data-modal-backdrop]");
      if (backdrop && root.contains(backdrop) && target === backdrop) {
        closeModal(backdrop.getAttribute("data-modal-backdrop") ?? "");
        return;
      }

      const btn = target?.closest("button");
      if (!btn || !root.contains(btn)) return;

      const openModalName = btn.getAttribute("data-open-modal");
      if (openModalName) {
        e.preventDefault();
        const modal = root.querySelector<HTMLElement>(`[data-modal="${openModalName}"]`);
        if (modal) modal.classList.remove("hidden");
        return;
      }
      const closeModalName = btn.getAttribute("data-modal-close");
      if (closeModalName) {
        e.preventDefault();
        closeModal(closeModalName);
        return;
      }

      if (btn.hasAttribute("data-risk-add")) {
        e.preventDefault();
        appendRiskRow();
        return;
      }
      if (btn.hasAttribute("data-risk-delete")) {
        e.preventDefault();
        const tr = btn.closest<HTMLElement>("tr[data-risk-id]");
        if (tr && confirm("이 위험성평가 행을 삭제하시겠습니까?")) {
          tr.remove();
          renumberRiskRows();
          saveRiskRows(true);
        }
        return;
      }
      if (btn.hasAttribute("data-risk-tab")) {
        e.preventDefault();
        onRiskTabClick(btn);
        return;
      }
      if (btn.hasAttribute("data-policy-tab")) {
        e.preventDefault();
        onPolicyTabClick(btn);
        return;
      }
      if (btn.hasAttribute("data-policy-image-remove")) {
        e.preventDefault();
        void onPolicyImageRemove();
        return;
      }
      if (btn.hasAttribute("data-toc-group-toggle")) {
        e.preventDefault();
        onTocGroupToggle(btn);
        return;
      }

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
          saveRiskRows(true);
          return;
        }
        void exportDocument(exportFormat!, btn as HTMLButtonElement);
        return;
      }

      const text = (btn.textContent || "").replace(/\s+/g, "");
      if (text.includes("임시저장") || text.includes("최종계획서생성")) {
        doSave(true);
        saveRiskRows(true);
      }
    };

    const exportDocument = async (format: string, btn: HTMLButtonElement) => {
      const originalHtml = btn.innerHTML;
      btn.setAttribute("disabled", "true");
      btn.innerHTML = `<span>생성 중...</span>`;
      try {
        await doSave(true);
        await saveRiskRows(true);
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

    // 대제목(로마숫자) 밑 소제목 묶음을 접었다 펼쳤다 하는 아코디언. 목차가 길어질
    // 때(발주처 전용 항목까지 합쳐 15개 안팎) 전부 펼쳐두면 스크롤할수록 좌측
    // 목차가 화면을 다 차지해 산만해지므로, 서버 렌더링 시 첫 장만 펼치고 나머지는
    // 접어 두고(agencyTemplates.ts의 buildGroupHeaderHtml) 여기서 클릭/스크롤에
    // 반응해 펼침 상태를 바꾼다.
    const setGroupOpen = (panel: HTMLElement, open: boolean) => {
      panel.hidden = !open;
      const toggle = panel.previousElementSibling;
      const chevron = toggle?.querySelector<HTMLElement>("[data-toc-group-chevron]");
      chevron?.classList.toggle("-rotate-90", !open);
    };

    const onTocGroupToggle = (btn: HTMLElement) => {
      const panel = btn.nextElementSibling as HTMLElement | null;
      if (!panel || !panel.matches("[data-toc-group-panel]")) return;
      setGroupOpen(panel, panel.hidden);
    };

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
        // 스크롤로 활성화된 항목이 접힌 묶음 안에 있으면 자동으로 펼쳐서 보여준다.
        if (isActive) {
          const panel = a.closest<HTMLElement>("[data-toc-group-panel]");
          if (panel?.hidden) setGroupOpen(panel, true);
        }
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
    root.addEventListener("change", onRiskDbSelectChange);
    root.addEventListener("change", onPolicyImageChange);
    root.addEventListener("change", onProcessExtractFileChange);
    root.addEventListener("click", onClick);
    root.addEventListener("click", onTocClick);
    return () => {
      root.removeEventListener("input", onFieldChange);
      root.removeEventListener("change", onFieldChange);
      root.removeEventListener("change", onTemplateSelectChange);
      root.removeEventListener("change", onRiskDbSelectChange);
      root.removeEventListener("change", onPolicyImageChange);
      root.removeEventListener("change", onProcessExtractFileChange);
      root.removeEventListener("click", onClick);
      root.removeEventListener("click", onTocClick);
      sectionObserver.disconnect();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (riskSaveTimer.current) clearTimeout(riskSaveTimer.current);
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
