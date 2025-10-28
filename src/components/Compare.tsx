import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { CompareQuizModal } from "./CompareQuizModal";

const Compare = () => {
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  return (
    <section id="compare" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Compare Treatment Options
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understanding the differences between IV Ketamine and SPRAVATO®
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse bg-card rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-4 md:p-6 font-semibold text-base md:text-lg border-b border-border">
                    Category
                  </th>
                  <th className="text-left p-4 md:p-6 font-semibold text-base md:text-lg border-b border-l border-border">
                    IV Ketamine
                  </th>
                  <th className="text-left p-4 md:p-6 font-semibold text-base md:text-lg border-b border-l border-border">
                    SPRAVATO® Nasal Spray
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Regulatory */}
                <tr>
                  <td className="p-4 md:p-6 font-medium border-b border-border">
                    Regulatory Status
                  </td>
                  <td className="p-4 md:p-6 border-b border-l border-border">
                    Off-label for depression/anxiety
                  </td>
                  <td className="p-4 md:p-6 border-b border-l border-border">
                    FDA-approved for TRD, MDD with SI/B
                  </td>
                </tr>

                {/* Row 2: Setting */}
                <tr>
                  <td className="p-4 md:p-6 font-medium border-b border-border">
                    Treatment Setting
                  </td>
                  <td className="p-4 md:p-6 border-b border-l border-border">
                    In-clinic infusion with monitoring
                  </td>
                  <td className="p-4 md:p-6 border-b border-l border-border">
                    In-clinic nasal spray, observe ≥2 hours under REMS
                  </td>
                </tr>

                {/* Row 3: Coverage */}
                <tr>
                  <td className="p-4 md:p-6 font-medium">
                    Insurance Coverage
                  </td>
                  <td className="p-4 md:p-6 border-l border-border">
                    Coverage varies
                  </td>
                  <td className="p-4 md:p-6 border-l border-border">
                    May be covered with prior authorization
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Help Me Choose Button */}
          <div className="text-center">
            <Button
              onClick={() => setIsQuizOpen(true)}
              size="lg"
              variant="outline"
              className="gap-2"
              aria-label="Open treatment selection quiz"
            >
              <HelpCircle className="h-5 w-5" />
              Help me choose
            </Button>
          </div>
        </div>
      </div>

      <CompareQuizModal isOpen={isQuizOpen} onClose={() => setIsQuizOpen(false)} />
    </section>
  );
};

export default Compare;
