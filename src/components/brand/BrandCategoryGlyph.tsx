import { cn } from "@/lib/utils";

/** Elevated Health category marks — custom monoline glyphs (not generic Lucide templates). */
export type BrandGlyphCategory =
  | "Recovery"
  | "Wellness"
  | "Performance"
  | "Immunity"
  | "Glow"
  | "IV"
  | "Default";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function GlyphPaths({ category }: { category: BrandGlyphCategory }) {
  switch (category) {
    case "Recovery":
      return (
        <>
          <path {...strokeProps} d="M12 4v16M8 8c0-2 2-4 4-4s4 2 4 4M8 16c0 2 2 4 4 4s4-2 4-4" />
          <path {...strokeProps} d="M6 12h12" opacity={0.45} />
        </>
      );
    case "Wellness":
      return (
        <>
          <circle {...strokeProps} cx="12" cy="12" r="7.5" />
          <path {...strokeProps} d="M12 8.5v7M9 12h6" />
        </>
      );
    case "Performance":
      return (
        <>
          <path {...strokeProps} d="M6 17L12 7l6 10" />
          <path {...strokeProps} d="M8.5 14h7" opacity={0.5} />
        </>
      );
    case "Immunity":
      return (
        <path
          {...strokeProps}
          d="M12 4.5l5.5 2.2v5.1c0 3.6-2.4 5.9-5.5 7.2-3.1-1.3-5.5-3.6-5.5-7.2V6.7L12 4.5z"
        />
      );
    case "Glow":
      return (
        <>
          <circle {...strokeProps} cx="12" cy="12" r="3.25" />
          <path
            {...strokeProps}
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"
            opacity={0.55}
          />
        </>
      );
    case "IV":
      return (
        <>
          <path {...strokeProps} d="M9 6v12M15 6v12" />
          <path {...strokeProps} d="M7 9h4M13 15h4" />
          <ellipse {...strokeProps} cx="12" cy="12" rx="2" ry="3.5" opacity={0.4} />
        </>
      );
    default:
      return <circle {...strokeProps} cx="12" cy="12" r="6.5" />;
  }
}

interface BrandCategoryGlyphProps {
  category: BrandGlyphCategory | string;
  className?: string;
  size?: number;
}

export function normalizeBrandGlyphCategory(raw: string): BrandGlyphCategory {
  const key = raw.trim();
  if (key === "Recovery" || key === "Wellness" || key === "Performance" || key === "Immunity" || key === "Glow") {
    return key;
  }
  return "Default";
}

export function BrandCategoryGlyph({ category, className, size = 28 }: BrandCategoryGlyphProps) {
  const normalized = normalizeBrandGlyphCategory(category);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("text-accent shrink-0", className)}
      aria-hidden
    >
      <GlyphPaths category={normalized} />
    </svg>
  );
}
