"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({
  className,
  redirectTo = "/",
}: {
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
    >
      로그아웃
    </button>
  );
}
