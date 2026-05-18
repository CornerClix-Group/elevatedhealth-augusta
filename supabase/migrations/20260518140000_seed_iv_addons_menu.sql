-- Seed IV add-ons when table is empty (walk-in $25 boosters).
INSERT INTO public.iv_addons (name, description, price, is_active)
SELECT v.name, v.description, v.price, true
FROM (
  VALUES
    ('Vitamin C Push', 'Extra antioxidant support', 25),
    ('B12 Shot', 'Energy and metabolism boost', 25),
    ('Glutathione Push', 'Detox and skin support', 25),
    ('Zofran Push', 'Nausea relief add-on', 25),
    ('Toradol Push', 'Anti-inflammatory relief', 25)
) AS v(name, description, price)
WHERE NOT EXISTS (SELECT 1 FROM public.iv_addons LIMIT 1);
