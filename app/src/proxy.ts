import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MEMBER_PROTECTED = ["/documents", "/my-page", "/inquiries", "/subscription"];
const ADMIN_PROTECTED = ["/admin"];
const ADMIN_PUBLIC = ["/admin/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAdminPublic = ADMIN_PUBLIC.some((p) => pathname === p);
  const isAdminRoute = !isAdminPublic && ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
  const isMemberRoute = MEMBER_PROTECTED.some((p) => pathname.startsWith(p));

  if (isMemberRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isMemberRoute && user) {
    const { data: member } = await supabase.from("members").select("status").eq("id", user.id).single();
    if (member && member.status !== "active") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("suspended", "1");
      return NextResponse.redirect(url);
    }
  }

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("id", user.id)
      .single();
    if (member?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Excludes /api routes (each route authenticates itself via its own
  // createClient()/getUser() call) and static assets. This matters beyond
  // performance: every request that hits this proxy calls supabase.auth.getUser(),
  // which triggers an on-demand token refresh once the access token is expired.
  // A page load fires many concurrent requests (the page nav + its API calls);
  // if several of them race to refresh the same (soon-to-be-rotated) refresh
  // token at once, Supabase invalidates all but one and the user gets logged
  // out with no obvious cause. Keeping this matcher narrow keeps refreshes to
  // ~one per navigation instead of one per request, which avoids that race.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
