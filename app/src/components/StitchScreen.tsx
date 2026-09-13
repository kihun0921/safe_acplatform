"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Buttons (not <a> links) whose visible label implies a navigation action.
// Matched against button text with whitespace stripped, most specific first.
const BUTTON_LINK_MAP: [string, string][] = [
  ["관리자로그인", "/admin"],
  ["관리자포털로그인", "/admin"],
  ["계획서작성조회", "/documents/wizard"],
  ["계획서작성시작", "/documents/wizard"],
  ["직접입력해서시작", "/documents/wizard"],
  ["이어서작성", "/documents/wizard"],
  ["회원가입완료", "/login"],
  ["전체문서함바로가기", "/documents"],
  ["문서함전체보기", "/documents"],
  ["로그인", "/announcements"],
];

function normalize(s: string) {
  return s.replace(/\s+/g, "");
}

function resolveTarget(label: string): string | null {
  const norm = normalize(label);
  for (const [key, route] of BUTTON_LINK_MAP) {
    if (norm.includes(key)) return route;
  }
  return null;
}

export default function StitchScreen({ html, script }: { html: string; script?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!script) return;
    try {
      const fn = new Function(script);
      fn();
    } catch (err) {
      console.error("[StitchScreen] inline script failed", err);
    }
  }, [script]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest("button");
      if (!el || !root.contains(el)) return;
      const target = resolveTarget(el.textContent || "");
      if (target) router.push(target);
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!root.contains(form)) return;
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
      const target = btn ? resolveTarget(btn.textContent || "") : null;
      if (target) router.push(target);
    };

    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("submit", onSubmit);
    };
  }, [router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
