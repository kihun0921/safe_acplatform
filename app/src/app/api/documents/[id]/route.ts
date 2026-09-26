import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const {
    fields,
    riskRows,
    safetyPolicy,
    hazardMachineryRows,
    hazardVehicleRows,
    hazardSubstanceRows,
    ppeQuantities,
    emergencyContactRows,
    safetyCostAmounts,
    accidentLevelAttachments,
    workforceVulnerableRows,
    workforceFireWatchRows,
    workforcePairWorkRows,
    executionOptions,
    percentComplete,
    status,
  } = body ?? {};

  // content는 fields 외에도 pdfOverview(공고문 PDF 자동분석 캐시), riskRows(위험성평가
  // 표 행), safetyPolicy(안전보건 경영방침 이미지 첨부/표준문구 모드), hazard{Machinery,
  // Vehicle,Substance}Rows(유해·위험 기계·기구·물질 관리계획 항목), ppeQuantities(보호구
  // 지급 예정수량), emergencyContactRows(유관기관 비상연락체계), safetyCostAmounts
  // (안전보건 관리비용 산업안전보건관리비/세부내역 금액), accidentLevelAttachments
  // (재해발생 수준 증빙자료 이미지 경로), executionOptions(현장 안전보건 실행계획
  // 선택항목 토글·내용) 등 여러 키를
  // 독립적으로 담는다. "임시저장" 한 번에 이 키들이 서로 다른 PATCH 요청으로 거의
  // 동시에 도착할 수 있는데(위험성평가 표는 항상 별도 요청으로 저장됨), 여기서
  // "읽고 → 병합 → 쓰기"를 따로 하면 두 요청이 겹칠 때 나중에 끝나는 쪽이 먼저
  // 저장된 값을 통째로 덮어써 버리는 lost-update가 실제로 발생했다. DB 함수
  // merge_document_content()가 한 UPDATE 문 안에서 jsonb `||` 병합을 원자적으로
  // 수행하므로 이 경쟁 상태 자체가 생기지 않는다.
  const contentPatch: Record<string, unknown> = {};
  if (fields) contentPatch.fields = fields;
  if (riskRows) contentPatch.riskRows = riskRows;
  if (safetyPolicy) contentPatch.safetyPolicy = safetyPolicy;
  if (hazardMachineryRows) contentPatch.hazardMachineryRows = hazardMachineryRows;
  if (hazardVehicleRows) contentPatch.hazardVehicleRows = hazardVehicleRows;
  if (hazardSubstanceRows) contentPatch.hazardSubstanceRows = hazardSubstanceRows;
  if (ppeQuantities) contentPatch.ppeQuantities = ppeQuantities;
  if (emergencyContactRows) contentPatch.emergencyContactRows = emergencyContactRows;
  if (safetyCostAmounts) contentPatch.safetyCostAmounts = safetyCostAmounts;
  if (accidentLevelAttachments) contentPatch.accidentLevelAttachments = accidentLevelAttachments;
  if (workforceVulnerableRows) contentPatch.workforceVulnerableRows = workforceVulnerableRows;
  if (workforceFireWatchRows) contentPatch.workforceFireWatchRows = workforceFireWatchRows;
  if (workforcePairWorkRows) contentPatch.workforcePairWorkRows = workforcePairWorkRows;
  if (executionOptions) contentPatch.executionOptions = executionOptions;

  if (Object.keys(contentPatch).length > 0 || typeof percentComplete === "number" || status) {
    const { error } = await supabase.rpc("merge_document_content", {
      doc_id: id,
      content_patch: contentPatch,
      new_percent_complete: typeof percentComplete === "number" ? percentComplete : null,
      new_status: status ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
