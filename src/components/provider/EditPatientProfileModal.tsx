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
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PatientData {
  id: string;
  full_name: string;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  allergies?: string | null;
}

interface EditPatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientData;
  onUpdated?: () => void;
}

const EditPatientProfileModal = ({
  isOpen,
  onClose,
  patient,
  onUpdated,
}: EditPatientProfileModalProps) => {
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [allergies, setAllergies] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when patient changes
  useEffect(() => {
    if (patient) {
      setStreetAddress(patient.street_address || "");
      setCity(patient.city || "");
      setState(patient.state || "");
      setZipCode(patient.zip_code || "");
      setAllergies(patient.allergies || "");
    }
  }, [patient]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          street_address: streetAddress.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          allergies: allergies.trim() || "NKDA",
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast.success("Patient profile updated");
      onUpdated?.();
      onClose();
    } catch (error: any) {
      console.error("Error updating patient:", error);
      toast.error(error.message || "Failed to update patient");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border border-gold/30 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-cormorant text-foreground">
            Edit Patient Profile
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{patient.full_name}</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Address Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mailing Address</Label>
            <Input
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="Street Address"
            />
            <div className="grid grid-cols-6 gap-2">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="col-span-3"
              />
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="ST"
                className="col-span-1"
                maxLength={2}
              />
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="ZIP"
                className="col-span-2"
                maxLength={10}
              />
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Drug Allergies</Label>
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="List allergies or leave blank for NKDA"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if no known drug allergies (NKDA)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-foreground/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gold hover:bg-gold-dark text-white"
          >
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientProfileModal;
