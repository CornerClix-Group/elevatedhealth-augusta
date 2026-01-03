import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TIRZEPATIDE-CHECKOUT] ${step}${detailsStr}`);
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { email, name } = await req.json();
    logStep("Request body parsed", { email, name });

    // Tirzepatide Membership - $499/month
    const TIRZEPATIDE_PRICE_ID = "price_1SlZnyEOtKRY99puE9JNOrTR";

    // Check if customer exists
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: TIRZEPATIDE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/payment-success?type=tirzepatide`,
      cancel_url: `${req.headers.get("origin")}/weight-loss`,
      metadata: {
        service_type: "tirzepatide_membership",
        patient_name: name || "",
        patient_email: email || "",
      },
      subscription_data: {
        metadata: {
          service_type: "tirzepatide_membership",
          patient_name: name || "",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Record pending subscription in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseKey && email) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("consultation_bookings").insert({
        customer_email: email,
        customer_name: name || null,
        service_type: "tirzepatide_membership",
        status: "pending_payment",
        stripe_session_id: session.id,
        notes: "Tirzepatide Membership subscription - $499/month",
      });
      logStep("Pending subscription recorded in database");
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
