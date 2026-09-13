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

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(`로그인에 실패했습니다: ${error.message}`);
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // 세션이 끊겨 보호된 페이지에서 이곳으로 튕겨온 경우, proxy.ts가 붙여준
      // ?next=원래경로 를 우선 사용해 로그인 후 원래 보던 화면으로 되돌아가게 한다.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || (member?.role === "admin" ? "/admin" : "/announcements"));
      router.refresh();
    };

    root.addEventListener("submit", onSubmit);
    return () => root.removeEventListener("submit", onSubmit);
  }, [router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
