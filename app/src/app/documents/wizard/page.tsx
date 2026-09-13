import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// No document id was given — send the user to start one from an
// announcement, or straight to their most recent in-progress document.
export default async function WizardEntryRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/announcements");

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("member_id", user.id)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  redirect(doc ? `/documents/${doc.id}/wizard` : "/announcements");
}
