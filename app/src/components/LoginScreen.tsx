"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginScreen({ html, script }: { html: string; script?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!script) return;
    try {
      new Function(script)();
    } catch (err) {
      console.error("[LoginScreen] inline script failed", err);
    }
  }, [script]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const supabase = createClient();

    const onSubmit = async (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!root.contains(form)) return;
      const email = (form.querySelector<HTMLInputElement>("#email")?.value ?? "").trim();
      const password = form.querySelector<HTMLInputElement>("#password")?.value ?? "";
      if (!email || !password) return;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(`로그인에 실패했습니다: ${error.message}`);
        return;
      }
      router.push("/announcements");
      router.refresh();
    };

    root.addEventListener("submit", onSubmit);
    return () => root.removeEventListener("submit", onSubmit);
  }, [router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
