import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOHIGHLEVEL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/wqGyQyVn4INUQXzYRwuv/webhook-trigger/p8bD223V4h9DSSogCliJ";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const {
      name,
      email,
      phone,
      interest,
      chat_summary,
      source = 'website_chat',
      lead_id
    } = body;

    console.log('Sending lead to GoHighLevel:', { name, email, phone, interest, source });

    // Send to GoHighLevel webhook
    const ghlPayload = {
      // Standard contact fields
      name: name || '',
      firstName: name?.split(' ')[0] || '',
      lastName: name?.split(' ').slice(1).join(' ') || '',
      email: email || '',
      phone: phone || '',
      
      // Custom fields for your GHL setup
      source: source,
      interest: interest || 'General Inquiry',
      chatSummary: chat_summary || '',
      leadId: lead_id || '',
      
      // Timestamp
      createdAt: new Date().toISOString(),
      
      // Tags for segmentation
      tags: [
        'website_lead',
        source === 'voice_agent' ? 'ai_voice_call' : 'ai_chat',
        interest ? `interest_${interest.toLowerCase().replace(/\s+/g, '_')}` : 'general'
      ].filter(Boolean)
    };

    const ghlResponse = await fetch(GOHIGHLEVEL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ghlPayload),
    });

    const responseText = await ghlResponse.text();
    console.log('GoHighLevel response status:', ghlResponse.status);
    console.log('GoHighLevel response:', responseText);

    if (!ghlResponse.ok) {
      throw new Error(`GoHighLevel webhook failed: ${ghlResponse.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sent to GoHighLevel successfully',
        ghlStatus: ghlResponse.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending to GoHighLevel:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
