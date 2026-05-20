-- Provider clinical access hardening
-- Purpose: allow provider-only users to perform day-to-day clinical workflow
-- while preserving least-privilege boundaries.

-- ---------------------------------------------------------------------------
-- Remove stale provider-only policies by naming pattern to avoid conflicts.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'appointments',
        'patients',
        'symptom_logs',
        'lab_results',
        'soap_notes',
        'patient_encounters',
        'encounter_attachments',
        'consultation_bookings'
      )
      AND policyname ILIKE 'provider_only_%'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provider_has_active_schedule_on_day(_scheduled_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_schedules ps
    WHERE ps.provider_id = auth.uid()
      AND ps.is_active = true
      AND ps.day_of_week = EXTRACT(DOW FROM (_scheduled_at AT TIME ZONE 'America/New_York'))::smallint
  );
$$;

CREATE OR REPLACE FUNCTION public.provider_can_access_appointment(
  _appointment_provider_id uuid,
  _scheduled_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (
    _appointment_provider_id = auth.uid()
    OR (
      _appointment_provider_id IS NULL
      AND public.provider_has_active_schedule_on_day(_scheduled_at)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- appointments
-- Provider can access:
--   1) rows assigned to themselves, OR
--   2) unassigned rows on a day they have active schedule.
-- This intentionally excludes rows assigned to other providers.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_provider_select_clinical" ON public.appointments;
CREATE POLICY "appointments_provider_select_clinical"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND public.provider_can_access_appointment(provider_id, scheduled_at)
);

DROP POLICY IF EXISTS "appointments_provider_update_clinical" ON public.appointments;
CREATE POLICY "appointments_provider_update_clinical"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND public.provider_can_access_appointment(provider_id, scheduled_at)
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND public.provider_can_access_appointment(provider_id, scheduled_at)
);

-- ---------------------------------------------------------------------------
-- patients
-- Provider can read patients they are actively treating:
-- appointment with provider in the past or today.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "patients_provider_select_treated" ON public.patients;
CREATE POLICY "patients_provider_select_treated"
ON public.patients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = patients.id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

-- ---------------------------------------------------------------------------
-- Intake data (stored as baseline symptom/intake logs in symptom_logs).
-- Provider can read logs for patients they are treating.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "symptom_logs_provider_select_treated" ON public.symptom_logs;
CREATE POLICY "symptom_logs_provider_select_treated"
ON public.symptom_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = symptom_logs.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

-- ---------------------------------------------------------------------------
-- lab_results
-- Provider can read labs for patients they are treating.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lab_results_provider_select_treated" ON public.lab_results;
CREATE POLICY "lab_results_provider_select_treated"
ON public.lab_results
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = lab_results.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

-- ---------------------------------------------------------------------------
-- soap_notes (legacy)
-- Provider can:
--   - SELECT their own notes for treated patients
--   - INSERT their own notes for treated patients
--   - UPDATE their own notes for treated patients
-- No provider DELETE policy is granted.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "soap_notes_provider_select_own_treated" ON public.soap_notes;
CREATE POLICY "soap_notes_provider_select_own_treated"
ON public.soap_notes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = soap_notes.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

DROP POLICY IF EXISTS "soap_notes_provider_insert_own_treated" ON public.soap_notes;
CREATE POLICY "soap_notes_provider_insert_own_treated"
ON public.soap_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = soap_notes.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

DROP POLICY IF EXISTS "soap_notes_provider_update_own_treated" ON public.soap_notes;
CREATE POLICY "soap_notes_provider_update_own_treated"
ON public.soap_notes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = soap_notes.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND provider_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = soap_notes.patient_id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
      AND (a.scheduled_at AT TIME ZONE 'America/New_York')::date
            <= (NOW() AT TIME ZONE 'America/New_York')::date
  )
);

-- ---------------------------------------------------------------------------
-- consultation_bookings
-- consultation_bookings does not have provider_id. Scope via linked
-- appointments.consultation_booking_id and provider appointment access rules.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "consultation_bookings_provider_select_assigned" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_provider_select_assigned"
ON public.consultation_bookings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.consultation_booking_id = consultation_bookings.id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
  )
);

DROP POLICY IF EXISTS "consultation_bookings_provider_update_assigned" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_provider_update_assigned"
ON public.consultation_bookings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.consultation_booking_id = consultation_bookings.id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.consultation_booking_id = consultation_bookings.id
      AND public.provider_can_access_appointment(a.provider_id, a.scheduled_at)
  )
);

-- ---------------------------------------------------------------------------
-- patient_encounters and encounter_attachments
-- Confirmed in prior migrations: provider role is already included.
-- No policy changes required here.
-- ---------------------------------------------------------------------------
