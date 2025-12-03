import { useState } from "react";
import { Package, Truck, FlaskConical, Calendar, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KitStatusAdminProps {
  paymentId: string;
  currentStatus: string;
  currentTrackingNumber?: string | null;
  patientEmail: string;
  onUpdate?: () => void;
}

const statusOptions = [
  { value: "not_ordered", label: "Not Ordered", icon: Package },
  { value: "ordered", label: "Order Confirmed", icon: Package },
  { value: "shipped", label: "Kit Shipped", icon: Truck },
  { value: "sample_received", label: "Sample Received", icon: FlaskConical },
  { value: "analyzing", label: "Analyzing Results", icon: FlaskConical },
  { value: "results_ready", label: "Results Ready", icon: Calendar },
];

const KitStatusAdmin = ({
  paymentId,
  currentStatus,
  currentTrackingNumber,
  patientEmail,
  onUpdate,
}: KitStatusAdminProps) => {
  const [status, setStatus] = useState(currentStatus || "not_ordered");
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, any> = {
        zrt_kit_status: status,
        tracking_number: trackingNumber || null,
      };

      // Add timestamps based on status changes
      if (status === "shipped" && currentStatus !== "shipped") {
        updates.shipped_at = new Date().toISOString();
      }
      if (status === "sample_received" && currentStatus !== "sample_received") {
        updates.sample_received_at = new Date().toISOString();
      }
      if (status === "results_ready" && currentStatus !== "results_ready") {
        updates.results_ready_at = new Date().toISOString();
        
        // Also update the patient's onboarding status to unlock booking
        const { data: payment } = await supabase
          .from("hormone_mapping_payments")
          .select("patient_id")
          .eq("id", paymentId)
          .single();

        if (payment?.patient_id) {
          await supabase
            .from("patients")
            .update({ onboarding_status: "labs_reviewed" })
            .eq("id", payment.patient_id);
        }
      }

      const { error } = await supabase
        .from("hormone_mapping_payments")
        .update(updates)
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Kit status updated successfully");
      onUpdate?.();
    } catch (error: any) {
      console.error("Error updating kit status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = status !== currentStatus || trackingNumber !== (currentTrackingNumber || "");

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="w-4 h-4" />
          Kit Tracking Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kit-status">Current Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="kit-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tracking-number">Tracking Number</Label>
          <Input
            id="tracking-number"
            placeholder="e.g., 1Z999AA10123456784"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Supports UPS, FedEx, and USPS tracking numbers
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}

        {status === "results_ready" && (
          <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
            ✓ Patient can now book their strategy call
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default KitStatusAdmin;
