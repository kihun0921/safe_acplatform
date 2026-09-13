import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WizardScreen from "@/components/WizardScreen";
import DocumentPaywallModal from "@/components/DocumentPaywallModal";
import DocumentPriceEditor from "@/components/DocumentPriceEditor";
import { pickAnnouncementPdf, extractBusinessOverviewFromPdf } from "@/lib/extractBusinessOverview";
import { buildWizardHtml, SCRIPT_documents_wizard, type PdfOverview } from "@/lib/wizardHtml";
import { isDocumentUnlocked } from "@/lib/documentAccess";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/documents/${id}/wizard`);

  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) notFound();

  // 문서 헤더/시공사 필드에는 항상 "문서 소유 회원"의 정보를 써야 한다 — 로그인한
  // 사람(user)이 아니라 doc.member_id 기준. 관리자가 다른 회원의 문서를 열람할 때
  // user.id로 조회하면 관리자 본인 회사명이 잘못 찍히는 버그가 있었다.
  const { data: member } = await supabase
    .from("members")
    .select("name, company")
    .eq("id", doc.member_id)
    .single();
  const isOwner = doc.member_id === user.id;
  const { data: viewer } = await supabase.from("members").select("role").eq("id", user.id).single();
  const isAdmin = viewer?.role === "admin";
  const showAdminReturnLink = isAdmin && !isOwner;
  const unlocked = isAdmin || (await isDocumentUnlocked(supabase, id));

  const initialFields = (doc.content?.fields ?? {}) as Record<string, string | boolean>;

  // 발주처 표준서식(agency_templates): 이 문서의 발주처와 정확히 일치하는 표준서식만
  // 선택지로 보여준다. 현재는 LH만 실제로 등록되어 있고, 나머지 발주처는 공통 서식만
  // 노출된다(옵션이 없으면 드롭다운 대신 읽기 전용 배지로 표시).
  const { data: availableTemplates } = doc.agency
    ? await supabase.from("agency_templates").select("id, name").eq("agency", doc.agency)
    : { data: null };
  const { data: selectedTemplate } = doc.template_id
    ? await supabase.from("agency_templates").select("*").eq("id", doc.template_id).maybeSingle()
    : { data: null };

  const { data: announcement } = doc.announcement_id
    ? await supabase
        .from("announcements")
        .select("base_amount, winner_amount, awarded, site_region, attachments")
        .eq("id", doc.announcement_id)
        .maybeSingle()
    : { data: null };

  // 공고문 PDF 자동분석(공사기간/위치/공사내용): 문서를 만들 때 한 번만 다운로드·분석해서
  // doc.content.pdfOverview에 캐싱해 둔다. (필드값 자동저장(fields)과는 별개 — 사용자가
  // 나중에 이 필드들을 직접 수정하면 그 값은 일반 필드 자동저장 경로로 저장되어 항상
  // 우선하지만, 이 캐시가 없다면 아직 손대지 않은 필드는 새로고침마다 빈 값으로
  // 되돌아가 버린다.)
  let pdfOverview = doc.content?.pdfOverview as PdfOverview | undefined;
  if (!pdfOverview && announcement) {
    const pdfUrl = pickAnnouncementPdf(announcement.attachments ?? null);
    if (pdfUrl) {
      const extracted = await extractBusinessOverviewFromPdf(pdfUrl).catch(() => null);
      if (extracted) {
        pdfOverview = extracted;
        await supabase
          .from("documents")
          .update({ content: { ...doc.content, pdfOverview: extracted } })
          .eq("id", id);
      }
    }
  }

  const html = buildWizardHtml(
    doc,
    announcement,
    pdfOverview,
    member,
    showAdminReturnLink,
    selectedTemplate,
    availableTemplates ?? []
  );

  return (
    <>
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <DocumentPriceEditor documentId={id} price={doc.price} />
        </div>
      )}
      <WizardScreen
        html={html}
        script={SCRIPT_documents_wizard}
        documentId={id}
        initialFields={initialFields}
        initialPercent={doc.percent_complete ?? 0}
        downloadsLocked={!unlocked}
      />
      {!unlocked && <DocumentPaywallModal documentId={id} price={doc.price} />}
    </>
  );
}
