-- Seed lab catalog: 5 named panels, ~23 unique individual tests, panel→test joins.
--
-- Catalog tables (lab_panels, lab_tests, panel_tests) did not previously exist.
-- The existing public.lab_results table holds per-patient lab values and is unrelated.
--
-- Pricing reflects the canonical numbers in .cursorrules (panel non-member/member)
-- and the per-test pricing supplied with the seed task. Patient-charging continues
-- to flow through the consult-visit checkout (no Stripe Price IDs are created here);
-- these rows drive Caroline's ordering workflow and downstream LabCorp requisitions.

-- ============================================================================
-- 1. CATALOG TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lab_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  non_member_price_cents integer NOT NULL CHECK (non_member_price_cents >= 0),
  member_price_cents integer NOT NULL CHECK (member_price_cents >= 0),
  sex_specific text CHECK (sex_specific IS NULL OR sex_specific IN ('female','male')),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  category text,
  description text,
  non_member_price_cents integer NOT NULL CHECK (non_member_price_cents >= 0),
  member_price_cents integer NOT NULL CHECK (member_price_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panel_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid NOT NULL REFERENCES public.lab_panels(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.lab_tests(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (panel_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_tests_panel ON public.panel_tests(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_tests_test ON public.panel_tests(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_panels_active ON public.lab_panels(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_lab_tests_active ON public.lab_tests(is_active, category, display_order);

-- ============================================================================
-- 2. updated_at TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_panels_updated_at ON public.lab_panels;
CREATE TRIGGER trg_lab_panels_updated_at
  BEFORE UPDATE ON public.lab_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lab_tests_updated_at ON public.lab_tests;
CREATE TRIGGER trg_lab_tests_updated_at
  BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view lab panels" ON public.lab_panels;
CREATE POLICY "Authenticated can view lab panels"
  ON public.lab_panels FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and staff manage lab panels" ON public.lab_panels;
CREATE POLICY "Admin and staff manage lab panels"
  ON public.lab_panels FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Authenticated can view lab tests" ON public.lab_tests;
CREATE POLICY "Authenticated can view lab tests"
  ON public.lab_tests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and staff manage lab tests" ON public.lab_tests;
CREATE POLICY "Admin and staff manage lab tests"
  ON public.lab_tests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Authenticated can view panel tests" ON public.panel_tests;
CREATE POLICY "Authenticated can view panel tests"
  ON public.panel_tests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and staff manage panel tests" ON public.panel_tests;
CREATE POLICY "Admin and staff manage panel tests"
  ON public.panel_tests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- ============================================================================
-- 4. SEED — lab_panels (5 rows)
-- ============================================================================

INSERT INTO public.lab_panels (name, slug, description, non_member_price_cents, member_price_cents, sex_specific, display_order)
VALUES
  ('Foundation Wellness',  'foundation-wellness',
   'Comprehensive baseline labs covering metabolic health, blood count, cholesterol, blood sugar, vitamin D, thyroid, iron stores, and inflammation.',
   29500, 24500, NULL, 10),
  ('Hormone — Female',     'hormone-female',
   'Foundation labs plus female hormone optimization panel — estrogen sensitivity, progesterone, total/free testosterone, adrenal markers, complete thyroid.',
   39500, 34500, 'female', 20),
  ('Hormone — Male',       'hormone-male',
   'Foundation labs plus male hormone optimization panel — testosterone profile, estrogen sensitivity, prostate (40+), adrenal markers, complete thyroid.',
   39500, 34500, 'male', 30),
  ('Weight Optimization',  'weight-optimization',
   'Foundation labs plus weight loss-relevant markers — fasting insulin, leptin, morning cortisol, full thyroid panel.',
   34500, 29500, NULL, 40),
  ('Sexual Wellness',      'sexual-wellness',
   'Targeted panel for sexual response and libido evaluation. CMP delivered as a lite chemistry subset (electrolytes, creatinine) appropriate for sexual response work-up.',
   24500, 19500, NULL, 50)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      non_member_price_cents = EXCLUDED.non_member_price_cents,
      member_price_cents = EXCLUDED.member_price_cents,
      sex_specific = EXCLUDED.sex_specific,
      display_order = EXCLUDED.display_order;

-- ============================================================================
-- 5. SEED — lab_tests (23 unique rows)
-- ============================================================================

INSERT INTO public.lab_tests (name, code, category, description, non_member_price_cents, member_price_cents, display_order)
VALUES
  ('Complete Blood Count',                'CBC',    'foundation',         'CBC with differential. Red/white cell counts, hemoglobin, hematocrit, platelets.',                          3500, 2500, 10),
  ('Comprehensive Metabolic Panel',       'CMP',    'foundation',         'Glucose, kidney function, electrolytes, liver enzymes (14 analytes).',                                       3500, 2500, 20),
  ('Lipid Panel',                         'LIPID',  'foundation',         'Total cholesterol, LDL, HDL, triglycerides, non-HDL, ratios.',                                               4000, 3000, 30),
  ('Hemoglobin A1c',                      'HBA1C',  'foundation',         '90-day average blood glucose. Diabetes screening and metabolic monitoring.',                                 3500, 2500, 40),
  ('Vitamin D, 25-OH',                    'VITD',   'foundation',         '25-hydroxyvitamin D. Bone, immune, and hormonal health marker.',                                             5500, 4000, 50),
  ('Thyroid Stimulating Hormone',         'TSH',    'foundation',         'Pituitary marker for thyroid function. Reflex to free T4 if abnormal.',                                      4000, 3000, 60),
  ('Ferritin',                            'FERR',   'foundation',         'Iron storage marker. Anemia, fatigue, hair loss work-up.',                                                   4000, 3000, 70),
  ('High-Sensitivity C-Reactive Protein', 'HSCRP',  'foundation',         'Systemic inflammation marker. Cardiovascular risk stratification.',                                          5000, 3500, 80),
  ('Estradiol, Sensitive',                'E2-S',   'hormone',            'LC-MS/MS sensitive estradiol assay. Accurate at the low end (men, postmenopausal women, monitoring).',       8500, 6000, 110),
  ('Progesterone',                        'PROG',   'hormone',            'Serum progesterone. Cycle phase confirmation, BHRT monitoring.',                                             5500, 4000, 120),
  ('Testosterone, Total',                 'TT',     'hormone',            'Total serum testosterone. TRT/BHRT screening and monitoring.',                                               5500, 4000, 130),
  ('Testosterone, Free',                  'FT',     'hormone',            'Free (bioavailable) testosterone. Calculated or direct measurement.',                                        7500, 5500, 140),
  ('DHEA-Sulfate',                        'DHEAS',  'hormone',            'Adrenal androgen reserve marker. HPA-axis assessment.',                                                      5500, 4000, 150),
  ('Follicle-Stimulating Hormone',        'FSH',    'hormone',            'Pituitary gonadotropin. Menopause status, ovarian reserve, male hypogonadism work-up.',                      4500, 3500, 160),
  ('Luteinizing Hormone',                 'LH',     'hormone',            'Pituitary gonadotropin. Paired with FSH for HPG-axis assessment.',                                           4500, 3500, 170),
  ('Sex Hormone-Binding Globulin',        'SHBG',   'hormone',            'Carrier protein that binds sex hormones. Required for free hormone calculation.',                            5500, 4000, 180),
  ('Free T3',                             'FT3',    'hormone',            'Active thyroid hormone. Comprehensive thyroid panel component.',                                             5000, 3500, 190),
  ('Free T4',                             'FT4',    'hormone',            'Inactive thyroid hormone (precursor to T3). Comprehensive thyroid panel component.',                         5000, 3500, 200),
  ('Prostate-Specific Antigen',           'PSA',    'hormone',            'Prostate health screening. Standard for men 40+ on TRT.',                                                    5500, 4000, 210),
  ('Prolactin',                           'PRL',    'hormone',            'Pituitary hormone. Libido, fertility, and pituitary screening.',                                             4500, 3500, 220),
  ('Cortisol, AM',                        'AMCORT', 'hormone',            'Morning serum cortisol. Adrenal function, stress, and HPA-axis screening.',                                  6500, 4500, 230),
  ('Fasting Insulin',                     'INS',    'weight_metabolic',   'Insulin resistance and metabolic syndrome marker. Pairs with HbA1c and glucose.',                            6000, 4500, 310),
  ('Leptin',                              'LEP',    'weight_metabolic',   'Satiety/adipose hormone. Weight loss resistance and metabolic dysfunction work-up.',                         9500, 7000, 320)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      non_member_price_cents = EXCLUDED.non_member_price_cents,
      member_price_cents = EXCLUDED.member_price_cents,
      display_order = EXCLUDED.display_order;

-- ============================================================================
-- 6. SEED — panel_tests join rows (62 total)
-- ============================================================================

INSERT INTO public.panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, x.display_order
FROM (
  VALUES
    ('foundation-wellness', 'CBC',    10),
    ('foundation-wellness', 'CMP',    20),
    ('foundation-wellness', 'LIPID',  30),
    ('foundation-wellness', 'HBA1C',  40),
    ('foundation-wellness', 'VITD',   50),
    ('foundation-wellness', 'TSH',    60),
    ('foundation-wellness', 'FERR',   70),
    ('foundation-wellness', 'HSCRP',  80),

    ('hormone-female', 'CBC',    10),
    ('hormone-female', 'CMP',    20),
    ('hormone-female', 'LIPID',  30),
    ('hormone-female', 'HBA1C',  40),
    ('hormone-female', 'VITD',   50),
    ('hormone-female', 'TSH',    60),
    ('hormone-female', 'FERR',   70),
    ('hormone-female', 'HSCRP',  80),
    ('hormone-female', 'E2-S',   110),
    ('hormone-female', 'PROG',   120),
    ('hormone-female', 'TT',     130),
    ('hormone-female', 'FT',     140),
    ('hormone-female', 'DHEAS',  150),
    ('hormone-female', 'FSH',    160),
    ('hormone-female', 'LH',     170),
    ('hormone-female', 'SHBG',   180),
    ('hormone-female', 'FT3',    190),
    ('hormone-female', 'FT4',    200),

    ('hormone-male', 'CBC',    10),
    ('hormone-male', 'CMP',    20),
    ('hormone-male', 'LIPID',  30),
    ('hormone-male', 'HBA1C',  40),
    ('hormone-male', 'VITD',   50),
    ('hormone-male', 'TSH',    60),
    ('hormone-male', 'FERR',   70),
    ('hormone-male', 'HSCRP',  80),
    ('hormone-male', 'TT',     130),
    ('hormone-male', 'FT',     140),
    ('hormone-male', 'E2-S',   145),
    ('hormone-male', 'DHEAS',  150),
    ('hormone-male', 'SHBG',   180),
    ('hormone-male', 'PSA',    210),
    ('hormone-male', 'FT3',    190),
    ('hormone-male', 'FT4',    200),

    ('weight-optimization', 'CBC',    10),
    ('weight-optimization', 'CMP',    20),
    ('weight-optimization', 'LIPID',  30),
    ('weight-optimization', 'HBA1C',  40),
    ('weight-optimization', 'VITD',   50),
    ('weight-optimization', 'TSH',    60),
    ('weight-optimization', 'FERR',   70),
    ('weight-optimization', 'HSCRP',  80),
    ('weight-optimization', 'INS',    310),
    ('weight-optimization', 'LEP',    320),
    ('weight-optimization', 'AMCORT', 230),
    ('weight-optimization', 'FT3',    190),
    ('weight-optimization', 'FT4',    200),

    ('sexual-wellness', 'CBC',    10),
    ('sexual-wellness', 'CMP',    20),
    ('sexual-wellness', 'TT',     130),
    ('sexual-wellness', 'FT',     140),
    ('sexual-wellness', 'E2-S',   145),
    ('sexual-wellness', 'PRL',    220),
    ('sexual-wellness', 'SHBG',   180)
) AS x(panel_slug, test_code, display_order)
JOIN public.lab_panels p ON p.slug = x.panel_slug
JOIN public.lab_tests  t ON t.code = x.test_code
ON CONFLICT (panel_id, test_id) DO UPDATE
  SET display_order = EXCLUDED.display_order;