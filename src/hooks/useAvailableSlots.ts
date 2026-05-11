/**
 * useAvailableSlots
 *
 * Patient-facing hook that fetches room-aware available time slots
 * for a given service + date. The room logic is entirely server-side —
 * patients only see whether a slot is bookable.
 *
 * Usage:
 *   const { slots, loading, error } = useAvailableSlots({
 *     serviceId,
 *     date: '2026-05-15',
 *   });
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableSlot {
  start_at: string; // ISO
  end_at: string;
  provider_id?: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
}

interface UseAvailableSlotsParams {
  serviceId: string | null | undefined;
  date: string | null | undefined; // YYYY-MM-DD
  providerId?: string;
  enabled?: boolean;
}

interface UseAvailableSlotsResult {
  slots: AvailableSlot[];
  service: ServiceInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAvailableSlots({
  serviceId,
  date,
  providerId,
  enabled = true,
}: UseAvailableSlotsParams): UseAvailableSlotsResult {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    if (!serviceId || !date) {
      setSlots([]);
      setService(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "get-available-slots",
        { body: { service_id: serviceId, date, provider_id: providerId } },
      );
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setSlots(data?.slots || []);
      setService(data?.service || null);
    } catch (e: any) {
      console.error("useAvailableSlots error", e);
      setError(e.message || "Failed to load available times");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date, providerId, enabled]);

  return { slots, service, loading, error, refetch: fetchSlots };
}
