import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import AgencyTemplateTabs from "@/components/AgencyTemplateTabs";
import CreateAgencyTemplateForm from "@/components/CreateAgencyTemplateForm";

export default async function AdminAgencyTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("agency_templates").select("*").order("agency");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader active="agency-templates" />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">발주처별 표준서식 관리</h1>
        <p className="text-sm text-slate-500 mb-6">
          여기서 등록한 발주처(agency)와 문서의 발주기관명이 정확히 일치하면, 계획서 작성 화면 상단
          드롭다운에서 회원이 이 표준서식을 선택할 수 있습니다. 선택 시 공통 6대 목차 뒤에 여기서
          정의한 추가 목차/입력항목이 그대로 이어붙습니다.
        </p>

        <CreateAgencyTemplateForm />

        <AgencyTemplateTabs templates={templates ?? []} />
      </main>
    </div>
  );
}
