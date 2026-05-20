import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SlotPicker, { type SlotPickerHandle } from "@/components/booking/SlotPicker";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import BookingConfirmedCard from "@/components/booking/BookingConfirmedCard";

type IntakeData = {
  intake_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  screening_result: string;
};

type ConfirmedAppointment = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
};

const SafetyConsultBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intakeId = searchParams.get("intake_id") || "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedAppointment | null>(null);
  const slotPickerRef = useRef<SlotPickerHandle>(null);

  useEffect(() => {
    const bootstrap = async () => {
      if (!intakeId) {
        navigate("/book/iv", { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-iv-screening-status", {
          body: { intake_id: intakeId },
        });
        if (error) throw error;
        if (data?.screening_result !== "blocked") {
          navigate("/book/iv", { replace: true });
          return;
        }
        setIntake(data as IntakeData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load safety consult booking.");
        navigate("/book/iv", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [intakeId, navigate]);

  const handleConfirm = async ({ slot }: { slot: { slot_token: string; start: string } }) => {
    if (!intakeId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-consult-appointment", {
        body: {
          slot_token: slot.slot_token,
          safety_intake_id: intakeId,
        },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Could not book safety consult.");
      }
      if (data?.appointment) {
        setConfirmed({
          id: data.appointment.id,
          scheduled_at: data.appointment.scheduled_at,
          duration_minutes: data.appointment.duration_minutes || 30,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed.");
      await slotPickerRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-3xl flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {confirmed ? (
            <BookingConfirmedCard
              appointmentId={confirmed.id}
              serviceLabel="Safety Consultation"
              scheduledAt={confirmed.scheduled_at}
              durationMinutes={confirmed.duration_minutes}
              preVisitInstructions={[
                "Bring photo ID and any current medication list",
                "This consult is complimentary (no charge)",
                "Please arrive 10 minutes early",
              ]}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-playfair text-3xl">Book your free safety consultation</CardTitle>
                <CardDescription className="font-jost">
                  {intake?.first_name
                    ? `${intake.first_name}, choose a time for your complimentary 30-minute physician safety consult.`
                    : "Choose a time for your complimentary 30-minute physician safety consult."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border p-4 bg-muted/30 font-jost text-sm">
                  <p><strong>Name:</strong> {[intake?.first_name, intake?.last_name].filter(Boolean).join(" ") || "—"}</p>
                  <p><strong>Email:</strong> {intake?.email || "—"}</p>
                  <p><strong>Phone:</strong> {intake?.phone || "—"}</p>
                </div>

                <SlotPicker
                  ref={slotPickerRef}
                  serviceLine="consult"
                  durationMinutes={30}
                  onConfirm={handleConfirm}
                  confirmLabel={submitting ? "Booking..." : "Book Free Safety Consult"}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SafetyConsultBooking;
