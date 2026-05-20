-- Patch IV screening to real catalog tables (iv_therapies / iv_addons).

-- A1) Contraindication flags on real IV catalog tables
ALTER TABLE public.iv_therapies
  ADD COLUMN IF NOT EXISTS requires_g6pd_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contraindicates_sesame_allergy boolean NOT NULL DEFAULT false;

ALTER TABLE public.iv_addons
  ADD COLUMN IF NOT EXISTS requires_g6pd_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contraindicates_sesame_allergy boolean NOT NULL DEFAULT false;

-- A2) Set contraindication flags on iv_therapies (idempotent)
UPDATE public.iv_therapies
SET requires_g6pd_clearance = true
WHERE lower(name) = 'the meyers';

UPDATE public.iv_therapies
SET requires_g6pd_clearance = true
WHERE lower(name) = 'the shield';

UPDATE public.iv_therapies
SET requires_g6pd_clearance = true
WHERE lower(name) = 'the glow';

-- A3) Set contraindication flags on iv_addons (idempotent)
UPDATE public.iv_addons
SET requires_g6pd_clearance = true
WHERE lower(name) = 'vitamin c push';

UPDATE public.iv_addons
SET requires_g6pd_clearance = true
WHERE lower(name) = 'glutathione push';

-- A4) Rename intake foreign key column and rewire FK to iv_therapies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'iv_intake_responses'
      AND column_name = 'selected_service_id'
  ) THEN
    ALTER TABLE public.iv_intake_responses
      RENAME COLUMN selected_service_id TO selected_therapy_id;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'iv_intake_responses_selected_service_id_fkey'
  ) THEN
    ALTER TABLE public.iv_intake_responses
      DROP CONSTRAINT iv_intake_responses_selected_service_id_fkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'iv_intake_responses_selected_therapy_id_fkey'
  ) THEN
    ALTER TABLE public.iv_intake_responses
      ADD CONSTRAINT iv_intake_responses_selected_therapy_id_fkey
      FOREIGN KEY (selected_therapy_id) REFERENCES public.iv_therapies(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- A5) Keep existing iv_intake_responses columns as-is for forward compatibility.

-- A6) Verification query references (commented):
-- SELECT name, requires_g6pd_clearance, contraindicates_sesame_allergy FROM iv_therapies ORDER BY sort_order;
-- SELECT name, requires_g6pd_clearance FROM iv_addons WHERE requires_g6pd_clearance = true;
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'iv_intake_responses' AND column_name IN ('selected_therapy_id', 'selected_service_id');
-- SELECT count(*) FROM iv_intake_responses;
