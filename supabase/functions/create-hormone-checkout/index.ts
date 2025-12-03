import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-HORMONE-CHECKOUT] ${step}${detailsStr}`);
};

// Two diagnostic tiers based on ZRT costs
const MAPPING_TIERS = {
  hormone: {
    priceId: "price_1SZiRMEOtKRY99pua6QMu12h", // Hormone Mapping $299
    name: "Hormone Mapping",
    zrtPanel: "saliva_iii",
  },
  metabolic: {
    priceId: "price_1Sa4bNEOtKRY99pulS73hT1V", // Metabolic Mapping $399
    name: "Metabolic Mapping",
    zrtPanel: "weight_management",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Parse request body for mapping type
    const body = await req.json().catch(() => ({}));
    const mappingType = body.mappingType || "hormone"; // Default to hormone mapping
    
    const tier = MAPPING_TIERS[mappingType as keyof typeof MAPPING_TIERS] || MAPPING_TIERS.hormone;
    logStep("Mapping tier selected", { mappingType, tier: tier.name, priceId: tier.priceId });

    // Check for authenticated user (optional - supports guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user?.email) {
        userEmail = userData.user.email;
        userId = userData.user.id;
        logStep("Authenticated user found", { email: userEmail });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "https://elevatedhealthaugusta.com";

    // Create checkout session for selected mapping tier with shipping address
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: tier.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: `${origin}/schedule-consult?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/hormones-women`,
      metadata: {
        user_id: userId || "",
        product: mappingType === "metabolic" ? "metabolic_mapping_package" : "hormone_mapping_package",
        zrt_panel: tier.zrtPanel,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url, tier: tier.name });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});