# Room Scheduling — Operating Guide

Elevated Health Augusta runs five physical spaces through a single scheduling
system. This document describes how the system thinks about rooms, durations,
blackouts, and concurrent booking caps — and how to change any of it without
opening a SQL editor.

---

## The five spaces

| # | Name   | Type           | Flex | Capacity | What it does                                                                                  |
|---|--------|----------------|------|----------|-----------------------------------------------------------------------------------------------|
| 1 | Room 1 | treatment_room | no   | 1        | IV hydration, NAD+, hormone, peptide, weight loss, injections                                 |
| 2 | Room 2 | treatment_room | no   | 1        | IV hydration, NAD+, hormone, peptide, weight loss, injections                                 |
| 3 | Room 3 | treatment_room | no   | 1        | IV hydration, NAD+, hormone, peptide, weight loss, injections                                 |
| 4 | Room 4 | treatment_room | no   | 1        | All treatment categories **plus** consults (acts as the dual-purpose room)                    |
| 5 | Lobby  | lobby          | yes  | 2        | Injections, brief consults, weight-loss check-ins only. Used **only** when treatment rooms full |

The Lobby is a **flex** room: the slot engine will not place a patient there
unless every treatment room is unavailable for that time. Only services
explicitly marked `allow_flex_room = true` are eligible for it. This means an
IV hydration appointment will never bump to the lobby — but a 15-minute
semaglutide injection will, if Rooms 1–4 are full.

---

## How a slot becomes "available"

For every 15-minute increment of a provider's working hours, the engine runs
this gauntlet. The slot is shown to the patient only if **all** checks pass:

1. **Provider is working.** The slot falls inside a `provider_availability`
   window for that day of week, and the provider is not on `provider_time_off`.
2. **Provider is free.** The provider has no other scheduled appointment
   overlapping the slot (including buffers).
3. **A compatible room is free.** The engine looks for any active room whose
   `allowed_service_categories` includes the service's category and whose
   `room_type_required` matches (if specified). It excludes rooms with a
   conflicting appointment or a `room_blackouts` entry overlapping the slot.
   Flex rooms only qualify if the service permits them.
4. **No booking limit is exceeded.** Every active `booking_limits` row whose
   day/time/category/room-type filters match the slot is evaluated. If
   accepting this booking would push the count of overlapping appointments at
   or above `max_concurrent`, the slot fails.

The patient never sees which room they're in. Room assignment happens
server-side via the `enforce_appointment_room_rules` trigger at the moment of
INSERT — the trigger calls `find_available_room()`, which uses the same logic
and writes the chosen `room_id` onto the appointment row. The trigger is the
source of truth; if someone bypasses the edge function entirely and inserts an
appointment directly, the trigger still picks the right room (or rejects the
insert).

---

## Service durations

Every service in the `services` table has four scheduling-relevant fields:

- `duration_minutes` — how long the room is occupied
- `buffer_after_minutes` — turnover time after the appointment ends, blocks
  the room from being booked again until elapsed
- `room_type_required` — `treatment_room` / `consult_room` / `injection_room`
  / `procedure_room`, or NULL for "any allowed room"
- `allow_flex_room` — whether the lobby can be used as a fallback

Current defaults (set by the migration):

| Service                     | Duration | Room                          | Flex OK |
|-----------------------------|----------|-------------------------------|---------|
| Myers Cocktail              | 60 min   | treatment_room                | no      |
| Immune Boost                | 60 min   | treatment_room                | no      |
| Athletic Recovery           | 60 min   | treatment_room                | no      |
| Hydration Rescue            | 60 min   | treatment_room                | no      |
| High-Dose Vitamin C         | 60 min   | treatment_room                | no      |
| NAD+ 250mg                  | 240 min  | treatment_room                | no      |
| NAD+ 500mg                  | 360 min  | treatment_room                | no      |
| Glutathione Push            | 15 min   | (any allowed)                 | **yes** |
| B12 / Lipo / Peptide / GLP-1 Injection | 15 min | (any allowed)         | **yes** |
| Hormone Consult (Initial)   | 60 min   | consult_room                  | **yes** |
| Hormone Consult (Follow-up) | 30 min   | consult_room                  | **yes** |
| Membership Consult          | 90 min   | (telehealth — no room)        | n/a     |

To change a duration: **Admin → Scheduling Settings → Service Durations**, find
the service, click Edit, set the new minutes, save. No deploy, no migration.

---

## Booking limits (concurrent caps)

These are the rules that say "even though we have four treatment rooms, I only
want three simultaneous IVs running because the RN can't realistically
shepherd four at once." The migration seeds three defaults:

1. **IV concurrent cap — 4** (category `iv_hydration`, applies to
   `treatment_room`) — never more than 4 IVs running at once. Effectively
   means all four treatment rooms can be IVing simultaneously. Drop this to
   3 if you want a margin.
2. **NAD+ concurrent cap — 2** (category `nad`, applies to `treatment_room`) —
   NAD drips are long and high-touch; cap at 2 concurrent.
3. **Lobby injection cap — 2** (category `injection`, applies to `lobby`) —
   the lobby has capacity for 2 patients getting a quick IM at the same time.

Every limit has optional filters:

- **Day of week** — leave as "Every day" or scope to e.g. Saturdays only
- **Start/end time** — leave blank for all day, or scope to e.g. 17:00–20:00
- **Service category** — leave blank to count all services, or scope to one
- **Room types** — leave blank to count all rooms, or scope (e.g. lobby only)
- **Effective from/until** — set a window when a limit applies (holiday rules,
  staffing constraints during a sick week, etc.)

A booking must pass **every** active limit. Limits stack. If you want a
"Saturday IVs capped at 2 because only one RN is here" rule, add it as a
separate limit on top of the existing IV cap of 4 — the more restrictive one
wins for that day.

To add or change a limit: **Admin → Scheduling Settings → Booking Limits**.

---

## Blackouts

A blackout takes a single room offline for a window of time. Use cases:

- Deep clean Room 2 every Wednesday 12:00–13:00
- Room 3 out of service for HVAC repair Nov 4–6
- Lobby closed during morning weight-loss group meeting
- Whole-clinic shutdown for a half-day (create five blackouts, one per room —
  or just toggle each room inactive in the Rooms tab if it's a longer thing)

A blackout makes the room unavailable for any service. The booking engine
treats it like an appointment that fills the entire window.

To create one: **Admin → Scheduling Settings → Blackouts** → pick room, set
the date and start/end times, optionally write a reason. To remove one,
click the X next to it in the Upcoming tab.

Note: blackouts on a single treatment room don't stop bookings — the engine
will route those appointments to the other three treatment rooms, until those
fill up, then to the lobby (for flex-eligible services). To stop bookings
clinic-wide, either blackout all rooms or toggle them inactive.

---

## How to do common things

### "Cancel IV hydration on Saturdays for a month"

Add a booking limit: name "Saturday IV pause", day_of_week = Saturday,
category = iv_hydration, max_concurrent = 0, effective_from = today,
effective_until = one month from today. Zero concurrent means no slots will
ever show as available on Saturdays for IV services during that window.

### "Make Room 3 the dedicated NAD room"

Edit Room 3, deselect all categories except `nad`. The engine will now only
place NAD appointments there.

### "Add a new room (Room 5, when we expand)"

INSERT into the `rooms` table with the next `display_order`, set `is_active`
true, set `allowed_service_categories` appropriately. No code changes needed —
the engine reads rooms dynamically.

### "Change IV duration to 75 minutes"

Admin → Scheduling Settings → Service Durations → edit each IV service →
75 minutes. Existing appointments aren't affected; new bookings will use the
new duration.

### "Block the whole clinic Thanksgiving Day"

Either: create five blackouts (one per room) for that date — or — toggle all
five rooms `is_active = false` for the day and re-enable the next morning.
Blackouts are less destructive (no chance of forgetting to re-enable).

---

## What the patient sees

A grid of available start times grouped into Morning / Afternoon / Evening.
That's it. No room information. No provider information unless they pre-
filtered by provider. Times are local (Eastern). If a slot would route the
patient to the lobby, they don't know — the booking confirmation just shows
the appointment time, and the front desk can check the `room_id` on the
appointment row before they arrive.

If zero slots are available for the day they picked, they see a "call us at
(706) 426-7383" fallback. Don't strip this — it converts.

---

## What's not in this system (yet)

These were intentionally deferred. None block launch.

- **Recurring blackouts.** The `recurring` + `recurrence_pattern jsonb`
  columns exist on `room_blackouts` but the engine doesn't expand them yet.
  Today, create each occurrence manually. Build the recurrence expander when
  you have more than ~5 recurring blackouts to maintain.
- **DST handling.** The edge function uses a hardcoded `-05:00` offset for
  America/New_York. This is correct from early November to mid-March. Between
  the DST transitions, slot times will be off by an hour. Replace with a
  proper IANA TZ library (e.g. `date-fns-tz` or use Postgres `AT TIME ZONE`)
  before March 2027.
- **Provider-specific room preferences.** If Caroline always uses Room 2, the
  system doesn't know that. Build this when you have more than one provider
  doing the same service type.
- **Group bookings.** The lobby has capacity 2 but the data model treats
  appointments as 1:1 with a room. Group classes (e.g. semaglutide education
  session for 6 patients) need a new appointment type. Not a 2026 problem.

---

## Tables and where they live

| Table             | What it stores                                                 |
|-------------------|----------------------------------------------------------------|
| `rooms`           | The five spaces, their type, active state, allowed categories  |
| `room_blackouts`  | Time windows when a specific room is offline                   |
| `booking_limits`  | Concurrent-cap rules with optional day/time/category filters   |
| `service_rooms`   | Auto-populated compatibility matrix (which service → which rooms) |
| `services`        | Has duration, buffer, room requirement columns added           |
| `appointments`    | Has `room_id` FK; trigger auto-assigns on insert               |

To inspect today's room utilization: `SELECT * FROM v_room_utilization;`
