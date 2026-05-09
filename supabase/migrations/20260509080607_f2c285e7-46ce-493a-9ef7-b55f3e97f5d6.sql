
DROP FUNCTION IF EXISTS public.trigger_cron_job_manual(bigint);
-- Bootstrap helpers retained: idempotent, restricted to service_role, useful
-- if the operator ever needs to rotate CRON_SECRET via the same flow.
