-- Add Labcorp blood work fields to lab_results table
ALTER TABLE public.lab_results 
ADD COLUMN IF NOT EXISTS lab_source TEXT DEFAULT 'zrt',
ADD COLUMN IF NOT EXISTS hematocrit NUMERIC,
ADD COLUMN IF NOT EXISTS psa NUMERIC,
ADD COLUMN IF NOT EXISTS alt NUMERIC,
ADD COLUMN IF NOT EXISTS ast NUMERIC,
ADD COLUMN IF NOT EXISTS a1c NUMERIC;

-- Add index for efficient querying by patient and lab source
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_source ON public.lab_results(patient_id, lab_source);