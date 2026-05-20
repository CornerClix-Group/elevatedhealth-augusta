import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_ADMIN_ID = "31178dc3-3509-4cdd-8440-e75835bb1521";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-team-role] User:", user.email);

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can change roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { target_user_id, new_role } = await req.json();

    if (!target_user_id || !new_role) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id or new_role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate new_role
    const validRoles = ["admin", "staff", "business_admin", "provider"];
    if (!validRoles.includes(new_role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Explicit guard requested for provider grants.
    if (new_role === "provider" && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can assign provider role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent changing master admin role
    if (target_user_id === MASTER_ADMIN_ID) {
      return new Response(
        JSON.stringify({ error: "Cannot modify master admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-team-role] Updating", target_user_id, "to", new_role);

    // Read current managed roles for audit diffing.
    const { data: existingRoleRows, error: existingRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .in("role", validRoles);

    if (existingRolesError) {
      console.error("[update-team-role] Existing roles read error:", existingRolesError);
      return new Response(
        JSON.stringify({ error: "Failed to read existing roles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingRoles = (existingRoleRows || []).map((r) => r.role as string);
    const existingRoleSet = new Set(existingRoles);

    // Replace managed role set with the requested single role.
    const { error: deleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", target_user_id)
      .in("role", validRoles);

    if (deleteError) {
      console.error("[update-team-role] Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to update role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: target_user_id, role: new_role });

    if (insertError) {
      console.error("[update-team-role] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to update role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Explicit audit write for service-role mutations.
    const auditRows: Array<{
      actor_user_id: string;
      target_user_id: string;
      action: "INSERT" | "DELETE";
      old_role: string | null;
      new_role: string | null;
      occurred_at: string;
    }> = [];
    const occurredAt = new Date().toISOString();
    for (const role of existingRoleSet) {
      if (role !== new_role) {
        auditRows.push({
          actor_user_id: user.id,
          target_user_id,
          action: "DELETE",
          old_role: role,
          new_role: null,
          occurred_at: occurredAt,
        });
      }
    }
    if (!existingRoleSet.has(new_role)) {
      auditRows.push({
        actor_user_id: user.id,
        target_user_id,
        action: "INSERT",
        old_role: null,
        new_role,
        occurred_at: occurredAt,
      });
    }

    if (auditRows.length > 0) {
      const { error: auditError } = await adminClient.from("audit_log").insert(auditRows);
      if (auditError) {
        console.error("[update-team-role] Audit insert error:", auditError);
        return new Response(
          JSON.stringify({ error: "Role changed but audit write failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[update-team-role] Role updated successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[update-team-role] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
