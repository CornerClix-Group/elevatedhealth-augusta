import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ProviderAppointmentRoute = () => {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();

  useEffect(() => {
    let cancelled = false;

    const openAppointmentPatient = async () => {
      if (!appointmentId) {
        toast.error("Missing appointment id.");
        navigate("/provider/dashboard", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id")
        .eq("id", appointmentId)
        .single();

      if (cancelled) return;

      if (error || !data?.patient_id) {
        toast.error("Could not open appointment details.");
        navigate("/provider/dashboard", { replace: true });
        return;
      }

      navigate("/provider/dashboard", {
        replace: true,
        state: {
          openPatientId: data.patient_id,
          openTab: "schedule",
          appointmentId: data.id,
        },
      });
    };

    void openAppointmentPatient();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Opening appointment...
      </div>
    </div>
  );
};

export default ProviderAppointmentRoute;
