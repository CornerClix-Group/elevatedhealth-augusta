import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SITE_CONFIG } from "@/lib/siteConfig";

interface PillarGridProps {
  onOpenBooking: () => void;
}

// Fine-line SVG icons for luxury aesthetic
const LotusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C12 2 8 6 8 10C8 14 12 18 12 18C12 18 16 14 16 10C16 6 12 2 12 2Z" />
    <path d="M12 18C12 18 6 14 2 14C2 14 4 18 8 20C12 22 12 22 12 22" />
    <path d="M12 18C12 18 18 14 22 14C22 14 20 18 16 20C12 22 12 22 12 22" />
  </svg>
);

const DNAIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15C2 15 4 13 7 13C10 13 12 15 12 15C12 15 14 17 17 17C20 17 22 15 22 15" />
    <path d="M2 9C2 9 4 11 7 11C10 11 12 9 12 9C12 9 14 7 17 7C20 7 22 9 22 9" />
    <line x1="4" y1="4" x2="4" y2="20" />
    <line x1="20" y1="4" x2="20" y2="20" />
    <line x1="7" y1="7" x2="7" y2="7.01" />
    <line x1="17" y1="17" x2="17" y2="17.01" />
    <line x1="7" y1="13" x2="7" y2="13.01" />
    <line x1="17" y1="11" x2="17" y2="11.01" />
  </svg>
);

const SunburstIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
  </svg>
);

const PillarGrid = ({ onOpenBooking }: PillarGridProps) => {
  const navigate = useNavigate();

  const pillars = [
    {
      icon: LotusIcon,
      title: "Ketamine Therapy",
      description: "IV infusions & SPRAVATO® for treatment-resistant depression, PTSD, and anxiety",
      route: SITE_CONFIG.routes.ketamine,
      features: ["70% response rate", "Results within 24hrs", "FDA-approved options"]
    },
    {
      icon: DNAIcon,
      title: "Medical Weight Loss",
      description: "Semaglutide (GLP-1) therapy with personalized nutrition and lifestyle support",
      route: SITE_CONFIG.routes.weightloss,
      features: ["15-20% weight loss", "Physician supervised", "Evidence-based"]
    },
    {
      icon: SunburstIcon,
      title: "Hormone Replacement",
      description: "Bioidentical hormone therapy to restore energy, mood, and vitality",
      route: SITE_CONFIG.routes.hormones,
      features: ["BHRT therapy", "Lab testing included", "Coming Soon"]
    }
  ];

  return (
    <section id="pillars" className="section-spacing bg-gradient-subtle scroll-mt-20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20 animate-fade-in-up">
            <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4 font-lato font-light">
              Our Approach
            </p>
            <h2 className="font-playfair text-foreground mb-6">
              Your Path to Wellness
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
              Three comprehensive pillars of care designed to help you restore your mind, renew your body, and rebalance your hormones
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid md:grid-cols-3 gap-10 lg:gap-12">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <Card 
                  key={index} 
                  className="group hover:shadow-lg transition-all duration-500 border border-border/50 hover:border-primary/20 cursor-pointer bg-card/80 backdrop-blur-sm animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                  onClick={() => navigate(pillar.route)}
                >
                  <CardContent className="p-10">
                    {/* Fine-line Icon */}
                    <div className="mb-8">
                      <Icon className="h-12 w-12 text-primary" />
                    </div>
                    
                    <h3 className="text-2xl font-playfair mb-4 text-foreground group-hover:text-primary transition-colors">
                      {pillar.title}
                    </h3>
                    
                    <p className="text-muted-foreground mb-8 leading-relaxed font-light">
                      {pillar.description}
                    </p>

                    {/* Features with gold dots */}
                    <ul className="space-y-3 mb-8">
                      {pillar.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Learn More Link */}
                    <div className="flex items-center gap-2 text-primary font-lato text-sm tracking-wide">
                      <span className="elegant-underline">Learn More</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PillarGrid;
