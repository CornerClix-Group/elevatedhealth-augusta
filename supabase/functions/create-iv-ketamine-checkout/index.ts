import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-IV-KETAMINE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { patientName, patientEmail, patientPhone, sessionNumber } = await req.json();
    
    if (!patientEmail) {
      throw new Error("Patient email is required");
    }
    logStep("Request data received", { patientName, patientEmail, patientPhone, sessionNumber });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: patientEmail, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: patientEmail,
        name: patientName || undefined,
        phone: patientPhone || undefined,
        metadata: {
          service: "iv_ketamine_infusion"
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://elevatedhealthaugusta.com";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: "price_1SaYv3EOtKRY99pulkr4H1At", // IV Ketamine Infusion - $400
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/ketamine-payment-success?session_id={CHECKOUT_SESSION_ID}&type=infusion`,
      cancel_url: `${origin}/ketamine`,
      metadata: {
        service: "iv_ketamine_infusion",
        patient_name: patientName || "",
        patient_email: patientEmail,
        patient_phone: patientPhone || "",
        session_number: sessionNumber?.toString() || "1"
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
