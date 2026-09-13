"use client";

import { useState } from "react";

type SitePage = {
  slug: string;
  title: string;
  body: string;
  updated_at: string;
};

export default function LegalTabs({
  pages,
  initialTab,
}: {
  pages: SitePage[];
  initialTab?: string;
}) {
  const [active, setActive] = useState(initialTab && pages.some((p) => p.slug === initialTab) ? initialTab : pages[0]?.slug);
  const current = pages.find((p) => p.slug === active) ?? pages[0];

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-5 sm:px-8 py-10 md:py-14">
      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-slate-200 pb-1">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => setActive(p.slug)}
            className={
              active === p.slug
                ? "px-3.5 py-2 text-sm font-bold text-[#1e3a5f] border-b-2 border-[#1e3a5f]"
                : "px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            {p.title}
          </button>
        ))}
      </div>

      {current && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-9 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e3a5f]" />
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            {current.title}
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            최종 수정일: {new Date(current.updated_at).toLocaleDateString("ko-KR")}
          </p>
          <div className="whitespace-pre-wrap text-sm sm:text-[15px] text-slate-700 leading-relaxed">
            {current.body}
          </div>
        </div>
      )}
    </main>
  );
}
