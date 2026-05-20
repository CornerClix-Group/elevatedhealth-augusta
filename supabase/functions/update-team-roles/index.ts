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

    console.log("[update-team-roles] User:", user.email);

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
    const body = await req.json();
    const { target_user_id, roles: newRoles, new_role } = body;

    // Support both new 'roles' array and legacy 'new_role' string
    let rolesToSet: string[] = newRoles || [];
    if (rolesToSet.length === 0 && new_role) {
      rolesToSet = [new_role];
    }

    if (!target_user_id || rolesToSet.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id or roles" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate roles
    const validRoles = ["admin", "staff", "business_admin", "provider"];
    for (const role of rolesToSet) {
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role: ${role}. Valid roles are: ${validRoles.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Explicit guard requested for provider grants.
    if (rolesToSet.includes("provider") && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can assign provider role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent changing master admin role - ensure they always have admin
    if (target_user_id === MASTER_ADMIN_ID && !rolesToSet.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Cannot remove admin role from master admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-team-roles] Updating", target_user_id, "to roles:", rolesToSet);

    // Snapshot current managed roles before mutation (for audit diff).
    const { data: existingRoleRows, error: existingRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .in("role", validRoles);

    if (existingRolesError) {
      console.error("[update-team-roles] Existing roles read error:", existingRolesError);
      return new Response(
        JSON.stringify({ error: "Failed to read existing roles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingRoles = (existingRoleRows || []).map((r) => r.role as string);
    const existingRoleSet = new Set(existingRoles);
    const nextRoleSet = new Set(rolesToSet);

    // Delete existing managed roles for this user before re-inserting desired set.
    const { error: deleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", target_user_id)
      .in("role", validRoles);

    if (deleteError) {
      console.error("[update-team-roles] Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to update roles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new roles
    for (const role of rolesToSet) {
      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: target_user_id,
          role: role,
        });

      if (insertError) {
        console.error("[update-team-roles] Insert error for", role, ":", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to insert updated role set" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
      if (!nextRoleSet.has(role)) {
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
    for (const role of nextRoleSet) {
      if (!existingRoleSet.has(role)) {
        auditRows.push({
          actor_user_id: user.id,
          target_user_id,
          action: "INSERT",
          old_role: null,
          new_role: role,
          occurred_at: occurredAt,
        });
      }
    }

    if (auditRows.length > 0) {
      const { error: auditError } = await adminClient.from("audit_log").insert(auditRows);
      if (auditError) {
        console.error("[update-team-roles] Audit insert error:", auditError);
        return new Response(
          JSON.stringify({ error: "Roles changed but audit write failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[update-team-roles] Roles updated successfully");

    return new Response(
      JSON.stringify({ success: true, roles: rolesToSet }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[update-team-roles] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
