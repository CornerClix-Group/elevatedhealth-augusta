import { Helmet } from "react-helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const About = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>About | Elevated Health Augusta</title>
        <meta name="description" content="Elevated Health Augusta was built by a team of physicians and nurses with experience across emergency medicine and physical medicine & rehabilitation. Evans, GA." />
        <link rel="canonical" href="https://elevatedhealthaugusta.com/about" />
      </Helmet>
      <div className="min-h-screen">
        <Navbar />
        
        <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-background">
          <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
            <p className="section-label mb-6">About Elevated Health Augusta</p>
            <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl text-foreground mb-10 leading-tight">
              Built by a team that spent years watching patients suffer through what was preventable.
            </h1>
            <div className="space-y-6 font-jost font-light text-lg text-muted-foreground leading-relaxed">
              <p>
                Elevated Health Augusta was founded by a team of physicians and nurses with deep experience across 
                emergency medicine and physical medicine &amp; rehabilitation. After years of watching 
                patients cycle through the ER for conditions that were entirely preventable — 
                hormonal decline, severe pregnancy nausea, metabolic breakdown — they built 
                something better.
              </p>
              <p>
                
              </p>
              <p>
                Every protocol at Elevated Health Augusta is physician-designed. Every prescription is physician-signed. 
                Every patient is physician-supervised. Our clinical team works together — physicians 
                and nurses — under direct medical oversight on your individualized care plan.
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
              <span>Board-Certified Physicians</span>
              <span className="text-accent/40">·</span>
              <span>Evans Town Center</span>
              <span className="text-accent/40">·</span>
              <span>Physician-Led Team</span>
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