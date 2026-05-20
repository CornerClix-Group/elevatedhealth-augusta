-- Stage 1 scheduling-admin backend foundation:
-- - provider role enablement
-- - provider scheduling RLS hardening
-- - provider directory RPC for admin/staff/business_admin
-- - user_roles audit log + trigger

BEGIN;

-- 1) Ensure app_role contains provider.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';

-- 2) Add FK from provider_schedules.provider_id -> auth.users(id) ON DELETE CASCADE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'provider_schedules'
      AND c.conname = 'provider_schedules_provider_id_fkey'
  ) THEN
    ALTER TABLE public.provider_schedules
      ADD CONSTRAINT provider_schedules_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) provider_schedules RLS:
--    - admin/staff/business_admin full access
--    - provider own-row access only
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active schedules" ON public.provider_schedules;
DROP POLICY IF EXISTS "Staff and admins can manage schedules" ON public.provider_schedules;
DROP POLICY IF EXISTS "Providers can manage their own schedule" ON public.provider_schedules;
DROP POLICY IF EXISTS "provider_schedules_select_privileged" ON public.provider_schedules;
DROP POLICY IF EXISTS "provider_schedules_manage_privileged" ON public.provider_schedules;
DROP POLICY IF EXISTS "provider_schedules_select_provider_own" ON public.provider_schedules;
DROP POLICY IF EXISTS "provider_schedules_manage_provider_own" ON public.provider_schedules;

CREATE POLICY "provider_schedules_select_privileged"
ON public.provider_schedules
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
);

CREATE POLICY "provider_schedules_manage_privileged"
ON public.provider_schedules
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
);

CREATE POLICY "provider_schedules_select_provider_own"
ON public.provider_schedules
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
);

CREATE POLICY "provider_schedules_manage_provider_own"
ON public.provider_schedules
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
);

-- 4) schedule_blocks RLS with same pattern (if table exists).
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Staff and admins can manage schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Providers can manage their own blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "schedule_blocks_select_privileged" ON public.schedule_blocks;
DROP POLICY IF EXISTS "schedule_blocks_manage_privileged" ON public.schedule_blocks;
DROP POLICY IF EXISTS "schedule_blocks_select_provider_own" ON public.schedule_blocks;
DROP POLICY IF EXISTS "schedule_blocks_manage_provider_own" ON public.schedule_blocks;

CREATE POLICY "schedule_blocks_select_privileged"
ON public.schedule_blocks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
);

CREATE POLICY "schedule_blocks_manage_privileged"
ON public.schedule_blocks
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_business_admin_role(auth.uid())
);

CREATE POLICY "schedule_blocks_select_provider_own"
ON public.schedule_blocks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
);

CREATE POLICY "schedule_blocks_manage_provider_own"
ON public.schedule_blocks
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
);

-- 5) New RPC: get_all_providers()
CREATE OR REPLACE FUNCTION public.get_all_providers()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_business_admin_role(auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id AS id,
    au.email::text AS email,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      NULLIF(au.raw_user_meta_data->>'name', ''),
      split_part(au.email, '@', 1)
    ) AS full_name,
    ur.role::text AS role
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = 'provider'::public.app_role
  ORDER BY full_name, au.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_providers() TO authenticated;

-- 6) Audit table + trigger for user_roles mutations.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_role text,
  new_role text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_user_id ON public.audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON public.audit_log(occurred_at DESC);

CREATE OR REPLACE FUNCTION public.log_user_roles_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_role text;
BEGIN
  -- When user_roles is mutated via service role clients (edge functions), that
  -- function is responsible for explicit audit inserts with actor context.
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(actor_user_id, target_user_id, action, old_role, new_role, occurred_at)
    VALUES (v_actor, NEW.user_id, 'INSERT', NULL, NEW.role::text, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log(actor_user_id, target_user_id, action, old_role, new_role, occurred_at)
    VALUES (v_actor, NEW.user_id, 'UPDATE', OLD.role::text, NEW.role::text, now());
    RETURN NEW;
  ELSE
    v_role := OLD.role::text;
    INSERT INTO public.audit_log(actor_user_id, target_user_id, action, old_role, new_role, occurred_at)
    VALUES (v_actor, OLD.user_id, 'DELETE', v_role, NULL, now());
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_audit ON public.user_roles;
CREATE TRIGGER trg_user_roles_audit
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_user_roles_audit();

COMMIT;
