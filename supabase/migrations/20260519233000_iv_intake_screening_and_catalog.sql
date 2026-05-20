-- IV intake screening + catalog reconciliation
-- Launch blocker implementation per IV-BOOKING-SPEC.md

-- ----------------------------------------------------------------------------
-- A1) iv_intake_responses table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iv_intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  email text NOT NULL,
  phone text,
  first_name text,
  last_name text,
  date_of_birth date,
  selected_service_id uuid,

  has_chf boolean NOT NULL DEFAULT false,
  has_esrd boolean NOT NULL DEFAULT false,
  is_pregnant boolean NOT NULL DEFAULT false,
  has_anaphylaxis_history boolean NOT NULL DEFAULT false,
  has_g6pd_deficiency boolean NOT NULL DEFAULT false,
  has_ckd boolean NOT NULL DEFAULT false,
  on_anticoagulants boolean NOT NULL DEFAULT false,
  has_hypertension_uncontrolled boolean NOT NULL DEFAULT false,
  has_diabetes boolean NOT NULL DEFAULT false,
  has_thyroid_disorder boolean NOT NULL DEFAULT false,
  currently_breastfeeding boolean NOT NULL DEFAULT false,
  has_sesame_allergy boolean NOT NULL DEFAULT false,
  has_iv_allergies boolean NOT NULL DEFAULT false,

  iv_allergies_text text,
  current_medications text,
  known_allergies text,
  recent_surgeries text,

  acknowledged_disclaimer boolean NOT NULL DEFAULT false,
  acknowledged_warnings boolean NOT NULL DEFAULT false,

  screening_result text NOT NULL,
  block_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  warn_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],

  clinician_override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clinician_override_at timestamptz,
  clinician_override_reason text,

  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  follow_up_status text NOT NULL DEFAULT 'new',
  follow_up_assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  follow_up_notes text,
  patient_notified_email_sent_at timestamptz,
  staff_notified_email_sent_at timestamptz,
  safety_consult_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT iv_intake_responses_screening_result_check CHECK (
    screening_result IN ('cleared', 'blocked', 'warned', 'warned_acknowledged', 'overridden')
  ),
  CONSTRAINT iv_intake_responses_follow_up_status_check CHECK (
    follow_up_status IN ('new', 'contacted', 'consult_scheduled', 'converted', 'declined', 'closed')
  )
);

ALTER TABLE public.iv_intake_responses
  ADD COLUMN IF NOT EXISTS follow_up_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS follow_up_assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_notes text,
  ADD COLUMN IF NOT EXISTS patient_notified_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_notified_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS safety_consult_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'iv_intake_responses_follow_up_status_check'
  ) THEN
    ALTER TABLE public.iv_intake_responses
      ADD CONSTRAINT iv_intake_responses_follow_up_status_check
      CHECK (follow_up_status IN ('new', 'contacted', 'consult_scheduled', 'converted', 'declined', 'closed'));
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'iv_intake_responses'
        AND tc.constraint_name = 'iv_intake_responses_selected_service_id_fkey'
    ) THEN
      EXECUTE '
        ALTER TABLE public.iv_intake_responses
        ADD CONSTRAINT iv_intake_responses_selected_service_id_fkey
        FOREIGN KEY (selected_service_id) REFERENCES public.services(id) ON DELETE SET NULL
      ';
    END IF;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_email ON public.iv_intake_responses(email);
CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_patient_id ON public.iv_intake_responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_appointment_id ON public.iv_intake_responses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_safety_consult_appointment_id ON public.iv_intake_responses(safety_consult_appointment_id);
CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_screening_result ON public.iv_intake_responses(screening_result);
CREATE INDEX IF NOT EXISTS idx_iv_intake_responses_follow_up_status ON public.iv_intake_responses(follow_up_status);

DROP TRIGGER IF EXISTS update_iv_intake_responses_updated_at ON public.iv_intake_responses;
CREATE TRIGGER update_iv_intake_responses_updated_at
BEFORE UPDATE ON public.iv_intake_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.iv_intake_responses ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- A2) RLS policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "iv_intake_insert_anyone" ON public.iv_intake_responses;
CREATE POLICY "iv_intake_insert_anyone"
ON public.iv_intake_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "iv_intake_select_patient_by_email" ON public.iv_intake_responses;
CREATE POLICY "iv_intake_select_patient_by_email"
ON public.iv_intake_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.user_id = auth.uid()
      AND lower(p.email) = lower(iv_intake_responses.email)
  )
);

DROP POLICY IF EXISTS "iv_intake_select_provider" ON public.iv_intake_responses;
CREATE POLICY "iv_intake_select_provider"
ON public.iv_intake_responses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
);

DROP POLICY IF EXISTS "iv_intake_select_admin_business_admin" ON public.iv_intake_responses;
CREATE POLICY "iv_intake_select_admin_business_admin"
ON public.iv_intake_responses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'business_admin'::public.app_role)
);

DROP POLICY IF EXISTS "iv_intake_update_admin_only" ON public.iv_intake_responses;
CREATE POLICY "iv_intake_update_admin_only"
ON public.iv_intake_responses
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'business_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'business_admin'::public.app_role)
);

-- ----------------------------------------------------------------------------
-- A3) services catalog extension
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.services
  ADD COLUMN IF NOT EXISTS supplier text DEFAULT 'fcc',
  ADD COLUMN IF NOT EXISTS supplier_sku text,
  ADD COLUMN IF NOT EXISTS supplier_ndc text,
  ADD COLUMN IF NOT EXISTS requires_g6pd_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contraindicates_sesame_allergy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS route_type text DEFAULT 'iv',
  ADD COLUMN IF NOT EXISTS active_ingredients jsonb,
  ADD COLUMN IF NOT EXISTS is_safety_consult boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'services_supplier_check'
    ) THEN
      EXECUTE '
        ALTER TABLE public.services
        ADD CONSTRAINT services_supplier_check
        CHECK (supplier IN (''fcc'',''mckesson'',''tbd''))
      ';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'services_route_type_check'
    ) THEN
      EXECUTE '
        ALTER TABLE public.services
        ADD CONSTRAINT services_route_type_check
        CHECK (route_type IN (''iv'',''im'',''either''))
      ';
    END IF;
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- A4) Catalog reconciliation log + idempotent service updates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_reconciliation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid,
  service_name text NOT NULL,
  issue_type text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid REFERENCES public.iv_intake_responses(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  error_message text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_recon_service_issue
  ON public.catalog_reconciliation_log(service_id, issue_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) THEN
    INSERT INTO public.catalog_reconciliation_log (service_name, issue_type, notes)
    VALUES (
      '[services table missing]',
      'migration_warning',
      'public.services not found; service catalog reconciliation updates skipped'
    )
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  -- FCC-supplied
  UPDATE public.services
  SET
    supplier = 'fcc',
    supplier_sku = '3516',
    requires_g6pd_clearance = true,
    active_ingredients = jsonb_build_object(
      'compound', 'Glutathione',
      'concentration', '200mg/mL'
    )
  WHERE lower(name) = 'glutathione';

  UPDATE public.services
  SET
    supplier = 'fcc',
    supplier_sku = '3735',
    requires_g6pd_clearance = true,
    active_ingredients = jsonb_build_object(
      'contains_ascorbic_acid', '65mg/mL',
      'label', 'Myers Cocktail'
    )
  WHERE lower(name) = 'myers cocktail';

  UPDATE public.services
  SET
    supplier = 'fcc',
    supplier_sku = '3733',
    active_ingredients = jsonb_build_object(
      'thiamine_mg_ml', 100,
      'riboflavin_5_p_mg_ml', 2,
      'niacinamide_mg_ml', 100,
      'dexpanthenol_mg_ml', 2,
      'pyridoxine_mg_ml', 2
    )
  WHERE lower(name) IN ('b complex', 'vitamin b complex');

  UPDATE public.services
  SET
    supplier = 'fcc',
    supplier_sku = '2867',
    route_type = 'im',
    active_ingredients = jsonb_build_object(
      'compound', 'Methylcobalamin',
      'concentration', '1mg/mL',
      'default_volume', '10mL'
    )
  WHERE lower(name) LIKE '%b12%'
    OR lower(name) LIKE '%methylcobalamin%';

  UPDATE public.services
  SET
    supplier = 'fcc',
    supplier_sku = '3558',
    route_type = 'im',
    contraindicates_sesame_allergy = true,
    active_ingredients = jsonb_build_object(
      'compound', 'Vitamin D3',
      'concentration', '50,000 IU/mL',
      'vehicle', 'sesame oil'
    )
  WHERE lower(name) IN ('vitamin d3', 'vit d3');

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '3729'
  WHERE lower(name) = 'magnesium chloride';

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '3727', route_type = 'iv'
  WHERE lower(name) = 'calcium chloride';

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '3731'
  WHERE lower(name) = 'zinc sulfate';

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '3725'
  WHERE lower(name) IN ('amino mix', 'amino-mix');

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '3732'
  WHERE lower(name) = 'taurine';

  UPDATE public.services
  SET supplier = 'fcc', supplier_sku = '2869', route_type = 'im'
  WHERE lower(name) IN ('lipotropic', 'skinny shot', 'mic');

  -- McKesson-supplied
  UPDATE public.services
  SET
    supplier = 'mckesson',
    supplier_sku = 'McKesson #1131007',
    supplier_ndc = '67157-0101-50',
    requires_g6pd_clearance = true
  WHERE lower(name) IN ('vitamin c', 'ascorbic acid');

  UPDATE public.services
  SET supplier = 'mckesson', supplier_sku = COALESCE(supplier_sku, 'TBD')
  WHERE lower(name) IN ('zofran', 'ondansetron');

  UPDATE public.services
  SET supplier = 'mckesson', supplier_sku = COALESCE(supplier_sku, 'TBD')
  WHERE lower(name) IN ('toradol', 'ketorolac');

  -- Log unmatched names for review
  WITH matched AS (
    SELECT id
    FROM public.services
    WHERE lower(name) IN (
      'glutathione',
      'myers cocktail',
      'b complex',
      'vitamin b complex',
      'vitamin d3',
      'vit d3',
      'magnesium chloride',
      'calcium chloride',
      'zinc sulfate',
      'amino mix',
      'amino-mix',
      'taurine',
      'lipotropic',
      'skinny shot',
      'mic',
      'vitamin c',
      'ascorbic acid',
      'zofran',
      'ondansetron',
      'toradol',
      'ketorolac'
    )
    OR lower(name) LIKE '%b12%'
    OR lower(name) LIKE '%methylcobalamin%'
  )
  INSERT INTO public.catalog_reconciliation_log (service_id, service_name, issue_type, notes)
  SELECT
    s.id,
    s.name,
    'unmatched_service_name',
    'No reconciliation mapping rule matched this service name'
  FROM public.services s
  WHERE NOT EXISTS (SELECT 1 FROM matched m WHERE m.id = s.id)
  ON CONFLICT (service_id, issue_type) DO NOTHING;
END
$$;

-- ----------------------------------------------------------------------------
-- B) Safety Consultation service seed
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  has_services boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) INTO has_services;

  IF NOT has_services THEN
    RETURN;
  END IF;

  INSERT INTO public.services (
    name,
    description,
    price_cents,
    service_line,
    supplier,
    duration_minutes,
    is_active,
    is_safety_consult,
    requires_g6pd_clearance,
    contraindicates_sesame_allergy
  )
  SELECT
    'Safety Consultation',
    'Complimentary physician evaluation for patients who need clinical clearance before IV therapy.',
    0,
    'consult',
    'fcc',
    30,
    true,
    true,
    false,
    false
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.services s
    WHERE lower(s.name) = lower('Safety Consultation')
  );

  UPDATE public.services
  SET
    price_cents = 0,
    service_line = 'consult',
    supplier = 'fcc',
    duration_minutes = 30,
    is_active = true,
    is_safety_consult = true,
    requires_g6pd_clearance = false,
    contraindicates_sesame_allergy = false
  WHERE lower(name) = lower('Safety Consultation');
END
$$;

-- ----------------------------------------------------------------------------
-- G) Follow-up status audit trigger (writes to existing audit_log table)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_iv_follow_up_status_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_target uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.follow_up_status IS NOT DISTINCT FROM OLD.follow_up_status THEN
    RETURN NEW;
  END IF;

  v_actor := auth.uid();
  v_target := COALESCE(NEW.follow_up_assigned_to, OLD.follow_up_assigned_to, v_actor);

  INSERT INTO public.audit_log (
    actor_user_id,
    target_user_id,
    action,
    old_role,
    new_role,
    occurred_at
  ) VALUES (
    v_actor,
    COALESCE(v_target, v_actor),
    'UPDATE',
    'iv_follow_up_status:' || COALESCE(OLD.follow_up_status, 'null'),
    'iv_follow_up_status:' || COALESCE(NEW.follow_up_status, 'null'),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_iv_intake_follow_up_audit ON public.iv_intake_responses;
CREATE TRIGGER trg_iv_intake_follow_up_audit
AFTER UPDATE ON public.iv_intake_responses
FOR EACH ROW
EXECUTE FUNCTION public.log_iv_follow_up_status_audit();
