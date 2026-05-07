import { useScrollReveal, revealClasses } from "@/hooks/useScrollReveal";

const steps = [
  {
    n: "01",
    title: "Wellness Assessment",
    body: "A 45-minute, in-clinic conversation with our RN to map your symptoms, history, and goals. $79.",
  },
  {
    n: "02",
    title: "Diagnostic Workup",
    body: "Targeted labs and, when indicated, our $250 Hormone Mapping Kit — interpreted by a physician, not an algorithm.",
  },
  {
    n: "03",
    title: "Personalized Protocol",
    body: "A treatment plan built around your biology — transdermal hormones, peptides, IV therapy, or weight loss medicine.",
  },
  {
    n: "04",
    title: "Ongoing Optimization",
    body: "Membership keeps you on protocol with unlimited visits, labs, and titration as your body changes.",
  },
];

const HowItWorksSection = () => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        <div className={`max-w-2xl mx-auto text-center mb-16 ${revealClasses.fadeUp(isVisible)}`}>
          <p className="section-label mb-4">How It Works</p>
          <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl text-foreground">
            Four steps to <span className="italic">feeling like yourself.</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`${revealClasses.fadeUp(isVisible)}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="border-t border-accent/40 pt-6">
                <p className="font-playfair italic text-accent text-2xl mb-3">{s.n}</p>
                <h3 className="font-playfair text-lg md:text-xl text-foreground mb-3 leading-snug">
                  {s.title}
                </h3>
                <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
