-- Row-Level Security (RLS) Policies
-- 올케어안전플랫폼 Supabase RLS Configuration
-- Generated: 2026-08-29

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Members Table Policies
-- ============================================================================

-- Policy 0: A newly signed-up user may create their own member profile row
CREATE POLICY "members_insert_self" ON public.members
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 1: Members see only themselves
CREATE POLICY "members_see_self" ON public.members
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Members update only themselves
CREATE POLICY "members_update_self" ON public.members
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Admins see all members
CREATE POLICY "admins_see_all_members" ON public.members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 4: Admins can update member subscription status
CREATE POLICY "admins_update_members" ON public.members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- Announcements Table Policies
-- ============================================================================

-- Policy 1: Everyone can read announcements (public data)
CREATE POLICY "announcements_read_all" ON public.announcements
  FOR SELECT
  USING (true);

-- Policy 2: Only admins can insert announcements (sync job)
CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 3: Only admins can update announcements
CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- Documents Table Policies
-- ============================================================================

-- Policy 1: Members see only their own documents
CREATE POLICY "documents_see_own" ON public.documents
  FOR SELECT
  USING (auth.uid() = member_id);

-- Policy 2: Members create documents only for themselves
CREATE POLICY "documents_create_own" ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Policy 3: Members update only their own documents
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Policy 4: Members delete only their own documents
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE
  USING (auth.uid() = member_id);

-- Policy 5: Admins can read all documents
CREATE POLICY "documents_admins_see_all" ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- Inquiries Table Policies
-- ============================================================================

-- Policy 1: Members see only their own inquiries
CREATE POLICY "inquiries_see_own" ON public.inquiries
  FOR SELECT
  USING (auth.uid() = member_id);

-- Policy 2: Members create inquiries only for themselves
CREATE POLICY "inquiries_create_own" ON public.inquiries
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Policy 3: Members update only their own inquiries
CREATE POLICY "inquiries_update_own" ON public.inquiries
  FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Policy 4: Admins can read all inquiries
CREATE POLICY "inquiries_admins_see_all" ON public.inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 5: Admins can update inquiries (to add response)
CREATE POLICY "inquiries_admins_respond" ON public.inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- Subscriptions Table Policies
-- ============================================================================

-- Policy 1: Members see only their own subscriptions
CREATE POLICY "subscriptions_see_own" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = member_id);

-- Policy 2: Admins see all subscriptions
CREATE POLICY "subscriptions_admins_see_all" ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 3: Only admins can manage subscriptions
CREATE POLICY "subscriptions_admins_manage" ON public.subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- ApiCredentials Table Policies
-- ============================================================================

-- Policy 1: Only admins can read API credentials
CREATE POLICY "api_credentials_admins_read" ON public.api_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 2: Only admins can create API credentials
CREATE POLICY "api_credentials_admins_create" ON public.api_credentials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 3: Only admins can update API credentials
CREATE POLICY "api_credentials_admins_update" ON public.api_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- Policy 4: Only admins can delete API credentials
CREATE POLICY "api_credentials_admins_delete" ON public.api_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS m
      WHERE m.id = auth.uid() AND m.role = 'admin'
    )
  );

-- ============================================================================
-- Grant permissions to authenticated users
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.api_credentials TO authenticated;

-- ============================================================================
-- Helper function: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Summary of RLS Rules
-- ============================================================================

/*
MEMBERS:
  - Members: SELECT (self), UPDATE (self)
  - Admins: SELECT (all), UPDATE (all)

ANNOUNCEMENTS:
  - Everyone: SELECT (read-only)
  - Admins: INSERT, UPDATE (for sync)

DOCUMENTS:
  - Members: SELECT/INSERT/UPDATE/DELETE (own only)
  - Admins: SELECT (all)

INQUIRIES:
  - Members: SELECT/INSERT/UPDATE (own only)
  - Admins: SELECT (all), UPDATE (to respond)

SUBSCRIPTIONS:
  - Members: SELECT (own)
  - Admins: SELECT (all), INSERT/UPDATE/DELETE

API_CREDENTIALS:
  - Admins only: SELECT, INSERT, UPDATE, DELETE
*/
