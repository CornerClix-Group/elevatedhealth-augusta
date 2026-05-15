import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export interface SignatureHistoryViewProps {
  consentVersionId: string;
  consentTypeLabel?: string;
}

const PAGE = 20;

export function SignatureHistoryView({ consentVersionId, consentTypeLabel }: SignatureHistoryViewProps) {
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalApprox, setTotalApprox] = useState<number | null>(null);
  const [sigRange, setSigRange] = useState<{ earliest: string; latest: string } | null>(null);
  const [rows, setRows] = useState<
    {
      id: string;
      patient_id: string;
      full_name: string | null;
      signed_at: string;
      expires_at: string;
      revoked_at: string | null;
      signing_method: string;
      staff_witness_user_id: string | null;
      pdf_storage_path: string | null;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE;
      const to = from + PAGE - 1;

      const { data, error, count } = await supabase
        .from("consent_records")
        .select(
          `
          id,
          patient_id,
          signed_at,
          expires_at,
          revoked_at,
          signing_method,
          staff_witness_user_id,
          pdf_storage_path,
          patients (full_name)
        `,
          { count: "exact" },
        )
        .eq("consent_version_id", consentVersionId)
        .order("signed_at", { ascending: false })
        .range(from, to);

      if (cancelled) return;
      if (error) {
        setRows([]);
        setTotalApprox(null);
      } else {
        setTotalApprox(count ?? null);
        const normalized =
          data?.map((r: Record<string, unknown>) => {
            const patients = r.patients as { full_name?: string | null } | null;
            return {
              id: r.id as string,
              patient_id: r.patient_id as string,
              full_name: patients?.full_name ?? null,
              signed_at: r.signed_at as string,
              expires_at: r.expires_at as string,
              revoked_at: (r.revoked_at as string | null) ?? null,
              signing_method: (r.signing_method as string) ?? "patient_typed_name",
              staff_witness_user_id: (r.staff_witness_user_id as string | null) ?? null,
              pdf_storage_path: (r.pdf_storage_path as string | null) ?? null,
            };
          }) ?? [];
        setRows(normalized);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [consentVersionId, page]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: minRow }, { data: maxRow }] = await Promise.all([
        supabase
          .from("consent_records")
          .select("signed_at")
          .eq("consent_version_id", consentVersionId)
          .order("signed_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("consent_records")
          .select("signed_at")
          .eq("consent_version_id", consentVersionId)
          .order("signed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (minRow?.signed_at && maxRow?.signed_at) {
        setSigRange({ earliest: minRow.signed_at as string, latest: maxRow.signed_at as string });
      } else {
        setSigRange(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consentVersionId]);

  const recordStatus = (r: (typeof rows)[0]) => {
    if (r.revoked_at) return { label: "Revoked", variant: "destructive" as const };
    if (new Date(r.expires_at).getTime() <= Date.now()) return { label: "Expired", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-4">
      {consentTypeLabel && (
        <p className="text-sm text-muted-foreground">
          Signatures recorded against version <span className="font-medium text-foreground">{consentTypeLabel}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {totalApprox != null ? (
            <>
              Total signatures (all pages): <strong className="text-foreground">{totalApprox}</strong>
            </>
          ) : (
            "Loading totals…"
          )}
        </span>
        <span>
          {sigRange ? (
            <>
              Signature dates:{" "}
              <strong className="text-foreground">
                {format(new Date(sigRange.earliest), "MMM d, yyyy")} —{" "}
                {format(new Date(sigRange.latest), "MMM d, yyyy")}
              </strong>
            </>
          ) : totalApprox === 0 ? (
            "No signatures yet"
          ) : totalApprox != null ? (
            "Date range loading…"
          ) : null}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || rows.length < PAGE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading history…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No signatures found for this version.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Witness</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const st = recordStatus(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name || r.patient_id.slice(0, 8) + "…"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.signed_at), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.expires_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs font-mono">{r.signing_method}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {r.staff_witness_user_id ? r.staff_witness_user_id.slice(0, 8) + "…" : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
