-- Seed IV lounge menu on fresh Supabase projects (no icon_name — UI does not render icons).
INSERT INTO public.iv_therapies (name, description, price, category, ingredients, sort_order, is_active, icon_name)
SELECT v.name, v.description, v.price, v.category, v.ingredients, v.sort_order, true, NULL
FROM (
  VALUES
    (
      'The Resurrection',
      'Rise again. Rapid rehydration with nausea and headache relief built in.',
      139,
      'Recovery',
      ARRAY['Saline', 'B-Complex', 'Zofran', 'Toradol']::text[],
      1
    ),
    (
      'The Meyers',
      'The OG vitamin IV. Your weekly reset for energy, mood, and metabolic balance.',
      159,
      'Wellness',
      ARRAY['Saline', 'Magnesium', 'B-Complex', 'Calcium']::text[],
      2
    ),
    (
      'Beast Mode',
      'Peak performance recovery. Accelerate muscle repair and crush fatigue post-workout.',
      169,
      'Performance',
      ARRAY['Amino Acids', 'B12', 'Magnesium', 'Taurine']::text[],
      3
    ),
    (
      'The Shield',
      'Immune support for travel, cold season, and high-exposure weeks.',
      149,
      'Immunity',
      ARRAY['Saline', 'Vitamin C', 'Zinc', 'B-Complex']::text[],
      4
    ),
    (
      'The Glow',
      'Skin, hair, and nail support with brightening antioxidants.',
      159,
      'Glow',
      ARRAY['Saline', 'Biotin', 'Vitamin C', 'Glutathione']::text[],
      5
    )
) AS v(name, description, price, category, ingredients, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.iv_therapies t WHERE t.name = v.name
);
