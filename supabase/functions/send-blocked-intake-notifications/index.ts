import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendResendEmail(args: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.message || `Resend failed with status ${res.status}`);
  }
  return payload;
}

function patientEmailHtml(input: {
  firstName: string;
  intakeId: string;
}) {
  const scheduleUrl = `https://elevatedhealthaugusta.com/book/consult/safety?intake_id=${encodeURIComponent(input.intakeId)}`;
  return `
  <div style="font-family: Arial, sans-serif; color:#2A2826; max-width:640px; margin:0 auto; padding:24px;">
    <h2 style="font-family: Georgia, serif; font-style: italic; margin:0 0 16px;">Elevated Health Augusta</h2>
    <p>Hi ${input.firstName},</p>
    <p>Thank you for your interest in IV therapy at Elevated Health Augusta.</p>
    <p>Based on the medical history you shared, we'd like to have one of our physicians evaluate you before scheduling IV therapy. This is a routine safety step — it doesn't mean IV is off the table.</p>
    <p>We've reserved a complimentary 30-minute safety consultation for you, no charge.</p>
    <p style="margin:24px 0;">
      <a href="${scheduleUrl}" style="background:#B8956A;color:#F2EBDC;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
        Schedule My Free Consult
      </a>
    </p>
    <p>Or call us at <a href="tel:+17067603470">(706) 760-3470</a> and we'll help you book directly.</p>
    <p>A member of our team will also follow up with you personally within 1 business day.</p>
    <p>— The Elevated Health Augusta Team</p>
  </div>`;
}

function staffEmailHtml(input: {
  intakeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  serviceName: string;
  blockReasons: string[];
}) {
  const adminUrl = `https://elevatedhealthaugusta.com/admin/intake-follow-ups/${encodeURIComponent(input.intakeId)}`;
  return `
  <div style="font-family: Arial, sans-serif; color:#2A2826; max-width:720px; margin:0 auto; padding:24px;">
    <h3 style="margin:0 0 16px;">A new IV intake was blocked at screening and needs follow-up.</h3>
    <p><strong>Patient:</strong> ${input.firstName} ${input.lastName}</p>
    <p><strong>Email:</strong> ${input.email}</p>
    <p><strong>Phone:</strong> ${input.phone || "—"}</p>
    <p><strong>DOB:</strong> ${input.dob || "—"}</p>
    <p><strong>Service requested:</strong> ${input.serviceName}</p>
    <p><strong>Block reasons:</strong></p>
    <ul>${input.blockReasons.map((r) => `<li>${r}</li>`).join("")}</ul>
    <p>Patient was sent the safety consultation invitation automatically.</p>
    <p><strong>Follow-up status:</strong> new</p>
    <p><a href="${adminUrl}">View intake in admin dashboard</a></p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const intakeId = typeof body?.intake_id === "string" ? body.intake_id : null;
    const reminderOnly = body?.reminder_only === true;
    if (!intakeId) {
      return new Response(JSON.stringify({ error: "intake_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intake, error: intakeErr } = await supabase
      .from("iv_intake_responses")
      .select("id, screening_result, first_name, last_name, email, phone, date_of_birth, block_reasons, selected_therapy_id")
      .eq("id", intakeId)
      .maybeSingle();
    if (intakeErr || !intake) {
      return new Response(JSON.stringify({ error: "Intake not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (intake.screening_result !== "blocked") {
      return new Response(JSON.stringify({ error: "Notifications only apply to blocked intake rows" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let serviceName = "IV service";
    if (intake.selected_therapy_id) {
      const { data: service } = await supabase
        .from("iv_therapies")
        .select("name")
        .eq("id", intake.selected_therapy_id)
        .maybeSingle();
      if (service?.name) serviceName = service.name;
    }

    const patientTo = intake.email;
    const staffTo = "admin@elevatedhealthaugusta.com";
    const from = "admin@elevatedhealthaugusta.com";

    let patientSent = false;
    let staffSent = false;
    const failLogs: Array<{ email_type: string; error_message: string }> = [];

    try {
      await sendResendEmail({
        apiKey: resendApiKey,
        from,
        to: patientTo,
        subject: "We received your IV intake — next steps",
        html: patientEmailHtml({
          firstName: intake.first_name || "there",
          intakeId,
        }),
      });
      patientSent = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[send-blocked-intake-notifications] patient email failed:", msg);
      failLogs.push({ email_type: "patient", error_message: msg });
    }

    if (!reminderOnly) {
      try {
        await sendResendEmail({
          apiKey: resendApiKey,
          from,
          to: staffTo,
          subject: `🚩 Blocked IV intake — ${intake.first_name || ""} ${intake.last_name || ""} — needs follow-up`,
          html: staffEmailHtml({
            intakeId,
            firstName: intake.first_name || "",
            lastName: intake.last_name || "",
            email: intake.email,
            phone: intake.phone || null,
            dob: intake.date_of_birth || null,
            serviceName,
            blockReasons: intake.block_reasons || [],
          }),
        });
        staffSent = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[send-blocked-intake-notifications] staff email failed:", msg);
        failLogs.push({ email_type: "staff", error_message: msg });
      }
    }

    if (failLogs.length > 0) {
      for (const row of failLogs) {
        await supabase.from("notification_failures").insert({
          intake_id: intakeId,
          email_type: row.email_type,
          error_message: row.error_message,
        });
      }
    }

    const patch: Record<string, string> = {};
    if (patientSent) patch.patient_notified_email_sent_at = new Date().toISOString();
    if (staffSent) patch.staff_notified_email_sent_at = new Date().toISOString();
    if (Object.keys(patch).length > 0) {
      await supabase.from("iv_intake_responses").update(patch).eq("id", intakeId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        intake_id: intakeId,
        patient_email_sent: patientSent,
        staff_email_sent: staffSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[send-blocked-intake-notifications] unexpected error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
