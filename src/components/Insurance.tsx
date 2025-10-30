import { Shield, FileCheck, DollarSign, Phone, CheckCircle2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Insurance = () => {
  const verificationSteps = [
    {
      number: "1",
      title: "Call or Submit Online",
      description: "Reach out to our team with your insurance information"
    },
    {
      number: "2",
      title: "We Verify Your Benefits",
      description: "We'll check your coverage and explain your out-of-pocket costs"
    },
    {
      number: "3",
      title: "Start Treatment",
      description: "Once verified, we'll schedule your first consultation"
    }
  ];

  const otherInsuranceProviders = [
    "Aetna",
    "Cigna", 
    "UnitedHealthcare",
    "Humana",
    "Medicare (select plans)",
    "TRICARE",
  ];

  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="insurance" className="py-24 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* BCBS Announcement Hero */}
          <div className="text-center mb-16">
            <Badge className="mb-6 px-4 py-2 text-sm font-semibold">
              Great News for Georgia
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Now In-Network with<br />
              <span className="text-primary">Blue Cross Blue Shield</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Getting the mental health care you need just became easier. We're proud to accept 
              BCBS of Georgia, making KETRA™ therapy more accessible than ever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" onClick={scrollToContact} className="gap-2">
                <Shield className="h-5 w-5" />
                Verify My Insurance
              </Button>
              <a href="tel:7065509202">
                <Button variant="outline" size="xl" className="gap-2 border-2">
                  <Phone className="h-5 w-5" />
                  Call (706) 550-9202
                </Button>
              </a>
            </div>
          </div>

          {/* How to Verify Your Coverage */}
          <div className="mb-16">
            <Card className="p-8 md:p-12 border-accent/20">
              <h3 className="text-3xl font-bold mb-4 text-center text-foreground">
                How to Verify Your Coverage
              </h3>
              <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
                We make insurance simple. Here's how to get started with your Blue Cross Blue Shield benefits:
              </p>
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {verificationSteps.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                        {step.number}
                      </div>
                      <h4 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                    {index < verificationSteps.length - 1 && (
                      <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-accent" />
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-accent/10 border-l-4 border-accent p-6 rounded-lg">
                <p className="text-foreground font-semibold mb-2">
                  What to Have Ready:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    Your insurance card (front and back)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    Your date of birth and member ID
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    Any referral information from your primary care doctor (if required)
                  </li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Other Insurance & Payment Options */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold mb-8 text-center text-foreground">
              Additional Coverage & Payment Options
            </h3>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="p-8 border-accent/20">
                <Shield className="h-12 w-12 text-accent mb-4" />
                <h4 className="text-2xl font-semibold mb-4 text-foreground">Other Insurance Plans</h4>
                <p className="text-muted-foreground mb-6">
                  We also work with several other major insurance providers:
                </p>
                <div className="space-y-3">
                  {otherInsuranceProviders.map((provider, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                      <span className="text-foreground">{provider}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  Don't see your plan? Contact us—we may still be able to help.
                </p>
              </Card>

              <Card className="p-8 border-accent/20">
                <DollarSign className="h-12 w-12 text-accent mb-4" />
                <h4 className="text-2xl font-semibold mb-4 text-foreground">Self-Pay Options</h4>
                <p className="text-muted-foreground mb-6">
                  No insurance? No problem. We offer transparent self-pay rates and flexible payment plans.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Transparent, upfront pricing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Flexible payment plans available</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">HSA and FSA accepted</span>
                  </li>
                </ul>
                <Button variant="outline" onClick={scrollToContact} className="w-full">
                  Request Pricing Information
                </Button>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12 text-center border border-accent/20">
            <h3 className="text-3xl font-bold mb-4 text-foreground">Ready to Use Your Benefits?</h3>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Our team handles the insurance paperwork so you can focus on getting better. 
              Let's verify your coverage and get you started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" onClick={scrollToContact} className="gap-2">
                <Shield className="h-5 w-5" />
                Verify My Insurance
              </Button>
              <a href="tel:7065509202">
                <Button variant="outline" size="xl" className="gap-2 border-2">
                  <Phone className="h-5 w-5" />
                  Call (706) 550-9202
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Insurance;
