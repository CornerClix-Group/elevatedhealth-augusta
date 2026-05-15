import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const cfIp = req.headers.get("cf-connecting-ip");
  const realIp = req.headers.get("x-real-ip");

  const ip =
    (cfIp && cfIp.trim()) ||
    (forwarded?.split(",")[0]?.trim()) ||
    (realIp && realIp.trim()) ||
    "unknown";

  console.log(
    JSON.stringify({
      event: "get_client_ip",
      ip,
      timestamp: new Date().toISOString(),
    }),
  );

  return new Response(JSON.stringify({ ip }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
