-- Additive migration: ELEVATED program tracking on patients.
--
-- Schema note: `public.patients.membership_tier` is plain TEXT (not a Postgres
-- ENUM) — see migration 20251218184023_0790f5c0-c424-406d-b1ba-f5f4e72e3533.sql.
-- Staff may continue using legacy vitality/concierge text values during transition.
-- Canonical elevated tier strings for future staff UI / reporting (TEXT, not enforced
-- here): elevated_trt, elevated_hrt, elevated_glp1, elevated_wellness.
--
-- `elevated_membership_status` remains the subscription lifecycle flag
-- (active | paused | cancelled) from prior migrations.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS elevated_program text;

COMMENT ON COLUMN public.patients.elevated_program IS
  'Active ELEVATED program tier: trt | hrt | glp1 | wellness | NULL. Set by stripe-webhook when a subscription is created or updated.';

CREATE INDEX IF NOT EXISTS idx_patients_elevated_program
  ON public.patients(elevated_program)
  WHERE elevated_program IS NOT NULL;
