/**
 * bootstrap-cron-secret-vault — one-shot bootstrap.
 *
 * Reads CRON_SECRET from edge function env and stores it in Supabase Vault
 * under the name 'cron_secret', so cron jobs can reference it via
 * vault.decrypted_secrets without ever exposing plaintext in migrations,
 * chat, or cron.job command fields.
 *
 * Auth: requires X-Cron-Secret header matching CRON_SECRET (so only an
 * operator who already knows the secret — or the platform itself — can
 * trigger it). Safe to call repeatedly: idempotent upsert.
 *
 * Should be deleted after successful use.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "CRON_SECRET env not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supplied = req.headers.get("X-Cron-Secret");
  if (supplied !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Upsert into vault: if exists, update; else create.
  const { data: existing, error: selErr } = await supabase
    .schema("vault" as any)
    .from("secrets")
    .select("id")
    .eq("name", "cron_secret")
    .maybeSingle();

  if (selErr) {
    return new Response(JSON.stringify({ error: "vault select failed", detail: selErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let action: string;
  if (existing?.id) {
    const { error } = await supabase.rpc("bootstrap_vault_update_cron_secret", {
      _value: expected,
    });
    if (error) {
      return new Response(JSON.stringify({ error: "vault update failed", detail: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    action = "updated";
  } else {
    const { error } = await supabase.rpc("bootstrap_vault_create_cron_secret", {
      _value: expected,
    });
    if (error) {
      return new Response(JSON.stringify({ error: "vault create failed", detail: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    action = "created";
  }

  return new Response(JSON.stringify({ ok: true, action }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
