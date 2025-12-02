-- Add gender and treatment_request to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS treatment_request text,
ADD COLUMN IF NOT EXISTS lab_path text DEFAULT 'zrt';

-- Add comment for clarity
COMMENT ON COLUMN public.patients.lab_path IS 'zrt = ZRT Saliva Kit, labcorp = LabCorp Blood Work';
COMMENT ON COLUMN public.patients.treatment_request IS 'hormone_female, hormone_male, weight_loss, testosterone';