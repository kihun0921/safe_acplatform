import type { SupabaseClient } from "@supabase/supabase-js";

// 우리 시스템은 월간 구독이 아니라 건당결제(문서 1건당 결제) 모델이다.
// 문서 1건은 아래 둘 중 하나가 있어야 다운로드(HWPX/DOCX/PDF)가 잠금해제된다:
//   1) 그 문서에 등록된(redeem된) 쿠폰 1개 (coupons.document_id = 문서, status='used')
//   2) 그 문서에 대해 완료된 결제 1건 (payments.document_id = 문서, status='paid') — 카드 또는 무통장입금
export async function isDocumentUnlocked(
  supabase: SupabaseClient,
  documentId: string
): Promise<boolean> {
  const [{ data: coupon }, { data: payment }] = await Promise.all([
    supabase.from("coupons").select("id").eq("document_id", documentId).eq("status", "used").maybeSingle(),
    supabase.from("payments").select("id").eq("document_id", documentId).eq("status", "paid").maybeSingle(),
  ]);
  return Boolean(coupon || payment);
}
