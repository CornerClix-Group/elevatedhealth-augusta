/** Canonical IV menu — used when Supabase has no rows yet (fresh project). */
export interface IvTherapyCatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  feelings: string[] | null;
  ingredients: string[] | null;
  icon_name: string | null;
  sort_order: number;
}

export const IV_THERAPIES_CATALOG: IvTherapyCatalogItem[] = [
  {
    id: "catalog-resurrection",
    name: "The Resurrection",
    description:
      "Rise again. Rapid rehydration with nausea and headache relief built in.",
    price: 139,
    category: "Recovery",
    feelings: null,
    ingredients: ["Saline", "B-Complex", "Zofran", "Toradol"],
    icon_name: null,
    sort_order: 1,
  },
  {
    id: "catalog-meyers",
    name: "The Meyers",
    description:
      "The OG vitamin IV. Your weekly reset for energy, mood, and metabolic balance.",
    price: 159,
    category: "Wellness",
    feelings: null,
    ingredients: ["Saline", "Magnesium", "B-Complex", "Calcium"],
    icon_name: null,
    sort_order: 2,
  },
  {
    id: "catalog-beast-mode",
    name: "Beast Mode",
    description:
      "Peak performance recovery. Accelerate muscle repair and crush fatigue post-workout.",
    price: 169,
    category: "Performance",
    feelings: null,
    ingredients: ["Amino Acids", "B12", "Magnesium", "Taurine"],
    icon_name: null,
    sort_order: 3,
  },
  {
    id: "catalog-shield",
    name: "The Shield",
    description:
      "Immune support for travel, cold season, and high-exposure weeks.",
    price: 149,
    category: "Immunity",
    feelings: null,
    ingredients: ["Saline", "Vitamin C", "Zinc", "B-Complex"],
    icon_name: null,
    sort_order: 4,
  },
  {
    id: "catalog-glow",
    name: "The Glow",
    description:
      "Skin, hair, and nail support with brightening antioxidants.",
    price: 159,
    category: "Glow",
    feelings: null,
    ingredients: ["Saline", "Biotin", "Vitamin C", "Glutathione"],
    icon_name: null,
    sort_order: 5,
  },
];
