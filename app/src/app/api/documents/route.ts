import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { announcementId, title, agency } = body ?? {};
  if (!title) {
    return NextResponse.json({ error: "제목이 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      member_id: user.id,
      announcement_id: announcementId ?? null,
      title,
      agency: agency ?? null,
      status: "in_progress",
      content: {},
      percent_complete: 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}
