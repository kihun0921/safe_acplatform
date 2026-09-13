import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });

  const { title, body } = await request.json();
  const { error } = await supabase
    .from("site_pages")
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
