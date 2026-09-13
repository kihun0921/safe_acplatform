import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 실제 나라장터 동기화 데이터의 발주기관명과 정확히 일치해야 매칭된다.
const LH_AGENCY = "한국토지주택공사(LH)";

const sections = [
  {
    id: "workforce",
    label: "작업투입 인력 인적사항",
    fields: [
      { key: "vulnerable_workers", label: "안전취약근로자 현황", type: "textarea", placeholder: "고령/외국인/신규 채용자 등 배치 현황을 입력하세요" },
      { key: "fire_watch", label: "화재감시자 배치 현황", type: "textarea", placeholder: "화재감시자 인원 및 배치 위치를 입력하세요" },
      { key: "pair_work", label: "2인1조 편성 현황", type: "textarea", placeholder: "밀폐공간·고소작업 등 2인1조 편성표를 입력하세요" },
    ],
  },
];

const { data: existing } = await admin
  .from("agency_templates")
  .select("id")
  .eq("agency", LH_AGENCY)
  .maybeSingle();

if (existing) {
  const { error } = await admin
    .from("agency_templates")
    .update({ name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)", sections })
    .eq("id", existing.id);
  if (error) throw error;
  console.log("LH 표준서식 업데이트 완료:", existing.id);
} else {
  const { data, error } = await admin
    .from("agency_templates")
    .insert({ agency: LH_AGENCY, name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)", sections })
    .select("id")
    .single();
  if (error) throw error;
  console.log("LH 표준서식 생성 완료:", data.id);
}
