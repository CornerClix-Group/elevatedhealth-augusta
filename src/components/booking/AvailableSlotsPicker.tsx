/**
 * AvailableSlotsPicker
 *
 * Patient-facing component for booking. Shows a grid of bookable times
 * for a selected service + date. The room is assigned server-side at
 * booking time — patients never see room details.
 *
 * Drop-in to your existing booking flow at the time-selection step.
 *
 * Design tokens: warm charcoal #2A2826, camel #B8956A, bone #F2EBDC.
 * Typography: Playfair Display (display) + Jost (body).
 */

import { useMemo } from "react";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";

interface AvailableSlotsPickerProps {
  serviceId: string;
  date: string; // YYYY-MM-DD
  providerId?: string;
  selectedStartAt?: string;
  onSelect: (slot: { start_at: string; end_at: string; provider_id?: string }) => void;
}

export function AvailableSlotsPicker({
  serviceId,
  date,
  providerId,
  selectedStartAt,
  onSelect,
}: AvailableSlotsPickerProps) {
  const { slots, service, loading, error } = useAvailableSlots({
    serviceId,
    date,
    providerId,
  });

  // Group slots by morning / afternoon / evening for cleaner UX
  const grouped = useMemo(() => {
    const buckets = { morning: [] as typeof slots, afternoon: [] as typeof slots, evening: [] as typeof slots };
    for (const s of slots) {
      const hour = new Date(s.start_at).getHours();
      if (hour < 12) buckets.morning.push(s);
      else if (hour < 17) buckets.afternoon.push(s);
      else buckets.evening.push(s);
    }
    return buckets;
  }, [slots]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center text-muted-foreground">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-jost text-sm">Finding available times…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 px-6 border border-destructive/30 bg-destructive/5 rounded-sm">
        <p className="font-jost text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="py-8 text-center">
        <p className="font-jost text-sm text-muted-foreground">Select a service to see available times.</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-12 px-6 text-center border border-border bg-muted/30 rounded-sm">
        <p className="font-playfair text-xl text-foreground mb-2">No times available</p>
        <p className="font-jost text-sm text-muted-foreground max-w-md mx-auto">
          We're fully booked for {formatDate(date)}. Try another day, or call us at
          <a href="tel:+17064267383" className="text-accent ml-1 underline">(706) 426-7383</a> for a
          waitlist spot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <div>
          <p className="font-jost text-xs uppercase tracking-[0.18em] text-accent">Available times</p>
          <h3 className="font-playfair text-2xl text-foreground mt-1">
            {formatDate(date)}
          </h3>
        </div>
        <p className="font-jost text-sm text-muted-foreground">
          {service.duration_minutes} min · {service.name}
        </p>
      </div>

      {(['morning', 'afternoon', 'evening'] as const).map((bucket) => {
        const list = grouped[bucket];
        if (list.length === 0) return null;
        return (
          <div key={bucket}>
            <p className="font-jost text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">
              {bucket}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {list.map((slot) => {
                const isSelected = selectedStartAt === slot.start_at;
                return (
                  <button
                    key={slot.start_at}
                    type="button"
                    onClick={() => onSelect(slot)}
                    className={[
                      "py-3 px-2 font-jost text-sm rounded-sm border transition-all duration-200",
                      isSelected
                        ? "bg-primary text-accent border-accent shadow-[0_0_0_2px_var(--accent)_inset]"
                        : "bg-background text-foreground border-border hover:border-accent hover:bg-muted/50",
                    ].join(" ")}
                  >
                    {formatTime(slot.start_at)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="font-jost text-xs text-muted-foreground italic">
        Don't see a time that works? Call us at <a href="tel:+17064267383" className="text-accent underline">(706) 426-7383</a> —
        we'll fit you in when we can.
      </p>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(yyyymmdd: string): string {
  const d = new Date(`${yyyymmdd}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
