-- Create iv_therapies table
CREATE TABLE public.iv_therapies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  category text NOT NULL,
  feelings text[] DEFAULT '{}',
  ingredients text[] DEFAULT '{}',
  stripe_price_id text,
  icon_name text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create iv_addons table
CREATE TABLE public.iv_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL DEFAULT 25,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.iv_therapies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iv_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for iv_therapies
CREATE POLICY "Anyone can view active IV therapies"
ON public.iv_therapies
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage IV therapies"
ON public.iv_therapies
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for iv_addons
CREATE POLICY "Anyone can view active IV addons"
ON public.iv_addons
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage IV addons"
ON public.iv_addons
FOR ALL
USING (has_role(auth.uid(), 'admin'));