-- Add RLS policy to allow public token lookup for intake forms
-- This enables unauthenticated users with a valid token to access the intake form

CREATE POLICY "Allow public intake token lookup"
ON public.patients
FOR SELECT
USING (intake_token IS NOT NULL AND intake_token_expires_at > NOW());

-- Also allow the submit-public-intake edge function to update patient records via service role
-- (service role bypasses RLS, but we need to ensure symptom_logs can be inserted)

CREATE POLICY "Allow public symptom log insert via intake"
ON public.symptom_logs
FOR INSERT
WITH CHECK (true);