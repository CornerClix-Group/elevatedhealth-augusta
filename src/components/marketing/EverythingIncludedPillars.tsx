import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const PILLARS = [
  {
    title: "Your monthly medication is included",
    body: "Program memberships bundle prescribed therapy—no separate pharmacy invoice for what’s in your plan.",
  },
  {
    title: "Lab review and protocol adjustments are included",
    body: "Quarterly labs and clinically appropriate physician oversight are part of ongoing care—not add-ons.",
  },
  {
    title: "Unlimited messaging is included",
    body: "Stay in touch with your care team between visits without per-message fees.",
  },
  {
    title: "One price, no hidden fees",
    body: "Transparent monthly pricing for ELEVATED programs. Initial Wellness Assessment and baseline labs are paid upfront, then predictable membership thereafter.",
  },
] as const;

export interface EverythingIncludedPillarsProps {
  className?: string;
  /** Optional short line above the grid (e.g. page-specific context). */
  intro?: string;
}

export function EverythingIncludedPillars({ className, intro }: EverythingIncludedPillarsProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-muted/20 px-6 py-8 md:px-10 md:py-10",
        className,
      )}
      aria-labelledby="everything-included-heading"
    >
      <div className="max-w-3xl mx-auto text-center mb-8">
        <p className="section-label mb-2">Everything Included</p>
        <h2
          id="everything-included-heading"
          className="font-playfair text-2xl md:text-3xl text-foreground mb-3"
        >
          Real medicine. Real local care. <span className="italic">No surprise billing.</span>
        </h2>
        {intro ? (
          <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">{intro}</p>
        ) : null}
      </div>
      <ul className="grid sm:grid-cols-2 gap-4 max-w-5xl mx-auto list-none p-0 m-0">
        {PILLARS.map((p) => (
          <li
            key={p.title}
            className="flex gap-3 rounded-lg border border-border bg-background p-4 text-left shadow-sm"
          >
            <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-playfair text-base text-foreground leading-snug mb-1">{p.title}</p>
              <p className="font-jost font-light text-xs text-muted-foreground leading-relaxed">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
