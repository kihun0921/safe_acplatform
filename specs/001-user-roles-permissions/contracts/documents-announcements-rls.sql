-- documents / announcements 테이블 RLS 정책 (실제 배포 스키마 기준)
-- 실제 컬럼: documents.user_id (member_id 아님), announcements는 공개 읽기 전용
-- 안전하게 재실행 가능 (DROP POLICY IF EXISTS 후 재생성)

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- announcements: 누구나(인증 사용자) 읽기 가능, 쓰기는 없음(추후 관리자/Edge Function 전용)
DROP POLICY IF EXISTS "announcements_read_all" ON public.announcements;
CREATE POLICY "announcements_read_all" ON public.announcements
  FOR SELECT
  USING (true);

-- documents: 본인 소유 문서만 조회/생성/수정/삭제
DROP POLICY IF EXISTS "documents_see_own" ON public.documents;
CREATE POLICY "documents_see_own" ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_create_own" ON public.documents;
CREATE POLICY "documents_create_own" ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- 테스트용 샘플 공고 (이미 데이터가 있으면 아무 것도 하지 않음)
INSERT INTO public.announcements (title, organization, deadline, category, status)
SELECT * FROM (VALUES
  ('OO초등학교 증축공사', 'OO교육청', '2026-09-30', '건축', 'open'),
  ('OO지방도로 확장 공사', 'OO도로시설공단', '2026-10-15', '토목', 'open'),
  ('OO변전소 개보수 공사', '한국전력공사', '2026-11-01', '토목', 'open')
) AS v(title, organization, deadline, category, status)
WHERE NOT EXISTS (SELECT 1 FROM public.announcements);
