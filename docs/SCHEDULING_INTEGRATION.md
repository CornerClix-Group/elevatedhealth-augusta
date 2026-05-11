# Cursor Execution Prompt — Room Scheduling Integration

Paste this into Cursor inside the `CornerClix-Group/elevated-ketra-augusta`
repo. It's a complete migration from the current basic scheduling to the
room-aware system.

---

## Context for Cursor

We are adding room-based scheduling to Elevated Health Augusta's site. The
clinic has four treatment rooms (Rooms 1–4) and a lobby that flexes as a 5th
room for short services. Patients see available times only; the system
assigns rooms server-side based on service category, room availability,
blackouts, and concurrent-booking caps.

All artifacts to copy are in `/room-scheduling/` at the repo root after you
unzip the delivery bundle. The repo already has Supabase configured, a
`services` table, an `appointments` table with `room_id`, and a basic `rooms`
table — this work extends them, does not replace them.

---

## Step 1 — Apply the SQL migration

Copy `supabase/migrations/20260511_room_scheduling.sql` into the repo at the
same path. The file is **idempotent and transactional** — it wraps everything
in `BEGIN/COMMIT`, uses `IF NOT EXISTS` and `WHERE NOT EXISTS` for every
mutation, and is safe to re-run.

Apply it:

```bash
# If using Supabase CLI with linked project:
supabase db push

# Or apply directly via psql:
psql "$DATABASE_URL" -f supabase/migrations/20260511_room_scheduling.sql
```

After applying, verify with the queries at the bottom of the migration file:

```sql
SELECT COUNT(*) FROM rooms;                       -- expect 5
SELECT COUNT(*) FROM booking_limits;              -- expect 3
SELECT COUNT(*) FROM service_rooms;               -- expect 10+
SELECT name, type, is_flex, max_concurrent_appointments,
       allowed_service_categories
  FROM rooms ORDER BY display_order;              -- inspect seeded rooms
SELECT * FROM v_room_utilization;                 -- inspect today's view
```

If row counts are off, **stop and investigate** before deploying the edge
function. The most likely cause is that the service slugs in the `UPDATE`
block don't match what's actually in the `services` table — open the
migration, find the `DO $$ BEGIN ... END $$;` block around line ~190, and
either update the slugs to match or add new `UPDATE services SET ...` lines
for any service that needs duration changes.

---

## Step 2 — Deploy the edge function

Copy `supabase/functions/get-available-slots/index.ts` into the repo at the
same path. Then:

```bash
supabase functions deploy get-available-slots
```

Test it from the Supabase Studio Functions tab or via curl:

```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/get-available-slots" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"service_id": "<uuid-of-an-iv-service>", "date": "2026-05-15"}'
```

Expected response shape:

```json
{
  "service": { "id": "...", "name": "Myers Cocktail", "category": "iv_hydration", "duration_minutes": 60 },
  "slots": [
    { "start_at": "2026-05-15T13:00:00.000Z", "end_at": "2026-05-15T14:00:00.000Z", "provider_id": "..." },
    { "start_at": "2026-05-15T13:15:00.000Z", "end_at": "2026-05-15T14:15:00.000Z", "provider_id": "..." }
  ]
}
```

If you get an empty `slots` array, that's likely correct (no provider
availability set up for that day, or the day is in the past). Check
`provider_availability` for that day-of-week and confirm at least one
provider has hours.

> **DST note:** the edge function uses a hardcoded `-05:00` offset for
> America/New_York. This is fine November through mid-March. If you're
> deploying between mid-March and early November, edit `CLINIC_TZ_OFFSET`
> to `-04:00` for now, and replace with proper IANA TZ handling before the
> next DST transition. There's a TODO comment in the file flagging this.

---

## Step 3 — Drop in the React files

Copy these into the repo at the same paths:

```
src/hooks/useAvailableSlots.ts
src/components/booking/AvailableSlotsPicker.tsx
src/pages/admin/SchedulingSettings.tsx
src/components/admin/scheduling/RoomList.tsx
src/components/admin/scheduling/RoomBlackouts.tsx
src/components/admin/scheduling/BookingLimitsTable.tsx
src/components/admin/scheduling/ServiceDurationGrid.tsx
```

These files assume:

- `@/integrations/supabase/client` exports a `supabase` client (already true
  in this repo)
- `sonner` is installed for toasts (already true in this repo)
- Tailwind has `bg-background`, `text-foreground`, `text-accent`, `bg-primary`,
  `border-border`, `bg-muted` configured to the EHA brand tokens (charcoal /
  camel / bone — already true after the rebrand)
- `font-playfair` and `font-jost` utilities exist (already true after the
  rebrand)
- `react-helmet-async` is available for the admin page `<Helmet>` tag
  (already true in this repo)

No new dependencies. If any import fails, it's because of a path-alias drift
— check `tsconfig.json` and `vite.config.ts` for the `@/` alias.

---

## Step 4 — Wire the admin page into the router

Find the admin router (likely `src/AppRoutes.tsx` or `src/pages/admin/Admin.tsx`).
Add the route:

```tsx
import SchedulingSettings from "@/pages/admin/SchedulingSettings";

// Inside the admin routes:
<Route path="/admin/scheduling" element={<SchedulingSettings />} />
```

Add a link to it from the admin nav/sidebar. Label: "Scheduling Settings".

---

## Step 5 — Replace the patient-side time picker

Find the current booking flow component. Likely candidates by name:
`BookingFlow`, `AppointmentBooking`, `BookAppointment`, `TimeSlotPicker`,
`SchedulePicker`. Search the codebase for `available_slots` or `time_slot` or
imports of any existing scheduling hook.

In that flow, replace the existing time-slot UI with:

```tsx
import { AvailableSlotsPicker } from "@/components/booking/AvailableSlotsPicker";

<AvailableSlotsPicker
  serviceId={selectedServiceId}
  date={selectedDate}              // YYYY-MM-DD string
  providerId={selectedProviderId}  // optional
  selectedStartAt={selectedStartAt}
  onSelect={(slot) => {
    setSelectedStartAt(slot.start_at);
    setSelectedProviderId(slot.provider_id);
  }}
/>
```

When the patient confirms and you INSERT the appointment, **do not set
`room_id`**. Leave it NULL. The `enforce_appointment_room_rules` trigger will
assign the correct room automatically using the same logic the edge function
used to mark the slot available.

Required fields on the insert:
- `service_id`
- `provider_id` (from the selected slot)
- `start_at` (from the selected slot)
- `end_at` (compute as `start_at + service.duration_minutes`)
- `patient_id`
- `status` = 'scheduled' (or whatever your current default is)

The trigger will reject the insert with a clear error if the room is no
longer available (race condition between slot fetch and booking confirm). Show
the patient: "That slot was just taken — please pick another." and refetch
slots.

---

## Step 6 — Smoke test

Run through this checklist with the dev server pointed at staging:

1. **Patient sees slots.** Open the booking flow as a guest, pick Myers
   Cocktail, pick tomorrow. You should see a grid of 15-minute-granularity
   start times during clinic hours.
2. **Patient books and a room is assigned.** Complete the booking. Query:
   `SELECT id, start_at, room_id FROM appointments ORDER BY created_at DESC LIMIT 1;`
   The `room_id` should be a treatment room UUID, not NULL.
3. **Conflict detection works.** Open two tabs, hold the same slot in both,
   book the first. The second should fail at INSERT with the trigger's
   conflict error.
4. **Blackouts hide slots.** Go to Admin → Scheduling Settings → Blackouts,
   create a blackout on Room 1 for tomorrow 10:00–14:00. Then book three
   more Myers Cocktails for that window. The fourth should fail — Rooms 2,
   3, and 4 take the first three, and Room 1 is blacked out.
5. **Limits cap concurrent.** Lower the IV concurrent cap to 2 in
   Admin → Booking Limits. Confirm only 2 IV slots are bookable in any given
   time window.
6. **Lobby flex works.** Book three B12 injections concurrently — they
   should occupy three treatment rooms. Book a fourth — it should route to
   the lobby (`room_id` = lobby UUID).
7. **Lobby doesn't accept IVs.** Try to book a Myers Cocktail when all
   treatment rooms are blacked out. It should fail (no slot available),
   not route to the lobby.

---

## Step 7 — Update the README

Add a "Scheduling" section pointing at `docs/ROOM_SCHEDULING.md`.

---

## Files to delete

None. This work is purely additive. The basic `rooms` table is extended, the
appointments table is unchanged structurally (just gains a trigger), and the
existing services table gains columns with sensible defaults.

If there's a previous version of an `/admin/scheduling` page or an older
slot-picker, decide on a per-file basis whether to delete or keep as fallback.
The new system fully replaces them functionally.

---

## When you're done

Confirm to Troy:

- ✅ Migration applied, verification queries returned expected counts
- ✅ Edge function deployed and tested with curl
- ✅ Admin page accessible at /admin/scheduling with all four tabs working
- ✅ Patient booking flow shows the new slot picker
- ✅ Smoke test 1–7 above all passed
- ⚠️  Note any service slugs that didn't match and were skipped during the
     duration update — Troy may want to handle these manually
