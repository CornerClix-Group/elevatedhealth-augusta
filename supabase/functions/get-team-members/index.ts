import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[get-team-members] No authorization header");
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for verifying the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for accessing auth.users
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log("[get-team-members] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-team-members] User authenticated:", user.email);

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      console.log("[get-team-members] Roles query error:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to check permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAdminAccess = roles?.some((r) => r.role === "admin" || r.role === "staff");
    if (!hasAdminAccess) {
      console.log("[get-team-members] User lacks admin access");
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users with admin or staff roles
    const { data: teamRoles, error: teamRolesError } = await adminClient
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", ["admin", "staff"]);

    if (teamRolesError) {
      console.log("[get-team-members] Team roles query error:", teamRolesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch team members" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-team-members] Found roles:", teamRoles?.length);

    // Get user details for each team member
    const teamMembers = [];
    for (const roleRecord of teamRoles || []) {
      const { data: userData, error: userDataError } = await adminClient.auth.admin.getUserById(
        roleRecord.user_id
      );

      if (userDataError || !userData.user) {
        console.log("[get-team-members] Failed to get user:", roleRecord.user_id, userDataError);
        continue;
      }

      teamMembers.push({
        user_id: roleRecord.user_id,
        email: userData.user.email,
        full_name: userData.user.user_metadata?.full_name || null,
        role: roleRecord.role,
        created_at: roleRecord.created_at,
        is_master_admin: roleRecord.user_id === "31178dc3-3509-4cdd-8440-e75835bb1521",
      });
    }

    console.log("[get-team-members] Returning", teamMembers.length, "team members");

    return new Response(
      JSON.stringify({ team: teamMembers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-team-members] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
