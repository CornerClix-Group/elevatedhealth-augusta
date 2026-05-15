import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ConsentSectionAttestationProps {
  sectionId: string;
  sectionTitle: string;
  attestationText: string;
  checked: boolean;
  onChange: (sectionId: string, checked: boolean) => void;
  disabled?: boolean;
}

export function ConsentSectionAttestation({
  sectionId,
  sectionTitle,
  attestationText,
  checked,
  onChange,
  disabled = false,
}: ConsentSectionAttestationProps) {
  const inputId = `consent-attestation-${sectionId}`;

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-2 border-accent/40 bg-accent/5 p-4",
        disabled && "opacity-60",
      )}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {sectionTitle}
      </p>
      <div className="flex items-start gap-3">
        <Checkbox
          id={inputId}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onChange(sectionId, value === true)}
          className="mt-1"
        />
        <Label
          htmlFor={inputId}
          className="cursor-pointer text-sm font-semibold leading-relaxed text-foreground"
        >
          {attestationText}
        </Label>
      </div>
    </div>
  );
}
