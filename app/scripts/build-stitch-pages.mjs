import fs from "node:fs";
import path from "node:path";

const SRC_DIR =
  "C:/Users/worlc/AppData/Local/Temp/claude/C--AI-SERVICE-acplatform-app/b4e3c4b9-c683-4d9b-bb97-cf31c41913ba/scratchpad/stitch_html";
const APP_DIR = "C:/AI_SERVICE/acplatform/app/src/app";
const COMPONENTS_DIR = "C:/AI_SERVICE/acplatform/app/src/components";

// NOTE: login / signup / admin-login are intentionally NOT regenerated here —
// they were hand-upgraded to LoginScreen/SignupScreen/AdminLoginScreen (real
// Supabase auth wiring). Re-running this script must not clobber that.
const ROUTES = [
  { file: "announcements.html", route: "announcements" },
  { file: "wizard.html", route: "documents/wizard" },
  { file: "documents.html", route: "documents" },
  { file: "mypage.html", route: "my-page" },
  { file: "inquiries.html", route: "inquiries" },
  { file: "subscription.html", route: "subscription" },
  { file: "admin-dashboard.html", route: "admin" },
  { file: "admin-members.html", route: "admin/members" },
  { file: "admin-api.html", route: "admin/api" },
  { file: "admin-payments.html", route: "admin/payments" },
  { file: "admin-coupons.html", route: "admin/coupons" },
  { file: "admin-inquiries.html", route: "admin/inquiries" },
  { file: "admin-site-pages.html", route: "admin/site-pages" },
  { file: "legal.html", route: "legal" },
];

const LINK_MAP = [
  ["회원가입", "/signup"],
  ["무료로 시작하기", "/signup"],
  ["공고 검색", "/announcements"],
  ["공고검색", "/announcements"],
  ["내 문서함", "/documents"],
  ["마이페이지", "/my-page"],
  ["문의하기", "/inquiries"],
  ["문의 상담", "/inquiries"],
  ["도입 문의", "/inquiries"],
  ["구독", "/subscription"],
  ["대시보드", "/admin"],
  ["회원관리", "/admin/members"],
  ["API 관리", "/admin/api"],
  ["API관리", "/admin/api"],
  ["API 연동", "/admin/api"],
  ["결제관리", "/admin/payments"],
  ["쿠폰관리", "/admin/coupons"],
  ["문의관리", "/admin/inquiries"],
  ["사이트관리", "/admin/site-pages"],
  ["사이트페이지", "/admin/site-pages"],
  ["이용약관", "/legal"],
  ["개인정보처리방침", "/legal"],
  ["환불규정", "/legal"],
  ["고객지원", "/legal"],
  ["로그아웃", "/"],
  ["로그인", "/login"], // keep last: broad match, many labels contain this
];

function normalize(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
}

function pickTarget(innerText, isAdmin) {
  const norm = normalize(innerText);
  if (norm.includes("올케어안전플랫폼")) return isAdmin ? "/admin" : "/";
  for (const [label, target] of LINK_MAP) {
    if (norm.includes(label.replace(/\s+/g, ""))) return target;
  }
  return null;
}

function rewriteLinks(html, isAdmin) {
  return html.replace(
    /<a\b([^>]*?)href="#"([^>]*)>([\s\S]*?)<\/a>/g,
    (full, before, after, inner) => {
      const target = pickTarget(inner, isAdmin);
      if (!target) return full;
      return `<a${before}href="${target}"${after}>${inner}</a>`;
    }
  );
}

function extractBodyAndScript(raw) {
  const bodyOpenMatch = raw.match(/<body[^>]*>/i);
  const bodyStart = bodyOpenMatch ? bodyOpenMatch.index + bodyOpenMatch[0].length : 0;
  const bodyEndIdx = raw.lastIndexOf("</body>");
  let bodyContent = raw.slice(bodyStart, bodyEndIdx === -1 ? raw.length : bodyEndIdx);

  // Pull out trailing <script>...</script> blocks (no src attr) to run client-side via eval.
  const scripts = [];
  bodyContent = bodyContent.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, (m, code) => {
    scripts.push(code);
    return "";
  });

  return { bodyContent: bodyContent.trim(), script: scripts.join("\n\n") };
}

function toRouteVarName(route) {
  return route.replace(/[\/-]/g, "_");
}

function escapeForTemplateLiteral(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

// 1. Shared StitchScreen component is maintained by hand at
//    src/components/StitchScreen.tsx (router-aware nav wiring). This script
//    no longer overwrites it — only per-route page.tsx files below.
fs.mkdirSync(COMPONENTS_DIR, { recursive: true });

// 2. Per-route pages
for (const { file, route } of ROUTES) {
  const srcPath = path.join(SRC_DIR, file);
  const raw = fs.readFileSync(srcPath, "utf8");
  const isAdmin = route.startsWith("admin");
  const { bodyContent, script } = extractBodyAndScript(raw);
  const rewritten = rewriteLinks(bodyContent, isAdmin);

  const varName = toRouteVarName(route);
  const outDir = path.join(APP_DIR, route);
  fs.mkdirSync(outDir, { recursive: true });

  const htmlLiteral = escapeForTemplateLiteral(rewritten);
  const scriptLiteral = escapeForTemplateLiteral(script);

  const content = `import StitchScreen from "@/components/StitchScreen";

const HTML_${varName} = \`
${htmlLiteral}
\`;

const SCRIPT_${varName} = \`
${scriptLiteral}
\`;

export default function Page() {
  return <StitchScreen html={HTML_${varName}} script={SCRIPT_${varName}} />;
}
`;

  fs.writeFileSync(path.join(outDir, "page.tsx"), content, "utf8");
  console.log(`wrote ${route}/page.tsx (${rewritten.length} bytes html, ${script.length} bytes script)`);
}

// 3. not-found.tsx (special Next.js file, no route folder)
{
  const raw = fs.readFileSync(path.join(SRC_DIR, "not-found.html"), "utf8");
  const { bodyContent, script } = extractBodyAndScript(raw);
  const rewritten = rewriteLinks(bodyContent, false);
  const htmlLiteral = escapeForTemplateLiteral(rewritten);
  const scriptLiteral = escapeForTemplateLiteral(script);
  const content = `import StitchScreen from "@/components/StitchScreen";

const HTML_not_found = \`
${htmlLiteral}
\`;

const SCRIPT_not_found = \`
${scriptLiteral}
\`;

export default function NotFound() {
  return <StitchScreen html={HTML_not_found} script={SCRIPT_not_found} />;
}
`;
  fs.writeFileSync(path.join(APP_DIR, "not-found.tsx"), content, "utf8");
  console.log("wrote not-found.tsx");
}

console.log("done");
