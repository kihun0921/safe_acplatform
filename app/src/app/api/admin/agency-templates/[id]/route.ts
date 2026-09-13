import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return { error: NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 }) };
  }
  return { error: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { name, sections, disabledCommonSections } = await request.json();
  const update: Record<string, unknown> = {};
  if (typeof name === "string") update.name = name.trim();
  if (sections !== undefined) {
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "sections는 배열 형식이어야 합니다." }, { status: 400 });
    }
    update.sections = sections;
  }
  if (disabledCommonSections !== undefined) {
    if (!Array.isArray(disabledCommonSections)) {
      return NextResponse.json({ error: "disabledCommonSections는 배열 형식이어야 합니다." }, { status: 400 });
    }
    update.disabled_common_sections = disabledCommonSections;
  }

  const { error } = await supabase.from("agency_templates").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase.from("agency_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
