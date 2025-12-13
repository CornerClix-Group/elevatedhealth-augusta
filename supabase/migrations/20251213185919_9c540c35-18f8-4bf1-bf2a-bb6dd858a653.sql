-- Add metabolic/thyroid/lipid columns to lab_results
ALTER TABLE public.lab_results
ADD COLUMN IF NOT EXISTS tsh NUMERIC,
ADD COLUMN IF NOT EXISTS free_t3 NUMERIC,
ADD COLUMN IF NOT EXISTS free_t4 NUMERIC,
ADD COLUMN IF NOT EXISTS tpo_antibodies NUMERIC,
ADD COLUMN IF NOT EXISTS fasting_insulin NUMERIC,
ADD COLUMN IF NOT EXISTS vitamin_d NUMERIC,
ADD COLUMN IF NOT EXISTS triglycerides NUMERIC,
ADD COLUMN IF NOT EXISTS hdl NUMERIC,
ADD COLUMN IF NOT EXISTS ldl NUMERIC;

-- Create metabolic_payments table for tracking $599 kit orders
CREATE TABLE public.metabolic_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount_paid INTEGER,
  kit_status TEXT NOT NULL DEFAULT 'not_ordered',
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  sample_received_at TIMESTAMP WITH TIME ZONE,
  results_ready_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metabolic_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create metabolic payment record"
ON public.metabolic_payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Patients can view their own metabolic payments"
ON public.metabolic_payments
FOR SELECT
USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Staff and admins can manage metabolic payments"
ON public.metabolic_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));