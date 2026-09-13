import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only: creates the auth user with email pre-confirmed so local/demo
// signups can log in immediately without wiring a real email provider.
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, company, ceoName, name, phone, registrationNumber } = body ?? {};

  if (!email || !password || !company || !name || !phone || !registrationNumber) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      company,
      ceo_name: ceoName ?? "",
      name,
      phone,
      registration_number: registrationNumber,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user.id });
}
