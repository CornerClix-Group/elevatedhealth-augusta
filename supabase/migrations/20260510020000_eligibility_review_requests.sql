-- ============================================================================
-- eligibility_review_requests
--
-- A clinical-eligibility queue for patients flagged by the safety screen
-- during intake. This is intentionally distinct from consultation_bookings
-- because the workflow vocabulary is different: a flagged intake might
-- result in a booking, a polite decline, a referral out, or just a phone
-- conversation. Conflating that with "this patient has an appointment"
-- creates ambiguity in the queue.
--
-- Replaces the legacy SafetyGate flow that bounced flagged patients to a
-- Google Calendar iframe. The patient now sees "a clinician will review
-- your intake within 1 business day" and the actual decision happens
-- inside the clinic on a Caroline / Troy queue.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.eligibility_review_status AS ENUM (
    'pending',
    'contacted',
    'scheduled',
    'declined',
    'referred_out'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.callback_window AS ENUM (
    'morning',
    'afternoon',
    'evening',
    'no_preference'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.eligibility_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  -- Snapshot of the patient name + contact info at submission time so the
  -- queue is readable even if the patient row is later anonymised.
  patient_name text NOT NULL,
  patient_email text,
  preferred_phone text NOT NULL,
  preferred_callback_window public.callback_window NOT NULL DEFAULT 'no_preference',
  -- intake_id is a soft FK because the intake table varies by intake
  -- vendor (PublicIntake, OAuth onboarding, etc.). Keep it loose for now.
  intake_id uuid,
  -- The flag reasons that triggered SafetyGate: e.g. ["pregnancy","heart_condition"]
  flag_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  treatment_type text,
  status public.eligibility_review_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  -- If the review resolves into a real booking, link the consultation_bookings
  -- row created by the admin queue's Schedule Consult action.
  resolved_booking_id uuid REFERENCES public.consultation_bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eligibility_review_status
  ON public.eligibility_review_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_review_patient
  ON public.eligibility_review_requests(patient_id)
  WHERE patient_id IS NOT NULL;

-- Auto-update updated_at on row edits.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eligibility_review_requests_touch
  ON public.eligibility_review_requests;
CREATE TRIGGER trg_eligibility_review_requests_touch
  BEFORE UPDATE ON public.eligibility_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: this table holds PHI flag reasons. Patients should never read it.
-- Only admin + staff get read access; service role writes via the
-- send-safety-callback-request edge function.
ALTER TABLE public.eligibility_review_requests ENABLE ROW LEVEL SECURITY;

-- Helper: did the caller originate this request? Allows a logged-in
-- patient to read their own (limited) submission for confirmation views,
-- but not the full queue.
DROP POLICY IF EXISTS eligibility_review_select_staff ON public.eligibility_review_requests;
CREATE POLICY eligibility_review_select_staff
  ON public.eligibility_review_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS eligibility_review_update_staff ON public.eligibility_review_requests;
CREATE POLICY eligibility_review_update_staff
  ON public.eligibility_review_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'staff')
    )
  );

-- Insert is handled by the send-safety-callback-request edge function
-- using the service role; no policy needed for authenticated users.

COMMENT ON TABLE public.eligibility_review_requests IS
  'Queue of patients who tripped the SafetyGate during intake. Resolves into one of: scheduled (consult booked), declined (medically inappropriate), referred_out (better served elsewhere), contacted (under discussion).';
COMMENT ON COLUMN public.eligibility_review_requests.flag_reasons IS
  'JSON array of flag identifiers from the safety screen, e.g. ["pregnancy","heart_condition","blood_pressure"]. Treat as PHI.';
COMMENT ON COLUMN public.eligibility_review_requests.resolved_booking_id IS
  'When status=scheduled, the consultation_bookings row created by the admin queue Schedule Consult action.';
