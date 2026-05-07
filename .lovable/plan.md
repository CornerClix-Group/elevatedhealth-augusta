
# Elevated Health Augusta — V2 Architecture Migration

This plan executes the full V2 package you uploaded. It is sequenced into 12 phases (V2-1 → V2-12) that match the prompt order in `eh-v2-lovable-prompts.md`. Each phase is a discrete, verifiable build. **We will run them one at a time** and verify each before moving on.

The V2 docs have been saved to `docs/v2/` so the team can reference them.

## Foundational decisions (from your answers)

- **Brand:** Elevated Health Augusta is the canonical brand. Réveil references will be retired across UI, memory, and configs.
- **Membership:** Replace the $199/$399/$699 tier model with a **single Elevated Membership at $199/mo**. Concierge $399 deferred to month 6.
- **Diagnostics:** Retire the $250 ZRT Hormone Mapping Kit. Lab pricing comes from the new LabCorp catalog (5 panels + ~30 à la carte).
- **Booking lanes:** Bifurcated — IV is open-booking; Hormones/Peptides are consult-gated ($79).

---

## Phase 0 — Pre-flight (this plan)

- Save V2 reference docs in repo (`docs/v2/`) ✅ already done.
- Update memory: rebrand to Elevated Health Augusta, retire ZRT kit, switch to single $199 membership, add patient stage tracking concept, add LabCorp labs as canonical lab pipeline.
- Confirm `STRIPE_SECRET_KEY` is set ✅.

## Phase 1 (V2-1) — Apply schema additions

Run `eh-v2-schema-additions.sql` as a single migration. Adds:

- `membership_tiers` (seeded with one row: Elevated Membership $199, `stripe_price_id` left NULL)
- `patient_memberships` (status, stripe_subscription_id, started_at, ends_at, paused_at)
- `lab_panels`, `lab_tests`, `lab_panel_tests` (5 panels + ~30 tests seeded)
- `lab_orders`, `lab_order_items`, `lab_results` (full lab pipeline)
- `diagnosis_codes` (~70 common ICD-10s seeded), `cpt_codes` (~17 seeded), `service_cpt_mappings`
- `visit_diagnoses`, `visit_cpt_codes`, `superbills`
- `patients.stage` column with check constraint + transition trigger
- `patient_stage_history` for audit
- Triggers: `appointment_stage_update`, `lab_order_stage_update`, `membership_stage_update`, `patient_stage_change_log`

**Verify:** row counts match (1 tier, 5 panels, ~30 tests, ~70 ICDs, ~17 CPTs); triggers present.

## Phase 2 (V2-2) — IV Hydration storefront + direct-book flow

- Routes: `/iv` storefront, `/iv/book` 5-step wizard (service → patient identity → date/time → Stripe pay → confirmation).
- Pulls services live where category IN ('iv','nad') AND online_bookable.
- New patient = minimal intake only (name/DOB/phone/email/SMS consent). Full demographics deferred to in-clinic.
- On success: create appointment row, set patient stage to `iv_only` if previously `new`, send Resend email + Sinch SMS confirm, push to Google Calendar if integrated.

## Phase 3 (V2-3) — Hormones + Peptides storefronts + consult-book flow

- Routes: `/hormones`, `/peptides` editorial storefronts. Primary CTA is **"Book a $79 Consultation"** (no direct service booking).
- `/consult/book`: 3 steps — program selection → identity + $79 Stripe charge → time slot.
- On success: create `consultation_bookings` row, set stage `consult_booked`, schedule pre-visit SMS for T-24h.

## Phase 4 (V2-4) — Pre-visit SMS intake form

- T-24h Sinch SMS to consult patients with tokenized link to mobile-first intake.
- Multi-step form: demographics, insurance (carrier/policy/group/member ID for **superbill only**, NOT clinic billing), comprehensive medical history, program-specific questions, e-signed consent for compounded meds.
- Writes to `patients.medical_history`, insurance fields, and marks `intake_completed = true`.

## Phase 5 (V2-5) — Lab catalog UI + order entry

- Provider chart screen: "Order Labs" picker showing 5 panels + à la carte search, with member/non-member pricing applied based on `patient_memberships.status`.
- Snapshots `charged_cents` into `lab_order_items` at order time (price-locked).
- Generates printable requisition summary (tests, tubes, fasting flag).
- Stripe charge added to patient's checkout for the lab markup.
- Stage moves to `labs_drawn` on order finalize.

## Phase 6 (V2-6) — Lab results inbound + review workflow

- Two ingest paths:
  - **Portal download:** Caroline uploads result PDF to `lab-documents` storage, links to open `lab_orders` row.
  - **Inbound efax:** dedicated efax → Supabase storage → edge function OCRs → creates `lab_results` rows.
- Physician review queue with flag visualization (H/L/Critical).
- On post: stage moves to `labs_received`, Sinch SMS to patient: "Results are in — book your follow-up."
- Patient portal labs tab shows values, ranges, flags, and historical trend.

## Phase 7 (V2-7) — ICD-10 + CPT assignment + superbill PDF

- Visit-close screen: searchable ICD-10 picker (defaults filtered to `is_common = true`), enforce 1 primary + up to 3 codes.
- CPT auto-populated from `service_cpt_mappings`; physician can adjust.
- Superbill PDF generator (clinic name/EIN/NPI, patient/insurance, DOS, dx, CPTs, charges, paid-in-full statement). Stored in `patient-documents` bucket.
- Patient portal "Visits" tab: download button per visit. Auto-emailed via Resend.

## Phase 8 (V2-8) — Membership enrollment + Stripe lifecycle

- Stripe Product "Elevated Membership" + monthly recurring $199 Price (created via Stripe tools); `stripe_price_id` written to `membership_tiers`.
- Enrollment flow at follow-up visit: Stripe Payment Element → create `patient_memberships` row → set stage `membership_active`.
- Webhook handler edge function for `customer.subscription.{created,updated,paused,resumed,deleted}` and `invoice.payment_failed`.
- Stripe Customer Portal session for self-service cancel/pause/payment update.
- Replaces all $199/$399/$699 tier UI/copy throughout: pricing pages, calculator, invite flows, dashboard.

## Phase 9 (V2-9) — Member dashboard + weekly admin visit booking

- Patient portal "Member" view: visits used this month, upcoming, labs, superbills, messaging.
- Weekly admin visit booking flow: 15-minute slots, $0 charge, member-only calendar feed.
- Member-rate auto-applied to lab orders.
- Quarterly physician check-in scheduler entry.

## Phase 10 (V2-10) — Quarterly physician check-in scheduling

- Auto-recurring 15-min telehealth (Doxy.me link or in-person) for active members. Reminder 7 days out.

## Phase 11 (V2-11) — Refill request workflow

- Patient portal action: "Request refill" on each active medication.
- Provider review queue → approve/deny → on approve, generate FCC fax order via existing fax pipeline.

## Phase 12 (V2-12) — LabCorp middleware (Health Gorilla / Particle Health)

- **Deferred to month 4+.** Wire HL7 order-out / result-in via middleware to eliminate dual entry. Out of scope for launch; documented only.

---

## Cross-cutting cleanup that happens during Phases 2, 3, 8

These removals/renames are bundled into the relevant phase rather than a separate sweep:

- Replace "Réveil" with "Elevated Health Augusta" in `siteConfig`, brand assets, SEO meta, footer, navbar, emails, SMS templates.
- Remove all $250 Hormone Mapping Kit references (pricing pages, invite cards, dashboard, payment edge function — `hormone_mapping_payments` table stays for historical records but UI hidden).
- Remove $399 / $699 membership tier UI + Stripe products archived.
- Final ketamine reference scrub (chatbot, SEO, sitemap).

## Technical details

**SQL migration approach.** `eh-v2-schema-additions.sql` is additive and idempotent-friendly. We will run it via the migration tool as one transaction. After approval, the Supabase types file regenerates automatically and we wire UI against the new tables.

**Stripe products created via tooling, not in code:**
- `Elevated Membership` — $199/mo recurring (price_id stored in `membership_tiers.stripe_price_id`)
- IV services already exist as products; lab panels do NOT need Stripe products (charged via dynamic line items at order time).

**Patient stage transitions** are mostly trigger-driven (booking → `consult_booked`, payment confirm on labs → `labs_drawn`, subscription created → `membership_active`). Admin override exposed in provider dashboard.

**Edge functions to add:**
- `labcorp-fax-inbound` (OCR + match to order)
- `stripe-membership-webhook` (subscription lifecycle)
- `superbill-generate` (PDF render via existing PDF pipeline)
- `pre-visit-intake-sms` (T-24h scheduler via pg_cron + Sinch)

**Files we will retire / rewrite:**
- `src/pages/PricingComparison.tsx`, `src/pages/Pricing.tsx` — rebuilt around single tier
- `src/components/provider/InvitePatientCard.tsx` — already partially updated; remove ZRT kit option
- `src/lib/serviceConfig.ts` — finalize `ACTIVE_SERVICES`
- Various marketing pages still mentioning $250 kit / multi-tier memberships

## Run cadence

We will run **Phase 1 first** (schema migration) for your approval, then proceed phase by phase. After each phase you'll be able to verify in preview before we move on. Total: ~5 weeks of build at the doc's stated pace, but each phase is independently shippable.

Reply **"start phase 1"** (or any phase number) to kick off.
