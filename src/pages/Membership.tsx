import { Helmet } from "react-helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { useEffect } from "react";

const tiers = [
  {
    name: "Wellness Pass",
    standard: "$199/mo",
    founding: "$149/mo",
    popular: false,
    features: [
      "2 IV infusions per month",
      "1 Glutathione push included",
      "Priority same-day booking",
      "10% off additional IVs and add-ons",
      "Member health portal access",
    ],
  },
  {
    name: "Longevity Protocol",
    standard: "$399/mo",
    founding: "$299/mo",
    popular: true,
    features: [
      "Everything in Wellness Pass",
      "1 peptide protocol (Sermorelin or CJC/Ipamorelin)",
      "Monthly physician check-in",
      "Quarterly biomarker panel",
      "NAD+ IV once per quarter",
      "15% off all additional services",
    ],
  },
  {
    name: "Executive Concierge",
    standard: "$699/mo",
    founding: "$549/mo",
    popular: false,
    features: [
      "Everything in Longevity Protocol",
      "Full HRT/BHRT management included",
      "Unlimited IVs (up to 4/month)",
      "2 peptide protocols simultaneously",
      "Direct physician access during business hours",
      "Annual comprehensive longevity panel",
      "2 guest IV visits per quarter",
    ],
  },
];

const Membership = () => {
  const { openBooking } = useBooking();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>Membership | Réveil</title>
        <meta name="description" content="Réveil founding membership — lock in your rate forever. Wellness Pass $149/mo, Longevity Protocol $299/mo, Executive Concierge $549/mo. 25 spots per tier." />
        <link rel="canonical" href="https://reveil.health/membership" />
      </Helmet>
      <div className="min-h-screen">
        <Navbar />
        
        <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-background">
          <div className="container mx-auto px-6 lg:px-8 max-w-3xl text-center">
            <p className="section-label mb-6">Membership</p>
            <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl text-foreground mb-8 leading-tight">
              Medicine that compounds.<br />
              <span className="italic">The longer you're with us, the better you feel.</span>
            </h1>
          </div>
        </section>

        <div className="section-divider max-w-5xl mx-auto" />

        {/* Tiers */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`p-8 border ${tier.popular ? 'border-accent' : 'border-border/50'} relative`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-jost text-xs font-medium uppercase tracking-[2.5px] text-accent bg-background px-3">
                      Most Popular
                    </span>
                  )}
                  <h3 className="font-playfair text-xl text-foreground mb-2">{tier.name}</h3>
                  <p className="font-jost text-2xl font-medium text-accent mb-1">{tier.founding}</p>
                  <p className="font-jost text-sm text-muted-foreground line-through mb-6">{tier.standard}</p>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((f) => (
                      <li key={f} className="font-jost font-light text-sm text-foreground flex items-start gap-2">
                        <span className="text-accent mt-0.5">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={openBooking}
                    className="w-full bg-primary text-accent font-jost font-medium text-sm rounded-sm hover:bg-primary-light"
                  >
                    Claim your founding rate
                  </Button>
                </div>
              ))}
            </div>
            <p className="font-jost font-light text-sm text-muted-foreground text-center mt-12 max-w-2xl mx-auto">
              Founding member pricing locks in forever for the first 25 members per tier. 
              Once spots fill, pricing returns to standard rates.
            </p>
          </div>
        </section>

        <div className="section-divider max-w-5xl mx-auto" />

        <section className="py-16 md:py-24 bg-background text-center">
          <div className="container mx-auto px-6">
            <Button 
              onClick={openBooking}
              size="lg"
              className="bg-primary text-accent font-jost font-medium tracking-wide text-sm px-10 py-6 rounded-sm hover:bg-primary-light"
            >
              Claim your founding rate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Membership;