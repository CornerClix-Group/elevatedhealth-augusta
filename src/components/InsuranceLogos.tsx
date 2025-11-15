import { Shield, Heart } from "lucide-react";

const InsuranceLogos = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-hope" />
            <h3 className="text-2xl font-light text-primary">Insurance Accepted</h3>
          </div>
          <p className="text-muted-foreground">
            We proudly accept the following insurance providers, with more coming soon
          </p>
        </div>

        {/* Insurance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center border-2 border-transparent hover:border-hope transition-all">
            <div className="text-3xl font-bold text-primary mb-2">BCBS</div>
            <div className="text-sm text-muted-foreground">Blue Cross Blue Shield</div>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-hope">
              <Heart className="w-3 h-3" />
              <span>Ketamine Therapy Covered</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center border-2 border-transparent hover:border-hope transition-all">
            <div className="text-3xl font-bold text-primary mb-2">TRICARE</div>
            <div className="text-sm text-muted-foreground">Military Health System</div>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-hope">
              <Heart className="w-3 h-3" />
              <span>Veterans & Active Duty</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center border-2 border-transparent hover:border-hope transition-all">
            <div className="text-3xl font-bold text-primary mb-2">VA</div>
            <div className="text-sm text-muted-foreground">Veterans Affairs</div>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-hope">
              <Heart className="w-3 h-3" />
              <span>Veterans Benefits</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground bg-accent/5 inline-block px-4 py-2 rounded-full">
            🎯 More insurance providers coming soon • Contact us to verify your coverage
          </p>
        </div>
      </div>
    </section>
  );
};

export default InsuranceLogos;
