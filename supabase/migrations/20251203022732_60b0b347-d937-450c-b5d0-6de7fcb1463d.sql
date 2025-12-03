-- Add is_archived column to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_patients_is_archived ON public.patients(is_archived);

-- Allow admins to delete patients (hard delete for test data cleanup)
CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));