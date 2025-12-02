-- Add phone and email columns to patients table for SMS and subscription management
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);