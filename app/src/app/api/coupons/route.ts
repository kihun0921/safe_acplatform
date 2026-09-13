import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });

  const { source, count } = await request.json();
  const n = Math.min(Math.max(Number(count) || 1, 1), 100);
  if (!source?.trim()) return NextResponse.json({ error: "발급 사유를 입력해 주세요." }, { status: 400 });

  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    let code = generateCode();
    let attempts = 0;
    while (codes.includes(code) && attempts < 5) {
      code = generateCode();
      attempts++;
    }
    codes.push(code);
  }

  const { error } = await supabase.from("coupons").insert(codes.map((code) => ({ code, source })));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ codes });
}
