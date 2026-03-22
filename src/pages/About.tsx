import { Helmet } from "react-helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const About = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>About | Réveil</title>
        <meta name="description" content="Réveil was founded by a board-certified emergency medicine physician. Every protocol is physician-designed, physician-signed, physician-supervised. Evans, GA." />
        <link rel="canonical" href="https://reveil.health/about" />
      </Helmet>
      <div className="min-h-screen">
        <Navbar />
        
        <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-background">
          <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
            <p className="section-label mb-6">About Réveil</p>
            <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl text-foreground mb-10 leading-tight">
              Built by a physician who spent years watching patients suffer through what was preventable.
            </h1>
            <div className="space-y-6 font-jost font-light text-lg text-muted-foreground leading-relaxed">
              <p>
                Réveil was founded by a board-certified emergency medicine physician who spent years 
                watching patients cycle through the ER for conditions that were entirely preventable — 
                hormonal decline, severe pregnancy nausea, metabolic breakdown with nowhere to go.
              </p>
              <p>
                Réveil is what was built so you never have to end up there.
              </p>
              <p>
                Every protocol at Réveil is physician-designed. Every prescription is physician-signed. 
                Every patient is physician-supervised. Your RN is exceptional — and she works directly 
                under our physician's oversight on your individualized written order.
              </p>
              <p>
                This is the difference between a spa and a clinic. Between an app and a physician. 
                Between feeling okay and feeling like yourself again.
              </p>
            </div>
          </div>
        </section>

        <div className="section-divider max-w-3xl mx-auto" />

        {/* Credibility */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-xs font-jost font-medium tracking-[2.5px] uppercase text-center">
              <span>Board-Certified Emergency Medicine</span>
              <span className="text-accent/40">·</span>
              <span>Evans Town Center</span>
              <span className="text-accent/40">·</span>
              <span>Physician-Owned</span>
              <span className="text-accent/40">·</span>
              <span>Physician-Supervised</span>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default About;