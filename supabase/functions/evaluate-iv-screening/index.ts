import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EvaluateRequest = {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  selected_therapy_id?: string;
  selected_service_id?: string; // legacy alias

  has_chf?: boolean;
  has_esrd?: boolean;
  is_pregnant?: boolean;
  has_anaphylaxis_history?: boolean;
  has_g6pd_deficiency?: boolean;
  has_ckd?: boolean;
  on_anticoagulants?: boolean;
  has_hypertension_uncontrolled?: boolean;
  has_diabetes?: boolean;
  has_thyroid_disorder?: boolean;
  currently_breastfeeding?: boolean;
  has_sesame_allergy?: boolean;
  has_iv_allergies?: boolean;

  iv_allergies_text?: string;
  current_medications?: string;
  known_allergies?: string;
  recent_surgeries?: string;
  acknowledged_disclaimer?: boolean;
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

    const body = (await req.json().catch(() => ({}))) as EvaluateRequest;

    const requiredFields = [
      "email",
      "phone",
      "first_name",
      "last_name",
      "date_of_birth",
      "acknowledged_disclaimer",
    ] as const;

    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        (typeof body[field] === "string" && !String(body[field]).trim())
      ) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (body.acknowledged_disclaimer !== true) {
      return new Response(
        JSON.stringify({ error: "acknowledged_disclaimer must be true" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const selectedTherapyId = body.selected_therapy_id || body.selected_service_id;
    if (!selectedTherapyId?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: selected_therapy_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const boolFields = [
      "has_chf",
      "has_esrd",
      "is_pregnant",
      "has_anaphylaxis_history",
      "has_g6pd_deficiency",
      "has_ckd",
      "on_anticoagulants",
      "has_hypertension_uncontrolled",
      "has_diabetes",
      "has_thyroid_disorder",
      "currently_breastfeeding",
      "has_sesame_allergy",
      "has_iv_allergies",
    ] as const;

    for (const field of boolFields) {
      if (typeof body[field] !== "boolean") {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: therapy, error: therapyErr } = await supabase
      .from("iv_therapies")
      .select("id, name, requires_g6pd_clearance, contraindicates_sesame_allergy")
      .eq("id", selectedTherapyId)
      .maybeSingle();

    if (therapyErr) {
      console.error("[evaluate-iv-screening] therapy lookup error:", therapyErr);
      return new Response(
        JSON.stringify({ error: "Could not validate selected IV therapy" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!therapy) {
      return new Response(
        JSON.stringify({ error: "Selected IV therapy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const blockReasons: string[] = [];
    const warnReasons: string[] = [];

    if (body.has_chf) {
      blockReasons.push("Active CHF is a contraindication for IV hydration therapy.");
    }
    if (body.has_esrd) {
      blockReasons.push("End-stage renal disease is a contraindication.");
    }
    if (body.is_pregnant) {
      blockReasons.push("We do not provide IV therapy during pregnancy at this clinic.");
    }
    if (body.has_anaphylaxis_history) {
      blockReasons.push(
        "History of anaphylaxis requires in-person physician consultation prior to any IV therapy.",
      );
    }
    if (therapy.requires_g6pd_clearance && body.has_g6pd_deficiency) {
      blockReasons.push("G6PD deficiency contraindicates the selected service.");
    }
    if (therapy.contraindicates_sesame_allergy && body.has_sesame_allergy) {
      blockReasons.push(
        "Selected service is formulated in sesame oil and you reported a sesame allergy.",
      );
    }

    if (body.has_ckd) {
      warnReasons.push("Chronic kidney disease - reduced fluid volume recommended.");
    }
    if (body.on_anticoagulants) {
      warnReasons.push("Anticoagulant use - careful venipuncture required.");
    }
    if (body.has_hypertension_uncontrolled) {
      warnReasons.push("Uncontrolled HTN - vitals must be checked before infusion.");
    }
    if (body.has_diabetes) {
      warnReasons.push("Diabetes - monitor blood glucose if dextrose-containing service.");
    }
    if (body.has_thyroid_disorder) {
      warnReasons.push("Thyroid disorder noted.");
    }
    if (body.currently_breastfeeding) {
      warnReasons.push("Breastfeeding - some ingredients pass into breast milk.");
    }
    if (body.has_iv_allergies) {
      warnReasons.push("Reported IV allergies require staff review pre-infusion.");
    }

    const screeningResult =
      blockReasons.length > 0 ? "blocked" : warnReasons.length > 0 ? "warned" : "cleared";

    const { data: intake, error: intakeErr } = await supabase
      .from("iv_intake_responses")
      .insert({
        email: body.email,
        phone: body.phone,
        first_name: body.first_name,
        last_name: body.last_name,
        date_of_birth: body.date_of_birth,
        selected_therapy_id: therapy.id,

        has_chf: body.has_chf,
        has_esrd: body.has_esrd,
        is_pregnant: body.is_pregnant,
        has_anaphylaxis_history: body.has_anaphylaxis_history,
        has_g6pd_deficiency: body.has_g6pd_deficiency,
        has_ckd: body.has_ckd,
        on_anticoagulants: body.on_anticoagulants,
        has_hypertension_uncontrolled: body.has_hypertension_uncontrolled,
        has_diabetes: body.has_diabetes,
        has_thyroid_disorder: body.has_thyroid_disorder,
        currently_breastfeeding: body.currently_breastfeeding,
        has_sesame_allergy: body.has_sesame_allergy,
        has_iv_allergies: body.has_iv_allergies,

        iv_allergies_text: body.iv_allergies_text || null,
        current_medications: body.current_medications || null,
        known_allergies: body.known_allergies || null,
        recent_surgeries: body.recent_surgeries || null,
        acknowledged_disclaimer: body.acknowledged_disclaimer,
        screening_result: screeningResult,
        block_reasons: blockReasons,
        warn_reasons: warnReasons,
      })
      .select("id, screening_result, block_reasons, warn_reasons")
      .single();

    if (intakeErr || !intake) {
      console.error("[evaluate-iv-screening] insert error:", intakeErr);
      return new Response(
        JSON.stringify({ error: "Failed to save intake screening" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (screeningResult === "blocked") {
      // Fire-and-forget follow-up notifications. Do not block patient flow.
      try {
        await supabase.functions.invoke("send-blocked-intake-notifications", {
          body: { intake_id: intake.id },
        });
      } catch (notifyErr) {
        console.error("[evaluate-iv-screening] blocked notification call failed:", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({
        intake_id: intake.id,
        screening_result: intake.screening_result,
        block_reasons: intake.block_reasons ?? [],
        warn_reasons: intake.warn_reasons ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[evaluate-iv-screening] unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
