import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { fields, percentComplete, status } = body ?? {};

  const update: Record<string, unknown> = {};
  if (fields) {
    // content는 fields 외에도 pdfOverview(공고문 PDF 자동분석 캐시) 등 다른 키를
    // 담을 수 있으므로, 통째로 교체하지 않고 fields만 병합해 덮어쓴다.
    const { data: existing } = await supabase.from("documents").select("content").eq("id", id).single();
    update.content = { ...(existing?.content ?? {}), fields };
  }
  if (typeof percentComplete === "number") update.percent_complete = percentComplete;
  if (status) {
    update.status = status;
    if (status === "completed") update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("documents").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
