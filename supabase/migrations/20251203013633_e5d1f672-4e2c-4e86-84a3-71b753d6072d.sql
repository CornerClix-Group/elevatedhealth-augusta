-- Add tracking_number column to hormone_mapping_payments
ALTER TABLE public.hormone_mapping_payments 
ADD COLUMN IF NOT EXISTS tracking_number text;

-- Add shipped_at timestamp for tracking
ALTER TABLE public.hormone_mapping_payments 
ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;

-- Add sample_received_at timestamp
ALTER TABLE public.hormone_mapping_payments 
ADD COLUMN IF NOT EXISTS sample_received_at timestamp with time zone;

-- Add results_ready_at timestamp
ALTER TABLE public.hormone_mapping_payments 
ADD COLUMN IF NOT EXISTS results_ready_at timestamp with time zone;