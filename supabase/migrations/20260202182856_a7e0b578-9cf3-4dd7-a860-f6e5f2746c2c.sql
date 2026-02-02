-- Create clinical notes table for provider documentation
CREATE TABLE public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID,
  note_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'clinical', 'phone_call', 'follow_up'
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false, -- Provider-only notes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Staff and admins can manage clinical notes
CREATE POLICY "Staff and admins can manage clinical notes"
  ON public.clinical_notes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Patients can view their own non-private notes
CREATE POLICY "Patients can view their own non-private notes"
  ON public.clinical_notes
  FOR SELECT
  USING (
    is_private = false AND 
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Add index for faster queries
CREATE INDEX idx_clinical_notes_patient_id ON public.clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_created_at ON public.clinical_notes(created_at DESC);

-- Add office_manager_email to clinic_settings if not exists
INSERT INTO clinic_settings (key, value, description)
VALUES ('office_manager_email', 'kcovington@pmrehab.net', 'Email address for the Office Manager to receive encounter forms and billing documents')
ON CONFLICT (key) DO NOTHING;