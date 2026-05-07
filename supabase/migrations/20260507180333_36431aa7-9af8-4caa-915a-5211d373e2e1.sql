-- Patients table additions
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS care_membership_tier text,
  ADD COLUMN IF NOT EXISTS care_membership_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS care_membership_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Membership visit log
CREATE TABLE IF NOT EXISTS public.membership_visit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL DEFAULT now(),
  service text NOT NULL,
  administered_by uuid,
  supplies_used jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mvl_patient ON public.membership_visit_log(patient_id, visit_date DESC);

ALTER TABLE public.membership_visit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own visit log"
  ON public.membership_visit_log FOR SELECT
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

CREATE POLICY "Staff manage visit log"
  ON public.membership_visit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));