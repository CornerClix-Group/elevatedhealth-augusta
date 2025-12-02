-- Create activation_links table to track sent activation emails
CREATE TABLE public.activation_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT,
  base_membership TEXT NOT NULL DEFAULT 'metabolic',
  addon_tier TEXT NOT NULL DEFAULT 'none',
  total_monthly INTEGER NOT NULL,
  stripe_checkout_url TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activation_links ENABLE ROW LEVEL SECURITY;

-- Policy for admin access
CREATE POLICY "Admins can manage activation links"
ON public.activation_links
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- Create index for quick lookups
CREATE INDEX idx_activation_links_status ON public.activation_links(status);
CREATE INDEX idx_activation_links_patient_email ON public.activation_links(patient_email);

-- Trigger for updated_at
CREATE TRIGGER update_activation_links_updated_at
BEFORE UPDATE ON public.activation_links
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();