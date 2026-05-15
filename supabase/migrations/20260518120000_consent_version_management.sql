-- Admin-only consent version publishing fields + narrow INSERT/UPDATE on consent_versions
-- to business_admin per clinic operating policy (providers/staff cannot publish catalog rows).

ALTER TABLE public.consent_versions
  ADD COLUMN IF NOT EXISTS force_re_consent_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.consent_versions
  ADD COLUMN IF NOT EXISTS changelog_notes text;

COMMENT ON COLUMN public.consent_versions.force_re_consent_required IS
  'When true on a superseded row: PR 6 workflows may require patients on this version to re-sign before prescribing.';
COMMENT ON COLUMN public.consent_versions.changelog_notes IS
  'Optional admin changelog when publishing a new legal version.';

-- Replace broad privileged write with business_admin-only INSERT/UPDATE.
DROP POLICY IF EXISTS "consent_versions_privileged_write" ON public.consent_versions;

DROP POLICY IF EXISTS "consent_versions_admin_insert" ON public.consent_versions;
CREATE POLICY "consent_versions_admin_insert"
  ON public.consent_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_admin_role(auth.uid()));

DROP POLICY IF EXISTS "consent_versions_admin_update" ON public.consent_versions;
CREATE POLICY "consent_versions_admin_update"
  ON public.consent_versions
  FOR UPDATE
  TO authenticated
  USING (public.has_business_admin_role(auth.uid()))
  WITH CHECK (public.has_business_admin_role(auth.uid()));
