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
    const intakeId = req.method === "POST"
      ? (await req.json().catch(() => ({})))?.intake_id
      : new URL(req.url).searchParams.get("intake_id");

    if (!intakeId || typeof intakeId !== "string") {
      return new Response(
        JSON.stringify({ error: "intake_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("iv_intake_responses")
      .select("id, first_name, last_name, email, phone, selected_therapy_id, screening_result, block_reasons, warn_reasons, block_severity, has_anaphylaxis_history, acknowledged_warnings, appointment_id")
      .eq("id", intakeId)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to load intake status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!data) {
      return new Response(
        JSON.stringify({ error: "Intake not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        intake_id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        selected_therapy_id: data.selected_therapy_id,
        screening_result: data.screening_result,
        block_reasons: data.block_reasons ?? [],
        warn_reasons: data.warn_reasons ?? [],
        block_severity: data.block_severity,
        has_anaphylaxis_history: !!data.has_anaphylaxis_history,
        acknowledged_warnings: !!data.acknowledged_warnings,
        appointment_id: data.appointment_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[get-iv-screening-status] unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
