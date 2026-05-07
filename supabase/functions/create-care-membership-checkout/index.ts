import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CARE_TIERS = {
  hormone: { priceId: "price_1TUWGzEOtKRY99puBXDbI7Of", name: "Hormone Care", amount: 14900 },
  hormone_injection: { priceId: "price_1TUWH1EOtKRY99pufz4DuJcT", name: "Hormone + Injection", amount: 24900 },
  peptide: { priceId: "price_1TUWH3EOtKRY99puAmlFTvOZ", name: "Peptide Performance", amount: 29900 },
  full: { priceId: "price_1TUWH5EOtKRY99puhz5E0Y20", name: "Full Optimization", amount: 44900 },
} as const;

type TierKey = keyof typeof CARE_TIERS;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const body = await req.json().catch(() => ({}));
    const tier = body.tier as TierKey;
    const patientId: string | undefined = body.patientId;
    const customerEmailInput: string | undefined = body.email;
    const customerName: string | undefined = body.name;

    if (!tier || !CARE_TIERS[tier]) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const tierConfig = CARE_TIERS[tier];
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let userEmail: string | undefined = customerEmailInput;
    let userId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user?.email) {
        userEmail = userData.user.email;
        userId = userData.user.id;
      }
    }

    if (patientId && !userEmail) {
      const { data: patient } = await supabaseClient
        .from("patients").select("email").eq("id", patientId).single();
      if (patient?.email) userEmail = patient.email;
    }

    if (!userEmail) throw new Error("Email is required.");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://elevatedhealthaugusta.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: tierConfig.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/care-membership?success=true&tier=${tier}`,
      cancel_url: `${origin}/care-membership`,
      metadata: {
        user_id: userId || "",
        patient_id: patientId || "",
        product: "care_membership",
        tier,
        tier_name: tierConfig.name,
        customer_name: customerName || "",
      },
      subscription_data: {
        metadata: { tier, tier_name: tierConfig.name, product: "care_membership" },
      },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CARE-MEMBERSHIP-CHECKOUT]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
