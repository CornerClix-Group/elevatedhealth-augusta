import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  name: string;
  patientId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, patientId }: InviteRequest = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    console.log(`Sending invite to ${email} for patient ${patientId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://elevatedhealthaugusta.com"}/patient/dashboard`,
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      throw linkError;
    }

    const magicLink = linkData.properties?.action_link;

    // Update patient with user_id if created
    if (linkData.user) {
      await supabase
        .from("patients")
        .update({ user_id: linkData.user.id })
        .eq("id", patientId);
    }

    // Send email via Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Elevated Health <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Elevated Health - Your Personal Wellness Portal",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #2C3E50; font-size: 28px; margin: 0; font-weight: 300;">
                    Elevated Health
                  </h1>
                  <p style="color: #B8860B; font-size: 12px; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase;">
                    Augusta's Premier Wellness Destination
                  </p>
                </div>

                <div style="margin-bottom: 32px;">
                  <h2 style="color: #2C3E50; font-size: 24px; margin: 0 0 16px 0;">
                    Welcome, ${name}!
                  </h2>
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0;">
                    Lauren Bersi, FNP-C has invited you to access your personal wellness portal at Elevated Health.
                  </p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${magicLink}" style="display: inline-block; background-color: #2C3E50; color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 500;">
                    Access Your Portal
                  </a>
                </div>

                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-top: 32px;">
                  <h3 style="color: #2C3E50; font-size: 16px; margin: 0 0 16px 0;">What's Next?</h3>
                  <ol style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Click the button above to access your portal</li>
                    <li>Complete the medical intake questionnaire</li>
                    <li>Lauren will review and create your personalized protocol</li>
                  </ol>
                </div>

                <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
                  This link is valid for 24 hours.
                </p>

              </div>

              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Elevated Health Augusta | 7013 Evans Town Center Blvd, Suite 203 | Evans, GA 30809
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-patient-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);