-- ============================================================
-- File 1: consent_system_foundation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_type text NOT NULL,
  version_label text NOT NULL,
  title text NOT NULL,
  body_markdown text NOT NULL,
  body_hash text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  legal_review_status text DEFAULT 'pending_review',
  legal_review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_versions_type_version_unique UNIQUE (consent_type, version_label)
);
CREATE INDEX IF NOT EXISTS idx_consent_versions_type_active
  ON public.consent_versions(consent_type, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  consent_version_id uuid NOT NULL REFERENCES public.consent_versions(id) ON DELETE RESTRICT,
  consent_type text NOT NULL,
  document_text_hash text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_typed_name text NOT NULL,
  signed_ip text NOT NULL,
  signed_user_agent text NOT NULL,
  signed_session_id text,
  section_attestations jsonb,
  pdf_storage_path text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  superseded_by_consent_id uuid REFERENCES public.consent_records(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_records_patient_active
  ON public.consent_records(patient_id, consent_type) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_expiring
  ON public.consent_records(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_session
  ON public.consent_records(signed_session_id) WHERE signed_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.consent_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  parent_consent_record_id uuid NOT NULL REFERENCES public.consent_records(id) ON DELETE RESTRICT,
  acknowledgment_type text NOT NULL,
  substance_added text,
  acknowledgment_text text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_ip text NOT NULL,
  acknowledged_user_agent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_acknowledgments_patient
  ON public.consent_acknowledgments(patient_id, acknowledgment_type);

DROP TRIGGER IF EXISTS consent_versions_updated_at ON public.consent_versions;
CREATE TRIGGER consent_versions_updated_at BEFORE UPDATE ON public.consent_versions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS consent_records_updated_at ON public.consent_records;
CREATE TRIGGER consent_records_updated_at BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.consent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_versions_read" ON public.consent_versions;
CREATE POLICY "consent_versions_read" ON public.consent_versions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "consent_versions_privileged_write" ON public.consent_versions;
CREATE POLICY "consent_versions_privileged_write" ON public.consent_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role) OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role) OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid()));

DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select" ON public.consent_records
  FOR SELECT TO authenticated USING (
    patient_id IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );
DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert" ON public.consent_records
  FOR INSERT TO authenticated WITH CHECK (
    patient_id IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );
DROP POLICY IF EXISTS "consent_records_update" ON public.consent_records;
CREATE POLICY "consent_records_update" ON public.consent_records
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );

DROP POLICY IF EXISTS "consent_acknowledgments_select" ON public.consent_acknowledgments;
CREATE POLICY "consent_acknowledgments_select" ON public.consent_acknowledgments
  FOR SELECT TO authenticated USING (
    patient_id IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );
DROP POLICY IF EXISTS "consent_acknowledgments_insert" ON public.consent_acknowledgments;
CREATE POLICY "consent_acknowledgments_insert" ON public.consent_acknowledgments
  FOR INSERT TO authenticated WITH CHECK (
    patient_id IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-consents','signed-consents',false) ON CONFLICT (id) DO NOTHING;
UPDATE storage.buckets SET file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf']::text[] WHERE id = 'signed-consents';

DROP POLICY IF EXISTS "signed_consents_own_read" ON storage.objects;
DROP POLICY IF EXISTS "signed_consents_insert" ON storage.objects;
CREATE POLICY "signed_consents_own_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'signed-consents' AND (
    split_part(name,'/',1)::uuid IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  )
);
DROP POLICY IF EXISTS "signed_consents_insert" ON storage.objects;
CREATE POLICY "signed_consents_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'signed-consents' AND (
    split_part(name,'/',1)::uuid IN (SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  )
);

-- ============================================================
-- File 3: intake_flow_support
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consent_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_record_id uuid NOT NULL REFERENCES public.consent_records(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  override_reason text NOT NULL,
  override_reason_category text NOT NULL,
  staff_member_user_id uuid NOT NULL,
  witness_staff_user_id uuid,
  patient_identity_verification_method text NOT NULL,
  staff_attestation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_overrides_patient ON public.consent_overrides(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_overrides_staff ON public.consent_overrides(staff_member_user_id);
CREATE INDEX IF NOT EXISTS idx_consent_overrides_created ON public.consent_overrides(created_at);

ALTER TABLE public.consent_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_overrides_staff_read" ON public.consent_overrides;
CREATE POLICY "consent_overrides_staff_read" ON public.consent_overrides FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
  OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
);
DROP POLICY IF EXISTS "consent_overrides_staff_insert" ON public.consent_overrides;
CREATE POLICY "consent_overrides_staff_insert" ON public.consent_overrides FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
  OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
);

ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS signing_method text NOT NULL DEFAULT 'patient_typed_name';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consent_records_signing_method_check'
      AND conrelid = 'public.consent_records'::regclass
  ) THEN
    ALTER TABLE public.consent_records
      ADD CONSTRAINT consent_records_signing_method_check
      CHECK (signing_method IN ('patient_typed_name','staff_verbal_documented','patient_typed_name_in_clinic'));
  END IF;
END $$;
ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS staff_witness_user_id uuid;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS intake_consents_completed_at timestamptz;

-- ============================================================
-- File 3.5 (was missing): intake_magic_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intake_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  booking_id uuid,
  email_address text,
  phone_number text,
  expires_at timestamptz NOT NULL,
  first_used_at timestamptz,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_magic_links_token ON public.intake_magic_links(token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_intake_magic_links_patient ON public.intake_magic_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_magic_links_expires ON public.intake_magic_links(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE public.intake_magic_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intake_magic_links_staff_read" ON public.intake_magic_links;
CREATE POLICY "intake_magic_links_staff_read" ON public.intake_magic_links FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
  OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
);
DROP POLICY IF EXISTS "intake_magic_links_staff_insert" ON public.intake_magic_links;
CREATE POLICY "intake_magic_links_staff_insert" ON public.intake_magic_links FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
  OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
);

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS intake_link_email_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS intake_link_sms_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS intake_reminder_sent_at timestamptz;

-- ============================================================
-- File 4: consent_expiration_reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consent_expiration_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_record_id uuid NOT NULL REFERENCES public.consent_records(id) ON DELETE CASCADE,
  reminder_window text NOT NULL CHECK (reminder_window IN ('30_day','14_day','3_day','past_grace')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  channels_delivered text[] NOT NULL DEFAULT '{}',
  CONSTRAINT consent_expiration_reminders_sent_unique UNIQUE (consent_record_id, reminder_window)
);
CREATE INDEX IF NOT EXISTS idx_consent_expiration_reminders_record
  ON public.consent_expiration_reminders_sent(consent_record_id);
ALTER TABLE public.consent_expiration_reminders_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_expiration_reminders_staff_read" ON public.consent_expiration_reminders_sent;
CREATE POLICY "consent_expiration_reminders_staff_read" ON public.consent_expiration_reminders_sent
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'staff'::public.app_role)
    OR public.has_role(auth.uid(),'provider'::public.app_role) OR public.has_business_admin_role(auth.uid())
  );

ALTER TABLE public.intake_magic_links ADD COLUMN IF NOT EXISTS pending_consent_types text[];