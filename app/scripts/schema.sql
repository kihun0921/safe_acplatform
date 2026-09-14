-- 올케어안전플랫폼 — Consolidated schema for fresh Supabase project
-- Combines specs/001-user-roles-permissions/contracts/schema.sql (members/announcements/documents/inquiries/api_credentials)
-- with the corrected subscriptions/payments/coupons model from docs/SRS_Appendix_B (real deployed shape),
-- plus site_pages (Appendix C, AdminSitePagesPage/LegalPage) and sync_log (Appendix A, FR-025).

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- members
-- ============================================================================
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  company text not null,
  ceo_name text not null default '',
  name text not null,
  phone text not null,
  registration_number text not null,
  role text not null check (role in ('member','admin')) default 'member',
  status text not null check (status in ('active','inactive','suspended')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_members_registration_number on public.members(registration_number);

-- Auto-create a members row when a new auth user signs up (reads metadata passed at signUp time)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.members (id, email, company, ceo_name, name, phone, registration_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'ceo_name', ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'registration_number', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- announcements
-- ============================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agency text not null,
  announcement_number text not null,
  category text not null,
  trade_type text,
  site_region text,
  attachments jsonb not null default '[]'::jsonb,
  deadline date not null,
  base_amount bigint,
  description text,
  has_safety_form boolean not null default false,
  awarded boolean not null default false,
  winner_name text,
  winner_amount bigint,
  -- 'confirmed' = 나라장터 낙찰정보 API로 최종 확정된 낙찰자, 'provisional' = 개찰결과
  -- API 기준 1순위(최저가) 투찰업체(최종 낙찰 확정 전, 참고용). 최종 확정 정보가 들어오면
  -- 항상 provisional을 덮어쓰고 confirmed로 승격한다.
  award_status text check (award_status in ('provisional', 'confirmed')),
  source_url text,
  api_source text not null default 'manual',
  external_no text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.announcements add column if not exists trade_type text;
alter table public.announcements add column if not exists site_region text;
alter table public.announcements add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.announcements add column if not exists award_status text check (award_status in ('provisional', 'confirmed'));
create unique index if not exists idx_announcements_external on public.announcements(external_no, api_source);
create index if not exists idx_announcements_deadline on public.announcements(deadline);
create index if not exists idx_announcements_trade_type on public.announcements(trade_type);

-- ============================================================================
-- documents
-- ============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete set null,
  title text not null,
  agency text,
  status text not null check (status in ('in_progress','completed')) default 'in_progress',
  content jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_documents_member on public.documents(member_id);
create index if not exists idx_documents_status on public.documents(status);
-- 문서 1건 다운로드 잠금해제 가격(건당결제 기준). 기본 5만원, LH처럼 서식이 복잡한
-- 발주처는 관리자가 개별적으로 최대 50만원 등으로 직접 조정한다(/admin 문서 상세).
alter table public.documents add column if not exists price bigint not null default 50000;

-- ============================================================================
-- agency_templates — 발주처별 표준서식(목차/입력항목 구성)
-- ============================================================================
-- sections: 공통 6대 목차(사업개요/위험성평가/실행계획/비상대책/안전목표/별첨) 외에
-- 그 발주처만의 추가 목차를 정의한다. 셀 단위 상세 레이아웃(토글 스위치, 표 구조 등)은
-- 공통 위저드 템플릿을 그대로 따르고, 여기서는 "어떤 섹션이 추가되고 그 안에 어떤
-- 입력 필드가 있는지"만 다룬다.
-- shape: [{ "id": "workforce", "label": "작업투입 인력 인적사항",
--            "fields": [{ "key": "vulnerable_workers", "label": "안전취약근로자 현황", "type": "textarea" }, ...] }]
create table if not exists public.agency_templates (
  id uuid primary key default gen_random_uuid(),
  agency text not null unique,
  name text not null,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cover_style: 다운로드 문서(DOCX/PDF/HWPX) 맨 앞에 붙는 표지의 레이아웃을 고른다.
-- 표지에 들어가는 데이터(공사명/공사기간/도급금액/작성자 등)는 발주처와 무관하게
-- 항상 동일한 CoverPageData 하나로 통일되어 있고, 발주처마다 실제로 다른 것은
-- "그 데이터를 어떤 표/글자배치로 보여주는가"뿐이라 별도 필드 목록이 아니라 코드
-- 하나만 저장한다. 새 발주처 표지 샘플을 받으면 generateDocx.ts 등에 렌더러 함수를
-- 하나 추가하고 여기 값만 그 코드로 바꾸면 된다(lib/agencyTemplates.ts의
-- COVER_STYLES 참고).
alter table public.agency_templates add column if not exists cover_style text not null default 'generic';

alter table public.documents add column if not exists template_id uuid references public.agency_templates(id) on delete set null;
-- 공통 6대 목차 중 이 발주처 서식에서는 끄고 싶은 것들 (예: overview, risk, execution,
-- emergency, target, attachments 중 일부). 기본은 전부 켜짐(빈 배열).
alter table public.agency_templates add column if not exists disabled_common_sections text[] not null default '{}';

-- ============================================================================
-- inquiries
-- ============================================================================
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  content text not null,
  status text not null check (status in ('pending','answered')) default 'pending',
  admin_response text,
  admin_responded_by uuid references public.members(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_inquiries_member on public.inquiries(member_id);
create index if not exists idx_inquiries_status on public.inquiries(status);

-- ============================================================================
-- subscriptions (Appendix B §1 — real shape, single 'monthly' plan)
-- ============================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  status text not null check (status in ('pending','active','expired','cancelled')) default 'pending',
  plan_type text not null default 'monthly',
  amount bigint not null default 50000,
  payment_method text check (payment_method in ('card','bank_transfer')),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- payments (Appendix B §2)
-- ============================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_type text not null default 'monthly',
  amount bigint not null,
  method text not null check (method in ('card','bank_transfer')),
  status text not null check (status in ('pending','paid','failed','cancelled')) default 'pending',
  order_id text unique not null,
  toss_payment_key text,
  depositor_name text,
  confirmed_by uuid references public.members(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_payments_member on public.payments(member_id);
-- 건당결제(문서 1건 다운로드 잠금해제): subscription_id 대신 document_id가 채워진다.
alter table public.payments add column if not exists document_id uuid references public.documents(id) on delete cascade;
create index if not exists idx_payments_document on public.payments(document_id);

-- ============================================================================
-- coupons (Appendix B §3)
-- ============================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null check (status in ('unused','used','revoked')) default 'unused',
  source text not null,
  document_id uuid references public.documents(id) on delete set null,
  used_by uuid references public.members(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create or replace function public.redeem_coupon(p_code text, p_document_id uuid)
returns public.coupons as $$
declare
  v_coupon public.coupons;
  v_owner uuid;
begin
  select member_id into v_owner from public.documents where id = p_document_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'FORBIDDEN_DOCUMENT';
  end if;

  select * into v_coupon from public.coupons where code = p_code for update;
  if v_coupon.id is null or v_coupon.status <> 'unused' then
    raise exception 'INVALID_OR_USED_COUPON';
  end if;

  update public.coupons
    set status = 'used', document_id = p_document_id, used_by = auth.uid(), used_at = now()
    where id = v_coupon.id
    returning * into v_coupon;

  return v_coupon;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- api_credentials (admin-only)
-- ============================================================================
create table if not exists public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  agency text not null unique,
  api_key text not null,
  api_endpoint text,
  status text not null check (status in ('active','inactive')) default 'active',
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('success','failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- sync_log (Appendix A §1.4 / FR-025)
-- ============================================================================
create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz default now(),
  result jsonb not null default '{}'::jsonb
);

-- ============================================================================
-- site_pages (Appendix C, AdminSitePagesPage / LegalPage)
-- ============================================================================
create table if not exists public.site_pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz default now()
);

insert into public.site_pages (slug, title, body) values
  ('terms', '이용약관', '제1조(목적)\n본 약관은 올케어안전플랫폼이 제공하는 서비스의 이용조건 및 절차를 규정합니다.'),
  ('privacy', '개인정보처리방침', '회사는 회원의 개인정보를 관련 법령에 따라 안전하게 관리합니다.'),
  ('customer-service', '고객센터', '문의사항은 문의하기 메뉴 또는 고객센터 이메일로 접수해 주세요.'),
  ('refund-policy', '환불규정', '구독 결제 후 7일 이내 미사용 시 전액 환불이 가능합니다.')
on conflict (slug) do nothing;

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['members','documents','inquiries','subscriptions','payments','api_credentials']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.members enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;
alter table public.inquiries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.api_credentials enable row level security;
alter table public.sync_log enable row level security;
alter table public.site_pages enable row level security;
alter table public.agency_templates enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.members where id = auth.uid() and role = 'admin');
$$ language sql security definer set search_path = public stable;

-- members
drop policy if exists members_see_self on public.members;
create policy members_see_self on public.members for select using (auth.uid() = id or public.is_admin());
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members for update using (auth.uid() = id or public.is_admin());

-- announcements (public read)
drop policy if exists announcements_read_all on public.announcements;
create policy announcements_read_all on public.announcements for select using (true);
drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- documents
drop policy if exists documents_owner_all on public.documents;
create policy documents_owner_all on public.documents for all using (auth.uid() = member_id or public.is_admin()) with check (auth.uid() = member_id or public.is_admin());

-- inquiries
drop policy if exists inquiries_owner_select on public.inquiries;
create policy inquiries_owner_select on public.inquiries for select using (auth.uid() = member_id or public.is_admin());
drop policy if exists inquiries_owner_insert on public.inquiries;
create policy inquiries_owner_insert on public.inquiries for insert with check (auth.uid() = member_id);
drop policy if exists inquiries_owner_update on public.inquiries;
create policy inquiries_owner_update on public.inquiries for update using ((auth.uid() = member_id and status = 'pending') or public.is_admin());
drop policy if exists inquiries_owner_delete on public.inquiries;
create policy inquiries_owner_delete on public.inquiries for delete using (auth.uid() = member_id and status = 'pending');

-- subscriptions
drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions for select using (auth.uid() = member_id or public.is_admin());
drop policy if exists subscriptions_owner_upsert on public.subscriptions;
create policy subscriptions_owner_upsert on public.subscriptions for insert with check (auth.uid() = member_id);
drop policy if exists subscriptions_owner_update on public.subscriptions;
create policy subscriptions_owner_update on public.subscriptions for update using (auth.uid() = member_id or public.is_admin());

-- payments
drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments for select using (auth.uid() = member_id or public.is_admin());
drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert on public.payments for insert with check (auth.uid() = member_id);
drop policy if exists payments_admin_update on public.payments;
create policy payments_admin_update on public.payments for update using (public.is_admin());

-- coupons (admin manage, members read own redemptions only via function; direct select limited to admin)
drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coupons_member_see_own_redemption on public.coupons;
create policy coupons_member_see_own_redemption on public.coupons for select using (used_by = auth.uid());

-- api_credentials (admin only)
drop policy if exists api_credentials_admin_all on public.api_credentials;
create policy api_credentials_admin_all on public.api_credentials for all using (public.is_admin()) with check (public.is_admin());

-- sync_log (admin read, service role writes via edge function)
drop policy if exists sync_log_admin_read on public.sync_log;
create policy sync_log_admin_read on public.sync_log for select using (public.is_admin());

-- site_pages (public read, admin write)
drop policy if exists site_pages_public_read on public.site_pages;
create policy site_pages_public_read on public.site_pages for select using (true);
drop policy if exists site_pages_admin_write on public.site_pages;
create policy site_pages_admin_write on public.site_pages for all using (public.is_admin()) with check (public.is_admin());

-- agency_templates (모든 로그인 회원이 위저드에서 선택하려면 읽을 수 있어야 하고, 관리만 admin)
drop policy if exists agency_templates_read_all on public.agency_templates;
create policy agency_templates_read_all on public.agency_templates for select using (true);
drop policy if exists agency_templates_admin_write on public.agency_templates;
create policy agency_templates_admin_write on public.agency_templates for all using (public.is_admin()) with check (public.is_admin());
