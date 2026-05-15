import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateTypedName } from "@/lib/consents/name-validation";
import { cn } from "@/lib/utils";

export interface TypedNameSignatureProps {
  expectedName?: string;
  value: string;
  onChange: (typedName: string) => void;
  onValidationStateChange?: (state: { isValid: boolean; warning?: string }) => void;
  disabled?: boolean;
}

export function TypedNameSignature({
  expectedName,
  value,
  onChange,
  onValidationStateChange,
  disabled = false,
}: TypedNameSignatureProps) {
  useEffect(() => {
    const result = validateTypedName(value, expectedName);
    onValidationStateChange?.(result);
  }, [value, expectedName, onValidationStateChange]);

  const validation = validateTypedName(value, expectedName);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <Label htmlFor="consent-typed-name" className="text-sm font-medium">
        Type your full legal name to sign
      </Label>
      <Input
        id="consent-typed-name"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Full legal name"
        className="max-w-md"
        autoComplete="name"
      />
      {expectedName && (
        <p className="text-xs text-muted-foreground">Name on file: {expectedName}</p>
      )}
      {validation.warning && (
        <p
          className={cn(
            "text-xs",
            validation.isValid ? "text-amber-700 dark:text-amber-400" : "text-destructive",
          )}
        >
          {validation.warning}
        </p>
      )}
      {value.trim().length > 0 && (
        <p className="font-playfair text-2xl italic text-foreground/90">{value.trim()}</p>
      )}
    </div>
  );
}
