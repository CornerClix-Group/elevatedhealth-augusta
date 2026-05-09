-- NOTE: This is the clinical SOP / standing-orders system,
-- distinct from the legacy public.protocols table (which holds
-- compounded-medication dispensing recipes used by the order
-- and fax flows). The two systems coexist intentionally. The
-- legacy table may be renamed or consolidated in a future
-- migration; for now they are independent.
--
-- One spec deviation: clinical_protocol_versions.notes_for_reviewer
-- is jsonb (not text) so the per-note resolved-state checkboxes
-- specified in Phase 5 of the build task can persist across
-- physician review sessions. Shape: jsonb array of objects:
--   [{ "note": "...", "resolved": false, "resolved_at": null, "resolved_by": null }]
--
-- This migration creates schema only. The 13 protocol drafts and
-- the UI components ship in two follow-up commits.

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- pgcrypto is required for digest() used by sign_clinical_protocol_version.
-- Supabase enables it by default; this is a safety no-op if it already exists.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clinical_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('iv','hormone','peptide','weight_loss','monitoring')),
  service_type text[] NOT NULL DEFAULT '{}',
  -- current_version_id is set by sign_clinical_protocol_version() on first sign.
  -- It is intentionally nullable so a brand-new protocol can exist with only
  -- draft versions and no signed/current version yet. The FK is added after
  -- the versions table exists (see ALTER below).
  current_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_protocol_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_signature','signed','retired')),
  body_markdown text NOT NULL,
  body_structured jsonb NOT NULL DEFAULT '{}'::jsonb,
  authored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at timestamptz,
  signature_hash text,
  notes_for_reviewer jsonb NOT NULL DEFAULT '[]'::jsonb,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id, version_number),
  -- A signed version must have a signer + timestamp + hash recorded together.
  CONSTRAINT signed_fields_consistent CHECK (
    (status = 'signed'  AND signed_by IS NOT NULL AND signed_at IS NOT NULL AND signature_hash IS NOT NULL)
    OR (status <> 'signed')
  )
);

-- Now that the versions table exists, attach the FK from protocols.current_version_id.
ALTER TABLE public.clinical_protocols
  ADD CONSTRAINT clinical_protocols_current_version_fkey
  FOREIGN KEY (current_version_id)
  REFERENCES public.clinical_protocol_versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.clinical_protocol_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_version_id uuid NOT NULL
    REFERENCES public.clinical_protocol_versions(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  executed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- appointment_id is nullable and intentionally untyped (no FK) because it
  -- can point at iv_drip_bookings or consultation_bookings; type discrimination
  -- is left to the application layer until a unified appointments view exists.
  appointment_id uuid,
  executed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  adverse_event_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clinical_protocols_active_category
  ON public.clinical_protocols(is_active, category);

CREATE INDEX IF NOT EXISTS idx_clinical_protocols_service_type
  ON public.clinical_protocols USING gin (service_type);

CREATE INDEX IF NOT EXISTS idx_cp_versions_protocol
  ON public.clinical_protocol_versions(protocol_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_cp_versions_status
  ON public.clinical_protocol_versions(status);

CREATE INDEX IF NOT EXISTS idx_cp_executions_patient
  ON public.clinical_protocol_executions(patient_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_cp_executions_version
  ON public.clinical_protocol_executions(protocol_version_id);

CREATE INDEX IF NOT EXISTS idx_cp_executions_adverse
  ON public.clinical_protocol_executions(adverse_event_flagged)
  WHERE adverse_event_flagged = true;

-- ============================================================================
-- 4. updated_at TRIGGERS
-- ============================================================================

-- Reuses public.update_updated_at_column() which exists from prior migrations.
DROP TRIGGER IF EXISTS trg_clinical_protocols_updated_at ON public.clinical_protocols;
CREATE TRIGGER trg_clinical_protocols_updated_at
  BEFORE UPDATE ON public.clinical_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clinical_protocol_versions_updated_at ON public.clinical_protocol_versions;
CREATE TRIGGER trg_clinical_protocol_versions_updated_at
  BEFORE UPDATE ON public.clinical_protocol_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE public.clinical_protocols           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_protocol_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_protocol_executions ENABLE ROW LEVEL SECURITY;

-- ---------- clinical_protocols ----------
-- Anyone authenticated can SELECT active protocols. Inactive ones visible to admin/staff only.
DROP POLICY IF EXISTS "Authenticated can view active clinical protocols" ON public.clinical_protocols;
CREATE POLICY "Authenticated can view active clinical protocols"
  ON public.clinical_protocols FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
  );

DROP POLICY IF EXISTS "Admin and staff manage clinical protocols" ON public.clinical_protocols;
CREATE POLICY "Admin and staff manage clinical protocols"
  ON public.clinical_protocols FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- ---------- clinical_protocol_versions ----------
-- Staff can SELECT signed versions only. Admin can SELECT every state.
DROP POLICY IF EXISTS "Staff can view signed protocol versions" ON public.clinical_protocol_versions;
CREATE POLICY "Staff can view signed protocol versions"
  ON public.clinical_protocol_versions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (status = 'signed' AND has_role(auth.uid(), 'staff'::app_role))
  );

-- Only admin can INSERT new versions or UPDATE existing ones.
-- The sign_clinical_protocol_version() helper is the only sanctioned path
-- for moving a version into status='signed'; the application UI calls the
-- helper rather than UPDATE-ing status='signed' directly. The CHECK below
-- enforces that policy: a direct UPDATE that flips status='signed' must
-- have signed_by = auth.uid() (i.e. the admin signing in their own name).
DROP POLICY IF EXISTS "Admin can insert protocol versions" ON public.clinical_protocol_versions;
CREATE POLICY "Admin can insert protocol versions"
  ON public.clinical_protocol_versions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin can update protocol versions" ON public.clinical_protocol_versions;
CREATE POLICY "Admin can update protocol versions"
  ON public.clinical_protocol_versions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND (status <> 'signed' OR signed_by = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete protocol versions" ON public.clinical_protocol_versions;
CREATE POLICY "Admin can delete protocol versions"
  ON public.clinical_protocol_versions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- clinical_protocol_executions ----------
-- Staff INSERT for themselves. Staff SELECT their own. Admin SELECTs everything.
DROP POLICY IF EXISTS "Staff can log their own protocol executions" ON public.clinical_protocol_executions;
CREATE POLICY "Staff can log their own protocol executions"
  ON public.clinical_protocol_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    executed_by = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  );

DROP POLICY IF EXISTS "Staff can view their own protocol executions" ON public.clinical_protocol_executions;
CREATE POLICY "Staff can view their own protocol executions"
  ON public.clinical_protocol_executions FOR SELECT
  TO authenticated
  USING (
    executed_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin can manage all protocol executions" ON public.clinical_protocol_executions;
CREATE POLICY "Admin can manage all protocol executions"
  ON public.clinical_protocol_executions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 6. HELPER: sign_clinical_protocol_version(version_id uuid)
-- ============================================================================
--
-- Signs a draft or pending_signature version. SECURITY DEFINER so it can
-- bypass the UPDATE policy's per-column constraints in a controlled,
-- atomic way; access control is performed inside the function body.
--
-- Returns the signed version row.
--
-- Idempotency: re-signing an already-signed version raises an exception
-- rather than silently no-op'ing, so the UI can surface the error.

CREATE OR REPLACE FUNCTION public.sign_clinical_protocol_version(version_id uuid)
RETURNS public.clinical_protocol_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_version public.clinical_protocol_versions%ROWTYPE;
  v_now timestamptz := now();
  v_hash text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'sign_clinical_protocol_version requires an authenticated caller';
  END IF;

  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin role may sign clinical protocol versions';
  END IF;

  SELECT * INTO v_version
    FROM public.clinical_protocol_versions
    WHERE id = version_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinical protocol version % not found', version_id;
  END IF;

  IF v_version.status NOT IN ('draft', 'pending_signature') THEN
    RAISE EXCEPTION 'Cannot sign version in status %', v_version.status;
  END IF;

  v_hash := encode(
    digest(
      v_version.body_markdown || '|' || v_caller::text || '|' || v_now::text,
      'sha256'
    ),
    'hex'
  );

  UPDATE public.clinical_protocol_versions
    SET status = 'signed',
        signed_by = v_caller,
        signed_at = v_now,
        signature_hash = v_hash,
        updated_at = v_now
    WHERE id = version_id
    RETURNING * INTO v_version;

  UPDATE public.clinical_protocols
    SET current_version_id = v_version.id,
        updated_at = v_now
    WHERE id = v_version.protocol_id;

  RETURN v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_clinical_protocol_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_clinical_protocol_version(uuid) TO authenticated;

COMMENT ON FUNCTION public.sign_clinical_protocol_version(uuid) IS
  'Signs a draft or pending_signature clinical protocol version. Requires admin role. '
  'Sets status=signed, signed_by/at, signature_hash (sha256 of body_markdown|signer|timestamp), '
  'and points the parent clinical_protocols.current_version_id at the freshly signed row.';

-- ============================================================================
-- 7. VERIFICATION QUERIES (run in Supabase SQL Editor after migration applies)
-- ============================================================================
-- Sanity (expected: 0 rows in all three tables until the seed migration runs):
--   SELECT
--     (SELECT count(*) FROM public.clinical_protocols)           AS protocols,
--     (SELECT count(*) FROM public.clinical_protocol_versions)   AS versions,
--     (SELECT count(*) FROM public.clinical_protocol_executions) AS executions;
--
-- Confirm helper function exists and is admin-gated:
--   SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid) AS args, p.prosecdef AS security_definer
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'sign_clinical_protocol_version';
