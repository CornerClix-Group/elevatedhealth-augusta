import { Helmet } from "react-helmet";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { SITE_CONFIG } from "@/lib/siteConfig";
import { isServiceActive } from "@/lib/serviceConfig";

// Display values — actual charges flow through Stripe via
// create-consultation-checkout ($79) and the membership product.
const PRICE_CONSULT = "$79";
const PRICE_PANEL_PEPTIDE = "$245";
const PRICE_PANEL_PEPTIDE_MEMBER = "$195";
const PRICE_MEMBERSHIP = "$199";

type Peptide = {
  name: string;
  desc: string;
  bestFor: string;
  price: string;
  group: "Recovery" | "Performance" | "Longevity" | "Cognitive" | "Sexual Wellness";
  note?: string;
};

const allPeptides: Peptide[] = [
  // Recovery
  { name: "BPC-157", desc: "Gut healing and soft-tissue repair signaling.", bestFor: "GI repair · post-injury", price: "$179–229/mo", group: "Recovery" },
  { name: "TB-500 (Thymosin Beta-4)", desc: "Connective tissue and muscle recovery.", bestFor: "Tendon, ligament, muscle", price: "$249–299/mo", group: "Recovery" },
  { name: "GHK-Cu", desc: "Skin, hair, and collagen synthesis support.", bestFor: "Skin · hair · collagen", price: "$149–179/mo", group: "Recovery" },
  // Performance
  { name: "CJC-1295 / Ipamorelin", desc: "Amplifies natural GH peaks for performance and recovery.", bestFor: "Fat loss · recovery", price: "$249–299/mo", group: "Performance" },
  { name: "Sermorelin", desc: "GH precursor — sleep, energy, body composition.", bestFor: "Sleep · energy · body comp", price: "$199–249/mo", group: "Performance" },
  // Longevity
  { name: "NAD+ (IV)", desc: "Cellular energy and cognition. Administered at the IV Lounge.", bestFor: "Longevity · clarity", price: "$299–399/infusion", group: "Longevity", note: "Routes to /iv-lounge" },
  { name: "NAD+ (Subcutaneous)", desc: "Take-home daily microdose for sustained NAD+ support.", bestFor: "Longevity · home protocol", price: "$249–299/mo", group: "Longevity" },
  { name: "Thymosin Alpha-1", desc: "Immune modulation and resilience.", bestFor: "Immune · post-illness", price: "$199–249/mo", group: "Longevity" },
  // Cognitive
  { name: "Selank", desc: "Focus, cognition, and gentle anxiolytic effect. Sublingual.", bestFor: "Focus · stress", price: "$179–229/mo", group: "Cognitive" },
];

const sexualWellnessPeptides: Peptide[] = [
  { name: "PT-141 (Bremelanotide)", desc: "Sexual response support — for men and women.", bestFor: "Libido · desire", price: "$149–199/mo", group: "Sexual Wellness" },
];

const peptides: Peptide[] = [
  ...allPeptides,
  ...(isServiceActive("sexualWellness") ? sexualWellnessPeptides : []),
];

const groupOrder: Peptide["group"][] = ["Recovery", "Performance", "Longevity", "Cognitive", "Sexual Wellness"];

const symptoms = [
  "Slow recovery from training", "Age-related decline", "Sleep disruption",
  "Stubborn body composition", "Libido changes", "Immune dysregulation",
  "Post-injury rehab", "Cognitive dulling", "Skin, hair, connective tissue concerns",
];

const steps = [
  { n: "01", t: `Wellness Assessment (${PRICE_CONSULT})`, d: "Meet your physician. Walk through goals, history, training load. About 45 minutes." },
  { n: "02", t: "Targeted Lab Panel", d: `Hormone or weight panel depending on your goal — typically ${PRICE_PANEL_PEPTIDE}–$345 / ${PRICE_PANEL_PEPTIDE_MEMBER}–$295 members.` },
  { n: "03", t: "Custom Protocol", d: "Physician selects your peptide(s), dose, and frequency. Compounded by FCC and shipped to your door." },
  { n: "04", t: "Self-Administer or In-Clinic", d: "Most peptides are subcutaneous self-injection — we train you in 15 minutes. Or come in weekly with membership." },
];

const faqs = [
  { q: "Are peptides FDA-approved?", a: "Some are; many are compounded under 503A authority for specific patients. Compounded does not mean unregulated — it means custom-made under pharmaceutical compounding standards." },
  { q: "Can I get peptides cheaper online?", a: "Yes — but those are generally research-grade with no physician oversight, no labs, and unknown source. We're not competing on price. We're offering medical safety." },
  { q: "How are they administered?", a: "Most are subcutaneous self-injection at home, weekly or daily depending on the peptide. Some are IV (NAD+ at our IV Lounge), some sublingual (Selank), some topical (GHK-Cu in creams)." },
  { q: "How long until I notice results?", a: "Sleep and recovery peptides: 1–2 weeks. Body-composition peptides: 4–12 weeks. Longevity peptides are hard to subjectively measure — we monitor labs." },
  { q: "Do peptides have side effects?", a: "Generally well-tolerated. Specific peptides have specific considerations your physician will review with you before prescribing." },
  { q: "Can I stack peptides?", a: "Yes — common stacks include CJC/Ipamorelin + BPC-157 for recovery, or Sermorelin + GHK-Cu for general optimization. Your physician designs your stack." },
];

const PeptideTherapy = () => {
  const { openBooking } = useBooking();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>Peptide Therapy Augusta GA | Physician-Supervised Protocols — Elevated Health</title>
        <meta name="description" content="Physician-prescribed, custom-compounded peptide protocols in Augusta, GA. BPC-157, CJC/Ipamorelin, NAD+, GHK-Cu and more. Lab-monitored, shipped to your door." />
        <link rel="canonical" href="https://elevatedhealthaugusta.com/peptides" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main>
          {/* 1. Hero (Pattern A) */}
          <section className="min-h-[70vh] flex items-center bg-muted/30">
            <div className="container mx-auto px-6 lg:px-8 max-w-4xl py-24">
              <p className="section-label mb-6">Peptide Protocols</p>
              <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl text-foreground mb-8 leading-tight">
                Targeted regeneration.<br /><span className="italic">The science of optimization.</span>
              </h1>
              <p className="font-jost font-light text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
                Custom peptide protocols compounded for you. Recovery, cognition, longevity, body composition — physician-supervised, lab-monitored, shipped to your door.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={openBooking} size="lg" className="font-jost tracking-wide">
                  Book your {PRICE_CONSULT} consultation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button asChild variant="link" size="lg" className="font-jost tracking-wide text-foreground">
                  <a href="#menu">Explore the menu ↓</a>
                </Button>
              </div>
            </div>
          </section>

          {/* 2. Pricing Strip (Pattern B) */}
          <section className="py-16 md:py-20 bg-background border-y border-border">
            <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
              <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                {[
                  { l: "Initial Consultation", p: PRICE_CONSULT, sub: "credited toward your protocol" },
                  { l: "Peptide Lab Panel", p: `from ${PRICE_PANEL_PEPTIDE}`, sub: `members from ${PRICE_PANEL_PEPTIDE_MEMBER}` },
                  { l: "Elevated Membership", p: `${PRICE_MEMBERSHIP}/mo`, sub: "supplies, weekly visits, member labs" },
                ].map((c) => (
                  <div key={c.l} className="px-6 py-8 md:py-4 text-center">
                    <p className="section-label mb-3">{c.l}</p>
                    <p className="font-playfair text-3xl md:text-4xl text-foreground mb-2">{c.p}</p>
                    <p className="font-jost text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. What it is (Pattern C) */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
              <div className="grid md:grid-cols-12 gap-12 items-center">
                <div className="md:col-span-5">
                  <div className="aspect-[4/5] bg-muted/40 flex items-center justify-center text-muted-foreground/40 font-jost text-xs tracking-widest uppercase">
                    {/* TODO: editorial photograph — vials / compounding pharmacy */}
                    Editorial Image
                  </div>
                </div>
                <div className="md:col-span-7">
                  <p className="section-label mb-4">What it is</p>
                  <h2 className="font-playfair italic text-4xl md:text-5xl text-foreground mb-8">
                    Compounded peptides, custom-dosed.
                  </h2>
                  <div className="space-y-5 font-jost font-light text-lg text-muted-foreground leading-relaxed">
                    <p>Most peptides aren't FDA-approved manufactured pharmaceuticals — they're compounded by 503A pharmacies specifically for the prescribing physician's patient.</p>
                    <p>Our partner is FCC, a 503A pharmacy in Texas. They compound and ship your protocol directly to your door — refrigerated and labeled for you. Patient-specific 503A compliance, no generic batches.</p>
                    <p>Why this matters: peptide quality varies wildly in the gray-market space — research-grade kits, telehealth subscription brands of unknown origin. FCC's compounds are prescribed by a physician, monitored with labs, and held to pharmaceutical compounding standards.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. How it works (Pattern D) */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
              <div className="text-center mb-16">
                <p className="section-label mb-4">How It Works</p>
                <h2 className="font-playfair text-4xl md:text-5xl text-foreground">Four steps. <span className="italic">No surprises.</span></h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {steps.map((s) => (
                  <div key={s.n}>
                    <p className="font-playfair italic text-4xl text-accent mb-4">{s.n}</p>
                    <h3 className="font-playfair text-xl text-foreground mb-3">{s.t}</h3>
                    <p className="font-jost font-light text-muted-foreground leading-relaxed text-sm">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Peptide Menu */}
          <section id="menu" className="py-20 md:py-28 bg-background scroll-mt-24">
            <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
              <p className="section-label mb-4">The Menu</p>
              <h2 className="font-playfair text-3xl md:text-4xl text-foreground mb-12">
                A formulary <span className="italic">tuned to you</span>.
              </h2>

              {groupOrder.map((group) => {
                const items = peptides.filter((p) => p.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-14 last:mb-0">
                    <p className="section-label mb-6">{group}</p>
                    <div className="grid md:grid-cols-2 gap-x-12">
                      {items.map((p) => (
                        <div key={p.name} className="py-6 border-b border-border/60">
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <h3 className="font-playfair italic text-xl text-foreground">{p.name}</h3>
                            <span className="font-jost font-medium text-accent text-sm shrink-0">{p.price}</span>
                          </div>
                          <p className="font-jost font-light text-muted-foreground text-sm leading-relaxed mb-2">{p.desc}</p>
                          <p className="font-jost text-xs uppercase tracking-widest text-muted-foreground/70">{p.bestFor}</p>
                          {p.note && <p className="font-jost text-xs italic text-accent mt-1">{p.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. Who it's for */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
              <p className="section-label mb-4">Who It's For</p>
              <h2 className="font-playfair text-3xl md:text-4xl text-foreground mb-10">
                If you're experiencing<span className="italic">…</span>
              </h2>
              <ul className="grid sm:grid-cols-2 gap-4">
                {symptoms.map((s) => (
                  <li key={s} className="font-jost font-light text-foreground text-lg flex items-start gap-3">
                    <span className="text-accent mt-1.5 text-sm">—</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 7. Pricing transparency (Pattern E) */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
              <p className="section-label mb-4">Pricing</p>
              <h2 className="font-playfair text-3xl md:text-4xl text-foreground mb-10">Transparent <span className="italic">all the way through</span>.</h2>

              <div className="space-y-10">
                <div>
                  <p className="section-label mb-4">One-time</p>
                  <div className="space-y-3 font-jost text-foreground">
                    <div className="flex justify-between border-b border-border/60 pb-3"><span>Initial Wellness Assessment</span><span className="font-medium">{PRICE_CONSULT}</span></div>
                    <div className="flex justify-between border-b border-border/60 pb-3"><span>Peptide Lab Panel<br /><span className="font-light text-sm text-muted-foreground">depends on which markers your physician orders</span></span><span className="font-medium whitespace-nowrap">{PRICE_PANEL_PEPTIDE}–$345 / Member {PRICE_PANEL_PEPTIDE_MEMBER}–$295</span></div>
                  </div>
                </div>

                <div>
                  <p className="section-label mb-4">Ongoing (if you proceed)</p>
                  <div className="space-y-3 font-jost text-foreground">
                    <div className="flex justify-between border-b border-border/60 pb-3">
                      <span>Elevated Membership<br /><span className="font-light text-sm text-muted-foreground">weekly visits, supplies, member-rate labs</span></span>
                      <span className="font-medium whitespace-nowrap">{PRICE_MEMBERSHIP}/mo</span>
                    </div>
                    <div className="flex justify-between border-b border-border/60 pb-3">
                      <span>Compounded peptide(s)<br /><span className="font-light text-sm text-muted-foreground">billed separately by FCC, per peptide</span></span>
                      <span className="font-medium whitespace-nowrap">$150–300/mo each</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border p-6 space-y-2 font-jost text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Typical first month (consult + labs + first month membership)</span><span className="font-medium text-foreground">~$523–723 / $473–623 members</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Typical ongoing month (membership + 1–2 peptides)</span><span className="font-medium text-foreground">~$350–500/mo</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. FAQ (Pattern F) */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
              <p className="section-label mb-4">FAQ</p>
              <h2 className="font-playfair text-3xl md:text-4xl text-foreground mb-10">Questions, <span className="italic">answered</span>.</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left font-playfair text-lg text-foreground">{f.q}</AccordionTrigger>
                    <AccordionContent className="font-jost font-light text-muted-foreground text-base leading-relaxed">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* 9. Closing CTA (Pattern G) */}
          <section className="py-24 md:py-32 bg-background text-center">
            <div className="container mx-auto px-6 max-w-2xl">
              <h2 className="font-playfair text-4xl md:text-5xl text-foreground mb-8">
                Build the protocol your <span className="italic">body deserves</span>.
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={openBooking} size="lg" className="font-jost tracking-wide">
                  Book your {PRICE_CONSULT} consultation
                </Button>
                <Button asChild variant="outline" size="lg" className="font-jost tracking-wide">
                  <a href={`tel:${SITE_CONFIG.phoneRaw}`}>Or call {SITE_CONFIG.phone}</a>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PeptideTherapy;
