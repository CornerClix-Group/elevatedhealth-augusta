import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Tv } from "lucide-react";
import mediaImage from "@/assets/jennie-tv-feature.webp";

const MediaFeature = () => {
  return (
    <section className="py-16 px-4 bg-gradient-subtle">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 mb-4">
            <Tv className="w-8 h-8 text-accent" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              As Featured On
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The area's first ketamine clinic, bringing hope and innovative treatment to Augusta
          </p>
        </div>

        {/* Feature Card */}
        <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="relative h-64 md:h-auto">
              <img
                src={mediaImage}
                alt="Lauren Bursey featured on WJBF Jennie Show discussing Elevated Health Augusta"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-accent/10 text-accent font-semibold rounded-full text-sm mb-3">
                  WJBF News Channel 6
                </span>
                <h3 className="text-2xl font-bold text-primary mb-3">
                  Area's First Ketamine Clinic Opens in Evans
                </h3>
                <p className="text-muted-foreground mb-4">
                  Lauren Bursey, Family Nurse Practitioner, was featured on WJBF's "Jennie" show to discuss how Elevated Health Augusta is providing cutting-edge ketamine infusions for patients battling treatment-resistant mental health conditions.
                </p>
              </div>

              <div className="space-y-3 mb-6 text-sm text-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p>The only clinic of its kind in the Augusta area</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p>Specialized treatment for depression, PTSD, and anxiety</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p>Provider-monitored care throughout each 40-minute infusion</p>
                </div>
              </div>

              <Button
                variant="cta"
                size="lg"
                className="w-full md:w-auto"
                onClick={() => window.open('https://www.wjbf.com/featured/jennie/jennie-areas-first-ketamine-clinic-opens-in-evans/', '_blank')}
              >
                Watch Full Interview
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Additional Trust Indicators */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by the Augusta community since 2024
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            <div className="text-2xl font-bold text-primary">WJBF</div>
            <div className="text-lg text-muted-foreground">News Channel 6</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MediaFeature;
