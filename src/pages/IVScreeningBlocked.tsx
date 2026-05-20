import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertOctagon, Loader2, Phone } from "lucide-react";

const IVScreeningBlocked = () => {
  const { intake_id } = useParams<{ intake_id: string }>();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!intake_id) {
        setError("Missing intake id.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("get-iv-screening-status", {
          body: { intake_id },
        });
        if (invokeErr) throw invokeErr;
        setFirstName((data?.first_name as string) || "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load screening details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [intake_id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair text-3xl flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 text-destructive" />
                Let&apos;s make sure you&apos;re in good hands.
              </CardTitle>
              <CardDescription className="font-jost">
                Thanks for sharing your medical history. Based on what you told us, we&apos;d like one of our
                physicians to evaluate you in person before scheduling IV therapy. This is a routine safety step
                — it doesn&apos;t mean IV is off the table, just that we want to design the right plan for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="text-destructive">{error}</p>
              ) : (
                <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 font-jost">
                  We&apos;ve scheduled you for a complimentary 30-minute safety consultation with Dr. Akers.
                  No charge.
                </div>
              )}

              {firstName && <p className="font-jost text-sm text-muted-foreground">We&apos;ll take good care of you, {firstName}.</p>}

              <div className="grid sm:grid-cols-1 gap-3">
                <Button asChild>
                  <Link to={`/book/consult/safety?intake_id=${encodeURIComponent(intake_id || "")}`}>
                    Book My Free Safety Consult
                  </Link>
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Button asChild variant="outline">
                  <Link to="/book/iv">Return to services</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="tel:+17067603470">
                    <Phone className="w-4 h-4 mr-2" />
                    Call us instead: (706) 760-3470
                  </a>
                </Button>
              </div>

              <p className="font-jost text-sm text-muted-foreground text-center">
                A member of our team will also reach out within 1 business day to help you schedule, if you&apos;d prefer.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IVScreeningBlocked;
