import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SITE_CONFIG } from "@/lib/siteConfig";

const Treatments = () => {
  const navigate = useNavigate();

  const treatments = [
    {
      title: "IV Ketamine",
      headline: "Rapid Relief for Treatment-Resistant Depression",
      description: "In-clinic IV infusions with physician oversight offer a fast-acting solution for depression, anxiety, and mood-related conditions when standard treatments haven't worked.",
      route: SITE_CONFIG.routes.ivKetamine
    },
    {
      title: "SPRAVATO® Nasal Spray",
      headline: "FDA-Approved Ketamine Therapy",
      description: "An FDA-approved nasal spray for treatment-resistant depression and acute suicidal ideation, administered safely in our clinic with comprehensive monitoring.",
      route: SITE_CONFIG.routes.spravato
    },
    {
      title: "Hormone Replacement Therapy",
      headline: "Restore Balance, Reclaim Vitality",
      description: "Personalized hormone optimization for men and women to improve energy, mood, metabolism, and overall quality of life through evidence-based treatment protocols.",
      route: SITE_CONFIG.routes.hormoneReplacement
    },
    {
      title: "Weight Loss Programs",
      headline: "Sustainable Weight Loss Through Medical Science",
      description: "Comprehensive, physician-guided weight loss programs combining nutrition, lifestyle coaching, and advanced medical interventions for lasting results.",
      route: SITE_CONFIG.routes.weightLoss
    }
  ];

  return (
    <section id="treatments" className="py-16 md:py-24 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Our Treatment Options
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Science-driven therapies tailored to your unique health goals
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {treatments.map((treatment, index) => (
              <Card 
                key={index} 
                className="flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl mb-2 group-hover:text-primary transition-colors">
                    {treatment.title}
                  </CardTitle>
                  <p className="text-base font-semibold text-primary">
                    {treatment.headline}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="text-sm leading-relaxed">
                    {treatment.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => navigate(treatment.route)}
                    variant="outline"
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    aria-label={`Learn more about ${treatment.title}`}
                  >
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Coverage Note */}
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm md:text-base text-muted-foreground bg-card border border-border rounded-lg p-4 md:p-6">
              Coverage and eligibility vary by plan and medical necessity. We'll help you verify 
              benefits and coordinate care.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Treatments;
