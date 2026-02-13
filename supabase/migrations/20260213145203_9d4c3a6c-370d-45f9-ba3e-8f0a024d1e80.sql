
-- SOAP Notes table for structured clinical encounter documentation
CREATE TABLE public.soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  
  -- Encounter metadata
  encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  encounter_type TEXT NOT NULL DEFAULT 'follow_up',
  service_line TEXT NOT NULL DEFAULT 'hormone',
  status TEXT NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  
  -- SOAP sections
  subjective JSONB NOT NULL DEFAULT '{}'::jsonb,
  objective JSONB NOT NULL DEFAULT '{}'::jsonb,
  assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Vitals (part of Objective but stored separately for querying)
  vitals JSONB DEFAULT '{}'::jsonb,
  
  -- Linked data
  linked_lab_result_id UUID REFERENCES public.lab_results(id),
  icd10_codes TEXT[] DEFAULT '{}',
  cpt_codes TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff and admins can manage SOAP notes"
ON public.soap_notes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Patients can view their own signed SOAP notes"
ON public.soap_notes FOR SELECT
USING (status = 'signed' AND patient_id IN (
  SELECT id FROM patients WHERE user_id = auth.uid()
));

-- Auto-update timestamp trigger
CREATE TRIGGER update_soap_notes_updated_at
BEFORE UPDATE ON public.soap_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast patient lookups
CREATE INDEX idx_soap_notes_patient_id ON public.soap_notes(patient_id);
CREATE INDEX idx_soap_notes_encounter_date ON public.soap_notes(encounter_date DESC);
CREATE INDEX idx_soap_notes_provider_id ON public.soap_notes(provider_id);

-- SOAP note templates table for reusable templates per service line
CREATE TABLE public.soap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_line TEXT NOT NULL,
  encounter_type TEXT NOT NULL DEFAULT 'follow_up',
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can manage SOAP templates"
ON public.soap_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Authenticated users can view SOAP templates"
ON public.soap_templates FOR SELECT
USING (true);

-- Insert default templates for each service line
INSERT INTO public.soap_templates (name, service_line, encounter_type, is_default, template_data) VALUES
('Ketamine Initial Evaluation', 'ketamine', 'initial', true, '{
  "subjective": {"chief_complaint": "", "hpi": "", "psychiatric_history": "", "substance_history": "", "current_medications": "", "phq9_score": null, "gad7_score": null, "review_of_systems": ""},
  "objective": {"mental_status_exam": "", "affect": "", "mood": "", "thought_process": "", "thought_content": "", "insight_judgment": ""},
  "assessment": {"primary_diagnosis": "", "secondary_diagnoses": [], "clinical_impression": "", "treatment_appropriateness": ""},
  "plan": {"treatment_protocol": "", "dosage": "", "frequency": "", "monitoring_plan": "", "safety_plan": "", "follow_up": "", "referrals": ""}
}'::jsonb),
('Ketamine Follow-Up', 'ketamine', 'follow_up', true, '{
  "subjective": {"symptom_changes": "", "side_effects": "", "mood_rating": null, "sleep_quality": "", "current_medications": "", "phq9_score": null, "gad7_score": null},
  "objective": {"mental_status_exam": "", "affect": "", "mood": "", "vital_signs_stable": true, "dissociation_level": ""},
  "assessment": {"treatment_response": "", "clinical_impression": "", "adverse_events": ""},
  "plan": {"continue_treatment": true, "dosage_adjustment": "", "next_session": "", "safety_plan_update": "", "follow_up": ""}
}'::jsonb),
('HRT Initial Evaluation', 'hormone', 'initial', true, '{
  "subjective": {"chief_complaint": "", "symptom_onset": "", "symptom_severity": "", "menstrual_history": "", "sexual_health": "", "current_medications": "", "family_history": "", "review_of_systems": ""},
  "objective": {"physical_exam": "", "lab_review": "", "bmi": null, "blood_pressure": ""},
  "assessment": {"primary_diagnosis": "", "hormone_status": "", "clinical_impression": "", "contraindications": ""},
  "plan": {"protocol": "", "compound": "", "dosage": "", "route": "", "monitoring_schedule": "", "lab_recheck_date": "", "follow_up": ""}
}'::jsonb),
('HRT Follow-Up', 'hormone', 'follow_up', true, '{
  "subjective": {"symptom_changes": "", "side_effects": "", "energy_level": "", "mood_changes": "", "sleep_quality": "", "libido_changes": "", "current_medications": ""},
  "objective": {"lab_review": "", "blood_pressure": "", "weight": null, "bmi": null},
  "assessment": {"treatment_response": "", "lab_interpretation": "", "clinical_impression": ""},
  "plan": {"dosage_adjustment": "", "protocol_changes": "", "lab_recheck_date": "", "follow_up": ""}
}'::jsonb),
('Weight Loss Initial Evaluation', 'weight_loss', 'initial', true, '{
  "subjective": {"chief_complaint": "", "weight_history": "", "diet_history": "", "exercise_habits": "", "previous_weight_loss": "", "current_medications": "", "comorbidities": "", "review_of_systems": ""},
  "objective": {"weight": null, "height": null, "bmi": null, "blood_pressure": "", "waist_circumference": null, "lab_review": ""},
  "assessment": {"primary_diagnosis": "", "bmi_category": "", "metabolic_risk": "", "clinical_impression": ""},
  "plan": {"medication": "", "starting_dose": "", "titration_schedule": "", "dietary_recommendations": "", "exercise_plan": "", "monitoring_schedule": "", "follow_up": ""}
}'::jsonb),
('Weight Loss Follow-Up', 'weight_loss', 'follow_up', true, '{
  "subjective": {"weight_change": "", "appetite_changes": "", "gi_side_effects": "", "energy_level": "", "exercise_adherence": "", "dietary_adherence": "", "current_medications": ""},
  "objective": {"weight": null, "bmi": null, "blood_pressure": "", "lab_review": ""},
  "assessment": {"weight_loss_progress": "", "treatment_response": "", "clinical_impression": ""},
  "plan": {"dose_adjustment": "", "medication_changes": "", "lifestyle_modifications": "", "lab_recheck_date": "", "follow_up": ""}
}'::jsonb);
