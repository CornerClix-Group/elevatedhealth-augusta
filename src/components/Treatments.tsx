import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SITE_CONFIG } from "@/lib/siteConfig";

const Treatments = () => {
  const navigate = useNavigate();

  return (
    <section id="treatments" className="py-16 md:py-24 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Treatment Options
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Evidence-based ketamine therapies for treatment-resistant conditions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
            {/* IV Ketamine Card */}
            <Card className="flex flex-col hover-scale">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">
                  IV Ketamine
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base leading-relaxed">
                  In-clinic IV ketamine with physician oversight for treatment-resistant depression, 
                  anxiety-related symptoms, and select pain-related mood issues (after evaluation).
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => navigate(SITE_CONFIG.routes.ivKetamine)}
                  className="w-full gap-2"
                  size="lg"
                  aria-label="Learn more about IV Ketamine treatment"
                >
                  Learn about IV Ketamine
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* SPRAVATO® Card */}
            <Card className="flex flex-col hover-scale">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">
                  SPRAVATO® Nasal Spray
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base leading-relaxed">
                  FDA-approved pathway for TRD and for depressive symptoms in MDD with acute suicidal 
                  ideation/behavior. Administered in-clinic under REMS with ≥2-hour observation.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => navigate(SITE_CONFIG.routes.spravato)}
                  className="w-full gap-2"
                  size="lg"
                  aria-label="Learn more about SPRAVATO nasal spray treatment"
                >
                  Learn about SPRAVATO®
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Coverage Note */}
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm md:text-base text-muted-foreground bg-card border border-border rounded-lg p-4 md:p-6">
              Coverage and eligibility vary by plan and medical necessity. We'll help you check 
              benefits and request referrals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Treatments;
