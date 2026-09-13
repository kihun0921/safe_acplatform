import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWizardHtml, type PdfOverview } from "@/lib/wizardHtml";
import { extractWizardSections } from "@/lib/wizardExport";
import { generateWizardDocx } from "@/lib/generateDocx";
import { generateWizardPdf } from "@/lib/generatePdf";
import { generateWizardHwpx } from "@/lib/generateHwpx";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  if (format !== "docx" && format !== "pdf" && format !== "hwpx") {
    return NextResponse.json({ error: "format은 docx, pdf, hwpx 중 하나여야 합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  if (doc.member_id !== user.id) {
    const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
    if (me?.role !== "admin") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { data: member } = await supabase.from("members").select("name, company").eq("id", doc.member_id).single();

  const { data: announcement } = doc.announcement_id
    ? await supabase
        .from("announcements")
        .select("base_amount, winner_amount, awarded, site_region, attachments")
        .eq("id", doc.announcement_id)
        .maybeSingle()
    : { data: null };

  const pdfOverview = doc.content?.pdfOverview as PdfOverview | undefined;
  const html = buildWizardHtml(doc, announcement, pdfOverview, member);
  const savedFields = (doc.content?.fields ?? {}) as Record<string, string | boolean>;
  const sections = extractWizardSections(html, savedFields);

  const title = (doc.title ?? "안전보건관리계획서").replace(/\s*계획서$/, "") + " 안전보건관리계획서";
  const filename = encodeURIComponent(title);

  if (format === "docx") {
    const buffer = await generateWizardDocx(title, sections);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
      },
    });
  }

  if (format === "hwpx") {
    const buffer = await generateWizardHwpx(title, sections);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename="${filename}.hwpx"`,
      },
    });
  }

  const buffer = await generateWizardPdf(title, sections);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
