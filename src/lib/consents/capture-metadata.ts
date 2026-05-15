import { supabase } from "@/integrations/supabase/client";

export type SigningMetadata = {
  ip: string;
  userAgent: string;
  timestamp: string;
};

/**
 * Capture client metadata for consent signing.
 * IP is resolved via the get-client-ip edge function (Supabase-forwarded headers).
 */
export async function captureSigningMetadata(): Promise<SigningMetadata> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const timestamp = new Date().toISOString();

  let ip = "unknown";
  try {
    const { data, error } = await supabase.functions.invoke("get-client-ip");
    if (!error && data?.ip) {
      ip = String(data.ip);
    }
  } catch {
    // Non-blocking — record unknown and continue signing
  }

  return { ip, userAgent, timestamp };
}
