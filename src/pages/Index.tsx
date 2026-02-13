import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FinancingBanner from "@/components/FinancingBanner";
import OurTreatments from "@/components/OurTreatments";
import MissionStatement from "@/components/MissionStatement";
import NotReadyToBook from "@/components/NotReadyToBook";
import WhyUsCompare from "@/components/WhyUsCompare";
import InsuranceLogos from "@/components/InsuranceLogos";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SEOSchema from "@/components/SEOSchema";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AssistantHub from "@/components/AssistantHub";
import { FloatingMobileCTA } from "@/components/FloatingMobileCTA";
import { FloatingMobileChatCTA } from "@/components/FloatingMobileChatCTA";
import CacheRefreshBanner from "@/components/CacheRefreshBanner";

const Index = () => {
  return (
    <div className="min-h-screen">
      <CacheRefreshBanner />
      <SEOSchema />
      <Navbar />
      <main>
        <Hero />
        <FinancingBanner />
        <MissionStatement />
        <OurTreatments />
        <div className="container mx-auto px-4 py-12">
          <NotReadyToBook />
        </div>
        <WhyUsCompare />
        <InsuranceLogos />
        <Contact />
      </main>
      <Footer />
      <AssistantHub />
      <FloatingMobileCTA />
      <FloatingMobileChatCTA />
      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
