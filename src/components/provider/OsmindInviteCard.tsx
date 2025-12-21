import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink, Check, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface OsmindInviteCardProps {
  patientId: string;
  patientName: string;
  patientEmail: string;
  consentSentAt: string | null;
  consentCompletedAt: string | null;
  consentMethod: string | null;
  onUpdate?: () => void;
}

const OSMIND_URL = "https://app.osmind.org";

const OsmindInviteCard = ({
  patientId,
  patientName,
  patientEmail,
  consentSentAt,
  consentCompletedAt,
  consentMethod,
  onUpdate,
}: OsmindInviteCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkInviteSent = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          consent_sent_at: new Date().toISOString(),
          consent_method: "osmind",
        })
        .eq("id", patientId);

      if (error) throw error;
      toast.success("Osmind invite marked as sent");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating consent status:", error);
      toast.error("Failed to update consent status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkConsentComplete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          consent_completed_at: new Date().toISOString(),
        })
        .eq("id", patientId);

      if (error) throw error;
      toast.success("Consent marked as complete");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating consent status:", error);
      toast.error("Failed to update consent status");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (consentCompletedAt) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <Check className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (consentSentAt) {
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Clock className="h-3 w-3 mr-1" />
          Pending Completion
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircle className="h-3 w-3 mr-1" />
        Not Started
      </Badge>
    );
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span className="text-blue-900">Osmind Status</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-1">
          <p className="font-medium text-blue-900">{patientName}</p>
          <p className="text-blue-700">{patientEmail}</p>
        </div>

        {consentSentAt && (
          <div className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1 inline-block">
            Invite sent: {format(new Date(consentSentAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}

        {consentCompletedAt && (
          <div className="text-xs text-green-600 bg-green-100 rounded px-2 py-1 inline-block">
            Completed: {format(new Date(consentCompletedAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => window.open(OSMIND_URL, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Osmind
          </Button>

          {!consentSentAt && (
            <Button
              size="sm"
              onClick={handleMarkInviteSent}
              disabled={isProcessing}
            >
              Mark Invite Sent
            </Button>
          )}

          {consentSentAt && !consentCompletedAt && (
            <Button
              size="sm"
              onClick={handleMarkConsentComplete}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}
        </div>

        <p className="text-xs text-blue-600/80">
          Ketamine patients complete waivers and assessments through Osmind's secure platform.
        </p>
      </CardContent>
    </Card>
  );
};

export default OsmindInviteCard;
