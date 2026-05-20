import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import MyScheduleManager from "@/components/provider/MyScheduleManager";

type ProviderScheduleRow = Database["public"]["Tables"]["provider_schedules"]["Row"];

type ShiftFormValues = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  service_lines: string[];
  location: string;
  is_active: boolean;
};

type ProviderOption = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

const SERVICE_OPTIONS = [
  { value: "iv", label: "IV Therapy" },
  { value: "consult", label: "Wellness Assessment" },
  { value: "hormone", label: "Hormone" },
  { value: "peptide", label: "Peptide" },
  { value: "weight_loss", label: "Weight Loss" },
  { value: "follow_up", label: "Follow-up" },
] as const;

const defaultShiftForm = (): ShiftFormValues => ({
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  slot_minutes: 30,
  service_lines: ["consult"],
  location: "",
  is_active: true,
});

const toTimeWithSeconds = (time: string): string => `${time}:00`;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const validateShiftForm = (values: ShiftFormValues): string | null => {
  if (values.day_of_week < 0 || values.day_of_week > 6) {
    return "Day of week must be between 0 and 6.";
  }

  if (!values.start_time || !values.end_time) {
    return "Start and end time are required.";
  }

  if (timeToMinutes(values.end_time) <= timeToMinutes(values.start_time)) {
    return "End time must be later than start time.";
  }

  if (!Number.isInteger(values.slot_minutes) || values.slot_minutes <= 0) {
    return "Slot minutes must be a positive whole number.";
  }

  if (values.service_lines.length === 0) {
    return "Choose at least one service line.";
  }

  return null;
};

const toDisplayName = (provider: ProviderOption): string =>
  provider.full_name?.trim() || provider.email;

const normalizeProviderOptions = (data: unknown): ProviderOption[] => {
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      const record = row as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.email !== "string") return null;
      return {
        id: record.id,
        email: record.email,
        full_name: typeof record.full_name === "string" ? record.full_name : record.email,
        role: typeof record.role === "string" ? record.role : "provider",
      } as ProviderOption;
    })
    .filter((provider): provider is ProviderOption => Boolean(provider))
    .sort((a, b) => toDisplayName(a).localeCompare(toDisplayName(b)));
};

export default function ProviderSchedules() {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

  const [schedules, setSchedules] = useState<ProviderScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newShift, setNewShift] = useState<ShiftFormValues>(defaultShiftForm);
  const [editingShift, setEditingShift] = useState<ProviderScheduleRow | null>(null);
  const [editingValues, setEditingValues] = useState<ShiftFormValues>(defaultShiftForm);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );

  const groupedSchedules = useMemo(() => {
    const byDay = new Map<number, ProviderScheduleRow[]>();
    for (let day = 0; day <= 6; day += 1) byDay.set(day, []);

    schedules.forEach((schedule) => {
      const current = byDay.get(schedule.day_of_week) ?? [];
      current.push(schedule);
      byDay.set(schedule.day_of_week, current);
    });

    byDay.forEach((rows, day) => {
      rows.sort((a, b) => a.start_time.localeCompare(b.start_time));
      byDay.set(day, rows);
    });

    return byDay;
  }, [schedules]);

  const loadProviders = async () => {
    setProvidersLoading(true);
    setProvidersError(null);

    const { data, error } = await supabase.rpc("get_all_providers");
    if (error) {
      console.error("[ProviderSchedules] get_all_providers failed", error);
      setProviders([]);
      setSelectedProviderId("");
      setProvidersError(
        "Could not load provider roster. Please confirm your account has scheduling access.",
      );
      setProvidersLoading(false);
      return;
    }

    const options = normalizeProviderOptions(data);
    setProviders(options);
    setSelectedProviderId((current) => {
      if (current && options.some((provider) => provider.id === current)) return current;
      return options[0]?.id ?? "";
    });
    setProvidersLoading(false);
  };

  const loadSchedules = async (providerId: string) => {
    setSchedulesLoading(true);
    const { data, error } = await supabase
      .from("provider_schedules")
      .select("*")
      .eq("provider_id", providerId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      console.error("[ProviderSchedules] failed to load schedules", error);
      setSchedules([]);
      toast.error("Unable to load provider shifts right now.");
    } else {
      setSchedules(data ?? []);
    }
    setSchedulesLoading(false);
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  useEffect(() => {
    if (!selectedProviderId) {
      setSchedules([]);
      return;
    }
    void loadSchedules(selectedProviderId);
  }, [selectedProviderId]);

  const updateNewShift = <K extends keyof ShiftFormValues>(key: K, value: ShiftFormValues[K]) => {
    setNewShift((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditingShift = <K extends keyof ShiftFormValues>(
    key: K,
    value: ShiftFormValues[K],
  ) => {
    setEditingValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleServiceLine = (
    values: ShiftFormValues,
    serviceLine: string,
    apply: (next: ShiftFormValues) => void,
  ) => {
    const nextLines = values.service_lines.includes(serviceLine)
      ? values.service_lines.filter((line) => line !== serviceLine)
      : [...values.service_lines, serviceLine];
    apply({ ...values, service_lines: nextLines });
  };

  const handleCreateShift = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProviderId) return;

    const validationError = validateShiftForm(newShift);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const payload: Database["public"]["Tables"]["provider_schedules"]["Insert"] = {
      provider_id: selectedProviderId,
      day_of_week: newShift.day_of_week,
      start_time: toTimeWithSeconds(newShift.start_time),
      end_time: toTimeWithSeconds(newShift.end_time),
      slot_minutes: newShift.slot_minutes,
      service_lines: newShift.service_lines,
      location: newShift.location.trim() || null,
      is_active: newShift.is_active,
    };

    const { error } = await supabase.from("provider_schedules").insert(payload);
    setSaving(false);

    if (error) {
      console.error("[ProviderSchedules] create shift failed", error);
      toast.error("Could not save the shift. Please check your permissions and try again.");
      return;
    }

    toast.success("Shift created.");
    setNewShift(defaultShiftForm());
    await loadSchedules(selectedProviderId);
  };

  const openEditDialog = (shift: ProviderScheduleRow) => {
    setEditingShift(shift);
    setEditingValues({
      day_of_week: shift.day_of_week,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      slot_minutes: shift.slot_minutes,
      service_lines: shift.service_lines,
      location: shift.location ?? "",
      is_active: shift.is_active,
    });
  };

  const handleUpdateShift = async () => {
    if (!editingShift || !selectedProviderId) return;

    const validationError = validateShiftForm(editingValues);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("provider_schedules")
      .update({
        day_of_week: editingValues.day_of_week,
        start_time: toTimeWithSeconds(editingValues.start_time),
        end_time: toTimeWithSeconds(editingValues.end_time),
        slot_minutes: editingValues.slot_minutes,
        service_lines: editingValues.service_lines,
        location: editingValues.location.trim() || null,
        is_active: editingValues.is_active,
      })
      .eq("id", editingShift.id);
    setSaving(false);

    if (error) {
      console.error("[ProviderSchedules] update shift failed", error);
      toast.error("Could not update shift.");
      return;
    }

    toast.success("Shift updated.");
    setEditingShift(null);
    await loadSchedules(selectedProviderId);
  };

  const handleToggleActive = async (shift: ProviderScheduleRow) => {
    if (!selectedProviderId) return;

    const { error } = await supabase
      .from("provider_schedules")
      .update({ is_active: !shift.is_active })
      .eq("id", shift.id);

    if (error) {
      console.error("[ProviderSchedules] toggle active failed", error);
      toast.error("Unable to change shift status right now.");
      return;
    }

    toast.success(!shift.is_active ? "Shift activated." : "Shift deactivated.");
    await loadSchedules(selectedProviderId);
  };

  const handleDeleteShift = async (shift: ProviderScheduleRow) => {
    if (!selectedProviderId) return;

    if (!window.confirm("Delete this shift?")) return;

    const { error } = await supabase.from("provider_schedules").delete().eq("id", shift.id);
    if (error) {
      console.error("[ProviderSchedules] delete shift failed", error);
      toast.error("Unable to delete shift right now.");
      return;
    }

    toast.success("Shift deleted.");
    await loadSchedules(selectedProviderId);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Provider Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-2 md:w-[360px]">
              <Label htmlFor="provider-select">Provider</Label>
              <select
                id="provider-select"
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
                disabled={providersLoading || providers.length === 0}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {providersLoading ? (
                  <option>Loading providers...</option>
                ) : providers.length === 0 ? (
                  <option>No provider users found</option>
                ) : (
                  providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {toDisplayName(provider)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadProviders()}
                disabled={providersLoading}
                className="gap-2"
              >
                {providersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Providers
              </Button>
              {selectedProvider && (
                <Badge variant="secondary">
                  Editing: {toDisplayName(selectedProvider)}
                </Badge>
              )}
            </div>
          </div>

          {providersError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {providersError}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProvider && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateShift} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-day">Day</Label>
                    <select
                      id="new-day"
                      value={newShift.day_of_week}
                      onChange={(event) => updateNewShift("day_of_week", Number(event.target.value))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {DAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-start">Start Time</Label>
                    <Input
                      id="new-start"
                      type="time"
                      value={newShift.start_time}
                      onChange={(event) => updateNewShift("start_time", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-end">End Time</Label>
                    <Input
                      id="new-end"
                      type="time"
                      value={newShift.end_time}
                      onChange={(event) => updateNewShift("end_time", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-slot">Slot Minutes</Label>
                    <Input
                      id="new-slot"
                      type="number"
                      min={1}
                      step={1}
                      value={newShift.slot_minutes}
                      onChange={(event) =>
                        updateNewShift("slot_minutes", Number.parseInt(event.target.value, 10) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-location">Location</Label>
                    <Input
                      id="new-location"
                      placeholder="Optional location label"
                      value={newShift.location}
                      onChange={(event) => updateNewShift("location", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newShift.is_active}
                        onChange={(event) => updateNewShift("is_active", event.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Service Lines</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((service) => {
                      const selected = newShift.service_lines.includes(service.value);
                      return (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() =>
                            toggleServiceLine(newShift, service.value, (next) => setNewShift(next))
                          }
                          className={[
                            "px-3 py-1.5 rounded-md border text-sm transition-colors",
                            selected
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-background hover:bg-muted",
                          ].join(" ")}
                        >
                          {service.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Shift
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Shifts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {schedulesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading shifts...
                </div>
              ) : (
                DAY_OPTIONS.map((day) => {
                  const rows = groupedSchedules.get(day.value) ?? [];
                  return (
                    <section key={day.value} className="space-y-2">
                      <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                        {day.label}
                      </h3>
                      {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No shifts configured.</p>
                      ) : (
                        <div className="space-y-2">
                          {rows.map((shift) => (
                            <div
                              key={shift.id}
                              className="border rounded-md p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Slot: {shift.slot_minutes} min · Services:{" "}
                                  {shift.service_lines.length > 0
                                    ? shift.service_lines.join(", ")
                                    : "none"}
                                </p>
                                {shift.location && (
                                  <p className="text-xs text-muted-foreground">Location: {shift.location}</p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={shift.is_active ? "default" : "secondary"}>
                                  {shift.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(shift)}
                                  className="gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleToggleActive(shift)}
                                >
                                  {shift.is_active ? "Disable" : "Enable"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void handleDeleteShift(shift)}
                                  className="gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <MyScheduleManager providerId={selectedProviderId} />
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={Boolean(editingShift)}
        onOpenChange={(open) => {
          if (!open) setEditingShift(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-day">Day</Label>
                <select
                  id="edit-day"
                  value={editingValues.day_of_week}
                  onChange={(event) => updateEditingShift("day_of_week", Number(event.target.value))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Time</Label>
                <Input
                  id="edit-start"
                  type="time"
                  value={editingValues.start_time}
                  onChange={(event) => updateEditingShift("start_time", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Time</Label>
                <Input
                  id="edit-end"
                  type="time"
                  value={editingValues.end_time}
                  onChange={(event) => updateEditingShift("end_time", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slot">Slot Minutes</Label>
                <Input
                  id="edit-slot"
                  type="number"
                  min={1}
                  step={1}
                  value={editingValues.slot_minutes}
                  onChange={(event) =>
                    updateEditingShift("slot_minutes", Number.parseInt(event.target.value, 10) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingValues.location}
                  onChange={(event) => updateEditingShift("location", event.target.value)}
                  placeholder="Optional location label"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingValues.is_active}
                    onChange={(event) => updateEditingShift("is_active", event.target.checked)}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Lines</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((service) => {
                  const selected = editingValues.service_lines.includes(service.value);
                  return (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() =>
                        toggleServiceLine(editingValues, service.value, (next) => setEditingValues(next))
                      }
                      className={[
                        "px-3 py-1.5 rounded-md border text-sm transition-colors",
                        selected
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-background hover:bg-muted",
                      ].join(" ")}
                    >
                      {service.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingShift(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleUpdateShift()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
