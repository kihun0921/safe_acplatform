import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올케어안전플랫폼",
  description: "공공 발주처 입찰 안전보건관리계획서 자동 완성 B2B SaaS",
};

const TAILWIND_CONFIG = `
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#1e3a5f',
            strong: '#132742',
            soft: '#eff4fa',
            hover: '#172e4c'
          },
          surface: {
            DEFAULT: '#ffffff',
            alt: '#f8fafc'
          },
          border: '#e2e8f0',
          text: {
            DEFAULT: '#1e293b',
            secondary: '#475569',
            muted: '#94a3b8'
          },
          success: {
            DEFAULT: '#15803d',
            soft: '#dcfce7'
          },
          warn: {
            DEFAULT: '#b45309',
            soft: '#fef3c7'
          },
          danger: {
            DEFAULT: '#b91c1c',
            soft: '#fee2e2'
          }
        },
        borderRadius: {
          DEFAULT: "0.25rem",
          "lg": "0.5rem",
          "xl": "0.75rem",
          "2xl": "1rem",
          "full": "9999px"
        },
        fontFamily: {
          // 예전엔 headline/display에 궁서체 느낌의 세리프 서체(Noto Serif KR)를
          // 썼는데, 이 시스템 전체 톤(고딕/산세리프)과 안 어울린다는 피드백에 따라
          // body/label과 동일한 고딕 계열로 통일한다 — font-headline·font-display
          // 클래스를 쓰는 곳을 일일이 찾아 고치는 대신 여기 한 곳만 바꾼다.
          headline: ["'Noto Sans KR'", "'Public Sans'", "sans-serif"],
          display: ["'Noto Sans KR'", "'Public Sans'", "sans-serif"],
          body: ["'Noto Sans KR'", "'Public Sans'", "sans-serif"],
          label: ["'Noto Sans KR'", "'Public Sans'", "sans-serif"]
        }
      },
    },
  }
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <script dangerouslySetInnerHTML={{ __html: TAILWIND_CONFIG }} />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .material-symbols-outlined.fill-icon {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
      </head>
      <body className="bg-[#f8fafc] text-text font-body antialiased selection:bg-primary/10 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
