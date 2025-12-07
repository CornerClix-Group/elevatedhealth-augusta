import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BUSINESS-METRICS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user is authenticated and has business_admin, admin, or staff role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const hasAccess = roles?.some(r => 
      r.role === "admin" || r.role === "staff" || r.role === "business_admin"
    );
    if (!hasAccess) throw new Error("Access denied");

    logStep("User authorized", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get active subscriptions for MRR
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    let totalMRR = 0;
    const subscriptionDetails: any[] = [];

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        if (price.recurring?.interval === "month") {
          totalMRR += (price.unit_amount || 0) / 100;
        } else if (price.recurring?.interval === "year") {
          totalMRR += ((price.unit_amount || 0) / 100) / 12;
        }
      }
      subscriptionDetails.push({
        id: sub.id,
        customerEmail: sub.customer ? (typeof sub.customer === 'string' ? sub.customer : sub.customer.email) : null,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      });
    }

    // Get this month's charges for cash collected
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfMonth.getTime() / 1000),
      },
      limit: 100,
    });
    logStep("Fetched charges", { count: charges.data.length });

    const cashCollected = charges.data
      .filter((c: Stripe.Charge) => c.status === "succeeded" && !c.refunded)
      .reduce((sum: number, c: Stripe.Charge) => sum + (c.amount / 100), 0);

    // Get failed payments from invoice.payment_failed events (last 30 days)
    const failedInvoices = await stripe.invoices.list({
      status: "open",
      limit: 50,
    });
    
    const failedPayments = failedInvoices.data
      .filter((inv: Stripe.Invoice) => inv.attempted && !inv.paid)
      .map((inv: Stripe.Invoice) => ({
        id: inv.id,
        customerEmail: inv.customer_email,
        amountDue: (inv.amount_due || 0) / 100,
        dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        lastAttempt: inv.attempted ? new Date(inv.created * 1000).toISOString() : null,
      }));

    logStep("Compiled metrics", { 
      totalMRR, 
      cashCollected, 
      activeSubscriptions: subscriptions.data.length,
      failedPayments: failedPayments.length 
    });

    return new Response(JSON.stringify({
      mrr: totalMRR,
      cashCollectedThisMonth: cashCollected,
      activeSubscriptionCount: subscriptions.data.length,
      projectedRevenue: totalMRR * 12,
      failedPayments,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Access denied" ? 403 : 500,
    });
  }
});
