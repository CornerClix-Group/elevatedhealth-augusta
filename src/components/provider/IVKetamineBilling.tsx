import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Copy, Check, ExternalLink, Syringe, DollarSign, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IVKetamineBillingProps {
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
}

const IVKetamineBilling = ({
  patientId,
  patientName: initialName = "",
  patientEmail: initialEmail = "",
  patientPhone: initialPhone = "",
}: IVKetamineBillingProps) => {
  const [patientName, setPatientName] = useState(initialName);
  const [patientEmail, setPatientEmail] = useState(initialEmail);
  const [patientPhone, setPatientPhone] = useState(initialPhone);
  const [sessionNumber, setSessionNumber] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (!patientEmail) {
      toast.error("Patient email is required");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-iv-ketamine-checkout", {
        body: {
          patientName,
          patientEmail,
          patientPhone,
          sessionNumber: parseInt(sessionNumber) || 1,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPaymentLink(data.url);
      toast.success("Payment link generated successfully");
    } catch (error: any) {
      console.error("Error generating payment link:", error);
      toast.error(error.message || "Failed to generate payment link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!paymentLink) return;
    
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      toast.success("Payment link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const copyEmailTemplate = async () => {
    if (!paymentLink) return;

    const emailBody = `Hi ${patientName || "there"},

Your IV Ketamine Infusion Session #${sessionNumber} is scheduled. Please complete payment before your appointment:

Payment Amount: $400
Pay Here: ${paymentLink}

Please complete payment at least 24 hours before your session.

If you have any questions, please don't hesitate to reach out.

Best regards,
Elevated Health Augusta
(706) 750-4265`;

    try {
      await navigator.clipboard.writeText(emailBody);
      toast.success("Email template copied to clipboard");
    } catch {
      toast.error("Failed to copy email template");
    }
  };

  const openPaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, "_blank");
    }
  };

  return (
    <Card className="border-hope/30 bg-gradient-to-br from-hope/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="w-4 h-4 text-hope" />
              IV Ketamine Infusion Billing
            </CardTitle>
            <CardDescription className="mt-1">
              Generate payment link for $400 per infusion
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-hope/10 text-hope border-hope/30">
            <DollarSign className="w-3 h-3 mr-1" />
            $400
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Patient Name</Label>
            <Input
              placeholder="John Doe"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Session #</Label>
            <Input
              type="number"
              min="1"
              placeholder="1"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Patient Email *</Label>
          <Input
            type="email"
            placeholder="patient@email.com"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            className="bg-background"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Patient Phone</Label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            className="bg-background"
          />
        </div>

        <Button
          onClick={handleGenerateLink}
          disabled={isGenerating || !patientEmail}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Generate Payment Link
            </>
          )}
        </Button>

        {paymentLink && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Payment Link:</p>
              <p className="text-sm font-mono break-all text-foreground">{paymentLink}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openPaymentLink}
                className="flex-1"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={copyEmailTemplate}
              className="w-full"
            >
              <Send className="w-3 h-3 mr-1" />
              Copy Email Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IVKetamineBilling;
