import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Pill, RefreshCw, MessageSquare } from "lucide-react";

interface HormoneAddonSelectorProps {
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  currentTier?: string;
  baseMembership?: "metabolic" | "vitality" | null;
}

const ADDON_TIERS = [
  { value: "none", label: "None (GLP-1 Only)", price: 0, description: "No hormone add-on" },
  { value: "tier1", label: "Tier 1 - Single Hormone", price: 75, description: "Bi-Est, Testosterone, or Progesterone" },
  { value: "tier2", label: "Tier 2 - Dual Hormone", price: 125, description: "Two hormones (e.g., Bi-Est + Progesterone)" },
  { value: "tier3", label: "Tier 3 - Trifecta", price: 175, description: "All three: Bi-Est, Testosterone, Progesterone" },
];

const BASE_PRICES = {
  metabolic: 399,
  vitality: 199,
};

const HormoneAddonSelector = ({
  patientId,
  patientName,
  patientEmail,
  patientPhone,
  currentTier = "none",
  baseMembership = "metabolic",
}: HormoneAddonSelectorProps) => {
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [selectedMembership, setSelectedMembership] = useState<"metabolic" | "vitality">(baseMembership || "metabolic");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const selectedAddon = ADDON_TIERS.find(t => t.value === selectedTier);
  const basePrice = BASE_PRICES[selectedMembership];
  const addonPrice = selectedAddon?.price || 0;
  const totalMonthly = basePrice + addonPrice;

  const firstName = patientName.split(" ")[0] || patientName;

  const handleUpdateMembership = async () => {
    if (!patientEmail) {
      toast.error("Patient email required to update subscription");
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-addon", {
        body: {
          customer_email: patientEmail,
          addon_tier: selectedTier,
          patient_id: patientId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Membership updated! New total: ${data.monthly_total_formatted}`);
      } else {
        throw new Error(data?.error || "Failed to update subscription");
      }
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update membership");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendActivationSMS = async () => {
    if (!patientPhone) {
      toast.error("Patient phone number required to send SMS");
      return;
    }

    setIsSendingSMS(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-activation-sms", {
        body: {
          first_name: firstName,
          phone: patientPhone,
          base_membership: selectedMembership,
          addon_tier: selectedTier,
          patient_email: patientEmail,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Sent to HighLevel! SMS is on the way.");
      } else {
        throw new Error(data?.error || "Failed to send activation SMS");
      }
    } catch (err: any) {
      console.error("SMS send error:", err);
      toast.error(err.message || "Failed to send activation SMS");
    } finally {
      setIsSendingSMS(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Pill className="w-4 h-4" />
          Membership & Hormone Protocol Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Base Membership</label>
          <Select value={selectedMembership} onValueChange={(v: "metabolic" | "vitality") => setSelectedMembership(v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select membership" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="metabolic">
                <div className="flex items-center justify-between w-full">
                  <span>Metabolic Membership (GLP-1)</span>
                  <span className="text-muted-foreground ml-4">$399/mo</span>
                </div>
              </SelectItem>
              <SelectItem value="vitality">
                <div className="flex items-center justify-between w-full">
                  <span>Vitality Membership (HRT Only)</span>
                  <span className="text-muted-foreground ml-4">$199/mo</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Hormone Add-On Tier</label>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select hormone tier" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {ADDON_TIERS.map((tier) => (
                <SelectItem key={tier.value} value={tier.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{tier.label}</span>
                    <span className="text-muted-foreground ml-4">
                      {tier.price > 0 ? `+$${tier.price}/mo` : "No charge"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAddon && (
            <p className="text-xs text-muted-foreground mt-1">{selectedAddon.description}</p>
          )}
        </div>

        <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Monthly Bill Estimate</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {selectedMembership === "vitality" ? "Vitality Membership" : "Metabolic Membership"}
              </span>
              <span>${basePrice}</span>
            </div>
            {addonPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{selectedAddon?.label}</span>
                <span>+${addonPrice}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
              <span>Total Monthly</span>
              <span className="text-primary text-lg">${totalMonthly}/mo</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSendActivationSMS}
          disabled={isSendingSMS || !patientPhone}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {isSendingSMS ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4 mr-2" />
          )}
          {isSendingSMS ? "Sending..." : "Send Activation Link via SMS"}
        </Button>

        {!patientPhone && (
          <p className="text-xs text-center text-amber-600">
            Patient phone number not available. Cannot send SMS.
          </p>
        )}

        {patientEmail && (
          <Button
            onClick={handleUpdateMembership}
            disabled={isUpdating || selectedTier === currentTier}
            variant="outline"
            className="w-full"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isUpdating ? "Updating..." : "Update Existing Subscription"}
          </Button>
        )}

        {selectedTier === currentTier && patientEmail && (
          <p className="text-xs text-center text-muted-foreground">
            Select a different tier to update existing subscription
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HormoneAddonSelector;
