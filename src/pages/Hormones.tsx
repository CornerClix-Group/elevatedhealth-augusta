import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import elevatedForHerLogo from "@/assets/elevated-for-her-logo.png";
import elevatedForHimLogo from "@/assets/elevated-for-him-logo.png";

const Hormones = () => {
  return (
    <>
      <Helmet>
        <title>Hormone Replacement Therapy Augusta | BHRT for Men & Women - Elevated Health</title>
        <meta name="description" content="Bioidentical hormone replacement therapy in Augusta, GA. Specialized treatment for men and women. Expert care for testosterone therapy, menopause, and hormone optimization." />
        <meta name="keywords" content="hormone replacement Augusta, BHRT Augusta GA, testosterone therapy, menopause treatment, hormone optimization Augusta" />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main>
          {/* Hero Section */}
          <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center mb-16">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up leading-tight">
                  Hormone Replacement<br />Therapy in Augusta
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                  Personalized bioidentical hormone therapy for men and women.<br />
                  Restore balance, energy, and vitality.
                </p>
              </div>

              {/* Gender Selection Cards */}
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                {/* Women's HRT Card */}
                <Link to="/hormones-women">
                  <Card className="h-full hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer border-2 border-feminine/30 hover:border-feminine group">
                    <CardContent className="p-10 text-center">
                      <div className="mb-6">
                        <img 
                          src={elevatedForHerLogo} 
                          alt="Elevated+ for Her" 
                          className="h-24 mx-auto mb-4"
                        />
                      </div>
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-feminine/10 group-hover:bg-feminine/20 transition-colors mb-6">
                        <Heart className="h-10 w-10 text-feminine" />
                      </div>
                      <h2 className="text-3xl font-bold mb-4 group-hover:text-feminine transition-colors">
                        For Women
                      </h2>
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                        Bioidentical HRT for menopause, perimenopause, and hormone imbalance. Reclaim your energy and feel like yourself again.
                      </p>
                      <div className="space-y-2 text-sm text-muted-foreground mb-6">
                        <p>✓ Hot flash relief</p>
                        <p>✓ Mood & sleep support</p>
                        <p>✓ Energy restoration</p>
                        <p>✓ Expert women's care</p>
                      </div>
                      <Button 
                        className="w-full bg-feminine hover:bg-feminine-light text-feminine-foreground text-lg py-6"
                      >
                        Explore Women's HRT
                      </Button>
                    </CardContent>
                  </Card>
                </Link>

                {/* Men's TRT Card */}
                <Link to="/hormones-men">
                  <Card className="h-full hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer border-2 border-primary/30 hover:border-primary group">
                    <CardContent className="p-10 text-center">
                      <div className="mb-6">
                        <img 
                          src={elevatedForHimLogo} 
                          alt="Elevated+ for Him" 
                          className="h-24 mx-auto"
                        />
                      </div>
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-6">
                        <Shield className="h-10 w-10 text-primary" />
                      </div>
                      <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                        For Men
                      </h2>
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                        Testosterone replacement therapy and hormone optimization. Restore your strength, drive, and performance.
                      </p>
                      <div className="space-y-2 text-sm text-muted-foreground mb-6">
                        <p>✓ Low testosterone treatment</p>
                        <p>✓ Energy & strength boost</p>
                        <p>✓ Performance optimization</p>
                        <p>✓ Expert men's health</p>
                      </div>
                      <Button 
                        className="w-full bg-primary hover:bg-primary-light text-primary-foreground text-lg py-6"
                      >
                        Explore Men's TRT
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground">
                  Board-certified care • Personalized treatment plans • Comprehensive lab testing
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Hormones;
