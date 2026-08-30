-- 나라장터/방위사업청 실공고 동기화를 위한 컬럼 추가 (안전하게 재실행 가능)

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS external_no TEXT,
  ADD COLUMN IF NOT EXISTS api_source TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 같은 공고가 중복 저장되지 않도록 external_no 기준 유니크 인덱스
-- (NULL은 유니크 제약에서 제외되므로 기존 수동 입력 샘플 데이터와 충돌 없음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_announcements_external_no
  ON public.announcements(external_no)
  WHERE external_no IS NOT NULL;
