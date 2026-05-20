import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type FollowUpStatus =
  | "new"
  | "contacted"
  | "consult_requested"
  | "consult_scheduled"
  | "converted"
  | "declined"
  | "closed";

type IntakeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  selected_therapy_id: string | null;
  screening_result: string;
  block_severity: "hard" | "service_specific" | null;
  has_anaphylaxis_history: boolean;
  block_reasons: string[];
  warn_reasons: string[];
  follow_up_status: FollowUpStatus;
  follow_up_assigned_to: string | null;
  follow_up_notes: string | null;
  safety_consult_appointment_id: string | null;
  created_at: string;
};

type TeamMember = { user_id: string; email: string; full_name: string | null; roles: string[] };

const STATUS_OPTIONS: FollowUpStatus[] = [
  "new",
  "consult_requested",
  "contacted",
  "consult_scheduled",
  "converted",
  "declined",
  "closed",
];

const statusBadgeClass = (status: FollowUpStatus) => {
  if (status === "new") return "bg-amber-100 text-amber-900 border-amber-300";
  if (status === "consult_requested") return "bg-orange-200 text-orange-900 border-orange-400";
  if (status === "contacted") return "bg-blue-100 text-blue-900 border-blue-300";
  if (status === "consult_scheduled") return "bg-emerald-100 text-emerald-900 border-emerald-300";
  if (status === "converted") return "bg-emerald-600 text-white border-emerald-700";
  return "bg-zinc-100 text-zinc-800 border-zinc-300";
};

const severityBadgeClass = (severity: IntakeRow["block_severity"]) => {
  if (severity === "hard") return "bg-red-100 text-red-900 border-red-300";
  if (severity === "service_specific") return "bg-violet-100 text-violet-900 border-violet-300";
  return "bg-zinc-100 text-zinc-700 border-zinc-300";
};

const IntakeFollowUps = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [therapiesById, setTherapiesById] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [canWrite, setCanWrite] = useState(false);

  const [selectedStatuses, setSelectedStatuses] = useState<Set<FollowUpStatus>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me" | "unassigned">("all");
  const [urgentOnly, setUrgentOnly] = useState(false);

  const [detailsStatus, setDetailsStatus] = useState<FollowUpStatus | "">("");
  const [detailsAssignee, setDetailsAssignee] = useState<string>("");
  const [detailsNote, setDetailsNote] = useState("");

  const selected = useMemo(() => rows.find((r) => r.id === routeId) || null, [rows, routeId]);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email || "");

      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roleErr) throw roleErr;
      const roleSet = new Set((roleRows || []).map((r) => r.role));
      setCanWrite(roleSet.has("admin") || roleSet.has("business_admin"));

      const { data, error } = await supabase
        .from("iv_intake_responses")
        .select(
          "id, first_name, last_name, email, phone, selected_therapy_id, screening_result, block_severity, has_anaphylaxis_history, block_reasons, warn_reasons, follow_up_status, follow_up_assigned_to, follow_up_notes, safety_consult_appointment_id, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const source = (data || []) as IntakeRow[];
      const filtered = source.filter((r) =>
        r.screening_result === "blocked" || (r.screening_result === "warned" && r.follow_up_status !== "closed")
      );
      setRows(filtered);

      const therapyIds = Array.from(new Set(filtered.map((r) => r.selected_therapy_id).filter(Boolean))) as string[];
      if (therapyIds.length > 0) {
        const { data: therapies } = await supabase
          .from("iv_therapies")
          .select("id, name")
          .in("id", therapyIds);
        const map: Record<string, string> = {};
        (therapies || []).forEach((therapy) => (map[therapy.id] = therapy.name));
        setTherapiesById(map);
      } else {
        setTherapiesById({});
      }

      const teamRes = await supabase.functions.invoke("get-team-members", { body: {} });
      if (!teamRes.error && teamRes.data?.team) {
        setTeam(teamRes.data.team as TeamMember[]);
      }
    } catch (e) {
      console.error("[IntakeFollowUps] load failed:", e);
      toast.error("Could not load intake follow-ups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!routeId) return;
    const row = rows.find((r) => r.id === routeId);
    if (!row) return;
    setDetailsStatus(row.follow_up_status);
    setDetailsAssignee(row.follow_up_assigned_to || "");
    setDetailsNote("");
  }, [routeId, rows]);

  const applyFilters = useCallback((row: IntakeRow) => {
    if (selectedStatuses.size > 0 && !selectedStatuses.has(row.follow_up_status)) return false;
    if (dateFrom && row.created_at.slice(0, 10) < dateFrom) return false;
    if (dateTo && row.created_at.slice(0, 10) > dateTo) return false;
    if (assigneeFilter === "me" && row.follow_up_assigned_to !== currentUserId) return false;
    if (assigneeFilter === "unassigned" && !!row.follow_up_assigned_to) return false;
    if (urgentOnly && row.follow_up_status !== "consult_requested") return false;
    return true;
  }, [selectedStatuses, dateFrom, dateTo, assigneeFilter, currentUserId, urgentOnly]);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter(applyFilters);
    if (!urgentOnly) return filtered;
    return filtered.sort((a, b) => {
      if (a.has_anaphylaxis_history && !b.has_anaphylaxis_history) return -1;
      if (!a.has_anaphylaxis_history && b.has_anaphylaxis_history) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows, applyFilters, urgentOnly]);

  const teamName = (id: string | null) => {
    if (!id) return "Unassigned";
    const member = team.find((m) => m.user_id === id);
    return member?.full_name || member?.email || id;
  };

  const updateSelected = async (patch: Partial<IntakeRow>, extraNote?: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      let nextNotes = selected.follow_up_notes || "";
      if (extraNote && extraNote.trim()) {
        const stamped = `[${new Date().toISOString()}] ${currentUserEmail || "staff"}: ${extraNote.trim()}`;
        nextNotes = nextNotes ? `${nextNotes}\n${stamped}` : stamped;
      }
      const payload: Record<string, unknown> = { ...patch };
      if (extraNote !== undefined) payload.follow_up_notes = nextNotes;

      const { error } = await supabase.from("iv_intake_responses").update(payload).eq("id", selected.id);
      if (error) throw error;
      toast.success("Follow-up updated.");
      await load();
    } catch (e) {
      console.error("[IntakeFollowUps] update failed:", e);
      toast.error("Could not update follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const sendReminder = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("send-blocked-intake-notifications", {
        body: { intake_id: selected.id, reminder_only: true },
      });
      if (error) throw error;
      toast.success("Staff alert email sent.");
      await load();
    } catch (e) {
      console.error("[IntakeFollowUps] reminder failed:", e);
      toast.error("Could not send reminder email.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Intake Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Status filter (multi-select)</Label>
              <select
                multiple
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={Array.from(selectedStatuses)}
                onChange={(e) => {
                  const selectedValues = Array.from(e.target.selectedOptions).map((opt) => opt.value as FollowUpStatus);
                  setSelectedStatuses(new Set(selectedValues));
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assignment</Label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value as "all" | "me" | "unassigned")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All</option>
                <option value="me">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Urgent queue</Label>
              <label className="h-10 rounded-md border border-input bg-background px-3 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={(e) => setUrgentOnly(e.target.checked)}
                />
                Consult requested only (anaphylaxis first)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Requested service</th>
                    <th className="py-2 pr-3">Block severity</th>
                    <th className="py-2 pr-3">Reasons</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Days since submitted</th>
                    <th className="py-2 pr-3">Assigned to</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const daysAgo = Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    const reasons = row.screening_result === "blocked" ? row.block_reasons : row.warn_reasons;
                    return (
                      <tr key={row.id} className="border-b align-top">
                        <td className="py-3 pr-3">
                          <div className="font-medium">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown"}</div>
                          <div className="text-muted-foreground">{row.email}</div>
                          <div className="text-muted-foreground">{row.phone || "—"}</div>
                        </td>
                        <td className="py-3 pr-3">{therapiesById[row.selected_therapy_id || ""] || "—"}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge className={severityBadgeClass(row.block_severity)}>
                              {row.block_severity === "service_specific"
                                ? "Service-specific"
                                : row.block_severity === "hard"
                                ? "Hard"
                                : "Unknown"}
                            </Badge>
                            {row.has_anaphylaxis_history && (
                              <Badge className="bg-red-200 text-red-900 border-red-400">Anaphylaxis</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {reasons.map((r, idx) => (
                              <Badge key={`${row.id}-${idx}`} variant="outline">{r}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge className={statusBadgeClass(row.follow_up_status)}>{row.follow_up_status}</Badge>
                        </td>
                        <td className="py-3 pr-3">{daysAgo}d</td>
                        <td className="py-3 pr-3">{teamName(row.follow_up_assigned_to)}</td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/intake-follow-ups/${row.id}`)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Intake details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Patient</p>
                <p>{[selected.first_name, selected.last_name].filter(Boolean).join(" ") || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                <p className="text-sm text-muted-foreground">{selected.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Requested service</p>
                <p>{therapiesById[selected.selected_therapy_id || ""] || "—"}</p>
                <p className="text-xs uppercase text-muted-foreground mt-2 mb-1">Block severity</p>
                <div className="flex flex-wrap gap-1">
                  <Badge className={severityBadgeClass(selected.block_severity)}>
                    {selected.block_severity === "service_specific"
                      ? "Service-specific"
                      : selected.block_severity === "hard"
                      ? "Hard"
                      : "Unknown"}
                  </Badge>
                  {selected.has_anaphylaxis_history && (
                    <Badge className="bg-red-200 text-red-900 border-red-400">Anaphylaxis</Badge>
                  )}
                </div>
                <p className="text-xs uppercase text-muted-foreground mt-2 mb-1">Current status</p>
                <Badge className={statusBadgeClass(selected.follow_up_status)}>{selected.follow_up_status}</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Block reasons</p>
              <div className="flex flex-wrap gap-1">
                {(selected.block_reasons || []).map((r, i) => (
                  <Badge key={`b-${i}`} variant="outline">{r}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Warn reasons</p>
              <div className="flex flex-wrap gap-1">
                {(selected.warn_reasons || []).map((r, i) => (
                  <Badge key={`w-${i}`} variant="outline">{r}</Badge>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Update status</Label>
                <select
                  disabled={!canWrite || saving}
                  value={detailsStatus}
                  onChange={(e) => setDetailsStatus(e.target.value as FollowUpStatus)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Assign to</Label>
                <select
                  disabled={!canWrite || saving}
                  value={detailsAssignee}
                  onChange={(e) => setDetailsAssignee(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (append)</Label>
              <Textarea
                disabled={!canWrite || saving}
                value={detailsNote}
                onChange={(e) => setDetailsNote(e.target.value)}
                placeholder="Add a follow-up note..."
              />
            </div>

            {selected.follow_up_notes && (
              <div className="rounded-md border p-3 bg-muted/20">
                <p className="text-xs uppercase text-muted-foreground mb-1">History</p>
                <pre className="text-sm whitespace-pre-wrap font-sans">{selected.follow_up_notes}</pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {canWrite && (
                <>
                  <Button
                    disabled={saving}
                    onClick={() => updateSelected(
                      { follow_up_status: detailsStatus as FollowUpStatus, follow_up_assigned_to: detailsAssignee || null },
                      detailsNote,
                    )}
                  >
                    Save updates
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => updateSelected({ follow_up_status: "contacted" }, "Marked as contacted")}
                  >
                    Mark as contacted
                  </Button>
                </>
              )}
              {selected.safety_consult_appointment_id && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/provider/appointments/${selected.safety_consult_appointment_id}`)}
                >
                  View linked safety consult
                </Button>
              )}
              {canWrite && (
                <Button variant="outline" disabled={saving} onClick={sendReminder}>
                  Resend blocked staff alert
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/admin/intake-follow-ups")}>
                Close details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntakeFollowUps;
