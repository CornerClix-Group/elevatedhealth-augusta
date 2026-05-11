// ============================================================================
// Edge Function: get-available-slots
// Purpose:    Returns available booking slots for a given service + date,
//             accounting for room availability, blackouts, concurrent caps,
//             and provider availability windows.
// Endpoint:   POST /functions/v1/get-available-slots
// Body:       { service_id: string, date: 'YYYY-MM-DD', provider_id?: string }
// Returns:    { service: {...}, slots: [{ start_at, end_at }, ...] }
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLINIC_TIMEZONE = "America/New_York";
const CLINIC_TZ_OFFSET = "-05:00"; // EST. For DST handling switch to a library; manual is fine for v1.
const SLOT_GRANULARITY_MINUTES = 15;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

interface RequestBody {
  service_id: string;
  date: string; // YYYY-MM-DD
  provider_id?: string;
}

interface SlotInternal {
  start_at: string;
  end_at: string;
  available: boolean;
  reason?: string;
  provider_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { service_id, date, provider_id } = (await req.json()) as RequestBody;

    if (!service_id || !date) {
      return json({ error: "service_id and date required" }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "date must be YYYY-MM-DD" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ----- Service -----
    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select("id, slug, name, category, duration_minutes, buffer_before_minutes, buffer_after_minutes, requires_room, room_type_required, allow_flex_room, min_advance_booking_hours, max_advance_booking_days, allow_same_day_booking, online_bookable, active")
      .eq("id", service_id)
      .single();

    if (svcErr || !service) return json({ error: "Service not found" }, 404);
    if (!service.active || !service.online_bookable) return json({ slots: [], service });

    // Enforce max-advance booking window
    const requestDate = new Date(`${date}T00:00:00${CLINIC_TZ_OFFSET}`);
    const maxAdvanceDays = service.max_advance_booking_days ?? 90;
    const maxAdvanceDate = new Date(Date.now() + maxAdvanceDays * 86400 * 1000);
    if (requestDate > maxAdvanceDate) return json({ slots: [], service });

    // ----- Provider availability windows for that DOW -----
    const dow = requestDate.getDay();

    let availQuery = supabase
      .from("provider_availability")
      .select("id, provider_id, day_of_week, start_time, end_time, service_categories, effective_from, effective_until")
      .eq("day_of_week", dow)
      .lte("effective_from", date)
      .or(`effective_until.is.null,effective_until.gte.${date}`);

    if (provider_id) availQuery = availQuery.eq("provider_id", provider_id);

    const { data: rawAvailability } = await availQuery;
    const availability = (rawAvailability || []).filter((a: any) =>
      !a.service_categories || a.service_categories.includes(service.category)
    );

    if (availability.length === 0) return json({ slots: [], service });

    // ----- Day-bounded data fetches -----
    const startOfDayISO = `${date}T00:00:00${CLINIC_TZ_OFFSET}`;
    const endOfDayISO = `${date}T23:59:59${CLINIC_TZ_OFFSET}`;

    const [{ data: appointments }, { data: rooms }, { data: blackouts }, { data: limits }, { data: serviceRooms }, { data: timeOff }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_at, end_at, room_id, service_id, status, provider_id, services!inner(category)")
        .gte("start_at", startOfDayISO)
        .lte("end_at", endOfDayISO)
        .not("status", "in", "(cancelled,no_show,rescheduled)"),
      supabase.from("rooms").select("*").eq("active", true),
      supabase
        .from("room_blackouts")
        .select("*")
        .gte("end_at", startOfDayISO)
        .lte("start_at", endOfDayISO),
      supabase
        .from("booking_limits")
        .select("*")
        .eq("active", true)
        .lte("effective_from", date)
        .or(`effective_until.is.null,effective_until.gte.${date}`),
      supabase.from("service_rooms").select("*").eq("service_id", service_id),
      supabase
        .from("provider_time_off")
        .select("*")
        .gte("end_at", startOfDayISO)
        .lte("start_at", endOfDayISO),
    ]);

    // ----- Build slot grid -----
    const now = new Date();
    const minAdvanceMs = (service.min_advance_booking_hours ?? 2) * 3600 * 1000;
    const earliestBookable = new Date(now.getTime() + minAdvanceMs);
    const durationMs = service.duration_minutes * 60_000;

    const candidateSlots: SlotInternal[] = [];

    for (const window of availability) {
      const winStart = parseLocalTime(date, window.start_time);
      const winEnd = parseLocalTime(date, window.end_time);

      for (
        let cursor = new Date(winStart.getTime());
        cursor.getTime() + durationMs <= winEnd.getTime();
        cursor = new Date(cursor.getTime() + SLOT_GRANULARITY_MINUTES * 60_000)
      ) {
        const slotStart = new Date(cursor.getTime());
        const slotEnd = new Date(cursor.getTime() + durationMs);

        if (slotStart < earliestBookable) continue;

        const result = checkSlot(
          slotStart,
          slotEnd,
          service,
          rooms || [],
          appointments || [],
          blackouts || [],
          limits || [],
          serviceRooms || [],
          timeOff || [],
          window.provider_id,
        );

        candidateSlots.push({
          start_at: slotStart.toISOString(),
          end_at: slotEnd.toISOString(),
          available: result === null,
          reason: result || undefined,
          provider_id: window.provider_id,
        });
      }
    }

    // Dedupe: if any provider could serve a slot, it's available
    const deduped = dedupeKeepBest(candidateSlots);

    return json({
      service: {
        id: service.id,
        name: service.name,
        category: service.category,
        duration_minutes: service.duration_minutes,
      },
      slots: deduped
        .filter((s) => s.available)
        .map((s) => ({ start_at: s.start_at, end_at: s.end_at, provider_id: s.provider_id })),
    });
  } catch (err) {
    console.error("get-available-slots error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ----- Helpers -----

function checkSlot(
  slotStart: Date,
  slotEnd: Date,
  service: any,
  rooms: any[],
  appointments: any[],
  blackouts: any[],
  limits: any[],
  serviceRooms: any[],
  timeOff: any[],
  providerId: string,
): string | null {
  // Provider time-off
  const onLeave = timeOff.some(
    (t) =>
      t.provider_id === providerId &&
      new Date(t.start_at).getTime() < slotEnd.getTime() &&
      new Date(t.end_at).getTime() > slotStart.getTime(),
  );
  if (onLeave) return "provider_off";

  // Provider double-booking
  const providerConflict = appointments.some(
    (a) =>
      a.provider_id === providerId &&
      new Date(a.start_at).getTime() < slotEnd.getTime() &&
      new Date(a.end_at).getTime() > slotStart.getTime(),
  );
  if (providerConflict) return "provider_busy";

  // Room availability
  if (service.requires_room) {
    const eligibleRooms = rooms.filter((r) => {
      if (!r.active) return false;
      if (!r.allowed_service_categories?.includes(service.category)) return false;
      if (service.room_type_required) {
        if (r.type === service.room_type_required) return true;
        if (service.allow_flex_room && r.is_flex) return true;
        return false;
      }
      return true;
    });

    const compatRooms = serviceRooms.length > 0
      ? eligibleRooms.filter((r) => serviceRooms.some((sr) => sr.room_id === r.id))
      : eligibleRooms;

    if (compatRooms.length === 0) return "no_eligible_rooms";

    compatRooms.sort((a, b) => {
      const aPref = serviceRooms.find((sr) => sr.room_id === a.id)?.preferred ? 1 : 0;
      const bPref = serviceRooms.find((sr) => sr.room_id === b.id)?.preferred ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      return (a.display_order || 0) - (b.display_order || 0);
    });

    const bufBefore = (service.buffer_before_minutes || 0) * 60_000;
    const bufAfter = (service.buffer_after_minutes || 15) * 60_000;

    const hasRoom = compatRooms.some((room) => {
      const overlap = appointments.some(
        (a) =>
          a.room_id === room.id &&
          new Date(a.start_at).getTime() < slotEnd.getTime() + bufAfter &&
          new Date(a.end_at).getTime() > slotStart.getTime() - bufBefore,
      );
      if (overlap) return false;

      const blackedOut = blackouts.some(
        (b) =>
          b.room_id === room.id &&
          new Date(b.start_at).getTime() < slotEnd.getTime() &&
          new Date(b.end_at).getTime() > slotStart.getTime(),
      );
      if (blackedOut) return false;

      return true;
    });

    if (!hasRoom) return "rooms_full";
  }

  // Booking limits
  for (const limit of limits) {
    if (limit.service_category && limit.service_category !== service.category) continue;
    const dow = slotStart.getUTCDay();
    // Convert to clinic TZ DOW (approx — for DST-correct logic, use Intl.DateTimeFormat)
    if (limit.day_of_week !== null && limit.day_of_week !== dow) continue;

    const slotStartMin = slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes();
    const slotEndMin = slotEnd.getUTCHours() * 60 + slotEnd.getUTCMinutes();
    const limStart = timeStrToMinutes(limit.start_time);
    const limEnd = timeStrToMinutes(limit.end_time);
    if (slotStartMin < limStart || slotEndMin > limEnd) continue;

    const concurrent = appointments.filter((a) => {
      if (limit.service_category && a.services?.category !== limit.service_category) return false;
      if (limit.applies_to_room_types) {
        const room = rooms.find((r) => r.id === a.room_id);
        if (!room || !limit.applies_to_room_types.includes(room.type)) return false;
      }
      return (
        new Date(a.start_at).getTime() < slotEnd.getTime() &&
        new Date(a.end_at).getTime() > slotStart.getTime()
      );
    }).length;

    if (concurrent >= limit.max_concurrent) return `limit_${limit.name}`;
  }

  return null;
}

function parseLocalTime(dateStr: string, timeStr: string): Date {
  // timeStr like "08:00" or "08:00:00"
  const [h, m] = timeStr.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${dateStr}T${pad(h)}:${pad(m)}:00${CLINIC_TZ_OFFSET}`);
}

function timeStrToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function dedupeKeepBest(slots: SlotInternal[]): SlotInternal[] {
  const byStart = new Map<string, SlotInternal>();
  for (const s of slots) {
    const existing = byStart.get(s.start_at);
    if (!existing) {
      byStart.set(s.start_at, s);
    } else if (s.available && !existing.available) {
      byStart.set(s.start_at, s);
    }
  }
  return Array.from(byStart.values()).sort((a, b) =>
    a.start_at.localeCompare(b.start_at),
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
