import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_CONSENTS, type ConsentType } from "@/data/consents";
import type { ConsentDocument, ConsentRecord, ConsentVersion } from "@/data/consents/types";
import { ConsentSigningFlow } from "@/components/consents/ConsentSigningFlow";
import { ConsentReviewView } from "@/components/consents/ConsentReviewView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePatient } from "@/hooks/usePatient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type VersionMap = Partial<Record<ConsentType, ConsentVersion>>;

export default function ConsentPreview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: patient, isLoading: patientLoading } = usePatient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [versions, setVersions] = useState<VersionMap>({});
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [selectedType, setSelectedType] = useState<ConsentType | null>(null);
  const [signedRecord, setSignedRecord] = useState<ConsentRecord | null>(null);
  const [forceTier2Scroll, setForceTier2Scroll] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (import.meta.env.DEV) {
        setAllowed(true);
        return;
      }

      if (!user) {
        setAllowed(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isPrivileged = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
      setAllowed(isPrivileged);
    }

    checkAccess();
  }, [user]);

  useEffect(() => {
    if (!allowed) return;

    async function loadVersions() {
      setLoadingVersions(true);
      const map: VersionMap = {};
      for (const type of Object.keys(ALL_CONSENTS) as ConsentType[]) {
        const { data } = await supabase
          .from("consent_versions")
          .select("*")
          .eq("consent_type", type)
          .eq("is_active", true)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) map[type] = data;
      }
      setVersions(map);
      setLoadingVersions(false);
    }

    loadVersions();
  }, [allowed]);

  if (allowed === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-playfair text-2xl">Not available</h1>
        <p className="mt-2 text-muted-foreground">
          This page is only available in development or to admin/staff users.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Go home
        </Button>
      </div>
    );
  }

  const selectedDoc: ConsentDocument | undefined = selectedType
    ? {
        ...ALL_CONSENTS[selectedType],
        ...(forceTier2Scroll && selectedType ? { tier: 2 as const } : {}),
      }
    : undefined;

  const selectedVersion = selectedType ? versions[selectedType] : undefined;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-playfair text-3xl font-light">Consent signing preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dev-only route. Select a consent to exercise ConsentSigningFlow against live catalog versions.
          </p>
        </div>

        {!patient && !patientLoading && (
          <Card>
            <CardContent className="pt-6 text-sm text-amber-700">
              Sign in as a patient (or use staff with a linked patient) to test signing — consent_records
              insert requires a valid patient_id.
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Switch id="force-tier2" checked={forceTier2Scroll} onCheckedChange={setForceTier2Scroll} />
          <Label htmlFor="force-tier2">Force tier-2 scroll enforcement on selected consent</Label>
        </div>

        {loadingVersions ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ALL_CONSENTS) as ConsentType[]).map((type) => {
              const v = versions[type];
              return (
                <Card
                  key={type}
                  className={`cursor-pointer transition-colors ${selectedType === type ? "ring-2 ring-accent" : ""}`}
                  onClick={() => {
                    setSelectedType(type);
                    setSignedRecord(null);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{ALL_CONSENTS[type].title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {v ? (
                      <>
                        {v.version_label} · tier {ALL_CONSENTS[type].tier}
                        {v.id ? ` · id ${v.id.slice(0, 8)}…` : ""}
                      </>
                    ) : (
                      <span className="text-destructive">No active version in DB</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedType && selectedDoc && selectedVersion && patient && (
          <ConsentSigningFlow
            consentDocument={selectedDoc}
            consentVersionId={selectedVersion.id}
            patientId={patient.id}
            patientName={patient.full_name}
            isDevPreview
            onCancel={() => setSelectedType(null)}
            onSigningComplete={(record) => {
              setSignedRecord(record);
              toast.success("Test consent record created");
            }}
          />
        )}

        {signedRecord && selectedVersion && (
          <div className="space-y-2 border-t border-border pt-8">
            <h2 className="font-playfair text-xl">Signed record preview</h2>
            <ConsentReviewView
              consentRecord={signedRecord}
              consentVersion={selectedVersion}
              showDownloadButton
            />
          </div>
        )}
      </div>
    </div>
  );
}
