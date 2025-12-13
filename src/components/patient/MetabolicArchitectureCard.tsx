import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Activity, Brain, Flame, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MetabolicArchitectureCardProps {
  patientId: string;
  patientEmail: string;
  patientName: string;
  kitStatus?: string;
}

export const MetabolicArchitectureCard = ({
  patientId,
  patientEmail,
  patientName,
  kitStatus
}: MetabolicArchitectureCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-metabolic-checkout', {
        body: {
          email: patientEmail,
          name: patientName,
          patientId
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If kit already ordered, show status instead
  if (kitStatus && kitStatus !== 'not_ordered') {
    return (
      <Card className="relative overflow-hidden border-2 border-[#C5A059] bg-gradient-to-br from-amber-50/50 to-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C5A059]/10 to-transparent rounded-bl-full" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Metabolic Kit Ordered</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your Metabolic Architecture Kit is {kitStatus === 'ordered' ? 'being prepared' : 
            kitStatus === 'shipped' ? 'on its way' : 
            kitStatus === 'sample_received' ? 'being analyzed' : 'ready for review'}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-2 border-[#C5A059] bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 shadow-lg">
      {/* Premium Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold px-3 py-1 rounded-full">
        <Sparkles className="h-3 w-3" />
        PREMIUM ADD-ON
      </div>

      {/* Decorative corner */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-[#C5A059]/15 to-transparent rounded-br-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-[#C5A059]/10 to-transparent rounded-tl-full" />

      <CardHeader className="pt-8 pb-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-serif font-bold text-foreground tracking-tight">
            Stop Guessing. Start Engineering.
          </h3>
          <p className="text-lg font-medium text-[#C5A059]">
            The Metabolic Architecture Analysis ($599)
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have ever felt like you eat nothing but still gain weight, it's not in your head—it's in your biology. 
          Standard labs miss the hidden barriers to fat loss.
        </p>

        <div className="bg-gradient-to-r from-slate-50 to-amber-50/50 rounded-lg p-4 border border-[#C5A059]/20">
          <p className="text-sm font-medium text-foreground mb-3">
            This medical-grade, at-home analysis tests the <span className="text-[#C5A059] font-semibold">4 Engines of Metabolism</span> simultaneously:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Flame className="h-4 w-4 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Thyroid Performance</p>
                <p className="text-xs text-muted-foreground">Not just TSH, but the actual active hormones (Free T3/T4) and Antibodies that drive your burn rate.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Insulin Efficiency</p>
                <p className="text-xs text-muted-foreground">Determining if your body is storing energy instead of burning it (Insulin Resistance).</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Adrenal Stress</p>
                <p className="text-xs text-muted-foreground">4-point Cortisol rhythm to see if stress is locking down your fat stores.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Hormonal Fuel</p>
                <p className="text-xs text-muted-foreground">Testosterone and Sex Hormones that build muscle and drive energy.</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#B8934E] hover:to-[#C5A059] text-white font-semibold py-6 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Unlock My Metabolic Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
