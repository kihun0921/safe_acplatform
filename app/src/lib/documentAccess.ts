import type { SupabaseClient } from "@supabase/supabase-js";

// 우리 시스템은 월간 구독이 아니라 건당결제(문서 1건당 결제) 모델이다.
// 문서 1건은 아래 둘 중 하나가 있어야 다운로드(HWPX/DOCX/PDF)가 잠금해제된다:
//   1) 그 문서에 등록된(redeem된) 쿠폰 1개 (coupons.document_id = 문서, status='used')
//   2) 그 문서에 대해 완료된 결제 1건 (payments.document_id = 문서, status='paid') — 카드 또는 무통장입금
//
// 반드시 이미 결제/쿠폰 등록이 끝난 문서에 결제 팝업이 다시 뜨는 일이 없어야 한다.
// .maybeSingle()은 매칭되는 행이 2개 이상이면 에러를 던지고, 그 에러를 무시하면
// data가 null이 되어 "잠금해제 안 됨"으로 오판하는 치명적인 실패 모드가 있었다
// (한 문서에 결제 실패 후 재결제 등으로 paid 행이 2개 이상 쌓이거나, 쿠폰을
// 두 번 등록한 경우 실제로 발생 가능). limit(1) + 배열 길이 체크로 교체해
// 매칭 행이 여러 개여도 항상 안전하게 "잠금해제됨"으로 판단하도록 한다.
export async function isDocumentUnlocked(
  supabase: SupabaseClient,
  documentId: string
): Promise<boolean> {
  const [couponResult, paymentResult] = await Promise.all([
    supabase.from("coupons").select("id").eq("document_id", documentId).eq("status", "used").limit(1),
    supabase.from("payments").select("id").eq("document_id", documentId).eq("status", "paid").limit(1),
  ]);

  if (couponResult.error) {
    console.error("[isDocumentUnlocked] coupons query failed:", couponResult.error.message);
  }
  if (paymentResult.error) {
    console.error("[isDocumentUnlocked] payments query failed:", paymentResult.error.message);
  }

  return Boolean(couponResult.data?.length || paymentResult.data?.length);
}
