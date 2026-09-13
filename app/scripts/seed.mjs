import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAdminUser() {
  const email = "admin@acplatform.local";
  const password = "AcPlatform2026!";

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      company: "올케어솔루션 주식회사",
      ceo_name: "관리자",
      name: "시스템 관리자",
      phone: "010-0000-0000",
      registration_number: "000-00-00000",
    },
  });

  let userId;
  if (error) {
    if (error.message.includes("already been registered") || error.status === 422) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list.users.find((u) => u.email === email);
      if (!existing) throw error;
      userId = existing.id;
      console.log("Admin user already exists:", email);
    } else {
      throw error;
    }
  } else {
    userId = created.user.id;
    console.log("Admin user created:", email, "/ password:", password);
  }

  // Promote to admin role (trigger already inserted a 'member' row on signUp)
  const { error: updateErr } = await admin
    .from("members")
    .update({ role: "admin" })
    .eq("id", userId);
  if (updateErr) throw updateErr;
  console.log("Promoted to admin role:", userId);
}

async function seedAnnouncements() {
  const rows = [
    {
      title: "OO초등학교 증축공사",
      agency: "OO교육청",
      announcement_number: "2026-00123",
      category: "건축",
      deadline: "2026-10-04",
      base_amount: 4820000000,
      has_safety_form: true,
      awarded: false,
      api_source: "pps",
      external_no: "2026-00123",
    },
    {
      title: "OO지방도로 확장 공사",
      agency: "OO도로시설공단",
      announcement_number: "2026-00456",
      category: "토목",
      deadline: "2026-10-08",
      base_amount: 12300000000,
      has_safety_form: true,
      awarded: false,
      api_source: "pps",
      external_no: "2026-00456",
    },
    {
      title: "OO변전소 개보수 공사",
      agency: "한국전력공사",
      announcement_number: "2026-00789",
      category: "전기",
      deadline: "2026-10-02",
      base_amount: 2140000000,
      has_safety_form: false,
      api_source: "kepco",
      external_no: "2026-00789",
      awarded: true,
      winner_name: "(주)한빛전력",
      winner_amount: 2080000000,
    },
    {
      title: "화성태안3지구 복합커뮤니티센터 신축공사 중 안전보건관리 용역",
      agency: "한국토지주택공사(LH)",
      announcement_number: "202502-89211-00",
      category: "건축",
      deadline: "2026-10-06",
      base_amount: 4850000000,
      has_safety_form: true,
      awarded: false,
      api_source: "manual",
      external_no: "202502-89211-00",
    },
    {
      title: "OO정수장 설비 교체",
      agency: "한국수자원공사",
      announcement_number: "2026-01055",
      category: "설비",
      deadline: "2026-10-10",
      base_amount: 3050000000,
      has_safety_form: true,
      awarded: false,
      api_source: "manual",
      external_no: "2026-01055",
    },
  ];

  const { error } = await admin.from("announcements").upsert(rows, { onConflict: "external_no,api_source" });
  if (error) throw error;
  console.log(`Seeded ${rows.length} demo announcements.`);
}

async function seedSitePages() {
  // already inserted by schema.sql via ON CONFLICT DO NOTHING; nothing to do here.
}

try {
  await ensureAdminUser();
  await seedAnnouncements();
  await seedSitePages();
  console.log("Seed complete.");
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
}
