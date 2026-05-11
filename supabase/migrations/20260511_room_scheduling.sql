-- ============================================================================
-- Migration: Room-based scheduling for Elevated Health Augusta
-- Author: Generated 2026-05-11
-- Description:
--   1. Enhance rooms table (display order, flex capability, capacity, allowed cats)
--   2. Add room_blackouts (admin marks specific room unavailable for a window)
--   3. Add booking_limits (concurrent caps per service category / room type)
--   4. Add service_rooms compatibility matrix
--   5. Extend services table with scheduling rules
--   6. Seed 4 treatment rooms + 1 flex lobby for the Evans, GA location
--   7. Update IV/NAD/consult/injection durations to current operating reality
--   8. Add find_available_room() and check_booking_limits() functions
--   9. Add enforcement trigger on appointments
--  10. Add v_room_utilization view for admin dashboard
--
-- All inserts are idempotent (safe to run twice).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enhance rooms table
-- ----------------------------------------------------------------------------
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flex boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_concurrent_appointments integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allowed_service_categories text[]
    DEFAULT array['iv','nad','hormone','peptide','weight_loss','consult','injection']::text[],
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Widen type CHECK to include lobby (flex space)
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_type_check;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_type_check
  CHECK (type IN ('treatment_room','consult_room','procedure_room','injection_room','lobby'));

CREATE INDEX IF NOT EXISTS idx_rooms_active_order
  ON public.rooms(active, display_order);

-- ----------------------------------------------------------------------------
-- 2. Room blackouts (admin marks a room unavailable for a time window)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  recurring boolean DEFAULT false,
  recurrence_pattern jsonb, -- e.g., {"days_of_week":[1,3,5]}
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT room_blackouts_time_check CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_room_blackouts_room_time
  ON public.room_blackouts(room_id, start_at, end_at);

-- ----------------------------------------------------------------------------
-- 3. Booking limits (caps simultaneous bookings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6), -- null = all days
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_concurrent integer NOT NULL CHECK (max_concurrent > 0),
  service_category text, -- null = all categories
  applies_to_room_types text[], -- null = all room types
  effective_from date NOT NULL DEFAULT current_date,
  effective_until date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_limits_active
  ON public.booking_limits(active, day_of_week) WHERE active = true;

-- ----------------------------------------------------------------------------
-- 4. Service-room compatibility matrix
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_rooms (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  preferred boolean DEFAULT false,
  PRIMARY KEY (service_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_service_rooms_service ON public.service_rooms(service_id);
CREATE INDEX IF NOT EXISTS idx_service_rooms_room ON public.service_rooms(room_id);

-- ----------------------------------------------------------------------------
-- 5. Extend services table with scheduling rules
-- ----------------------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS requires_room boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS room_type_required text,
  ADD COLUMN IF NOT EXISTS allow_flex_room boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_advance_booking_hours integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_advance_booking_days integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS allow_same_day_booking boolean DEFAULT true;

-- ----------------------------------------------------------------------------
-- 6. Seed the 5 rooms (idempotent)
-- ----------------------------------------------------------------------------
INSERT INTO public.rooms
  (name, type, active, display_order, is_flex, max_concurrent_appointments, allowed_service_categories, notes)
SELECT v.name, v.type::text, v.active, v.display_order, v.is_flex,
       v.max_concurrent, v.allowed_categories, v.notes
FROM (VALUES
  ('Room 1', 'treatment_room', true, 1, false, 1,
   array['iv','nad','injection','peptide','weight_loss','hormone'],
   'Primary IV / NAD+ treatment room'),
  ('Room 2', 'treatment_room', true, 2, false, 1,
   array['iv','nad','injection','peptide','weight_loss','hormone'],
   'Primary IV / NAD+ treatment room'),
  ('Room 3', 'treatment_room', true, 3, false, 1,
   array['iv','nad','injection','peptide','weight_loss','hormone'],
   'Primary IV / NAD+ treatment room'),
  ('Room 4', 'treatment_room', true, 4, false, 1,
   array['iv','nad','injection','peptide','weight_loss','hormone','consult'],
   'Treatment room with consult capability'),
  ('Lobby (Flex)', 'lobby', true, 5, true, 2,
   array['injection','consult','weight_loss'],
   'Flex space used only when treatment rooms are full; injections and brief consults only')
) AS v(name, type, active, display_order, is_flex, max_concurrent, allowed_categories, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE rooms.name = v.name);

-- ----------------------------------------------------------------------------
-- 7. Service duration alignment (IV hydration = 60 min per current direction)
--    Wrapped in DO block so missing service slugs don't break the migration.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- IV hydration block: 60 minutes, requires treatment room
  UPDATE public.services
     SET duration_minutes = 60,
         room_type_required = 'treatment_room',
         requires_room = true,
         allow_flex_room = false
   WHERE slug IN ('myers-cocktail','immune-boost','athletic-recovery','iv-hydration-rescue','high-dose-vitamin-c');

  -- NAD+ 250mg: 4 hours
  UPDATE public.services
     SET duration_minutes = 240,
         room_type_required = 'treatment_room',
         requires_room = true,
         allow_flex_room = false
   WHERE slug IN ('nad-250mg','nad-plus-250mg','nad-250');

  -- NAD+ 500mg: 6 hours
  UPDATE public.services
     SET duration_minutes = 360,
         room_type_required = 'treatment_room',
         requires_room = true,
         allow_flex_room = false
   WHERE slug IN ('nad-500mg','nad-plus-500mg','nad-500');

  -- Quick injections: 15 min, flex room allowed (can use lobby when treatment rooms full)
  UPDATE public.services
     SET duration_minutes = 15,
         requires_room = true,
         allow_flex_room = true
   WHERE slug IN ('glutathione-push','semaglutide-injection','tirzepatide-injection','b12-injection','lipo-injection','peptide-injection');

  -- Hormone consult initial: 60 min, consult room preferred, lobby acceptable
  UPDATE public.services
     SET duration_minutes = 60,
         room_type_required = 'consult_room',
         requires_room = true,
         allow_flex_room = true
   WHERE slug IN ('hormone-consult-initial','hormone-initial-consult');

  -- Hormone consult follow-up: 30 min
  UPDATE public.services
     SET duration_minutes = 30,
         room_type_required = 'consult_room',
         requires_room = true,
         allow_flex_room = true
   WHERE slug IN ('hormone-consult-followup','hormone-followup','hormone-follow-up');

  -- Membership consult: 90 min, virtual-capable so room not strictly required
  UPDATE public.services
     SET duration_minutes = 90,
         requires_room = false,
         allow_flex_room = true
   WHERE slug IN ('membership-consult','membership-consultation');
END $$;

-- ----------------------------------------------------------------------------
-- 8. Default booking limits (idempotent by name)
-- ----------------------------------------------------------------------------
INSERT INTO public.booking_limits
  (name, day_of_week, start_time, end_time, max_concurrent, service_category, applies_to_room_types, active)
SELECT v.name, v.day_of_week, v.start_time::time, v.end_time::time,
       v.max_concurrent, v.service_category, v.applies_to_room_types, v.active
FROM (VALUES
  ('Default — IV concurrent cap (4 rooms)',
    NULL::int, '00:00', '23:59', 4, 'iv', array['treatment_room'], true),
  ('Default — NAD+ concurrent cap (long chair turns)',
    NULL::int, '00:00', '23:59', 2, 'nad', array['treatment_room'], true),
  ('Default — Lobby injection cap',
    NULL::int, '00:00', '23:59', 2, 'injection', array['lobby'], true)
) AS v(name, day_of_week, start_time, end_time, max_concurrent, service_category, applies_to_room_types, active)
WHERE NOT EXISTS (SELECT 1 FROM public.booking_limits WHERE booking_limits.name = v.name);

-- ----------------------------------------------------------------------------
-- 9. Default service-room compatibility (idempotent)
-- ----------------------------------------------------------------------------
-- IV + NAD -> Rooms 1-4 only (never lobby — slow drips need privacy + reclining)
INSERT INTO public.service_rooms (service_id, room_id, preferred)
SELECT s.id, r.id, false
FROM public.services s
CROSS JOIN public.rooms r
WHERE s.category IN ('iv','nad')
  AND r.type = 'treatment_room'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_rooms sr
    WHERE sr.service_id = s.id AND sr.room_id = r.id
  );

-- Injections -> all treatment rooms + lobby (lobby preferred to keep treatment rooms free for IVs)
INSERT INTO public.service_rooms (service_id, room_id, preferred)
SELECT s.id, r.id, (r.type = 'lobby')
FROM public.services s
CROSS JOIN public.rooms r
WHERE s.category = 'injection'
  AND r.type IN ('treatment_room','lobby')
  AND NOT EXISTS (
    SELECT 1 FROM public.service_rooms sr
    WHERE sr.service_id = s.id AND sr.room_id = r.id
  );

-- Hormone/peptide/weight-loss -> all treatment rooms (Room 4 preferred for consults bundled in)
INSERT INTO public.service_rooms (service_id, room_id, preferred)
SELECT s.id, r.id, (r.name = 'Room 4')
FROM public.services s
CROSS JOIN public.rooms r
WHERE s.category IN ('hormone','peptide','weight_loss')
  AND r.type = 'treatment_room'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_rooms sr
    WHERE sr.service_id = s.id AND sr.room_id = r.id
  );

-- Consults -> Room 4 (preferred) + Lobby (acceptable when Room 4 busy)
INSERT INTO public.service_rooms (service_id, room_id, preferred)
SELECT s.id, r.id, (r.name = 'Room 4')
FROM public.services s
CROSS JOIN public.rooms r
WHERE s.category = 'consult'
  AND (r.name = 'Room 4' OR r.type = 'lobby')
  AND NOT EXISTS (
    SELECT 1 FROM public.service_rooms sr
    WHERE sr.service_id = s.id AND sr.room_id = r.id
  );

-- ----------------------------------------------------------------------------
-- 10. Core availability function
--     Given a service + proposed window, returns the room_id that can host it,
--     or NULL if none / service doesn't need a room.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_available_room(
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_service record;
  v_room_id uuid;
  v_buffer_before interval;
  v_buffer_after interval;
BEGIN
  SELECT s.category, s.requires_room, s.room_type_required, s.allow_flex_room,
         COALESCE(s.buffer_before_minutes, 0) AS buffer_before,
         COALESCE(s.buffer_after_minutes, 15) AS buffer_after
    INTO v_service
  FROM public.services s
  WHERE s.id = p_service_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT v_service.requires_room THEN
    RETURN NULL; -- caller treats NULL room as "no room needed"
  END IF;

  v_buffer_before := (v_service.buffer_before || ' minutes')::interval;
  v_buffer_after  := (v_service.buffer_after  || ' minutes')::interval;

  SELECT r.id INTO v_room_id
  FROM public.rooms r
  LEFT JOIN public.service_rooms sr
    ON sr.room_id = r.id AND sr.service_id = p_service_id
  WHERE r.active = true
    AND v_service.category = ANY(r.allowed_service_categories)
    AND (
      v_service.room_type_required IS NULL
      OR r.type = v_service.room_type_required
      OR (v_service.allow_flex_room = true AND r.is_flex = true)
    )
    -- Respect compatibility matrix when populated
    AND (
      NOT EXISTS (SELECT 1 FROM public.service_rooms WHERE service_id = p_service_id)
      OR sr.room_id IS NOT NULL
    )
    -- No overlapping appointment (with buffer)
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.room_id = r.id
        AND a.status NOT IN ('cancelled','no_show','rescheduled')
        AND (p_exclude_appointment_id IS NULL OR a.id <> p_exclude_appointment_id)
        AND a.start_at < (p_end_at + v_buffer_after)
        AND a.end_at   > (p_start_at - v_buffer_before)
    )
    -- No overlapping blackout
    AND NOT EXISTS (
      SELECT 1 FROM public.room_blackouts b
      WHERE b.room_id = r.id
        AND b.start_at < p_end_at
        AND b.end_at   > p_start_at
    )
  ORDER BY
    COALESCE(sr.preferred, false) DESC,
    r.display_order ASC
  LIMIT 1;

  RETURN v_room_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Booking limit check
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_limits(
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_service_category text;
  v_limit record;
  v_current_count integer;
  v_dow integer;
  v_local_start time;
  v_local_end time;
  v_local_date date;
BEGIN
  SELECT category INTO v_service_category FROM public.services WHERE id = p_service_id;

  v_dow := EXTRACT(DOW FROM p_start_at AT TIME ZONE 'America/New_York')::int;
  v_local_start := (p_start_at AT TIME ZONE 'America/New_York')::time;
  v_local_end   := (p_end_at   AT TIME ZONE 'America/New_York')::time;
  v_local_date  := (p_start_at AT TIME ZONE 'America/New_York')::date;

  FOR v_limit IN
    SELECT *
    FROM public.booking_limits bl
    WHERE bl.active = true
      AND (bl.day_of_week IS NULL OR bl.day_of_week = v_dow)
      AND bl.effective_from <= v_local_date
      AND (bl.effective_until IS NULL OR bl.effective_until >= v_local_date)
      AND (bl.service_category IS NULL OR bl.service_category = v_service_category)
      AND bl.start_time <= v_local_start
      AND bl.end_time   >= v_local_end
  LOOP
    SELECT COUNT(*) INTO v_current_count
    FROM public.appointments a
    JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.rooms r ON r.id = a.room_id
    WHERE a.status NOT IN ('cancelled','no_show','rescheduled')
      AND (p_exclude_appointment_id IS NULL OR a.id <> p_exclude_appointment_id)
      AND a.start_at < p_end_at
      AND a.end_at   > p_start_at
      AND (v_limit.service_category IS NULL OR s.category = v_limit.service_category)
      AND (v_limit.applies_to_room_types IS NULL OR r.type = ANY(v_limit.applies_to_room_types));

    IF v_current_count >= v_limit.max_concurrent THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. Enforcement trigger on appointments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_appointment_room_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_service record;
  v_room_available uuid;
  v_limits_ok boolean;
BEGIN
  IF NEW.status IN ('cancelled','no_show','rescheduled') THEN
    RETURN NEW;
  END IF;

  SELECT id, requires_room, duration_minutes,
         COALESCE(buffer_before_minutes,0) AS buffer_before_minutes,
         COALESCE(buffer_after_minutes,15) AS buffer_after_minutes
    INTO v_service
  FROM public.services WHERE id = NEW.service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service % not found', NEW.service_id;
  END IF;

  -- If service requires a room and none was specified, find one
  IF v_service.requires_room AND NEW.room_id IS NULL THEN
    v_room_available := public.find_available_room(NEW.service_id, NEW.start_at, NEW.end_at, NEW.id);
    IF v_room_available IS NULL THEN
      RAISE EXCEPTION 'No room available for service % at the requested time (%, %)',
        NEW.service_id, NEW.start_at, NEW.end_at;
    END IF;
    NEW.room_id := v_room_available;
  END IF;

  -- If a room WAS specified, verify it's actually available
  IF NEW.room_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.room_id = NEW.room_id
        AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND a.status NOT IN ('cancelled','no_show','rescheduled')
        AND a.start_at < NEW.end_at
        AND a.end_at   > NEW.start_at
    ) THEN
      RAISE EXCEPTION 'Room % is already booked at the requested time', NEW.room_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_blackouts b
      WHERE b.room_id = NEW.room_id
        AND b.start_at < NEW.end_at
        AND b.end_at   > NEW.start_at
    ) THEN
      RAISE EXCEPTION 'Room % is blacked out at the requested time', NEW.room_id;
    END IF;
  END IF;

  -- Validate booking limits
  v_limits_ok := public.check_booking_limits(NEW.service_id, NEW.start_at, NEW.end_at, NEW.id);
  IF NOT v_limits_ok THEN
    RAISE EXCEPTION 'Booking limit exceeded for this time slot';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_room_rules ON public.appointments;
CREATE TRIGGER appointment_room_rules
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_appointment_room_rules();

-- ----------------------------------------------------------------------------
-- 13. updated_at maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS booking_limits_updated_at ON public.booking_limits;
CREATE TRIGGER booking_limits_updated_at
  BEFORE UPDATE ON public.booking_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 14. RLS policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.room_blackouts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_limits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_rooms   ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate to make rerunnable
DROP POLICY IF EXISTS "Staff read room blackouts"   ON public.room_blackouts;
DROP POLICY IF EXISTS "Staff manage room blackouts" ON public.room_blackouts;
DROP POLICY IF EXISTS "Public read booking limits"  ON public.booking_limits;
DROP POLICY IF EXISTS "Staff manage booking limits" ON public.booking_limits;
DROP POLICY IF EXISTS "Public read service rooms"   ON public.service_rooms;
DROP POLICY IF EXISTS "Staff manage service rooms"  ON public.service_rooms;

CREATE POLICY "Staff read room blackouts" ON public.room_blackouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider','staff','rn')
    )
  );

CREATE POLICY "Staff manage room blackouts" ON public.room_blackouts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  );

CREATE POLICY "Public read booking limits" ON public.booking_limits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manage booking limits" ON public.booking_limits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  );

CREATE POLICY "Public read service rooms" ON public.service_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manage service rooms" ON public.service_rooms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','provider')
    )
  );

-- ----------------------------------------------------------------------------
-- 15. Room utilization view (for admin dashboard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_room_utilization AS
SELECT
  r.id,
  r.name,
  r.type,
  r.active,
  r.is_flex,
  r.display_order,
  COUNT(DISTINCT a.id)
    FILTER (WHERE a.start_at::date = current_date
            AND a.status NOT IN ('cancelled','no_show')) AS appointments_today,
  COUNT(DISTINCT a.id)
    FILTER (WHERE a.start_at >= date_trunc('week', current_date)
            AND a.start_at <  date_trunc('week', current_date) + interval '7 days'
            AND a.status NOT IN ('cancelled','no_show')) AS appointments_this_week,
  COUNT(DISTINCT b.id)
    FILTER (WHERE b.end_at > now()) AS active_blackouts
FROM public.rooms r
LEFT JOIN public.appointments a ON a.room_id = r.id
LEFT JOIN public.room_blackouts b ON b.room_id = r.id
GROUP BY r.id, r.name, r.type, r.active, r.is_flex, r.display_order
ORDER BY r.display_order;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
-- SELECT count(*) FROM public.rooms;                       -- expect 5
-- SELECT count(*) FROM public.booking_limits WHERE active; -- expect 3
-- SELECT count(*) FROM public.service_rooms;               -- expect 10+ (depends on service catalog)
-- SELECT * FROM public.v_room_utilization;                 -- snapshot
-- SELECT name, type, is_flex, max_concurrent_appointments FROM public.rooms ORDER BY display_order;
