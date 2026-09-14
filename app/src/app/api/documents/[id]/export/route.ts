import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWizardHtml, type PdfOverview } from "@/lib/wizardHtml";
import { extractWizardSections, extractCoverPageData, extractOverviewPageData } from "@/lib/wizardExport";
import { generateWizardDocx } from "@/lib/generateDocx";
import { generateWizardPdf } from "@/lib/generatePdf";
import { generateWizardHwpx } from "@/lib/generateHwpx";
import { isDocumentUnlocked } from "@/lib/documentAccess";
import type { CoverStyle, SectionOrderGroup } from "@/lib/agencyTemplates";

// "Ⅰ.사업개요"가 속한 실제 장(章) 제목("Ⅰ. 안전보건관리 체계" 등)을 정형 사업개요
// 페이지 상단에 그대로 쓴다. section_order에 그룹이 정의돼 있으면 그 로마숫자+제목을,
// 없으면 overview_label(또는 기본 라벨)로 최대한 근접하게 구성한다.
function resolveOverviewChapterTitle(
  selectedTemplate: { section_order?: SectionOrderGroup[] | null; overview_label?: string | null } | null | undefined
): string {
  const group = selectedTemplate?.section_order?.find((g) => g.members.includes("overview"));
  if (group) return `${group.roman}. ${group.title}`;
  return `Ⅰ. ${selectedTemplate?.overview_label?.trim() || "사업개요 및 기본정보"}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  if (format !== "docx" && format !== "pdf" && format !== "hwpx") {
    return NextResponse.json({ error: "format은 docx, pdf, hwpx 중 하나여야 합니다." }, { status: 400 });
  }
  // 미리보기(새 탭에서 바로 보기)는 강제 다운로드하지 않고 브라우저에서 바로
  // 열리도록 Content-Disposition을 inline으로 내려준다.
  const disposition = searchParams.get("preview") === "1" ? "inline" : "attachment";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  const { data: me } = await supabase.from("members").select("role").eq("id", user.id).single();
  const isAdmin = me?.role === "admin";
  if (doc.member_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 건당결제 모델: 쿠폰 등록 또는 결제 완료 전에는 다운로드를 막는다(관리자는 예외).
  if (!isAdmin) {
    const unlocked = await isDocumentUnlocked(supabase, id);
    if (!unlocked) {
      return NextResponse.json(
        { error: "다운로드하려면 쿠폰 등록 또는 결제(건당 " + doc.price.toLocaleString("ko-KR") + "원)가 필요합니다." },
        { status: 402 }
      );
    }
  }

  const { data: member } = await supabase.from("members").select("name, company").eq("id", doc.member_id).single();

  const { data: announcement } = doc.announcement_id
    ? await supabase
        .from("announcements")
        .select("base_amount, winner_amount, awarded, site_region, attachments")
        .eq("id", doc.announcement_id)
        .maybeSingle()
    : { data: null };

  const { data: selectedTemplate } = doc.template_id
    ? await supabase.from("agency_templates").select("*").eq("id", doc.template_id).maybeSingle()
    : { data: null };

  const pdfOverview = doc.content?.pdfOverview as PdfOverview | undefined;
  const html = buildWizardHtml(doc, announcement, pdfOverview, member, false, selectedTemplate);
  const savedFields = (doc.content?.fields ?? {}) as Record<string, string | boolean>;
  const overviewPageStyle = (selectedTemplate?.overview_page_style as string | null | undefined) ?? null;
  // overview_page_style이 켜진 발주처는 사업개요를 정형 페이지가 전담하므로, 일반
  // 섹션 목록(sec-overview)에서는 빼서 같은 내용이 두 번 나가지 않게 한다.
  const sections = extractWizardSections(html, savedFields, overviewPageStyle ? ["sec-overview"] : []);
  const cover = extractCoverPageData(html, savedFields, member?.company ?? "", member?.name ?? "");
  const coverStyle = (selectedTemplate?.cover_style as CoverStyle | undefined) ?? "generic";
  const overviewPage = overviewPageStyle
    ? extractOverviewPageData(html, savedFields, resolveOverviewChapterTitle(selectedTemplate))
    : undefined;

  const title = (doc.title ?? "안전보건관리계획서").replace(/\s*계획서$/, "") + " 안전보건관리계획서";
  const filename = encodeURIComponent(title);

  if (format === "docx") {
    const buffer = await generateWizardDocx(title, sections, cover, coverStyle, overviewPage, overviewPageStyle);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `${disposition}; filename="${filename}.docx"`,
      },
    });
  }

  if (format === "hwpx") {
    const buffer = await generateWizardHwpx(title, sections, cover, coverStyle, overviewPage, overviewPageStyle);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `${disposition}; filename="${filename}.hwpx"`,
      },
    });
  }

  const buffer = await generateWizardPdf(title, sections, cover, coverStyle, overviewPage, overviewPageStyle);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}.pdf"`,
    },
  });
}
