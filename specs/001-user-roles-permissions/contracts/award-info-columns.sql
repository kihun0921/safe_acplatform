-- 조달청 낙찰정보서비스 연동을 위한 컬럼 추가 (안전하게 재실행 가능)

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS awarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS winner_name TEXT,
  ADD COLUMN IF NOT EXISTS winner_amount TEXT,
  ADD COLUMN IF NOT EXISTS award_date TEXT;
