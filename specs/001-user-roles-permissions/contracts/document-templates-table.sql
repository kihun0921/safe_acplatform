-- 회원(회사)별 "기본 템플릿" — 위저드에서 "이 내용을 기본값으로 저장"을 누르면 그 시점의
-- WizardContent 전체가 여기 저장되고, 다음에 새 문서를 만들 때(또는 각 표의 "저장된 기본값
-- 불러오기" 버튼을 누를 때) 이 내용을 불러와 채운다. 회원 1명당 최대 1개 행(가장 최신 저장본).

CREATE TABLE IF NOT EXISTS public.document_templates (
  member_id UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_templates_owner_all" ON public.document_templates;
CREATE POLICY "document_templates_owner_all" ON public.document_templates
  FOR ALL
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;

NOTIFY pgrst, 'reload schema';
