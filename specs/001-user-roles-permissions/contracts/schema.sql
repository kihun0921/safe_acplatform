-- Phase 1 Database Schema
-- 올케어안전플랫폼 PostgreSQL Schema with RLS
-- Generated: 2026-08-29
--
-- 참고: 실제 배포된 Supabase members 테이블은 이 문서와 컬럼명이 다릅니다.
-- 코드(useAuth.ts, SignupPage.tsx, MyPage.tsx)는 실제 배포 스키마 기준으로 작성됨:
--   name (NOT manager_name), status (NOT subscription_status)
--   subscription_starts_at / expires_at 컬럼 없음
-- 이 문서를 기준으로 코드를 고치지 말고, 실제 Supabase 테이블 구조를 항상 먼저 확인할 것.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Members Table
-- ============================================================================

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin')) DEFAULT 'member',
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'inactive')) DEFAULT 'inactive',
  subscription_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_members_email ON public.members(email);
CREATE UNIQUE INDEX idx_members_registration_number ON public.members(registration_number);

COMMENT ON TABLE public.members IS 'Construction company managers and admins';
COMMENT ON COLUMN public.members.id IS 'Supabase Auth UID';
COMMENT ON COLUMN public.members.role IS 'member: 일반 회원, admin: 관리자';

-- ============================================================================
-- 2. Announcements Table (read-only from UI)
-- ============================================================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  announcement_number TEXT NOT NULL,
  category TEXT NOT NULL,
  deadline DATE NOT NULL,
  description TEXT DEFAULT NULL,
  has_safety_form BOOLEAN NOT NULL DEFAULT FALSE,
  api_source TEXT NOT NULL DEFAULT 'narajangeo',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_announcements_number ON public.announcements(announcement_number, api_source);
CREATE INDEX idx_announcements_deadline ON public.announcements(deadline);

COMMENT ON TABLE public.announcements IS '공고 (NaraJangTeo API 연동)';
COMMENT ON COLUMN public.announcements.has_safety_form IS '안전계획서 필수 여부';

-- ============================================================================
-- 3. Documents Table
-- ============================================================================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  step_current INTEGER NOT NULL DEFAULT 1 CHECK (step_current BETWEEN 1 AND 4),
  step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  percent_complete INTEGER NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_documents_member ON public.documents(member_id);
CREATE INDEX idx_documents_announcement ON public.documents(announcement_id);
CREATE INDEX idx_documents_status ON public.documents(status);

COMMENT ON TABLE public.documents IS '계획서 (안전계획서)';
COMMENT ON COLUMN public.documents.step_data IS 'Step-specific form data JSON { step1: {...}, step2: {...}, ... }';
COMMENT ON COLUMN public.documents.attachments IS 'Array of { name, url, type, size }';

-- ============================================================================
-- 4. Inquiries Table
-- ============================================================================

CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'answered')) DEFAULT 'pending',
  admin_response TEXT DEFAULT NULL,
  admin_responded_by UUID DEFAULT NULL REFERENCES public.members(id) ON DELETE SET NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inquiries_member ON public.inquiries(member_id);
CREATE INDEX idx_inquiries_status ON public.inquiries(status);

COMMENT ON TABLE public.inquiries IS '문의 (회원 ↔ 관리자)';

-- ============================================================================
-- 5. Subscriptions Table (Phase 2+)
-- ============================================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'premium')) DEFAULT 'basic',
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  started_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_member ON public.subscriptions(member_id);

COMMENT ON TABLE public.subscriptions IS '구독 정보 (Phase 2)';

-- ============================================================================
-- 6. ApiCredentials Table (admin-only, Phase 2+)
-- ============================================================================

CREATE TABLE public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_sync_status TEXT NOT NULL CHECK (last_sync_status IN ('success', 'failed')) DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_api_credentials_agency ON public.api_credentials(agency);

COMMENT ON TABLE public.api_credentials IS 'API 자격증명 (관리자만 접근, Phase 2)';
COMMENT ON COLUMN public.api_credentials.api_key IS 'Encrypted via Supabase Vault';

-- ============================================================================
-- 7. Audit Trigger: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Sample Data (Mock Data for Phase 1)
-- ============================================================================

INSERT INTO public.members (id, email, company, name, phone, registration_number, role, subscription_status)
VALUES
  ('1', 'manager@ooconst.co.kr', 'OO건설(주)', '김담당', '010-1234-5678', '123-45-67890', 'member', 'inactive'),
  ('admin-1', 'admin@oacplatform.co.kr', 'OAC Platform', '관리자', '010-9999-9999', '999-99-99999', 'admin', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, agency, announcement_number, category, deadline, has_safety_form)
VALUES
  ('OO초등학교 증축공사', 'OO교육청', '2026-00123', '건축', '2026-09-01', true),
  ('OO지방도로 확장 공사', 'OO도로시설공단', '2026-00456', '토목', '2026-09-07', true),
  ('OO변전소 개보수 공사', '한국전력공사', '2026-00789', '토목', '2026-09-15', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (member_id, announcement_id, title, status, step_current, percent_complete)
SELECT
  m.id,
  a.id,
  CONCAT(a.title, ' 계획서'),
  CASE WHEN RANDOM() > 0.5 THEN 'in_progress' ELSE 'completed' END,
  (RANDOM() * 4 + 1)::INTEGER,
  (RANDOM() * 100)::INTEGER
FROM public.members m
CROSS JOIN public.announcements a
WHERE m.role = 'member'
LIMIT 5
ON CONFLICT DO NOTHING;

INSERT INTO public.inquiries (member_id, title, content, status)
VALUES
  ('1', '계획서 작성 중 항목이 초기화됐어요', '...', 'pending'),
  ('1', '구독 결제가 반영되지 않습니다', '...', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTE: RLS policies defined in rls-policies.sql
-- ============================================================================
