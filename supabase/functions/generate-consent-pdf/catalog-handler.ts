/**
 * Catalog consent PDF generation (consent_records + consent_versions).
 *
 * PDF SERVICE: Not configured in v1. Set PDFSHIFT_API_KEY (or similar) in a follow-up
 * to enable binary PDF upload. Until then returns PDF_GENERATION_NOT_CONFIGURED and the
 * consent_records row remains signed without pdf_storage_path.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import MarkdownIt from "https://esm.sh/markdown-it@14.1.0";

const CLINIC_NAME = "Elevated Health Augusta";
const CLINIC_ADDRESS = "7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809";
const CLINIC_PHONE = "(706) 760-3470";

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

function buildCatalogHtml(params: {
  title: string;
  bodyMarkdown: string;
  patientName: string;
  signedTypedName: string;
  signedAt: string;
  versionLabel: string;
  documentHash: string;
  sectionAttestations: Record<string, boolean> | null;
}): string {
  const bodyHtml = md.render(params.bodyMarkdown);
  const attestationRows = params.sectionAttestations
    ? Object.entries(params.sectionAttestations)
        .map(
          ([id, ok]) =>
            `<tr><td>${id}</td><td>${ok ? "Yes" : "No"}</td></tr>`,
        )
        .join("")
    : "";

  const attestationTable =
    attestationRows.length > 0
      ? `<h3>Section attestations</h3><table border="1" cellpadding="6" cellspacing="0"><tr><th>Section</th><th>Attested</th></tr>${attestationRows}</table>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.55; color: #222; margin: 40px; }
    h1,h2,h3 { color: #2A2826; }
    .meta { background: #f5f0e8; padding: 12px; border-radius: 6px; margin-bottom: 24px; }
    .signature { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 16px; }
    .sig-name { font-family: "Brush Script MT", cursive; font-size: 22pt; font-style: italic; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
  </style>
</head>
<body>
  <div class="meta">
    <strong>${CLINIC_NAME}</strong><br/>
    ${CLINIC_ADDRESS} | ${CLINIC_PHONE}<br/>
    Patient: ${params.patientName}
  </div>
  <h1>${params.title}</h1>
  ${bodyHtml}
  ${attestationTable}
  <div class="signature">
    <p class="sig-name">${params.signedTypedName}</p>
    <p>Signed electronically on ${params.signedAt}</p>
    <p>Document version: ${params.versionLabel}</p>
    <p>Document hash: <code>${params.documentHash}</code></p>
  </div>
</body>
</html>`;
}

async function authorizeConsentRecord(
  req: Request,
  supabaseAdmin: SupabaseClient,
  patientId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  const userId = userData.user.id;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const privileged = (roles || []).some(
    (r) => r.role === "staff" || r.role === "admin" || r.role === "provider",
  );
  if (privileged) return { ok: true };

  const { data: patientRow } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("user_id", userId)
    .maybeSingle();
  if (patientRow) return { ok: true };

  return { ok: false, status: 403, error: "Not authorized for this consent record" };
}

export async function handleCatalogConsentPdf(
  req: Request,
  consentRecordId: string,
): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const logBase = {
    event: "generate_consent_pdf_catalog",
    consent_record_id: consentRecordId,
    timestamp: new Date().toISOString(),
  };

  const { data: record, error: recordError } = await supabase
    .from("consent_records")
    .select("*")
    .eq("id", consentRecordId)
    .single();

  if (recordError || !record) {
    console.log(JSON.stringify({ ...logBase, success: false, error: "record_not_found" }));
    return new Response(JSON.stringify({ error: "Consent record not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authorizeConsentRecord(req, supabase, record.patient_id);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: version, error: versionError } = await supabase
    .from("consent_versions")
    .select("*")
    .eq("id", record.consent_version_id)
    .single();

  if (versionError || !version) {
    console.log(JSON.stringify({ ...logBase, success: false, error: "version_not_found" }));
    return new Response(JSON.stringify({ error: "Consent version not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("id", record.patient_id)
    .single();

  if (patientError || !patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signedAtDisplay = new Date(record.signed_at).toLocaleString("en-US", {
    timeZone: "America/New_York",
  });

  const html = buildCatalogHtml({
    title: version.title,
    bodyMarkdown: version.body_markdown,
    patientName: patient.full_name,
    signedTypedName: record.signed_typed_name,
    signedAt: signedAtDisplay,
    versionLabel: version.version_label,
    documentHash: record.document_text_hash,
    sectionAttestations: record.section_attestations as Record<string, boolean> | null,
  });

  const pdfApiKey = Deno.env.get("PDFSHIFT_API_KEY");
  if (!pdfApiKey) {
    console.log(
      JSON.stringify({
        ...logBase,
        success: false,
        code: "PDF_GENERATION_NOT_CONFIGURED",
        html_bytes: html.length,
      }),
    );
    return new Response(
      JSON.stringify({
        ok: false,
        code: "PDF_GENERATION_NOT_CONFIGURED",
        message:
          "PDF generation service not configured. Set PDFSHIFT_API_KEY in Supabase secrets.",
        storage_path: null,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const pdfRes = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${pdfApiKey}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: html, landscape: false, use_print: false }),
    });

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      throw new Error(`PDFShift error ${pdfRes.status}: ${errText.slice(0, 200)}`);
    }

    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    const timestamp = new Date(record.signed_at).toISOString().replace(/[:.]/g, "-");
    const storagePath = `${record.patient_id}/${record.consent_type}-${version.version_label}-${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("signed-consents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: updateError } = await supabase
      .from("consent_records")
      .update({ pdf_storage_path: storagePath })
      .eq("id", record.id);

    if (updateError) {
      throw updateError;
    }

    console.log(JSON.stringify({ ...logBase, success: true, storage_path: storagePath }));

    return new Response(
      JSON.stringify({ ok: true, storage_path: storagePath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify({ ...logBase, success: false, error: message }));
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
