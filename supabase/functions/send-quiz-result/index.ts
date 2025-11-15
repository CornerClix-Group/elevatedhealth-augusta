import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const PAUBOX_SMTP_PASSWORD = Deno.env.get("PAUBOX_SMTP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const quizResultSchema = z.object({
  treatment: z.string(),
  reason: z.string(),
  score: z.number(),
  insurance: z.string(),
  answers: z.array(z.string()),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing quiz result submission...");
    
    const requestData = await req.json();
    const validatedData = quizResultSchema.parse(requestData);
    
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.paubox.com",
        port: 465,
        tls: true,
        auth: {
          username: "care@elevatedhealthaugusta.com",
          password: PAUBOX_SMTP_PASSWORD!,
        },
      },
    });

    await client.send({
      from: "care@elevatedhealthaugusta.com",
      to: "booking@elevatedhealthaugusta.com",
      subject: "New Quiz Completion - Treatment Path Recommendation",
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #27AE60; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .field { margin-bottom: 20px; }
              .field-label { font-weight: bold; color: #27AE60; margin-bottom: 5px; }
              .field-value { background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; }
              .highlight { background-color: #E8F5E9; padding: 15px; border-left: 4px solid #27AE60; margin: 20px 0; }
              .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Mood & Symptom Quiz Completed</h1>
              </div>
              <div class="content">
                <div class="highlight">
                  <div class="field-label" style="font-size: 18px;">Recommended Treatment Path:</div>
                  <div style="font-size: 20px; font-weight: bold; color: #27AE60; margin-top: 5px;">
                    ${validatedData.treatment}
                  </div>
                </div>

                <div class="field">
                  <div class="field-label">Reason for Recommendation:</div>
                  <div class="field-value">${validatedData.reason}</div>
                </div>
                
                <div class="field">
                  <div class="field-label">Total Score:</div>
                  <div class="field-value">${validatedData.score} points</div>
                </div>

                <div class="field">
                  <div class="field-label">Insurance Coverage:</div>
                  <div class="field-value">${validatedData.insurance}</div>
                </div>

                <div class="field">
                  <div class="field-label">Quiz Responses:</div>
                  <div class="field-value">
                    ${validatedData.answers.map((answer, i) => `Question ${i + 1}: ${answer}`).join('<br>')}
                  </div>
                </div>

                <div class="field">
                  <div class="field-label">Submission Time:</div>
                  <div class="field-value">${timestamp}</div>
                </div>
                
                <div style="margin-top: 30px; padding: 15px; background-color: #FFF3CD; border: 1px solid #FFC107; border-radius: 4px;">
                  <strong>⚡ Action Required:</strong> Patient may book consultation directly from quiz results.
                </div>
              </div>
              <div class="footer">
                <p>Elevated Health Augusta | Automated Quiz Notification</p>
                <p>This message was sent via HIPAA-compliant Paubox email service.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Quiz result sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending quiz result email:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
