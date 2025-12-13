import { CreditCard, Clock, CheckCircle2 } from "lucide-react";

const FinancingBanner = () => {
  return (
    <section className="py-8 bg-gradient-to-r from-[#F5E6D3]/50 via-background to-[#F5E6D3]/50 border-y border-gold/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
          {/* Headline */}
          <div className="text-center md:text-left">
            <p className="font-cormorant text-xl md:text-2xl text-foreground">
              Flexible Payment Plans Available
            </p>
            <p className="text-sm text-muted-foreground font-lato">
              Start treatment now, pay over time
            </p>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" />
              <span className="text-sm font-lato text-foreground">Pay in 4 interest-free</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              <span className="text-sm font-lato text-foreground">Approved in seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gold" />
              <span className="text-sm font-lato text-foreground">No impact on credit</span>
            </div>
          </div>

          {/* Logos */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-[#FFB3C7]/20 rounded-lg">
              <span className="font-bold text-sm text-[#E91E8A]">Klarna</span>
            </div>
            <div className="px-3 py-1.5 bg-[#0FA0EA]/10 rounded-lg">
              <span className="font-bold text-sm text-[#0FA0EA]">affirm</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancingBanner;
