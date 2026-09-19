import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WizardScreen from "@/components/WizardScreen";
import DocumentPaywallModal from "@/components/DocumentPaywallModal";
import DocumentPriceEditor from "@/components/DocumentPriceEditor";
import { pickAnnouncementPdf, extractBusinessOverviewFromPdf } from "@/lib/extractBusinessOverview";
import { buildWizardHtml, SCRIPT_documents_wizard, ACCIDENT_LEVEL_SLOTS, type PdfOverview } from "@/lib/wizardHtml";
import { normalizeAgencyName, type AgencyTemplateRow } from "@/lib/agencyTemplates";
import { isDocumentUnlocked } from "@/lib/documentAccess";
import { classifyConstructionType, buildInitialRiskRows, type RiskRow } from "@/lib/riskTemplates";

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
  const { data: memberRow } = await supabase
    .from("members")
    .select("name, company, ceo_name")
    .eq("id", doc.member_id)
    .single();
  const member = memberRow
    ? { name: memberRow.name, company: memberRow.company, ceoName: memberRow.ceo_name }
    : null;
  const isOwner = doc.member_id === user.id;
  const { data: viewer } = await supabase.from("members").select("role").eq("id", user.id).single();
  const isAdmin = viewer?.role === "admin";
  const showAdminReturnLink = isAdmin && !isOwner;
  const unlocked = isAdmin || (await isDocumentUnlocked(supabase, id));

  const initialFields = (doc.content?.fields ?? {}) as Record<string, string | boolean>;

  // 발주처 표준서식(agency_templates): 이 문서의 발주처와 이름이 일치하는 표준서식만
  // 선택지로 보여준다. 정확히 같은 문자열이 아니라 괄호 약어를 뗀 이름으로 비교하는
  // 이유는 공고 출처(수동 등록/각 발주처 API 동기화)마다 "한국토지주택공사(LH)"/
  // "한국토지주택공사"처럼 표기가 갈리기 때문이다(normalizeAgencyName 참고).
  // documents.template_id가 비어 있어도(문서 생성 라우트가 자동 적용하기 전에
  // 만들어진 예전 문서 등) 발주처 이름이 일치하면 처음부터 그 표준서식으로
  // 보여준다 — 회원이 매번 드롭다운에서 직접 골라야 하는 일이 없도록 한다.
  const { data: allTemplates } = await supabase.from("agency_templates").select("*");
  const normalizedDocAgency = doc.agency ? normalizeAgencyName(doc.agency) : null;
  const matchedTemplates: AgencyTemplateRow[] =
    normalizedDocAgency && allTemplates
      ? allTemplates.filter((t) => normalizeAgencyName(t.agency) === normalizedDocAgency)
      : [];
  const availableTemplates = matchedTemplates.map((t) => ({ id: t.id, name: t.name }));
  const selectedTemplate: AgencyTemplateRow | null =
    (doc.template_id ? matchedTemplates.find((t) => t.id === doc.template_id) : undefined) ??
    matchedTemplates[0] ??
    null;

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

  // 위험성평가 행(sec-risk 표)도 pdfOverview와 같은 방식으로 최초 1회만 자동
  // 생성해서 캐싱한다 — 이후에는 사용자가 실제로 추가·삭제·수정한 값이 항상
  // 우선한다.
  let riskRows = doc.content?.riskRows as RiskRow[] | undefined;
  if (!riskRows) {
    riskRows = buildInitialRiskRows(classifyConstructionType(doc.title ?? ""));
    await supabase
      .from("documents")
      .update({ content: { ...doc.content, riskRows } })
      .eq("id", id);
    doc.content = { ...doc.content, riskRows };
  }

  // 안전보건 경영방침 이미지: Storage에는 경로만 저장돼 있고(documents.content.
  // safetyPolicy.imagePath), 비공개 버킷이라 볼 때마다 서명 URL을 새로 만들어야 한다.
  const safetyPolicyImagePath = (doc.content?.safetyPolicy as { imagePath?: string } | undefined)?.imagePath;
  let safetyPolicyImageUrl: string | null = null;
  if (safetyPolicyImagePath) {
    const { data: signed } = await supabase.storage
      .from("safety-policy-images")
      .createSignedUrl(safetyPolicyImagePath, 3600);
    safetyPolicyImageUrl = signed?.signedUrl ?? null;
  }

  // 재해발생 수준 증빙자료(산재요양승인확인서/산업재해율 조회결과/안전보건경영
  // 시스템 인증서): 위와 동일하게 비공개 버킷이라 볼 때마다 서명 URL을 새로
  // 만들어야 한다.
  const accidentLevelAttachments =
    (doc.content?.accidentLevelAttachments as Record<string, string | null> | undefined) ?? {};
  const accidentLevelImageUrls: Record<string, string | null> = {};
  for (const slot of ACCIDENT_LEVEL_SLOTS) {
    const path = accidentLevelAttachments[slot.key];
    if (!path) continue;
    const { data: signed } = await supabase.storage
      .from("accident-level-attachments")
      .createSignedUrl(path, 3600);
    accidentLevelImageUrls[slot.key] = signed?.signedUrl ?? null;
  }

  const html = buildWizardHtml(
    doc,
    announcement,
    pdfOverview,
    member,
    showAdminReturnLink,
    selectedTemplate,
    availableTemplates ?? [],
    safetyPolicyImageUrl,
    accidentLevelImageUrls
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
