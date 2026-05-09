import type { Json } from "@/integrations/supabase/types";

export type DecisionConfidence = "standard" | "variable" | "high_stakes";

export type DecisionFlagRow = {
  field: string;
  current_value: string;
  rationale: string;
  alternatives: string;
  confidence: DecisionConfidence;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution?: "approved" | "overridden" | null;
};

export type LegacyReviewerRow = {
  note: string;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

export type ReviewerListItem = { kind: "decision"; data: DecisionFlagRow } | { kind: "legacy"; data: LegacyReviewerRow };

const CONF_RANK: Record<DecisionConfidence, number> = {
  high_stakes: 0,
  variable: 1,
  standard: 2,
};

export function sortDecisionFlagsForDisplay(flags: DecisionFlagRow[]): DecisionFlagRow[] {
  return [...flags].sort((a, b) => {
    const d = CONF_RANK[a.confidence] - CONF_RANK[b.confidence];
    if (d !== 0) return d;
    return a.field.localeCompare(b.field);
  });
}

export function sortDecisionFlagEntries<T extends { row: DecisionFlagRow }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const d = CONF_RANK[a.row.confidence] - CONF_RANK[b.row.confidence];
    if (d !== 0) return d;
    return a.row.field.localeCompare(b.row.field);
  });
}

export function parseReviewerList(raw: Json | null | undefined): ReviewerListItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: ReviewerListItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.field === "string" && typeof o.confidence === "string") {
      const c = o.confidence;
      if (c !== "standard" && c !== "variable" && c !== "high_stakes") continue;
      out.push({
        kind: "decision",
        data: {
          field: o.field,
          current_value: String(o.current_value ?? ""),
          rationale: String(o.rationale ?? ""),
          alternatives: String(o.alternatives ?? ""),
          confidence: c,
          resolved: Boolean(o.resolved),
          resolved_at: (o.resolved_at as string | null | undefined) ?? null,
          resolved_by: (o.resolved_by as string | null | undefined) ?? null,
          resolution: o.resolution === "approved" || o.resolution === "overridden" ? o.resolution : null,
        },
      });
      continue;
    }
    if (typeof o.note === "string" && o.note.length > 0) {
      out.push({
        kind: "legacy",
        data: {
          note: o.note,
          resolved: Boolean(o.resolved),
          resolved_at: (o.resolved_at as string | null | undefined) ?? null,
          resolved_by: (o.resolved_by as string | null | undefined) ?? null,
        },
      });
    }
  }
  return out;
}

export function allReviewerEntriesResolved(items: ReviewerListItem[]): boolean {
  return items.length > 0 && items.every((it) => (it.kind === "decision" ? it.data.resolved : it.data.resolved));
}

export function decisionFlagsFromList(items: ReviewerListItem[]): DecisionFlagRow[] {
  return items.filter((i): i is { kind: "decision"; data: DecisionFlagRow } => i.kind === "decision").map((i) => i.data);
}

export function fieldToDomId(field: string): string {
  return `cp-field-${field.replace(/\./g, "-")}`;
}

/** Accordion item `value` for ClinicalProtocolEditor sections */
export function fieldToAccordionSection(field: string): string {
  if (field === "indication") return "sec-indication";
  if (field.startsWith("dosing.")) return "sec-dosing";
  if (field === "pre_administration_checks") return "sec-pre";
  if (field === "contraindications" || field === "exclusion_criteria") return "sec-contraindications";
  if (field === "administration") return "sec-administration";
  if (field === "monitoring_during" || field === "monitoring_post") return "sec-monitoring";
  if (field === "patient_education") return "sec-education";
  if (field === "escalation_criteria") return "sec-escalation";
  if (field === "documentation_required") return "sec-documentation";
  if (field.startsWith("adverse_event_response.")) return "sec-aer";
  return "sec-indication";
}

export function serializeReviewerListForDb(items: ReviewerListItem[], userId: string): Json {
  return items.map((it) => {
    if (it.kind === "legacy") {
      const d = it.data;
      return {
        note: d.note,
        resolved: d.resolved,
        resolved_at: d.resolved ? d.resolved_at ?? new Date().toISOString() : null,
        resolved_by: d.resolved ? d.resolved_by ?? userId : null,
      };
    }
    const d = it.data;
    return {
      field: d.field,
      current_value: d.current_value,
      rationale: d.rationale,
      alternatives: d.alternatives,
      confidence: d.confidence,
      resolved: d.resolved,
      resolved_at: d.resolved ? d.resolved_at ?? new Date().toISOString() : null,
      resolved_by: d.resolved ? d.resolved_by ?? userId : null,
      resolution: d.resolution ?? null,
    };
  }) as unknown as Json;
}

export function updateDecisionFlagAt(
  items: ReviewerListItem[],
  index: number,
  patch: Partial<DecisionFlagRow>,
  userId: string,
): ReviewerListItem[] {
  return items.map((it, i) => {
    if (i !== index || it.kind !== "decision") return it;
    const next = { ...it.data, ...patch };
    if (patch.resolved === true) {
      next.resolved_at = next.resolved_at ?? new Date().toISOString();
      next.resolved_by = next.resolved_by ?? userId;
    }
    if (patch.resolved === false) {
      next.resolved_at = null;
      next.resolved_by = null;
      next.resolution = null;
    }
    return { kind: "decision", data: next };
  });
}

export function updateLegacyAt(
  items: ReviewerListItem[],
  index: number,
  resolved: boolean,
  userId: string,
): ReviewerListItem[] {
  return items.map((it, i) => {
    if (i !== index || it.kind !== "legacy") return it;
    return {
      kind: "legacy",
      data: {
        ...it.data,
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? userId : null,
      },
    };
  });
}
