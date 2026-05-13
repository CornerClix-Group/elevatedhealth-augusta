/**
 * This helper is groundwork for PR #12. Callers will be wired up when à la
 * carte checkout functions are migrated.
 *
 * Applies the 20% member discount policy from `docs/pricing/pricing_source_of_truth.md`
 * (mirrors `MEMBER_DISCOUNT_PERCENT` in `src/lib/stripeConfig.ts`).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const MEMBER_DISCOUNT_MULTIPLIER = 0.8;

export type ActiveElevatedProgramKey = "trt" | "hrt" | "glp1" | "wellness";

const PROGRAM_KEYS = new Set<ActiveElevatedProgramKey>(["trt", "hrt", "glp1", "wellness"]);

// Determines if a patient currently has an active ELEVATED membership of any tier.
// Returns the active program key, or null if not a member.
export async function getActiveElevatedProgram(
  supabaseAdmin: SupabaseClient,
  patientId: string,
): Promise<ActiveElevatedProgramKey | null> {
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("elevated_membership_status, elevated_program, stripe_subscription_id")
    .eq("id", patientId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.elevated_membership_status !== "active") return null;
  if (!data.stripe_subscription_id) return null;

  const raw = data.elevated_program as string | null | undefined;
  if (!raw || !PROGRAM_KEYS.has(raw as ActiveElevatedProgramKey)) return null;
  return raw as ActiveElevatedProgramKey;
}

// Applies the 20% member discount to a unit_amount in cents.
// Returns the original amount if the patient is not a member.
export async function applyMemberDiscount(
  supabaseAdmin: SupabaseClient,
  patientId: string,
  unitAmountCents: number,
): Promise<{ discountedAmount: number; isMember: boolean; program: string | null }> {
  const program = await getActiveElevatedProgram(supabaseAdmin, patientId);
  if (!program) {
    return { discountedAmount: unitAmountCents, isMember: false, program: null };
  }
  return {
    discountedAmount: Math.round(unitAmountCents * MEMBER_DISCOUNT_MULTIPLIER),
    isMember: true,
    program,
  };
}
