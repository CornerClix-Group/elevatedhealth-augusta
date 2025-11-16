import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Shield, 
  Zap, 
  Activity, 
  Calendar,
  Phone,
  ClipboardList,
  Users,
  TestTube,
  UserCheck,
  TrendingUp,
  Heart,
  Dumbbell,
  Target
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_CONFIG } from "@/lib/siteConfig";
import providerPortrait from "@/assets/provider-portrait.jpg";
import { Helmet } from "react-helmet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HRTQuizModal } from "@/components/HRTQuizModal";
import { Link } from "react-router-dom";

const HormonesMen = () => {
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const symptoms = [
    "Persistent fatigue and low energy",
    "Decreased sex drive and erectile dysfunction",
    "Loss of muscle mass and strength",
    "Unexplained weight gain (especially belly fat)",
    "Mood changes, irritability, and depression",
    "Poor focus and mental fog",
    "Decreased motivation and drive",
    "Poor sleep quality and insomnia"
  ];

  const howItWorks = [
    {
      step: 1,
      icon: ClipboardList,
      title: "Complete Your Evaluation",
      description: "Fill out our comprehensive men's health assessment"
    },
    {
      step: 2,
      icon: TestTube,
      title: "Lab Testing",
      description: "Complete hormone panel including total/free testosterone, estradiol, thyroid"
    },
    {
      step: 3,
      icon: UserCheck,
      title: "Expert Consultation",
      description: "Review results and create your personalized testosterone therapy plan"
    },
    {
      step: 4,
      icon: TrendingUp,
      title: "Treatment & Optimization",
      description: "Begin therapy with regular monitoring and dose optimization"
    }
  ];

  const treatmentOptions = [
    {
      title: "Testosterone Injections",
      description: "Weekly or bi-weekly injections for steady hormone levels and optimal results"
    },
    {
      title: "Testosterone Pellets",
      description: "Long-lasting pellet therapy with consistent levels for 4-6 months"
    },
    {
      title: "HCG Therapy",
      description: "Preserve fertility and natural testosterone production alongside TRT"
    },
    {
      title: "Thyroid Optimization",
      description: "Enhance energy, metabolism, and mental clarity with thyroid support"
    },
    {
      title: "Estrogen Management",
      description: "Control estrogen levels to maximize testosterone benefits"
    },
    {
      title: "Performance Peptides",
      description: "Advanced peptide therapies for muscle growth, recovery, and anti-aging"
    }
  ];

  const faqs = [
    {
      q: "What is testosterone replacement therapy (TRT)?",
      a: "TRT is a medically supervised treatment that restores testosterone levels to a healthy, youthful range. It's designed for men with clinically low testosterone who are experiencing symptoms like fatigue, low libido, weight gain, and decreased muscle mass."
    },
    {
      q: "How do I know if I need TRT?",
      a: "If you're experiencing symptoms of low testosterone—like persistent fatigue, low sex drive, difficulty building muscle, weight gain, or mood changes—you may benefit from TRT. We'll confirm with comprehensive lab testing and a clinical evaluation."
    },
    {
      q: "How long before I see results from TRT?",
      a: "Many men notice improvements in energy and mood within 3-4 weeks. Sexual function and muscle mass improvements typically occur over 8-12 weeks. Full optimization usually takes 3-6 months with proper dosing."
    },
    {
      q: "Are testosterone injections better than pellets?",
      a: "Both have advantages. Injections offer flexibility and steady levels with weekly dosing. Pellets provide consistent testosterone for months without weekly administration. We'll help you choose based on your lifestyle and preferences."
    },
    {
      q: "Is TRT safe for men?",
      a: "When properly prescribed and monitored by a qualified provider, TRT is safe and effective. We monitor your blood work regularly, manage any side effects, and adjust treatment to optimize results while minimizing risks."
    },
    {
      q: "Will TRT help with weight loss and muscle gain?",
      a: "Optimized testosterone levels support healthy body composition by increasing muscle mass and reducing fat, especially abdominal fat. Combined with proper nutrition and exercise, TRT can significantly improve physique and performance."
    }
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": "Elevated Health Augusta - Men's Testosterone Therapy",
    "image": "https://elevatedhealthaugusta.com/og-image.jpg",
    "description": "Men's testosterone replacement therapy in Augusta, GA. TRT clinic for low testosterone treatment. Expert hormone optimization from board-certified providers.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": SITE_CONFIG.address.line1,
      "addressLocality": "Evans",
      "addressRegion": "GA",
      "postalCode": "30809",
      "addressCountry": "US"
    },
    "telephone": SITE_CONFIG.phone,
    "priceRange": "$149-$699",
    "medicalSpecialty": "Endocrinology",
    "availableService": [
      {
        "@type": "MedicalTherapy",
        "name": "Testosterone Replacement Therapy",
        "description": "TRT for men with low testosterone"
      },
      {
        "@type": "MedicalTest",
        "name": "Comprehensive Male Hormone Testing",
        "description": "Complete hormone panel for men"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Testosterone Therapy Augusta | TRT Clinic GA - Elevated Health</title>
        <meta name="description" content="Men's testosterone replacement therapy in Augusta, GA. Expert TRT clinic for low testosterone treatment. Restore energy, strength, and drive. Board-certified care starting at $149/month." />
        <meta name="keywords" content="testosterone therapy Augusta, TRT clinic Augusta, men's hormone therapy GA, low testosterone treatment Augusta, men's health optimization, male hormone testing" />
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <Navbar />
        
        <main>
          {/* Gender Toggle */}
          <div className="bg-card border-b sticky top-16 z-40">
            <div className="container mx-auto px-4 py-3">
              <div className="flex justify-center gap-4">
                <Button
                  asChild
                  variant="outline"
                  className="border-2"
                >
                  <Link to="/hormones-women">
                    <Heart className="mr-2 h-4 w-4" />
                    For Women
                  </Link>
                </Button>
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary-light text-primary-foreground"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  For Men
                </Button>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary-dark/5">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="max-w-5xl mx-auto text-center">
                <div className="mb-8 animate-fade-in-up">
                  <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full">
                    <Shield className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-bold text-primary">Elevated Health</span>
                  </div>
                  <div className="text-lg font-semibold text-primary mt-2">Men's Hormone Optimization</div>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up leading-tight" style={{ animationDelay: "0.1s" }}>
                  Take Your Strength,<br />Drive, and Energy Back
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-10 animate-fade-in-up max-w-3xl mx-auto" style={{ animationDelay: "0.2s" }}>
                  Expert testosterone replacement therapy and men's hormone optimization in Augusta. Reclaim your performance, vitality, and confidence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <Button
                    onClick={() => setIsQuizOpen(true)}
                    size="lg"
                    className="bg-primary hover:bg-primary-light text-primary-foreground text-base md:text-lg px-8 py-6 shadow-lg w-full sm:w-auto"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Start Your Evaluation
                  </Button>
                  <Button
                    onClick={scrollToBooking}
                    variant="outline"
                    size="lg"
                    className="text-base md:text-lg px-8 py-6 border-2 border-primary hover:bg-primary hover:text-primary-foreground w-full sm:w-auto"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule a Consult
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Symptoms of Low T */}
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Symptoms of Low Testosterone
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Low testosterone affects more than just your sex drive. It impacts your entire quality of life.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {symptoms.map((symptom, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex gap-4 items-center">
                          <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                          <span className="text-base leading-relaxed">{symptom}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* How TRT Works */}
          <section className="py-16 md:py-24 bg-primary/5">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    How TRT & Men's HRT Works
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    A straightforward, evidence-based approach to restoring your hormonal health.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {howItWorks.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Card key={index} className="text-center hover:shadow-lg transition-all hover:-translate-y-1 border-primary/20">
                        <CardContent className="p-6">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                            <Icon className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-2xl font-bold text-primary mb-2">Step {item.step}</div>
                          <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Treatment Options */}
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Men's Hormone Treatment Options
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Customized testosterone and hormone therapy tailored to your goals and lifestyle.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {treatmentOptions.map((option, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow border-primary/20">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg mb-3 text-primary">{option.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-16 md:py-24 bg-primary/5">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Transparent TRT Pricing
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Straightforward pricing for quality testosterone therapy.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="hover:shadow-xl transition-shadow border-primary/30">
                    <CardContent className="p-8 text-center">
                      <h3 className="text-xl font-bold mb-2">Consultation</h3>
                      <div className="text-4xl font-bold text-primary mb-4">Free</div>
                      <p className="text-sm text-muted-foreground mb-6">Initial evaluation and planning</p>
                      <Button 
                        onClick={() => setIsQuizOpen(true)}
                        variant="outline" 
                        className="w-full border-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-xl transition-shadow border-2 border-primary shadow-lg relative">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                    <CardContent className="p-8 text-center">
                      <h3 className="text-xl font-bold mb-2">TRT Program</h3>
                      <div className="text-4xl font-bold text-primary mb-4">$149</div>
                      <p className="text-sm text-muted-foreground mb-6">Per month + medication</p>
                      <Button 
                        onClick={scrollToBooking}
                        className="w-full bg-primary hover:bg-primary-light text-primary-foreground"
                      >
                        Book Now
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-xl transition-shadow border-primary/30">
                    <CardContent className="p-8 text-center">
                      <h3 className="text-xl font-bold mb-2">Testosterone Pellets</h3>
                      <div className="text-4xl font-bold text-primary mb-4">$650</div>
                      <p className="text-sm text-muted-foreground mb-6">Per insertion (4-6 months)</p>
                      <Button 
                        onClick={scrollToBooking}
                        variant="outline" 
                        className="w-full border-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Learn More
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-8">
                  * Lab testing billed separately unless included in program. Insurance may cover labs.
                </p>
              </div>
            </div>
          </section>

          {/* Provider Section */}
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="relative h-[500px] rounded-lg overflow-hidden shadow-xl">
                    <img 
                      src={providerPortrait} 
                      alt="Lauren Bursey, NP-C" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                      Expert Men's Hormone Therapy
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      Our board-certified nurse practitioner specializes in men's hormone optimization and testosterone replacement therapy, helping men reclaim their strength and vitality.
                    </p>
                    <ul className="space-y-4 mb-8">
                      <li className="flex gap-3 items-start">
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <span>Specialized training in testosterone therapy and men's health</span>
                      </li>
                      <li className="flex gap-3 items-start">
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <span>Evidence-based protocols for optimal hormone optimization</span>
                      </li>
                      <li className="flex gap-3 items-start">
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <span>Personalized approach focused on your performance goals</span>
                      </li>
                    </ul>
                    <Button
                      onClick={scrollToBooking}
                      size="lg"
                      className="bg-primary hover:bg-primary-light text-primary-foreground"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Schedule Your Consult
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-16 md:py-24 bg-primary/5">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Men's TRT FAQ
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Your questions about testosterone therapy, answered.
                  </p>
                </div>
                
                <Accordion type="single" collapsible className="space-y-4">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6 bg-card">
                      <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline py-6 hover:text-primary">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-6">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* Final CTA / Booking */}
          <section id="booking-section" className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary-dark/5">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-6">
                    <Shield className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-bold text-primary">Elevated Health</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                    Ready to Reclaim Your Edge?
                  </h2>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                    Take the first step toward optimal testosterone levels and peak performance. Our expert team is ready to help you succeed.
                  </p>
                </div>

                <Card className="shadow-2xl overflow-hidden">
                  <CardContent className="p-8 md:p-12">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-6 text-center">Schedule Your Free Consultation</h3>
                      <div className="w-full h-[600px] rounded-lg overflow-hidden">
                        <iframe 
                          src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1hhrEVpqc7nipsCg8QbgW72gW8vbl-SnUXT-LL4z4zFT1w8jTUBr5cfiruiNd47uu28seod93b?gv=true"
                          className="w-full h-full border-0"
                          title="Book Men's Hormone Consultation"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-8">
                      <p className="text-center text-lg mb-6 font-semibold">
                        Prefer to speak with us directly?
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                          asChild
                          size="lg"
                          className="bg-primary hover:bg-primary-light text-primary-foreground text-lg px-8 py-6 w-full sm:w-auto"
                        >
                          <a href={`tel:${SITE_CONFIG.phoneRaw}`}>
                            <Phone className="mr-2 h-5 w-5" />
                            Call Now — {SITE_CONFIG.phone}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <HRTQuizModal isOpen={isQuizOpen} onClose={() => setIsQuizOpen(false)} />
      </div>
    </>
  );
};

export default HormonesMen;