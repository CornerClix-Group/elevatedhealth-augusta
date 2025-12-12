import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sinch fax status mapping
const STATUS_MAP: Record<string, string> = {
  "QUEUED": "queued",
  "IN_PROGRESS": "transmitting",
  "COMPLETED": "delivered",
  "FAILED": "failed",
  "CANCELED": "canceled",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log("Sinch webhook received:", JSON.stringify(body));

    // Sinch sends fax status updates with faxId and status
    // Handle both direct event format and wrapped format
    const faxId = body.id || body.faxId || body.fax_id;
    const sinchStatus = body.status || body.faxStatus;
    const errorMessage = body.errorMessage || body.error?.message;
    const completedAt = body.completedAt || body.completed_at;
    const pages = body.numberOfPages || body.pages;

    if (!faxId) {
      console.log("No fax ID in webhook payload");
      return new Response(
        JSON.stringify({ received: true, message: "No fax ID provided" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Map Sinch status to our internal status
    const mappedStatus = STATUS_MAP[sinchStatus?.toUpperCase()] || sinchStatus?.toLowerCase() || "unknown";
    
    console.log(`Updating fax ${faxId} to status: ${mappedStatus}`);

    // Find and update the order with this fax_id
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, patient_id, fax_status")
      .eq("fax_id", faxId)
      .single();

    if (findError || !order) {
      console.log(`Order with fax_id ${faxId} not found:`, findError?.message);
      return new Response(
        JSON.stringify({ received: true, message: "Order not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the order with new fax status
    const updateData: Record<string, any> = {
      fax_status: mappedStatus,
      updated_at: new Date().toISOString(),
    };

    // If failed, store the error message
    if (mappedStatus === "failed" && errorMessage) {
      updateData.fax_error = errorMessage;
    }

    // If delivered, update the status to completed
    if (mappedStatus === "delivered") {
      updateData.status = "completed";
      console.log(`Fax ${faxId} delivered successfully - marking order as completed`);
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    console.log(`Order ${order.id} updated - fax_status: ${mappedStatus}`);

    return new Response(
      JSON.stringify({
        received: true,
        order_id: order.id,
        fax_id: faxId,
        status: mappedStatus,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing Sinch webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
