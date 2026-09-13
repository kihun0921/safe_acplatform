import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Status changes (active/inactive/suspended) and role promotion/demotion
// (member <-> admin). Initial admin accounts are still provisioned out-of-band
// (seed script / direct DB), but once at least one admin exists, that admin
// can promote other members from this screen instead of needing DB access.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
  }

  const { status, role } = await request.json();

  if (status !== undefined) {
    if (!["active", "inactive", "suspended"].includes(status)) {
      return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
    }
    const { error } = await supabase.from("members").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (role !== undefined) {
    if (!["member", "admin"].includes(role)) {
      return NextResponse.json({ error: "잘못된 권한값입니다." }, { status: 400 });
    }
    if (id === user.id) {
      return NextResponse.json({ error: "자기 자신의 권한은 변경할 수 없습니다." }, { status: 400 });
    }
    const { error } = await supabase.from("members").update({ role }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
