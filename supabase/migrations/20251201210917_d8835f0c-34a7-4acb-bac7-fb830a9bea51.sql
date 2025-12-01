-- Add onboarding_status to patients table
ALTER TABLE public.patients 
ADD COLUMN onboarding_status TEXT DEFAULT 'pending_invite';

-- Add invited_at and invited_by columns
ALTER TABLE public.patients 
ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN invited_by UUID REFERENCES auth.users(id);

-- Add intake_completed flag
ALTER TABLE public.patients 
ADD COLUMN intake_completed BOOLEAN DEFAULT false;

-- Create index for onboarding status
CREATE INDEX idx_patients_onboarding_status ON public.patients(onboarding_status);

-- Comment for documentation
COMMENT ON COLUMN public.patients.onboarding_status IS 'Patient onboarding status: pending_invite, onboarding, intake_complete, active';