-- Add risk_status column to patients table
ALTER TABLE public.patients 
ADD COLUMN risk_status TEXT DEFAULT 'standard';

-- Add medical_history column for storing safety screening responses
ALTER TABLE public.patients 
ADD COLUMN medical_history JSONB DEFAULT '{}'::jsonb;

-- Create index for quick lookup of high-risk patients
CREATE INDEX idx_patients_risk_status ON public.patients(risk_status);

-- Add comment for documentation
COMMENT ON COLUMN public.patients.risk_status IS 'Patient risk classification: standard, high_risk_review, cleared_by_provider';
COMMENT ON COLUMN public.patients.medical_history IS 'Stores safety screening responses: breast_cancer, uterine_cancer, blood_clot, pregnant_breastfeeding';