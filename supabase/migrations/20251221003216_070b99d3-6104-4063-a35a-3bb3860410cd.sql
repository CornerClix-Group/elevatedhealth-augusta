-- Add consent tracking columns to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS consent_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consent_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consent_method TEXT DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS consent_signature TEXT,
ADD COLUMN IF NOT EXISTS consent_signature_date TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.consent_method IS 'internal = in-app consent, osmind = external Osmind waivers';
COMMENT ON COLUMN public.patients.consent_signature IS 'Typed legal name as e-signature';
COMMENT ON COLUMN public.patients.consent_signature_date IS 'Timestamp when patient signed consent';