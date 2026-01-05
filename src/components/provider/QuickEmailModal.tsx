import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Search, Mail, Send, MessageSquare } from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface QuickEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type DeliveryMethod = "email" | "sms";

const MESSAGE_TYPES = [
  { 
    value: "welcome", 
    label: "Welcome", 
    description: "Welcome to Elevated Health + portal access",
    emailFunction: "send-welcome-email",
    smsFunction: null,
  },
  { 
    value: "kit_payment", 
    label: "Kit Payment Request", 
    description: "Request payment for hormone mapping kit",
    emailFunction: "send-kit-payment-link",
    smsFunction: "send-kit-payment-sms",
  },
  { 
    value: "labs_reviewed", 
    label: "Labs Reviewed", 
    description: "Notify patient their labs are ready",
    emailFunction: "send-labs-reviewed-notification",
    smsFunction: null,
  },
  { 
    value: "vitality_activation", 
    label: "Vitality Activation", 
    description: "Send $249/mo Vitality membership link",
    emailFunction: "send-vitality-activation",
    smsFunction: null,
  },
  { 
    value: "glp1_activation", 
    label: "GLP-1 Activation", 
    description: "Send Semaglutide/Tirzepatide payment link",
    emailFunction: "send-glp1-activation",
    smsFunction: null,
  },
  { 
    value: "hormone_addon", 
    label: "Hormone Add-On", 
    description: "Send $149/mo hormone add-on link (GLP-1 members)",
    emailFunction: "send-hormone-addon-activation",
    smsFunction: null,
  },
  { 
    value: "consultation_invite", 
    label: "Consultation Invite", 
    description: "Send $99 consultation payment link",
    emailFunction: "send-consultation-invite",
    smsFunction: "send-consultation-invite-sms",
  },
  { 
    value: "iv_ketamine", 
    label: "IV Ketamine Payment", 
    description: "Send $400 IV ketamine payment link",
    emailFunction: "send-iv-ketamine-payment-email",
    smsFunction: "send-iv-ketamine-payment-sms",
  },
];

const QuickEmailModal = ({ open, onOpenChange, onSuccess }: QuickEmailModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messageType, setMessageType] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open && searchQuery.length >= 2) {
      searchPatients();
    }
  }, [searchQuery, open]);

  const searchPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, email, phone")
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMessageInfo = MESSAGE_TYPES.find(m => m.value === messageType);
  
  const canSendSms = selectedMessageInfo?.smsFunction !== null;
  const canSendEmail = selectedMessageInfo?.emailFunction !== null;

  const getEdgeFunction = () => {
    if (!selectedMessageInfo) return null;
    return deliveryMethod === "sms" 
      ? selectedMessageInfo.smsFunction 
      : selectedMessageInfo.emailFunction;
  };

  const hasRequiredContact = () => {
    if (!selectedPatient) return false;
    if (deliveryMethod === "email") return !!selectedPatient.email;
    if (deliveryMethod === "sms") return !!selectedPatient.phone;
    return false;
  };

  const handleSend = async () => {
    if (!selectedPatient || !messageType) {
      toast.error("Please select a patient and message type");
      return;
    }

    const edgeFunction = getEdgeFunction();
    if (!edgeFunction) {
      toast.error(`${deliveryMethod === "sms" ? "SMS" : "Email"} not available for this message type`);
      return;
    }

    if (!hasRequiredContact()) {
      toast.error(`Patient does not have a ${deliveryMethod === "sms" ? "phone number" : "email"} on file`);
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: {
          patient_id: selectedPatient.id,
          patient_name: selectedPatient.full_name,
          patient_email: selectedPatient.email,
          patient_phone: selectedPatient.phone,
          first_name: selectedPatient.full_name.split(" ")[0],
          send_email: deliveryMethod === "email",
        },
      });

      if (error) throw error;

      const destination = deliveryMethod === "sms" 
        ? selectedPatient.phone 
        : selectedPatient.email;
      toast.success(`${deliveryMethod === "sms" ? "SMS" : "Email"} sent to ${destination}!`);
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || `Failed to send ${deliveryMethod}`);
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setPatients([]);
    setSelectedPatient(null);
    setMessageType("");
    setDeliveryMethod("email");
  };

  // Auto-switch to email if SMS not available for selected type
  useEffect(() => {
    if (messageType && deliveryMethod === "sms" && !canSendSms) {
      setDeliveryMethod("email");
    }
  }, [messageType, canSendSms, deliveryMethod]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {deliveryMethod === "sms" ? (
              <MessageSquare className="w-5 h-5 text-primary" />
            ) : (
              <Mail className="w-5 h-5 text-primary" />
            )}
            Send Notification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Search */}
          <div className="space-y-2">
            <Label>Search Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
            
            {patients.length > 0 && !selectedPatient && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-b-0"
                  >
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.email || "No email"} • {patient.phone || "No phone"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Patient */}
          {selectedPatient && (
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className={!selectedPatient.email ? "text-amber-600" : ""}>
                  ✉️ {selectedPatient.email || "No email on file"}
                </p>
                <p className={!selectedPatient.phone ? "text-amber-600" : ""}>
                  📱 {selectedPatient.phone || "No phone on file"}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPatient(null)}
                className="mt-1"
              >
                Change Patient
              </Button>
            </div>
          )}

          {/* Message Type */}
          <div className="space-y-2">
            <Label>Message Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue placeholder="Select message type..." />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      {type.label}
                      {type.smsFunction && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">SMS</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMessageInfo && (
              <p className="text-xs text-muted-foreground">{selectedMessageInfo.description}</p>
            )}
          </div>

          {/* Delivery Method Toggle */}
          {messageType && (
            <div className="space-y-2">
              <Label>Send via</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={deliveryMethod === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeliveryMethod("email")}
                  disabled={!canSendEmail}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === "sms" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeliveryMethod("sms")}
                  disabled={!canSendSms}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </Button>
              </div>
              {!canSendSms && messageType && (
                <p className="text-xs text-muted-foreground">SMS not available for this message type</p>
              )}
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!selectedPatient || !messageType || !hasRequiredContact() || isSending}
            className="w-full"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send {deliveryMethod === "sms" ? "SMS" : "Email"}
          </Button>

          {selectedPatient && !hasRequiredContact() && (
            <p className="text-xs text-center text-amber-600">
              Cannot send {deliveryMethod === "sms" ? "SMS - no phone number" : "email - no email address"} on file
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEmailModal;
