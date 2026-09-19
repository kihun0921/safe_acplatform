import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWizardHtml, ACCIDENT_LEVEL_SLOTS, type PdfOverview } from "@/lib/wizardHtml";
import {
  extractWizardSections,
  extractCoverPageData,
  extractOverviewPageData,
  extractManagementPolicyData,
  extractOrgChartData,
} from "@/lib/wizardExport";
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

// 회사가 첨부한 안전보건경영방침 이미지가 손상돼 있으면(예: 잘린 PNG) 문서 생성
// 라이브러리(react-pdf/docx)의 이미지 디코더가 무한 루프에 빠질 수 있음을 실제로
// 확인했다. 손상 이미지 자체를 완벽히 걸러내기는 어려우므로, 생성 단계 전체에
// 안전 타임아웃을 둬 특정 문서 하나 때문에 요청이 영영 멈춰 있지 않도록 한다.
class ExportTimeoutError extends Error {}
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new ExportTimeoutError("export timed out")), ms)),
  ]);
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

  const { data: member } = await supabase
    .from("members")
    .select("name, company, ceo_name")
    .eq("id", doc.member_id)
    .single();

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
  const html = buildWizardHtml(
    doc,
    announcement,
    pdfOverview,
    member ? { name: member.name, company: member.company, ceoName: member.ceo_name } : null,
    false,
    selectedTemplate
  );
  const savedFields = (doc.content?.fields ?? {}) as Record<string, string | boolean>;
  const overviewPageStyle = (selectedTemplate?.overview_page_style as string | null | undefined) ?? null;
  const showManagementPolicy = Boolean(selectedTemplate?.show_management_policy);
  const showOrgChart = Boolean(selectedTemplate?.show_org_chart);
  // overview_page_style이 켜진 발주처는 사업개요를, show_management_policy가 켜진
  // 발주처는 안전보건 경영방침을, show_org_chart가 켜진 발주처는 조직도를 각각
  // 정형 페이지가 전담하므로, 일반 섹션 목록에서는 빼서 같은 내용이 두 번
  // 나가지 않게 한다.
  const excludeIds = [
    ...(overviewPageStyle ? ["sec-overview"] : []),
    ...(showManagementPolicy ? ["sec-management-policy"] : []),
    ...(showOrgChart ? ["sec-org_chart"] : []),
  ];
  const sections = extractWizardSections(html, savedFields, excludeIds);
  const cover = extractCoverPageData(html, savedFields, member?.company ?? "", member?.name ?? "");
  const coverStyle = (selectedTemplate?.cover_style as CoverStyle | undefined) ?? "generic";
  const overviewPage = overviewPageStyle
    ? extractOverviewPageData(html, savedFields, resolveOverviewChapterTitle(selectedTemplate))
    : undefined;

  // 안전보건 경영방침: 회사가 이미지를 첨부했으면 Storage에서 실제 바이트를 읽어와
  // 세 생성기 모두에 넘긴다(표지/사업개요와 달리 텍스트가 아니라 이진 데이터라
  // wizardExport.ts가 아니라 여기서 직접 다룬다).
  let managementPolicy: ReturnType<typeof extractManagementPolicyData> | undefined;
  let managementPolicyImage: Buffer | null = null;
  if (showManagementPolicy) {
    const safetyPolicy = (doc.content?.safetyPolicy ?? {}) as { mode?: string; imagePath?: string };
    const mode: "image" | "standard" = safetyPolicy.mode === "image" ? "image" : "standard";
    managementPolicy = extractManagementPolicyData(html, savedFields, member?.company ?? "", mode);
    if (mode === "image" && safetyPolicy.imagePath) {
      const { data: imageBlob } = await supabase.storage
        .from("safety-policy-images")
        .download(safetyPolicy.imagePath);
      if (imageBlob) managementPolicyImage = Buffer.from(await imageBlob.arrayBuffer());
    }
  }

  const orgChart = showOrgChart ? extractOrgChartData(html, savedFields) : undefined;

  // 재해발생 수준 증빙자료: 안전보건 경영방침 이미지와 동일하게 이진 데이터라
  // wizardExport.ts가 아니라 여기서 직접 Storage에서 읽어와, sections 배열에서
  // "sec-accident_level"을 찾아 직접 채워 넣는다(비동기 I/O라 extractWizardSections
  // 내부에서는 할 수 없음).
  if (selectedTemplate?.show_accident_level_uploads) {
    const attachments = (doc.content?.accidentLevelAttachments ?? {}) as Record<string, string | null>;
    const accidentSection = sections.find((s) => s.id === "sec-accident_level");
    if (accidentSection) {
      const images: { label: string; buffer: Buffer }[] = [];
      for (const slot of ACCIDENT_LEVEL_SLOTS) {
        const path = attachments[slot.key];
        if (!path) continue;
        const { data: blob } = await supabase.storage.from("accident-level-attachments").download(path);
        if (blob) images.push({ label: slot.label, buffer: Buffer.from(await blob.arrayBuffer()) });
      }
      if (images.length > 0) accidentSection.accidentImages = images;
    }
  }

  const title = (doc.title ?? "안전보건관리계획서").replace(/\s*계획서$/, "") + " 안전보건관리계획서";
  const filename = encodeURIComponent(title);

  try {
    if (format === "docx") {
      const buffer = await withTimeout(
        generateWizardDocx(
          title,
          sections,
          cover,
          coverStyle,
          overviewPage,
          overviewPageStyle,
          managementPolicy,
          managementPolicyImage,
          orgChart
        ),
        45000
      );
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `${disposition}; filename="${filename}.docx"`,
        },
      });
    }

    if (format === "hwpx") {
      const buffer = await withTimeout(
        generateWizardHwpx(
          title,
          sections,
          cover,
          coverStyle,
          overviewPage,
          overviewPageStyle,
          managementPolicy,
          managementPolicyImage,
          orgChart
        ),
        45000
      );
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/hwp+zip",
          "Content-Disposition": `${disposition}; filename="${filename}.hwpx"`,
        },
      });
    }

    const buffer = await withTimeout(
      generateWizardPdf(
        title,
        sections,
        cover,
        coverStyle,
        overviewPage,
        overviewPageStyle,
        managementPolicy,
        managementPolicyImage,
        orgChart
      ),
      45000
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof ExportTimeoutError) {
      return NextResponse.json(
        {
          error:
            "문서 생성이 지연되고 있습니다. 첨부하신 안전보건경영방침 이미지가 손상됐을 수 있으니 다른 이미지로 다시 첨부해 보세요.",
        },
        { status: 500 }
      );
    }
    throw err;
  }
}
