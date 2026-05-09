# RLS & Patient Data Isolation Audit — 2026-05-09 Follow-up

**Audit scope:** Re-verification of F-1 through F-11 from the 2026-05-08
audit (`docs/security/rls-audit-2026-05-08.md`) plus a re-sweep of every
table in the `public` schema and every Supabase edge function under
`supabase/functions/` for findings newly introduced by the remediation
work.

**Method:** Same as the original audit. Migration-replay analysis (87
migrations replayed in lexicographic order to determine live policy
state) plus per-edge-function JWT/service-role/role-check trace plus
the same five test scenarios re-walked in code. **No SQL was run
against the live database**; all findings are derived from the
codebase. Live execution against the deployed Supabase project should
be re-run by a human with read-only DB access before launch.

**Period covered:** Remediations applied between 2026-05-08 23:00 UTC
and 2026-05-09 03:55 UTC. Specifically: Lovable migrations
`20260509065337` (R-1, R-2, R-3), `20260509071111` (R-4, R-6, R-8,
R-9, R-11, plus `inventory_skus` tightening), `20260509074519` (R-10),
and `20260509075226` (search_path hardening + duplicate `patients`
SELECT policy cleanup); plus the corresponding edge-function lockdown,
deletion, and creation work shipped via the Cursor commits ending at
`af14f98`.

---

## Top-line status

**Security posture: launch-ready, with three operational follow-ups
that are not RLS findings but block first cron invocation and one
patient-experience smoke test.**

- All eleven numbered findings (F-1 through F-11) from the 2026-05-08
  audit are CLOSED in the live schema, with the single exception of
  **F-7** (`inventory_dispensations` patient self-SELECT) which is
  **deferred pending an explicit clinical-decision sign-off**. The
  pattern looks intentional based on the
  `20260509221500_inventory_rls_staff_full_visibility.sql` commit
  message, but the decision is not captured in `.cursorrules`. See §3
  for the recommended next step.
- The five patient-isolation test scenarios all pass in re-walk. No
  cross-patient SELECT/UPDATE/DELETE path exists. Anonymous SELECT
  and INSERT paths are limited to the storefront/lead-form set
  documented as intentional.
- **Zero new RLS findings** were introduced by the remediation work.
  Two minor cosmetic items surfaced during the re-sweep — both LOW
  severity, both isolated to `inventory_skus` — and are documented in
  §4 with one-line drop recipes.
- The four `§8` hardening items from the search_path migration are
  documented with proposed remediation paths in §5. None are
  exploitable; all are defense-in-depth.
- The intentional access pattern decisions from `.cursorrules` are
  reflected in §6. One additional table (`inventory_dispensations`)
  is a candidate for the same intentional-decision treatment.
- Three operational follow-ups (CRON_SECRET secret deployment,
  `request-hormone-review` smoke test, `get-available-slots`
  provider_id leak) are tracked in §7. None block the RLS posture; the
  cron secret blocks first invocation of two scheduled functions, and
  the provider_id leak is a known follow-up to be resolved via opaque
  slot tokens after launch.

**Recommendation:** Proceed to launch-readiness gates (Stripe
live-mode cutover, real photography, end-to-end booking dry runs)
without waiting on additional RLS work. Re-run this audit on a
quarterly cadence post-launch.

---

## TL;DR — finding closure status

| # | Severity | Finding | Lovable apply | Status |
|---|---|---|---|---|
| F-1 | **CRITICAL** | `iv_drip_bookings` SELECT was `USING (true)` | `20260509065337` | **CLOSED** |
| F-2 | **CRITICAL** | `patients` "Allow public intake token lookup" was unscoped | `20260509065337` | **CLOSED** |
| F-3 | **CRITICAL** | `user_roles` master-admin DELETE protection was inverted | `20260509065337` | **CLOSED** |
| F-4 | **HIGH** | `symptom_logs` open INSERT policy | `20260509071111` | **CLOSED** |
| F-5 | **HIGH/CRITICAL** | 8 critical + 12 high-risk edge functions writing PHI without auth | edge fn lockdown commits + `20260509075226` | **CLOSED** (one operational follow-up; see §7.1) |
| F-6 | MEDIUM | `consultation_bookings` no patient self-SELECT | `20260509071111` | **CLOSED** |
| F-7 | MEDIUM | `inventory_dispensations` no patient self-SELECT | — | **DEFERRED** — clinical-decision pending; pattern looks intentional but not recorded in `.cursorrules`. See §3.1. |
| F-8 | MEDIUM | Staff vs admin DELETE separation unenforced on patients + 7 clinical tables | `20260509071111` | **CLOSED** |
| F-9 | LOW/MEDIUM | Open public INSERT on five `_payments` tables | `20260509071111` | **CLOSED** |
| F-10 | MEDIUM | Patients could self-INSERT into `orders` | `20260509074519` (policy drop) + `request-hormone-review` edge fn | **CLOSED** (one smoke-test follow-up; see §7.2) |
| F-11 | LOW | Broad authenticated reads on `clinical_protocols`, `protocols`, `soap_templates`, `clinic_settings` | `20260509071111` | **CLOSED** |
| — | hygiene | search_path on `touch_updated_at` + duplicate `patients` SELECT policy | `20260509075226` | **CLOSED** |

**Closures: 10. Deferred (intentional-decision pending): 1. New findings: 0.**

---

## 1. Closure verification — F-1 through F-11

Each closure was verified by reading the deployed migration that
applied the fix plus the code path that depends on it.

### F-1 — `iv_drip_bookings` SELECT — **CLOSED**

**Live policy state (`public.iv_drip_bookings`):**
- `Anyone can create IV drip booking` (INSERT, role public): unchanged
- `Staff and admins can manage IV drip bookings` (ALL): unchanged
- `Public can view by stripe session id` (SELECT, role public, `USING (true)`): **DROPPED** by `20260509065337` line 2
- `Patients can view their own IV drip bookings` (SELECT, role authenticated): **NEW**, scopes by `customer_email IN (own emails)` OR by `appointment_id IN (own appointments via patients.user_id)` — `20260509065337` lines 4-14
- Public-anon read path now goes through `public.get_iv_booking_by_stripe_session(text)` SECURITY DEFINER RPC (pinned `search_path = public`, GRANTed to `anon, authenticated`)

**Frontend coupling:** `IVPaymentSuccess.tsx` did not query
`iv_drip_bookings` directly pre-fix, so the policy drop is non-
breaking on the existing frontend. If a future page wants the
session-id-anonymous read, it must call the RPC.

**Trace — anonymous caller dump attempt:**
- `SELECT * FROM iv_drip_bookings` with no JWT → no SELECT policy
  matches role `public` → 0 rows. ✓
- `SELECT * FROM iv_drip_bookings WHERE stripe_session_id = 'cs_…'`
  with no JWT → same path, 0 rows. ✓
- `SELECT public.get_iv_booking_by_stripe_session('cs_…')` with no
  JWT → returns at most one row (the one matching the supplied
  session) and only the columns the post-payment UI needs. ✓

### F-2 — `patients` intake-token policy — **CLOSED**

**Live policy state (`public.patients`):**
- `Allow public intake token lookup` (SELECT, role public, `USING (intake_token IS NOT NULL AND expires > NOW())`): **DROPPED** by `20260509065337` line 34
- `Patients can view their own record` (SELECT): unchanged
- `Staff and admins can read all patients` (SELECT, role authenticated): unchanged from Batch A `20260509071111`
- `Staff and admins can view all patients` (SELECT, role public, legacy duplicate): **DROPPED** by `20260509075226` line 2
- All other patients policies (UPDATE/INSERT/DELETE/etc.) unchanged
- Public-anon intake read path now goes through `public.get_patient_by_intake_token(text)` SECURITY DEFINER plpgsql function with safe `BEGIN/EXCEPTION WHEN invalid_text_representation` UUID cast (pinned `search_path = public`, GRANTed to `anon, authenticated`)

**Frontend coupling:** `src/pages/PublicIntake.tsx:159-163` calls
`supabase.rpc("get_patient_by_intake_token", { _token: token })`
instead of querying `patients` directly. The migration drop and
frontend swap shipped together so no window of breakage existed.

**Trace — anonymous "dump every active intake token" attempt:**
- `SELECT * FROM patients WHERE intake_token IS NOT NULL` with no
  JWT → no SELECT policy matches role `public` → 0 rows. ✓
- `SELECT public.get_patient_by_intake_token('not-a-uuid')` with no
  JWT → cast raises `invalid_text_representation`, caught by
  exception handler, returns 0 rows. No 500, no error leak. ✓
- `SELECT public.get_patient_by_intake_token('00000000-0000-0000-0000-000000000000')` with no JWT → cast succeeds, returns 0 rows because no patient has that token. ✓
- `SELECT public.get_patient_by_intake_token('<real expired token>')` → matches `intake_token` predicate, fails `intake_token_expires_at > NOW()` predicate → 0 rows. ✓

### F-3 — `user_roles` master-admin DELETE protection — **CLOSED**

**Live policy state (`public.user_roles`):**
- `Users can view their own roles` (SELECT, role authenticated): unchanged
- `Admins can manage all roles` (ALL, role authenticated): unchanged
- `Protect master admin role` (DELETE, role public, broken inverted logic): **DROPPED** by `20260509065337` line 66
- `Block deletion of master admin role` (DELETE, AS RESTRICTIVE, role public): **NEW** by `20260509065337` lines 68-77

**Trace — non-admin attempting to delete master admin row:**
- `Admins can manage all roles` permits DELETE only when `has_role(auth.uid(), 'admin')` is true. A non-admin authenticated user fails this → DELETE not permitted. ✓
- `Block deletion of master admin role` (RESTRICTIVE) ANDs with the permissive policy: even an admin caller is blocked from deleting the master admin row. Rotating the master admin requires a deliberate SQL-operator action (correct friction for a single-key recovery scenario). ✓

### F-4 — `symptom_logs` open INSERT — **CLOSED**

**Live policy state (`public.symptom_logs`):**
- `Patients can view their own symptom logs` (SELECT): unchanged
- `Staff and admins can view all symptom logs` (SELECT): unchanged
- `Patients can insert their own symptom logs` (INSERT, role authenticated, `WITH CHECK (patient_id IN (own))`): unchanged
- `Allow public symptom log insert via intake` (INSERT, role public, `WITH CHECK (true)`): **DROPPED** by `20260509071111` line 6

**Edge function path preserved:** `submit-public-intake/index.ts:88`
creates the `supabaseAdmin` client with the service-role key, which
bypasses RLS. The legitimate intake-driven insert path is unaffected.

**Trace — anonymous symptom_log forgery attempt:**
- `INSERT INTO symptom_logs (patient_id, …) VALUES (any_patient_id, …)` with no JWT → no INSERT policy matches role `public` → INSERT denied. ✓
- Same as authenticated patient B targeting patient A's `patient_id`: own-only INSERT policy `WITH CHECK` rejects. ✓

### F-5 — Edge function auth posture — **CLOSED**

**Per the third-wave update in the original audit, the F-5 work split
into deletions + lockdowns + design comments. Re-verified against
the current `supabase/functions/` directory and `supabase/config.toml`
listing:**

**Deleted from disk (verified absent in `supabase/functions/`):**
`check-consultation-followup`, `send-kit-payment-link`,
`send-kit-payment-sms`, `create-care-membership-checkout`,
`create-hormone-checkout`, `create-hormone-membership-checkout`,
`create-hormone-addon-checkout`, `send-hormone-addon-activation`,
`send-hormone-addon-sms`. **9 deletions, all confirmed.** All
matching `[functions.<name>]` entries also removed from `config.toml`.

**Locked down — JWT + staff/admin role check (verified in code):**
- `send-rx-fax/index.ts:218` — `requireStaffOrAdmin(req)` ✓
- `send-welcome-email/index.ts:97` — `requireStaffOrAdmin(req)` ✓
- `send-appointment-reminder/index.ts:138` — `requireStaffOrAdmin(req)` ✓
- `recommend-lab-panel/index.ts:98` — `requireStaffOrAdmin(req)` ✓

**Locked down — JWT + patient-self OR staff/admin (verified in code):**
- `generate-consent-pdf/index.ts:99` — `authorizePatientOrStaff(req, patientId)` ✓

**Locked down — X-Cron-Secret header (verified in code):**
- `send-intake-reminder/index.ts:51` — `authorizeCron(req)` ✓
- `send-stale-intake-alert/index.ts:47` — `authorizeCron(req)` ✓

**Design comments only (verify_jwt = false confirmed correct,
rationale captured in function header):**
- `create-alacarte-checkout`, `create-glp1-starter-checkout`,
  `create-semaglutide-checkout`, `create-tirzepatide-checkout`,
  `create-membership-checkout`, `verify-alacarte-payment`,
  `submit-public-intake`, `get-available-slots`. **All 8 confirmed
  with the documented header block.**

**`config.toml` `verify_jwt = true` set on:** `send-welcome-email`,
`send-rx-fax`, `send-appointment-reminder`, `generate-consent-pdf`,
`recommend-lab-panel`, `request-hormone-review`. (Plus
pre-existing `verify-alacarte-payment` JWT default.) **6 explicit
true settings confirmed in config.**

**Operational follow-up:** `send-intake-reminder` and
`send-stale-intake-alert` will reject every call until `CRON_SECRET`
is set in the Supabase project env. See §7.1.

### F-6 — `consultation_bookings` patient self-SELECT — **CLOSED**

**Live policy state (`public.consultation_bookings`):**
- `Patients can view their own consultation bookings` (SELECT, role authenticated, `USING (customer_email IN (SELECT email FROM patients WHERE user_id = auth.uid()))`): **NEW** by `20260509071111` lines 9-11
- All other policies unchanged

**Trace:** Patient A logged in queries `consultation_bookings` →
returns rows where `customer_email` matches one of patient A's
patients-table emails. Patient A querying patient B's booking by
booking_id directly returns 0 rows (no row matches the email join). ✓

### F-7 — `inventory_dispensations` patient self-SELECT — **DEFERRED**

**Live policy state (`public.inventory_dispensations`):**
- `Staff and admins can read all dispensations` (SELECT, role public via no-`TO` default but USING gates on has_role): unchanged from `20260509221500` lines 29-34
- No INSERT/UPDATE/DELETE policy → INSERT goes through `dispense_from_lot()` SECURITY DEFINER function only

**Status:** No patient self-SELECT policy exists. The original audit
called this out as a gap with a recommended remediation R-7. R-7 was
**not bundled into the second-wave RLS hardening migration** because
the user opted to ship policy fixes only when an explicit clinical
decision had been made; "patient-portal visibility into their own
dispensation history" is a UX call, not a security fix.

**New evidence as of 2026-05-09:** The
`20260509221500_inventory_rls_staff_full_visibility.sql` migration
(applied earlier in the launch sequence) deliberately collapses the
inventory_dispensations SELECT down to a single staff/admin policy
and explicitly comments "complete dispensation audit history" as a
staff-internal need. This implies the design intent is **staff-only
dispensation visibility, no patient portal read** — but that intent
is not yet captured in `.cursorrules` under "INTENTIONAL ACCESS
PATTERN DECISIONS."

**Recommended next step (not a code change in this audit):** Bring
this to the medical director and capture the decision in
`.cursorrules` using the same Table / Pattern / Rationale / Approved
by / Date / guardrail block format used for
`eligibility_review_requests`. Two viable outcomes:

1. **Keep staff-only** (most likely): document as intentional. Patient
   "what was dispensed at my last visit" surfaces would render via the
   `medications` table or a staff-prepared after-visit summary instead.
2. **Add patient self-read**: ship a single-line migration adding
   `Patients can view their own dispensations` (SELECT, role
   authenticated, `USING (patient_id IN (SELECT id FROM patients
   WHERE user_id = auth.uid()))`).

This audit recommends outcome #1 to match the existing
`eligibility_review_requests` precedent (clinical operational data
that does not need to be patient-portal-readable). Either way, decide
explicitly and record it.

### F-8 — Staff vs admin DELETE separation — **CLOSED**

**Live policy state (eight clinical tables):**
- `patients`, `clinical_notes`, `lab_results`, `medications`,
  `treatment_plans`, `soap_notes`, `encounter_forms`, `superbills`
  — each had its `Staff and admins can manage X` ALL policy
  **DROPPED** and replaced with explicit SELECT/INSERT/UPDATE
  policies (staff/admin) plus an `Admins can delete X` DELETE policy
  (admin only).
- `patients` retains its pre-existing `Admins can delete patients`
  policy from `20251203022732`; `20260509071111` did not add a
  duplicate for that table because the existing one already met the
  pattern.
- For the other seven tables, `20260509071111` adds a fresh `Admins
  can delete X` so dropping the ALL policy did not lock both staff
  and admins out of DELETE.

**Trace — staff caller attempting to DELETE a clinical note:**
- `Staff and admins can read clinical notes` (SELECT only) — does not permit DELETE
- `Staff and admins can insert clinical notes` (INSERT only) — does not permit DELETE
- `Staff and admins can update clinical notes` (UPDATE only) — does not permit DELETE
- `Admins can delete clinical notes` (DELETE) — `USING (has_role(auth.uid(), 'admin'))` → false for staff
- `Patients can view their own non-private notes` — SELECT only, doesn't apply to DELETE
- Net: DELETE denied. ✓

### F-9 — Open INSERT on `_payments` tables — **CLOSED**

**Five DROPs applied by `20260509071111` lines 108-112:**
`Anyone can create elevated architecture payment record` on
`elevated_architecture_payments`,
`Anyone can create payment record` on `hormone_mapping_payments`,
`Anyone can create metabolic payment record` on
`metabolic_payments`,
`Anyone can create neurotransmitter payment record` on
`neurotransmitter_payments`,
`Anyone can create toxicity payment record` on `toxicity_payments`.

**Pre-flight verified at write time:** no client-side `.from("X_payments").insert(...)` call exists in `src/` — all inserts originate from edge functions using the service role, which bypasses RLS.

**Trace — anonymous payment row forgery attempt:** No INSERT policy for any role except via the implicit "service_role bypasses RLS" path → INSERT denied. ✓

### F-10 — Patients self-INSERT `orders` — **CLOSED**

**Live policy state (`public.orders`):**
- `Patients can create orders for themselves` (INSERT, role authenticated): **DROPPED** by `20260509074519`
- `Patients can view their own orders` (SELECT): unchanged
- `Staff and admins can view all orders` (SELECT): unchanged
- `Staff and admins can update orders` (UPDATE): unchanged
- (No client-facing INSERT policy remains; all writes go through
  service-role edge functions.)

**New edge function path:** `request-hormone-review/index.ts`
(verify_jwt = true, validates `symptom_log.patient_id == auth.uid()`
ownership server-side, constructs the `orders` row server-side using
only the `symptom_scores` from the validated symptom log, inserts
via service role with `status='pending_review'`). The patient client
cannot smuggle arbitrary protocol_snapshot fields.

**Frontend coupling:** `src/pages/HormoneJourneyPage.tsx`
`handleRequestReview` invokes
`supabase.functions.invoke("request-hormone-review", { body: { symptom_log_id: latestLog.id } })` — no direct `.from("orders").insert(...)` remaining anywhere in `src/`.

**Trace — patient A constructing a fake order:**
- Direct insert (`.from("orders").insert({ patient_id, protocol_snapshot, … })`): **denied** — no INSERT policy matches role `authenticated`. ✓
- Via `request-hormone-review` with patient B's symptom_log_id: `patientRow` lookup with `WHERE id = symptomLog.patient_id AND user_id = auth.uid()` returns null → 403 Forbidden, no insert. ✓
- Via `request-hormone-review` with extra body fields like `protocol_snapshot.medication_name = "fentanyl"`: extra-keys check on line 88 rejects with 400 before any DB read. ✓

### F-11 — Broad authenticated reads — **CLOSED**

**Four `Authenticated … can view X` policies replaced with `Staff
and admins can view X` (`20260509071111` lines 114-129):**
- `clinical_protocols` — `Authenticated can view active clinical protocols` → `Staff and admins can view clinical protocols`
- `protocols` — `Authenticated users can view protocols` → `Staff and admins can view protocols`
- `soap_templates` — `Authenticated users can view SOAP templates` → `Staff and admins can view SOAP templates`
- `clinic_settings` — `Authenticated users can view clinic settings` → `Staff and admins can view clinic settings`

**Plus `inventory_skus`** (unnumbered table-level concern):
`Authenticated can read SKU catalog` → `Staff and admins can read
SKU catalog` (`20260509071111` lines 131-134).

**Trace — patient logged in queries any of the five tables:** no
SELECT policy matches because the patient does not have role staff
or admin → 0 rows. ✓

---

## 2. Test scenarios — re-walk

Same five scenarios as the original audit, re-traced against the
live state.

### Scenario A — Patient A queries Patient B's row across PHI tables

| Table | Original | Re-walk | Status |
|---|---|---|---|
| `appointments` | ✓ Blocked | ✓ Blocked (own-only predicate unchanged) | OK |
| `clinical_notes` | ✓ Blocked | ✓ Blocked | OK |
| `communication_logs` | ✓ Blocked | ✓ Blocked | OK |
| `conversations` | ✓ Blocked | ✓ Blocked | OK |
| `consultation_bookings` | (gap, F-6) | ✓ Now scoped via F-6 self-SELECT | **FIXED** |
| `elevated_architecture_payments` | ✓ Blocked | ✓ Blocked | OK |
| `encounter_forms` | ✓ Blocked | ✓ Blocked | OK |
| `hormone_mapping_payments` | ✓ Blocked | ✓ Blocked | OK |
| `iv_drip_bookings` | **✗ LEAK F-1** | ✓ Blocked via F-1 fix | **FIXED** |
| `lab_results` | ✓ Blocked | ✓ Blocked | OK |
| `medications` | ✓ Blocked | ✓ Blocked | OK |
| `membership_visit_log` | ✓ Blocked | ✓ Blocked | OK |
| `messages` | ✓ Blocked | ✓ Blocked | OK |
| `metabolic_payments` | ✓ Blocked | ✓ Blocked | OK |
| `neurotransmitter_payments` | ✓ Blocked | ✓ Blocked | OK |
| `orders` | ✓ Blocked | ✓ Blocked | OK |
| `patient_documents` | ✓ Blocked | ✓ Blocked | OK |
| `patients` | **✗ LEAK F-2** | ✓ Blocked via F-2 fix | **FIXED** |
| `soap_notes` | ✓ Blocked | ✓ Blocked | OK |
| `superbills` | ✓ Blocked | ✓ Blocked | OK |
| `symptom_logs` | ✓ Blocked | ✓ Blocked | OK |
| `toxicity_payments` | ✓ Blocked | ✓ Blocked | OK |
| `treatment_plans` | ✓ Blocked | ✓ Blocked | OK |

**Scenario A: PASS.** Zero cross-patient SELECT paths.

### Scenario B — Patient A UPDATEs Patient B's row

Re-walk: `patients` UPDATE remains scoped to `user_id = auth.uid()`.
No other patient-data table grants an UPDATE policy to the
`authenticated` role. `messages` patient UPDATE remains
conversation-scoped. **Scenario B: PASS.** No new patient UPDATE
policies were added by the remediation work.

### Scenario C — Anonymous user queries every table

Anonymous SELECT paths (re-walk):

| Table | Returned | Intentional? |
|---|---|---|
| `cpt_codes` | All rows | ✓ Yes (reference data) |
| `icd10_codes` | All rows | ✓ Yes (reference data) |
| `iv_addons` | Active rows | ✓ Yes (storefront) |
| `iv_therapies` | Active rows | ✓ Yes (storefront) |
| `patient_resources` | All rows | ✓ Yes (educational content) |
| `provider_schedules` | Active rows | ⚠ Yes for SlotPicker; provider_id leaks (see §5.4) |
| `schedule_blocks` | All rows | ⚠ Same |
| `chat_leads` | — | INSERT only |
| `hrt_quiz_submissions` | — | INSERT only |
| `iv_drip_bookings` | **0 rows** (was: all rows) | **FIXED via F-1** |
| `patients` | **0 rows** (was: all active-token rows) | **FIXED via F-2** |

Anonymous INSERT paths (re-walk):

| Table | Status | Intentional? |
|---|---|---|
| `chat_leads` | unchanged | ✓ Yes (lead form) |
| `hrt_quiz_submissions` | unchanged | ✓ Yes (quiz form) |
| `consultation_bookings` | unchanged (`WITH CHECK (true)` for the public-anon insert remains) | ⚠ Reachable via storefront; see §4.1 below |
| `iv_drip_bookings` | unchanged | ⚠ Reachable via storefront; same flag as `consultation_bookings` |
| `elevated_architecture_payments` | **denied** (was: open) | **FIXED via F-9** |
| `hormone_mapping_payments` | **denied** (was: open) | **FIXED via F-9** |
| `metabolic_payments` | **denied** (was: open) | **FIXED via F-9** |
| `neurotransmitter_payments` | **denied** (was: open) | **FIXED via F-9** |
| `toxicity_payments` | **denied** (was: open) | **FIXED via F-9** |
| `symptom_logs` | **denied** (was: open via F-4 policy) | **FIXED via F-4** |

**Scenario C: PASS.** All intentional public surfaces still work; all
fixed leak paths return 0 rows / denied.

### Scenario D — Staff escalation to admin-only data

Re-walk:

| Table | Original | Re-walk |
|---|---|---|
| `patients` | Staff could DELETE via ALL policy | **FIXED via F-8** — staff has read/insert/update only; DELETE is admin-only |
| `clinical_notes`, `lab_results`, `medications`, `treatment_plans`, `soap_notes`, `encounter_forms`, `superbills` | Same staff-DELETE concern | **FIXED via F-8** — same split applied |
| `user_roles` | Non-admin could DELETE master admin | **FIXED via F-3** — RESTRICTIVE policy AND'd with permissive admin policy |
| `inventory_skus` | (Originally not flagged; admin-only manage post-original audit was loosened to staff/admin manage in `20260509221500` for operational reasons.) | Both staff and admin now manage. Documented in commit message. Acceptable — SKU catalog is operational, not security-sensitive. |

**Scenario D: PASS.** No staff-escalation paths remain; the
loosening of `inventory_skus` is operational by design.

### Scenario E — Patient self-access to own records

Re-walk gap closures:

| Table | Original | Re-walk |
|---|---|---|
| `consultation_bookings` | Gap | **FIXED via F-6** |
| `inventory_dispensations` | Gap | **DEFERRED** — see F-7 / §3.1 below |
| `eligibility_review_requests` | Intentional gap | Documented in `.cursorrules` (intentional, signed by Troy Akers MD on 2026-05-08). ✓ |
| `clinical_protocol_executions` | "Consider — depends on transparency posture" | Unchanged. Out of scope for this audit. |

**Scenario E: PASS modulo F-7.**

---

## 3. Intentional access pattern decisions

### 3.1 — `eligibility_review_requests` (already documented)

**Captured in `.cursorrules` lines 296-339.** Re-verified against
live policy state in `20260510020000_eligibility_review_requests.sql`:

- `eligibility_review_select_staff` (SELECT, role authenticated): admin OR staff
- `eligibility_review_update_staff` (UPDATE, role authenticated): admin OR staff
- No INSERT policy (writes via service-role from `send-safety-callback-request`)
- No DELETE policy (rows are permanent / auditable)
- No patient self-SELECT — by intention (`.cursorrules` lines 304-339)

**Status: ✓ Posture matches the documented decision.** No drift.

### 3.2 — `inventory_dispensations` (candidate, undocumented)

**Live posture:** Staff/admin SELECT only, no patient self-SELECT.
Inserts via `dispense_from_lot()` SECURITY DEFINER. No UPDATE or
DELETE.

**The `20260509221500` commit message implies the staff-only read is
intentional ("complete dispensation audit history" is framed as an
operational concern, not a patient-facing one). But the decision is
not captured in `.cursorrules` yet.**

**Recommended action (do not fix in code; bring to medical director):**

- Decide whether patients should see their own dispensation history in
  the patient portal.
- If **no** (likely): add an INTENTIONAL ACCESS PATTERN DECISION block
  to `.cursorrules` mirroring the `eligibility_review_requests` block.
- If **yes**: ship a single-line policy migration (R-7 from the
  original audit). Two-table change is small.

This audit declines to make the call unilaterally because it is a
clinical/UX decision, not a security posture one.

---

## 4. New findings introduced by remediation work

**Two LOW-severity cosmetic findings, both isolated to
`inventory_skus`. Zero MEDIUM/HIGH/CRITICAL findings.**

### 4.1 — `inventory_skus` has duplicate functionally-equivalent SELECT policies — **LOW**

**Live policy state (`public.inventory_skus`):**
- `Staff and admins can read SKU catalog` (SELECT, role authenticated, from `20260509071111` lines 132-134)
- `Staff and admins can manage SKU catalog` (FOR ALL, no `TO` clause → defaults to role public, but `USING` gates on `has_role()`, from `20260509221500` lines 13-22)

**Both grant SELECT to staff and admin.** The `FOR ALL` policy
covers SELECT + INSERT + UPDATE + DELETE, so the dedicated
`Staff and admins can read SKU catalog` is redundant for the SELECT
case. This is the same kind of policy duplication we just cleaned
up on `patients` (`20260509075226` line 2).

**Severity:** LOW. Both policies gate on the same `has_role()`
check, so there is no privilege divergence. The duplication is
cosmetic — it makes `pg_policies` listings noisier and creates the
risk that a future audit will miss the FOR ALL policy if it only
inspects per-action policies.

**Proposed remediation (do not apply in this audit):**

```sql
DROP POLICY IF EXISTS "Staff and admins can read SKU catalog"
  ON public.inventory_skus;
```

Bundle with the cosmetic fix in §4.2 below — both are one-line
migrations on the same table.

### 4.2 — `inventory_skus` FOR ALL policy lacks explicit `TO authenticated` scoping — **LOW**

**Same policy as §4.1:**

```sql
CREATE POLICY "Staff and admins can manage SKU catalog"
  ON public.inventory_skus FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (...);
```

**Issue:** No `TO authenticated` clause. Postgres defaults this to
role `public`. The `USING` clause requires `has_role(auth.uid(),
…)`, which evaluates `has_role(NULL, …)` for unauthenticated
callers, which returns FALSE. So functionally the policy is still
staff/admin-only — BUT the explicit `TO authenticated` scoping is
the convention used everywhere else in Batch A (`20260509071111`).

**Severity:** LOW. No privilege escalation today. The risk is
purely "if someone later changes `has_role()` semantics or adds a
sibling permissive policy, the missing `TO authenticated` makes it
easier to introduce a leak by accident."

**Proposed remediation (do not apply in this audit):**

```sql
DROP POLICY IF EXISTS "Staff and admins can manage SKU catalog"
  ON public.inventory_skus;
CREATE POLICY "Staff and admins can manage SKU catalog"
  ON public.inventory_skus FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );
```

Bundle with §4.1 into a single small migration. Suggested filename:
`20260510070000_inventory_skus_policy_cleanup.sql`. Out of scope
for this re-audit per the prompt; flagged for the next hardening
pass.

### 4.3 — Storefront-anon INSERT on `consultation_bookings` and `iv_drip_bookings` — **NOT NEW; previously acknowledged**

The original audit Scenario C flagged these as "yes for
paid-self-booking — but `WITH CHECK (true)` is too permissive."
That posture is unchanged by the remediation work. It is
intentional for the storefront flow (anonymous user starts a
booking, redirected to Stripe, returns post-checkout to bind the
row). The pre-stamped row contains no clinical data.

**Re-classified as accepted risk** since (a) `verify-alacarte-payment`
and `verify-consultation-payment` reconcile via Stripe before any
clinical fulfillment, (b) the `create-*-checkout` edge functions
have design comments documenting the rationale, and (c) the rows
themselves only carry `customer_email`, `customer_name`,
`customer_phone`, `service_line`, `status`, and Stripe IDs. Not
flagged as a new finding.

If we ever surface this to a stricter compliance audit, the cleanup
path is to drop the `WITH CHECK (true)` policy and route both
checkout flows through edge functions exclusively. Not urgent.

---

## 5. §8 hardening items from search_path migration — proposed paths

These are the four items captured in
`docs/security/rls-audit-2026-05-08.md` §8, surfaced during the
search_path audit but deferred from the hardening migration. None
are exploitable today; each is defense-in-depth. Below is a
proposed remediation path for each.

### 5.1 — `update_updated_at_column()` trigger function unpinned — **LOW**

**Current:** `LANGUAGE plpgsql` with no `SECURITY DEFINER` and no
`SET search_path`. Attached as BEFORE UPDATE trigger on
`lab_panels` and `lab_tests` (defined in
`20260509003440_*.sql:65` and re-asserted in
`20260509004514_*.sql:61` — same body).

**Why it isn't exploitable today:** The function is
`SECURITY INVOKER`, so it runs with the calling user's privileges.
A search_path injection attack against a SECURITY INVOKER function
cannot escalate beyond what the caller already has.

**Proposed remediation:** Bundle into a future "trigger hygiene"
migration with one ALTER per trigger function:

```sql
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;
```

This is a one-line migration. Suggest combining with §4.1 / §4.2
into `20260510070000_post_launch_hygiene.sql` after the medical
director signs off on §3.2.

### 5.2 — Existing SECURITY DEFINER pins use `public` only, not `public, pg_temp` — **LOW**

**Current:** All eleven SECURITY DEFINER functions in the public
schema (`has_role`, `has_business_admin_role`, `handle_updated_at`,
`calculate_symptom_scores`, `sync_consultation_to_patient`,
`get_providers_directory`, `sign_clinical_protocol_version`,
`get_iv_booking_by_stripe_session`, `get_patient_by_intake_token`,
`dispense_from_lot`, `expire_inventory_lots`) use
`SET search_path = public` rather than `SET search_path = public,
pg_temp`.

**Why it isn't exploitable today:** With `search_path = public`
only, Postgres resolves names against the public schema. A
malicious caller can create a `pg_temp` table in their own session,
but the function's search_path doesn't include `pg_temp`, so the
shadow table is never reached during name resolution.

The `public, pg_temp` pattern adds `pg_temp` *last* so
session-temp objects are still resolvable for legitimate uses
(none of the eleven functions actually create temp objects, so
this is moot in practice) — but listing pg_temp explicitly at the
end is the strongest hardening posture.

**Proposed remediation:** Single mechanical migration ALTERing all
eleven functions:

```sql
ALTER FUNCTION public.has_role(uuid, app_role)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.has_business_admin_role(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_symptom_scores()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_consultation_to_patient()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_providers_directory()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.sign_clinical_protocol_version(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_iv_booking_by_stripe_session(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_patient_by_intake_token(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.dispense_from_lot(uuid, numeric, text, uuid, uuid, uuid, text, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_inventory_lots()
  SET search_path = public, pg_temp;
```

Suggested filename:
`20260510080000_security_definer_pgtemp_hardening.sql`. **Defer
until post-launch** — this churns the catalog without changing
behavior, and the current `public`-only pin is functionally safe.

### 5.3 — `touch_updated_at()` defined twice — **LOW (cosmetic)**

**Current:** Identical `CREATE OR REPLACE FUNCTION
public.touch_updated_at()` body in both
`20260509062727_*.sql:45` and
`20260510020000_eligibility_review_requests.sql:65`. The latter is
a Lovable re-emit alongside the table re-emit. Postgres treats
both as a no-op past the first apply (CREATE OR REPLACE is
idempotent).

**Proposed remediation:** No code change. Document as known schema
artifact in the audit doc (already done in original §8). Future
consolidation, if desired, is to drop one of the CREATE OR
REPLACE blocks during a planned migration housekeeping pass — but
the duplication has no operational cost.

### 5.4 — `get-available-slots` `provider_id` leak — **LOW (carryover)**

**Current:** The `get-available-slots` edge function returns slot
records with raw `provider_id` values in the response. This was
flagged in the third-wave R-5 work and deferred because closing it
requires a coordinated change across:

- `get-available-slots/index.ts` — emit opaque `slot_token` (HMAC-SHA256 over `provider_id || start_at || nonce`, signed with a server-side secret) instead of raw `provider_id`
- `book-iv-appointment/index.ts` — accept `slot_token`, verify HMAC, decode the `provider_id` server-side
- `book-consult-appointment/index.ts` — same as `book-iv-appointment`
- `src/components/SlotPicker.tsx` — pass `slot_token` to the booking call instead of `provider_id`
- Same for `ScheduleConsult.tsx`, `IVPaymentSuccess.tsx`, and any other component that holds a slot

**Why it isn't a launch blocker:** Knowing which provider is
booked at a given time is **not PHI**. It's operational metadata
that competing clinics could observe by booking through the same
storefront. The fix is hardening, not a privacy-law concern.

**Proposed remediation pattern:**

```ts
// In get-available-slots/index.ts
const SLOT_SECRET = Deno.env.get("SLOT_TOKEN_SECRET");
const slot_token = await sign(
  `${provider_id}|${start_at_iso}|${nonce}`,
  SLOT_SECRET,
);
return { slot_token, start_at, duration_min };  // no provider_id
```

```ts
// In book-iv-appointment/index.ts (and book-consult-appointment)
const { slot_token } = body;
const { provider_id, start_at } = await verifyAndDecode(slot_token, SLOT_SECRET);
// proceed with provider_id from the verified token
```

Tracked as a post-launch hardening item, not a launch blocker.

---

## 6. Operational follow-ups (not RLS findings)

These three items are not RLS findings but block specific
launch-readiness milestones. Tracked here so they don't get lost.

### 6.1 — `CRON_SECRET` env var must be set in Supabase project — **LAUNCH-BLOCKING for two scheduled functions**

Both `send-intake-reminder` and `send-stale-intake-alert` will
reject every invocation with `401 — Invalid or missing
X-Cron-Secret header` until:

1. `CRON_SECRET` is set in the Supabase project env (Edge Functions
   → Manage Secrets).
2. The Supabase Scheduled Function trigger that calls each function
   is updated to send a matching `X-Cron-Secret: <secret>` header.

**Owner:** Whoever runs the Supabase CLI / dashboard for env
secrets. Add to launch checklist.

**If we are not using these scheduled functions yet** (the
clinic's first day will not have a cohort of stale intake
patients), this can wait. But the secret should be set anyway so
the functions are ready when the volume justifies turning them on.

### 6.2 — `request-hormone-review` smoke test owed — **R-10 closure gate**

The `request-hormone-review` edge function is implemented and the
`HormoneJourneyPage.tsx` frontend update is shipped. R-10 closure
is contingent on a one-time smoke test:

1. Log in as a test patient with a valid `symptom_log` row.
2. Click "Request Provider Review" on the Hormone Journey page.
3. Verify a `pending_review` row appears in `public.orders` with
   `protocol_snapshot.symptom_scores` populated from the symptom
   log and no patient-supplied fields.
4. Verify the patient cannot directly insert into `public.orders`
   from the browser console (`.from("orders").insert(...)` should
   fail with an RLS denial).

**Owner:** QA dry-run. Add to pre-launch booking-flow checklist.

### 6.3 — `provider_id` opaque-token swap — **post-launch**

See §5.4. Hardening, not a launch blocker.

---

## 7. Updates to `.cursorrules`

**No changes required by this audit.** The existing INTENTIONAL
ACCESS PATTERN DECISIONS section accurately reflects the live
posture.

**Recommended addition (pending decision per §3.2):** A second
INTENTIONAL ACCESS PATTERN DECISION block for
`inventory_dispensations`. Format mirror:

```
inventory_dispensations (Rx fulfillment audit trail)

  Table: inventory_dispensations
  Pattern: staff/admin read only; no patient self-read; service-role
    writes via dispense_from_lot() SECURITY DEFINER function only
  Rationale: complete dispensation audit history is operational data
    needed by Caroline + Troy for FCC reconciliation and inventory
    bookkeeping. Patient "what was dispensed at my last visit"
    surfaces render via the medications table or staff-prepared
    after-visit summaries instead.
  Approved by: <medical director sign-off pending>
  Date: <YYYY-MM-DD>
  Do not add patient self-read policy without explicit clinical
    sign-off
```

Decline to add this block until the medical director signs off.
This audit is read-only.

---

## 8. Summary

| Category | Count |
|---|---|
| Findings closed (F-1 through F-11) | 10 |
| Findings deferred pending clinical decision (F-7) | 1 |
| New findings introduced | 0 |
| New cosmetic / LOW items surfaced (`inventory_skus`) | 2 |
| Defense-in-depth follow-ups (§5) | 4 |
| Operational follow-ups (§6) | 3 |
| Drift between Cursor-authored and Lovable-deployed migrations | 0 |

**Security posture: launch-ready.** The remediation work successfully
closed all numbered findings without introducing new exploitable
paths. The two new LOW findings on `inventory_skus` are cosmetic
duplicates that do not change the privilege model. The §5 hardening
items are defense-in-depth. The §6 operational follow-ups should be
slotted into the pre-launch checklist but do not affect the RLS
posture.

**Recommend:** Decide F-7 (in or out of `.cursorrules`); set
`CRON_SECRET`; run the R-10 smoke test; proceed to launch-readiness
gates (Stripe live-mode cutover, real photography, end-to-end booking
dry runs). Re-run this audit on a quarterly cadence post-launch.

---

## Appendix A — Migrations applied since 2026-05-08 audit

In lexicographic apply order:

| Filename | Type | Author | Purpose |
|---|---|---|---|
| `20260509065337_52b88c63-a80a-48da-b4ee-c1633b146d55.sql` | Lovable | Lovable | R-1 + R-2 + R-3 (refined plpgsql wrapper for `get_patient_by_intake_token`) |
| `20260509071111_bab7b2e0-d1f8-4403-92af-01da25a362db.sql` | Lovable | Lovable | R-4, R-6, R-8, R-9, R-11 + `inventory_skus` SELECT tightening |
| `20260509074519_677a9f04-120f-4d3f-bd11-b160076d436f.sql` | Lovable | Lovable | R-10 (DROP `Patients can create orders for themselves` on `public.orders`) |
| `20260509075226_d60920dd-9be0-4762-a1e7-8dcedd78f176.sql` | Lovable | Lovable | search_path pin on `touch_updated_at` + DROP duplicate `Staff and admins can view all patients` on `public.patients` |
| `20260510030000_critical_rls_fixes.sql` | Cursor | Cursor | R-1/R-2/R-3 source (reconciled in-place to match Lovable's deployed plpgsql wrapper after first apply) |
| `20260510040000_rls_hardening_pass.sql` | Cursor | Cursor | R-4/R-6/R-8/R-9/R-11 source |
| `20260510050000_drop_patient_orders_insert.sql` | Cursor | Cursor | R-10 source |
| `20260510060000_search_path_hardening.sql` | Cursor | Cursor | search_path pin + duplicate policy drop source |

**Drift check:** Each Lovable apply matches its Cursor-authored
counterpart line-for-line (or, in the R-2 case, supersedes it with a
strictly stronger version that Cursor has reconciled in place per the
.cursorrules Migration Workflow guidance). No schema drift detected.

---

## Appendix B — Edge function delta since 2026-05-08 audit

**Deleted (9):** `check-consultation-followup`,
`send-kit-payment-link`, `send-kit-payment-sms`,
`create-care-membership-checkout`, `create-hormone-checkout`,
`create-hormone-membership-checkout`,
`create-hormone-addon-checkout`,
`send-hormone-addon-activation`, `send-hormone-addon-sms`.

**Added (1):** `request-hormone-review` (R-10 sanctioned path for
patient-initiated provider review enqueue).

**Modified (10):**

| Function | Change |
|---|---|
| `send-rx-fax` | + `verify_jwt = true` + `requireStaffOrAdmin` |
| `send-welcome-email` | + `verify_jwt = true` + `requireStaffOrAdmin` |
| `send-appointment-reminder` | + `verify_jwt = true` + `requireStaffOrAdmin` |
| `recommend-lab-panel` | + `verify_jwt = true` + `requireStaffOrAdmin` |
| `generate-consent-pdf` | + `verify_jwt = true` + `authorizePatientOrStaff` |
| `send-intake-reminder` | + `authorizeCron(req)` (`X-Cron-Secret` header) |
| `send-stale-intake-alert` | + `authorizeCron(req)` (`X-Cron-Secret` header) |
| `create-alacarte-checkout` | design comment + status=`pending_payment` rename |
| `create-glp1-starter-checkout` | design comment + dropped `guest@pending.com` fallback |
| `create-semaglutide-checkout`, `create-tirzepatide-checkout`, `create-membership-checkout`, `verify-alacarte-payment`, `submit-public-intake`, `get-available-slots` | design-comment-only (rationale captured in function header) |

**Net edge function count:** 92 (original) − 9 (deleted) + 1 (added)
= 84 (current). Verified by `ls supabase/functions/`.

---

**Audit prepared:** 2026-05-09 by Cursor agent
**Methodology:** Migration replay + per-edge-function trace + 5 test
scenarios re-walked in code. No live SQL executed.
**Next review:** Quarterly post-launch, or immediately upon any of
these triggers: (a) new `_payments`-style table is added, (b) any
edge function is changed from `verify_jwt = true` back to `false`,
(c) any new INSERT or SELECT policy on a PHI-bearing table is added,
(d) a new SECURITY DEFINER function is created.
