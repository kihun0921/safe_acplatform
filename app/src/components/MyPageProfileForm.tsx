"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  name: string;
  company: string;
  ceo_name: string;
  phone: string;
  registration_number: string;
};

export default function MyPageProfileForm({ member }: { member: Member }) {
  const router = useRouter();
  const [name, setName] = useState(member.name);
  const [company, setCompany] = useState(member.company);
  const [ceoName, setCeoName] = useState(member.ceo_name);
  const [phone, setPhone] = useState(member.phone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/members/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, ceo_name: ceoName, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`저장 실패: ${data.error ?? "알 수 없는 오류"}`);
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-sm">
      <div className="pb-5 border-b border-slate-200">
        <h2 className="font-headline text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1e3a5f] text-xl">domain</span>
          기업 및 담당자 기본 정보
        </h2>
        <p className="text-xs text-slate-400 mt-1">* 수정된 정보는 향후 새로 작성되는 안전보건관리계획서에 자동 반영됩니다.</p>
      </div>

      <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            담당자명 <span className="text-rose-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            회사명 (법인명) <span className="text-rose-500">*</span>
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">대표이사명</label>
          <input
            value={ceoName}
            onChange={(e) => setCeoName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            담당자 연락처(휴대전화) <span className="text-rose-500">*</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">사업자등록번호</label>
          <input
            value={member.registration_number}
            readOnly
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">사업자등록번호는 가입 시 등록된 값으로, 변경이 필요하면 고객지원팀으로 문의해 주세요.</p>
        </div>
      </div>

      <div className="pt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#16304d] disabled:opacity-60"
        >
          {saving ? "저장 중..." : "회원 정보 저장하기"}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-semibold">저장되었습니다.</span>}
      </div>
    </div>
  );
}
