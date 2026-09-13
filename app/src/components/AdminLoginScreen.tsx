"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginScreen({ html, script }: { html: string; script?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!script) return;
    try {
      new Function(script)();
    } catch (err) {
      console.error("[AdminLoginScreen] inline script failed", err);
    }
    // Neutralize the design demo's fake OTP simulation; real auth happens in the submit handler below.
    (window as unknown as { simulateLogin?: () => void }).simulateLogin = () => {};
  }, [script]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const supabase = createClient();

    const onSubmit = async (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!root.contains(form)) return;

      const email = form.querySelector<HTMLInputElement>("#adminId")?.value?.trim() ?? "";
      const password = form.querySelector<HTMLInputElement>("#adminPassword")?.value ?? "";
      if (!email || !password) return;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(`관리자 로그인에 실패했습니다: ${error.message}`);
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (member?.role !== "admin") {
        await supabase.auth.signOut();
        alert("관리자 권한이 없는 계정입니다.");
        return;
      }

      router.push("/admin");
      router.refresh();
    };

    root.addEventListener("submit", onSubmit);
    return () => root.removeEventListener("submit", onSubmit);
  }, [router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
