import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const intakeId = typeof body?.intake_id === "string" ? body.intake_id : null;
    if (!intakeId) {
      return new Response(
        JSON.stringify({ error: "intake_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existing, error: existingErr } = await supabase
      .from("iv_intake_responses")
      .select("id, screening_result")
      .eq("id", intakeId)
      .maybeSingle();

    if (existingErr) {
      return new Response(
        JSON.stringify({ error: "Failed to verify intake row" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Intake row not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (existing.screening_result !== "warned") {
      return new Response(
        JSON.stringify({ error: "Only warned intakes can be acknowledged" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updateErr } = await supabase
      .from("iv_intake_responses")
      .update({
        screening_result: "warned_acknowledged",
        acknowledged_warnings: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to acknowledge warnings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, intake_id: intakeId, status: "warned_acknowledged" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[acknowledge-iv-warnings] unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
