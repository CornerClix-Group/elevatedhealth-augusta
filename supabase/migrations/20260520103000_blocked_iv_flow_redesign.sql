ALTER TABLE public.iv_intake_responses
  ADD COLUMN IF NOT EXISTS block_severity text
  CHECK (block_severity IN ('hard', 'service_specific'));

ALTER TABLE public.iv_intake_responses
  DROP CONSTRAINT IF EXISTS iv_intake_responses_follow_up_status_check;

ALTER TABLE public.iv_intake_responses
  ADD CONSTRAINT iv_intake_responses_follow_up_status_check
  CHECK (
    follow_up_status IN (
      'new',
      'contacted',
      'consult_requested',
      'consult_scheduled',
      'converted',
      'declined',
      'closed'
    )
  );
