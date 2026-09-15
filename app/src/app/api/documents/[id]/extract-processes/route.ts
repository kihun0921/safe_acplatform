import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProcessListFromPdf } from "@/lib/extractProcessList";

// 회원이 현장설명서·공사개요 PDF를 첨부하면 그 문서에서 공정 목록을 추출해
// 위험성평가 표 행으로 바로 추가할 수 있게 해준다. Storage에 영구 저장할
// 필요 없는 일회성 변환이라, 업로드된 바이트를 그 자리에서 파싱만 하고 버린다.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("id").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const processes = await extractProcessListFromPdf(buf);
  if (processes.length === 0) {
    return NextResponse.json({
      error: "문서에서 공정 목록을 찾지 못했습니다. 직접 입력해 주세요.",
      processes: [],
    });
  }
  return NextResponse.json({ processes });
}
