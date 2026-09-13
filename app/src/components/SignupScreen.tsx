"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SignupScreen({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const emailInput = root.querySelector<HTMLInputElement>("#email");
    const checkBtn = root.querySelector<HTMLButtonElement>("#emailCheckBtn");
    const resultEl = root.querySelector<HTMLParagraphElement>("#emailCheckResult");
    let lastCheckedEmail: string | null = null;

    const setResult = (text: string, cls: string) => {
      if (!resultEl) return;
      resultEl.className = `text-[11px] mt-1.5 flex items-center gap-1 ${cls}`;
      resultEl.innerHTML = `<span class="material-symbols-outlined text-xs">info</span><span>${text}</span>`;
    };

    const onCheckClick = async () => {
      const email = emailInput?.value.trim() ?? "";
      if (!email) {
        setResult("이메일을 먼저 입력해 주세요.", "text-danger");
        return;
      }
      if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.textContent = "확인 중...";
      }
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setResult(data.error ?? "확인 중 오류가 발생했습니다.", "text-danger");
          lastCheckedEmail = null;
          return;
        }
        if (data.available) {
          setResult("사용 가능한 이메일입니다.", "text-success");
          lastCheckedEmail = email;
        } else {
          setResult("이미 가입된 이메일입니다.", "text-danger");
          lastCheckedEmail = null;
        }
      } finally {
        if (checkBtn) {
          checkBtn.disabled = false;
          checkBtn.textContent = "중복확인";
        }
      }
    };
    checkBtn?.addEventListener("click", onCheckClick);

    const onEmailInput = () => {
      lastCheckedEmail = null;
      setResult("로그인 계정 ID 및 공공 문서 수신용으로 사용됩니다.", "text-text-muted");
    };
    emailInput?.addEventListener("input", onEmailInput);

    const onSubmit = async (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!root.contains(form)) return;

      const val = (id: string) => form.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
      const email = val("email").trim();
      const password = val("password");
      const passwordConfirm = val("password_confirm");
      const company = val("company_name").trim();
      const registrationNumber = val("business_number").trim();
      const name = val("manager_name").trim();
      const phone = val("phone").trim();
      const agreeRequired = form.querySelector<HTMLInputElement>("#agree_required")?.checked ?? true;

      if (!email || !password || !company || !registrationNumber || !name || !phone) {
        alert("모든 필수 항목을 입력해 주세요.");
        return;
      }
      if (password !== passwordConfirm) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }
      if (!agreeRequired) {
        alert("필수 약관에 동의해 주세요.");
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          company,
          name,
          phone,
          registrationNumber,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(`회원가입에 실패했습니다: ${result.error ?? "알 수 없는 오류"}`);
        return;
      }

      alert("회원가입이 완료되었습니다. 로그인해 주세요.");
      router.push("/login");
    };

    root.addEventListener("submit", onSubmit);
    return () => {
      root.removeEventListener("submit", onSubmit);
      checkBtn?.removeEventListener("click", onCheckClick);
      emailInput?.removeEventListener("input", onEmailInput);
    };
  }, [router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
