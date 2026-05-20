-- Single-use slot token replay protection (R-5 follow-up)
-- Stores redeemed token JTIs for a short TTL window.

CREATE TABLE IF NOT EXISTS public.slot_token_redemptions (
  jti uuid PRIMARY KEY,
  token_exp timestamptz NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  booking_function text NOT NULL CHECK (booking_function IN ('book-iv-appointment', 'book-consult-appointment')),
  booking_ref text
);

CREATE INDEX IF NOT EXISTS idx_slot_token_redemptions_token_exp
  ON public.slot_token_redemptions (token_exp);

ALTER TABLE public.slot_token_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.slot_token_redemptions FROM anon, authenticated;
GRANT ALL ON TABLE public.slot_token_redemptions TO service_role;
