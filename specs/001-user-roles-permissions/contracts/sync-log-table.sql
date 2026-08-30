-- 동기화 실행 이력 테이블 (관리자 페이지에서 "마지막 동기화" 표시용)

CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  result JSONB NOT NULL
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_sync_log" ON public.sync_log;
CREATE POLICY "admins_read_sync_log" ON public.sync_log
  FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.sync_log TO authenticated;

NOTIFY pgrst, 'reload schema';
