# PHASE 2B-PLAN — Pricing & Messaging Sweep (Audit and Plan Only)

**Date:** 2026-05-13  
**Authority:** `docs/pricing/pricing_source_of_truth.md` (including **Live Stripe Price IDs (Production)**).  
**Scope of this document:** Detailed change plan only. **No code was modified** to produce this plan.

---

## Executive summary

The codebase still reflects a **Réveil-era** commercial model: split GLP-1 member/non-member Stripe prices, Vitality/Concierge/Founding tiers, ZRT saliva checkout flows, ketamine-era **PUBLIC_KNOWLEDGE** in AI edge functions, and patient-facing copy that violates SOT **Forbidden language** and **Everything Included** pillars. Aligning to SOT requires: (1) swapping **38 deprecated test `price_…EOtKRY99pu…` IDs** for **30 live IDs** already documented in SOT; (2) **retiring obsolete edge functions** and their `config.toml` entries; (3) a **coordinated front-end + edge + webhook + DB template** rewrite so amounts, Stripe IDs, and narrative stay consistent; (4) a new **`MembershipComparison`** marketing component rolled across program surfaces; (5) an **idempotent migration** updating `email_templates` (seeded as `consultation_invite`, etc.)—the repo uses **`email_templates`**, not a table named `notification_templates`.

---

## Part 1 — Files to DELETE entirely

Each path is the **edge function folder** (delete `index.ts` + folder, and remove matching `[functions.*]` blocks from `supabase/config.toml`). Before production deletion, confirm **no Supabase Dashboard scheduled job** or **external Zapier** invokes these slugs.

| Path | Rationale | Caller / dependency check |
|------|-----------|---------------------------|
| `supabase/functions/create-vitality-checkout/` | Vitality membership discontinued (SOT + deprecated price `price_1Sga64…`). | **No `invoke` in `src/`** found. Only listed in `supabase/config.toml`. Safe after config cleanup. |
| `supabase/functions/send-vitality-activation-sms/` | Legacy Vitality activation SMS; deprecated price ID. | No `src/` invoke found. Config entry exists. |
| `supabase/functions/send-vitality-activation/` | Legacy vitality activation (separate from SMS). | No `src/` invoke found. Config entry exists. |
| `supabase/functions/create-founding-membership-checkout/` | Founding tiers / Réveil naming; deprecated prices `TDovo*`. | **No `src/` invoke** found. Safe if no staff-only UI elsewhere (grep showed docs only). |
| `supabase/functions/create-semaglutide-checkout/` | Split SKU model; superseded by **ELEVATED GLP-1** `price_1TWcPL…` + optional **Semaglutide Single Fill** `price_1TWcqT…`. | **`src/pages/WeightLoss.tsx`** invokes. **`src/components/provider/QuickPaymentModal.tsx`** returns function name. **`src/lib/stripeConfig.ts`** `WEIGHT_LOSS_PRICES` / `GLP1_MEDICATION_PRICES`. Must update callers **before** delete. |
| `supabase/functions/create-tirzepatide-checkout/` | Same as semaglutide. | Same callers as above. |
| `supabase/functions/create-glp1-starter-checkout/` | Starter month SKU; SOT deprecates `price_1SgcM9…`. | No direct `invoke` in `src/`; success flow tied to **`src/pages/MedicationConfirmed.tsx`** (`glp1_starter` key) and public weight-loss CTAs—grep any `medication-confirmed?med=glp1_starter` links in WeightLoss. Remove CTA + MedicationConfirmed branch when deleting. |
| `supabase/functions/create-glp1-continuation-checkout/` | Continuation SKU; SOT deprecates `price_1Sd8Ch…`. | **`MedicationConfirmed.tsx`** supports `glp1-continuation`. Update/remove. |
| `supabase/functions/create-neurotransmitter-checkout/` | ZRT Neurotransmitter panel; SOT discontinues ZRT patient product. | **`src/components/patient/NeurotransmitterCard.tsx`** invokes. Delete card surface or repurpose to LabCorp CTA when removing function. |
| `supabase/functions/create-metabolic-checkout/` | ZRT metabolic kit checkout. | **No active `src/` invoke** (only commented blocks in `HealthOverview` / `BiologicalScorecard`). Safe after confirming no bookmarked patient URLs. |
| `supabase/functions/create-toxicity-checkout/` | ZRT toxicity checkout. | Commented-only in patient components. |
| `supabase/functions/create-total-body-checkout/` | ZRT “Elevated Architecture” bundle. | Commented-only in patient components. |
| `supabase/functions/verify-neurotransmitter-payment/` | Payment verification paired with neurotransmitter checkout. | No `src/` references; likely success_URL callback only. Delete with checkout. |
| `supabase/functions/verify-metabolic-payment/` | Paired with metabolic checkout. | No `src/` references. |
| `supabase/functions/verify-toxicity-payment/` | Paired with toxicity checkout. | No `src/` references. |
| `supabase/functions/verify-total-body-payment/` | Paired with total-body checkout. | No `src/` references. |
| `supabase/functions/verify-hormone-payment/` | Legacy hormone mapping / kit payment path (`hormone_mapping_payments` per security audit). | **No `src/` invoke** found; confirm not used by old email links before delete. **Open question:** keep if any in-flight kit payments. |

**Not listed for deletion in this PR (Phase 3 or clinical tooling):** `parse-zrt-labs`, `ZRTRequisitionGenerator` (staff), `NewLabResultModal` ZRT mode (may still be needed for historical PDFs), `TermsOfService` ketamine sections (full rewrite Phase 3 per user). `update-subscription-addon` is **modify or retire** (see Part 3A)—not a blind delete until hormone add-on migration path is defined.

---

## Part 2 — Files to CREATE

| New path / artifact | Purpose (2–3 sentences) | Live Stripe IDs (from SOT) |
|---------------------|-------------------------|----------------------------|
| `supabase/functions/create-medical-review-checkout/` | Authenticated or staff-initiated **one-time** Checkout for **Medical Review $149** using `price_1TWcn3CXbCBPFEeILKHcCnTR`. Metadata should identify patient, requesting staff, and `service_type: medical_review`. | `price_1TWcn3…` |
| `supabase/functions/create-phone-followup-checkout/` | One-time Checkout for **Physician Phone Follow-Up $99** using `price_1TWcnXCXbCBPFEeIEojOHJDL`. | `price_1TWcnX…` |
| `supabase/functions/create-lab-panel-checkout/` | One-time Checkout selecting **Comprehensive $199** (`price_1TWcoM…`) vs **Expanded $299** (`price_1TWcol…`) via request body; metadata for booking reconciliation. | Both lab price IDs |
| `supabase/functions/create-medication-fill-checkout/` | One-time Checkout router: testosterone `price_1TWcp8…`, Bi-Est `price_1TWcpT…`, progesterone `price_1TWcq1…`, semaglutide single `price_1TWcqT…`, tirzepatide single `price_1TWcsC…`. Replaces most of **`create-alacarte-checkout`** medication branches. | Five fill IDs |
| `supabase/functions/create-trt-checkout/` | Subscription Checkout for **ELEVATED TRT** `price_1TWcPICXbCBPFEeInMGSsjDN`. | `price_1TWcPI…` |
| `supabase/functions/create-hrt-checkout/` | Subscription Checkout for **ELEVATED HRT** `price_1TWcPKCXbCBPFEeIJKBf62b9`. | `price_1TWcPK…` |
| `supabase/functions/create-glp1-checkout/` | Single subscription Checkout for **ELEVATED GLP-1** `price_1TWcPLCXbCBPFEeIK7tkeIAM` (replaces **create-semaglutide-checkout** + **create-tirzepatide-checkout** split). | `price_1TWcPL…` |
| `supabase/functions/create-wellness-membership-checkout/` | Subscription Checkout for **ELEVATED WELLNESS** `price_1TWcPNCXbCBPFEeIXo6IDpPf`. Replaces or splits **`create-membership-checkout`** (today hardcodes legacy `price_1TUs3L…`). | `price_1TWcPN…` |
| `supabase/functions/_shared/member-discount.ts` | Deno module exporting helpers: given `patient_id`, detect active ELEVATED subscription via DB + Stripe subscription items (or cached `elevated_membership_status` if already maintained), compute **20% off** eligible line items for à la carte Checkout sessions built with `price_data` or dynamic line items. | No fixed price ID; consumes patient state |
| `src/components/marketing/MembershipComparison.tsx` | Reusable marketing table (spec in **Part 4**). | Displays SOT dollar amounts; optional prop to pass Stripe links for CTAs |
| `supabase/migrations/<timestamp>_update_email_templates_pricing.sql` | **`email_templates`** (not `notification_templates`) — update rows where `template_key` / body still say **$99 Discovery**, wrong phone **922-7454**, etc. Use `UPDATE … WHERE body_html LIKE …` for idempotency. | N/A |

**Optional consolidation:** Instead of four separate `create-*-checkout` subscription functions, one **`create-elevated-program-checkout`** with `program: 'trt'|'hrt'|'glp1'|'wellness'` could reduce duplication—decide in implementation; plan assumes explicit functions for clarity.

---

## Part 3 — Files to MODIFY

### 3A — Edge functions to update

| Function | Current state | Target state / ID mapping |
|----------|---------------|---------------------------|
| `create-consultation-checkout` | `price_data` with `unit_amount: 7900` ($79). Metadata `product: "clinical_strategy_session"`. | Keep **$79** amount; align **product metadata naming** with “Wellness Assessment” (avoid “strategy session”). Optionally switch to fixed live price `price_1TWcma…` for parity with SOT catalog. |
| `send-consultation-invite` | Builds Checkout with **`unit_amount: 9900`** while comments say $149; email copy references **Discovery Consultation**, **$99 credit toward Hormone Mapping Kit**, **$149 credit** bullets; `serviceLabels` includes **ketamine**. | Replace with **$79 Wellness Assessment** live price `price_1TWcma…` OR keep `price_data` at 7900; rewrite HTML to **four pillars** + SOT onboarding exclusions; **remove ketamine** service label; remove hormone mapping kit credit claims (SOT forbids “consultation fee credits”). Fix phone numbers in template to **760-3470**. |
| `send-consultation-invite-sms` | Message mixes **$149 Strategy Session**, **$99 credit**, contradictory copy. | Single story: **$79 Wellness Assessment** + link + **760-3470**; align with email. |
| `verify-consultation-payment` | (Not deeply audited here.) | After invite uses live price id, ensure verification matches **new Price ID** or `price_data` line items. **Out of scope:** patient-row race (Phase 2C). |
| `stripe-webhook/index.ts` | Only recognizes legacy membership `ELEVATED_MEMBERSHIP_PRICE_ID = price_1TUs3L…`. Welcome email HTML still mentions **“ZRT Saliva Kit Shipping”** and pharmacy shipping framing. | **Array or switch** of four program price IDs + legacy migration window if needed; update `isElevatedMembership` logic to **program detection**; rewrite welcome email to **LabCorp quarterly labs**, **no ZRT**, **Everything Included** pillars; remove kit shipment copy. |
| `send-welcome-email` / `send-welcome-sms` | (Grep suggests templates may duplicate phone issues.) | Align onboarding copy with SOT; ensure any embedded prices match **$79 / $199 / program $249–$349**. |
| `send-booking-confirmation` | `useBookingConfirmation.ts` still says **“Clinical Strategy Session”**. | Rename to **Wellness Assessment**; verify amount language. |
| `send-activation-sms` | Uses deprecated **`PRICE_IDS`** including wrong semaglutide key (`price_1SlZnw…` at $399) and vitality/hormone add-on. | Replace with **live GLP-1 price** for messaging OR derive amounts from Stripe API; remove vitality/hormone add-on keys; align SMS text to ELEVATED programs. |
| `send-patient-invite` | Uses **`price_1SZiRM…` Hormone Mapping $299** checkout. | Remove checkout for discontinued product; replace flow with **$79 assessment + $199 lab** booking instructions or staff-generated **create-lab-panel-checkout** link. |
| `update-subscription-addon` | Adds **`price_1SmMlO…`** hormone add-on subscription item. | **Delete path** per SOT (rolled into TRT/HRT) **or** replace with documented clinical add-on if any remain—**requires physician/business decision** (Part 7). |
| `create-alacarte-checkout` | Maps legacy testosterone/bi-est/progesterone/follow-up/lab to old `price_1Sga*` / `T1AbV`. | Point medication keys to **`create-medication-fill-checkout`** live IDs; **remove labPanel branch** using deprecated diagnostic ID; **followUp** should map to **Physician Phone Follow-Up** live ID `price_1TWcnX…` (SOT says $99 phone follow-up—not the same as RN Maintenance $79; confirm clinical mapping). |
| `create-iv-drip-checkout` | Dynamic `price_data`; may use DB `stripe_price_id`. | When implementing **20% member discount**, call `_shared/member-discount.ts` to adjust `unit_amount` or add a coupon—**design choice** (Part 7). |
| `create-rebooking-checkout` | Uses legacy `price_1Sa5UF…`. | Swap to **`price_1TWcnsCXbCBPFEeIFltNQdpi`**. |
| `create-membership-checkout` | Single legacy **`price_1TUs3L…`** subscription. | **Replace** with invocations of **`create-wellness-membership-checkout`** OR generalize to accept program parameter and branch on four live subscription price IDs. |
| `create-sexual-wellness-checkout` / `create-hair-restoration-checkout` | Legacy `price_1Sfij*` / `Sa67Y` IDs. | Map each `product_key` to **live IDs** from SOT Sexual Wellness + Hair tables. |
| `create-hormone-addon-checkout` | (If present—mentioned in old security docs.) | Confirm existence; delete if still legacy tier add-on. |
| `chat/index.ts` | **`PUBLIC_KNOWLEDGE`** includes ketamine pricing, **$99/$149** consult variants, **Vitality $249**, **Hormone Mapping $250/$349**, GLP-1 **$399–699**, “book $149 consult”. | Full rewrite to SOT: **four ELEVATED programs**, **$79** assessment, **labs $199/$299**, **no ketamine**, no vitality/concierge, **Everything Included** pillars, **20% member discount** note. |
| `voice-session/index.ts` | Same **`PUBLIC_KNOWLEDGE`** block as chat (synced header comment); inconsistent **$99 vs $149** consult language. | Same rewrite as chat; keep header comment accurate. |
| `provider-chat/index.ts` | **`CLINIC_KNOWLEDGE`** is internal but still teaches staff **Vitality/Concierge**, **ZRT kits**, **$149 consult credit**, ketamine as core service. | Replace with **SOT-accurate internal ops**: ELEVATED tiers, LabCorp panels, FCC as 503A supplier **without** “pass-through member pricing” for program meds, escalation paths ($149 medical review, $99 phone follow-up), **no ketamine offering**. |

**Also update:** `supabase/config.toml` — remove deleted function sections; add new function sections with correct `verify_jwt` posture per security pattern.

### 3B — Marketing pages to update

| File | Price / copy changes | Forbidden / legacy language | Everything Included | `MembershipComparison` | Notes |
|------|---------------------|----------------------------|------------------------|--------------------------|-------|
| `src/pages/Index.tsx` | Indirect via child components. | — | Add via **PromiseSection** / **WhyElevatedSection** updates | Optional above fold on Index | Home is composition of sections |
| `src/components/home/WhyElevatedSection.tsx` | N/A | **Remove** “Labs and medications **pass through at cost**” | Add four-pillar compliant transparency | Optional | High-impact fix |
| `src/pages/Pricing.tsx` | Large ketamine/SPRAVATO schema and body copy; **Vitality** savings blocks; ZRT saliva product copy. | Ketamine as offered service; “ZRT Saliva Profile III”; Vitality membership pricing | Replace mental wellness section per **Phase 3** boundary: **for this PR**, strip patient-facing **prices/CTAs** for ketamine and Vitality; add ELEVATED program cards with **live prices** | Yes — banner per SOT | Major file |
| `src/pages/PricingComparison.tsx` | Calculator uses **`CONSULTATION_PRICES.discovery.amount` commented as $99** while value is 7900; **`DIAGNOSTIC_KIT_PRICES`** $250; membership **`ELEVATED_MEMBERSHIP` $199** legacy. | Inconsistent math / wrong kit economics | Rebuild model: non-member vs **ELEVATED TRT/HRT/GLP-1/WELLNESS** using SOT onboarding + monthly | Prefer new `MembershipComparison` or merge | |
| `src/pages/HormonesMen.tsx` / `HormonesWomen.tsx` | **`PRICE_MEMBERSHIP = "$199"`** → program-specific **$249 TRT** / **$229 HRT** (or gateway vs detail). | **“billed separately by FCC”** footnote under medication row | Add four pillars + comparison | **Yes** | FCC mention as **503A supplier** is fine; **billing implication** must change |
| `src/pages/Hormones.tsx` (gateway) | **`PRICE_MEMBERSHIP $199`**; step copy references **“Concierge membership”** language. | “Concierge membership” legacy tier naming | Point to ELEVATED programs | **Yes** | |
| `src/pages/WeightLoss.tsx` | **CTAs:** lines still say **“Get $99 Credit”** and **“Book a Consultation - $99”** while constants use **$79**; meta description mentions **“ZRT hormone testing”**. | ZRT in patient SEO; contradictory $99 | GLP-1 program **$349/mo** + single fills from SOT | **Yes** | Rewire **`invoke`** to **`create-glp1-checkout`**; remove sema/tire split |
| `src/pages/PeptideTherapy.tsx` | (Spot-check constants.) | May reference member discount 15% vs SOT **20%** | Four pillars where peptides intersect programs | **Yes** | Align IV lounge member benefit text |
| `src/pages/Membership.tsx` | Membership economics FAQ | **“Billed separately at FCC cost-plus”** table row; **“Billed separately at cost”** heading; FAQ **“Why aren’t medications included…”** | Full FAQ rewrite per pillars | **Yes** — central page |
| `src/pages/Affordability.tsx` | **Phone `706-973-3866`** (`tel:+17069733866` and display string). | Ketamine/TRICARE copy may remain for financing context—**triage** vs SOT “ketamine not offered” | Add disclaimer: financing for **eligible** services only | No | **J** fix |
| `src/pages/WhatToExpect.tsx` | **Step 2 duration shows `$99`** while title says **$79** (`WhatToExpect.tsx` vs shared component inconsistency). | Meta description still references **ketamine $400** sessions | Light touch per user: **price harmonization + meta** only | Optional | **E** fix |
| `src/components/WhatToExpect.tsx` | Already **$79** in one place—ensure single source of truth between page and component. | — | — | — | Dedupe |
| `src/pages/HairRestoration.tsx` | Uses legacy Stripe IDs (incl. dutasteride drift). | — | Low-traffic storefront per `.cursorrules` | Optional | Swap to live hair price IDs |
| `src/pages/SexualWellness.tsx` | Legacy price IDs | — | Optional | Swap to live IDs |

### 3C — Config and shared files

| File | Changes |
|------|---------|
| `src/lib/stripeConfig.ts` | **Major rewrite:** import or mirror **all 30 live `price_*` + product keys** from SOT; remove **`GLP1_MEDICATION_PRICES`**, **`WEIGHT_LOSS_PRICES`**, **`DIAGNOSTIC_KIT_PRICES`**, deprecated **`ELEVATED_MEMBERSHIP`** copy; replace **`ALACARTE_PRICES`** with medication fill keys at **$179/$109/$99** + single-fill sema/tirz; add **`ELEVATED_PROGRAMS`** object (`trt`/`hrt`/`glp1`/`wellness`); add **`CORE_SERVICE_PRICES`** (`wellness_assessment`, `medical_review`, `phone_followup`, `rebooking`, `lab_comprehensive`, `lab_expanded`); update **`CONSULTATION_CREDIT`** text to match SOT (credits claim discontinued—likely **remove** credit marketing); fix **`getAllPriceIds()`** helper to aggregate new exports. |
| `src/components/provider/PeptideAddonSelector.tsx` | Replace eight peptide **`price_1…`** literals with **live `TWc*` IDs** from SOT. |
| `src/components/provider/SexualWellnessAddonSelector.tsx` | Align PT-141 + oxytocin + PDE5 IDs with live table; **deduplicate** oxytocin ID drift (`SfijW` vs `SfibU`). |
| `src/components/provider/HairRestorationAddonSelector.tsx` | Same for hair IDs; align with **`create-hair-restoration-checkout`**. |
| `src/pages/StaffPricingCheatsheet.tsx` | Full rewrite to **SOT tables** + live IDs for staff reference. |
| `src/components/provider/DashboardWelcomeState.tsx` | Replace **“consultation invite ($149)”** with **$79 Wellness Assessment** invite language. |
| `src/pages/PatientResources.tsx` | Remove **Vitality / Concierge FAQ** (`$249`, `$499`, pharmacy billed separately). Replace with **ELEVATED** program FAQ + **Everything Included**. |
| `src/pages/PatientServices.tsx` | Spot-check for stale tier names / pricing. |
| `src/hooks/useBookingConfirmation.ts` | Strategy session → Wellness Assessment. |
| `src/components/patient/NextActionCard.tsx` | “Book Your Strategy Session” → Wellness Assessment. |
| `src/components/patient/OnboardingProgress.tsx` | Step labels. |
| `src/components/provider/ConsultationTracker.tsx` | “Discovery Consultations” label → Wellness Assessments. |
| `src/pages/Consult.tsx` | “Clinical Strategy Session” heading. |
| `src/components/MediaFeature.tsx` | Ketamine press link—**Phase 3** or remove CTA in this PR per scope (user: remove ketamine from CTAs/prices—**remove or de-emphasize click**). |
| `src/pages/IVLounge.tsx` | “**15% off**” vs SOT member **20%** for wellness members; “concierge access” language — **align discount to 20%** where referring to ELEVATED members; tighten concierge wording. |

### 3D — Patient portal

| Area | Finding | Plan |
|------|---------|------|
| `src/pages/PatientDashboard.tsx` | Large branch for **`primary_program === "ketamine"`**, Osmind copy, **`zrt_kit_status`**, **`membership_tier` vitality/concierge** UI. | **Not full removal in this PR** (Phase 3 for ketamine dashboard); **for 2B**: add an **“Everything Included”** banner for **ELEVATED** patients, update any **visible price strings**, and ensure non-ketamine path doesn’t show legacy tier savings. |
| Service cards / kit components | `HealthOverview`, `BiologicalScorecard`, `NeurotransmitterCard`, etc. | Remove **active** ZRT checkout hooks; replace with “**LabCorp labs at office**” + link to book **$199** panel when appropriate. |

### 3E — Database migration (`email_templates`)

**Table:** `public.email_templates` (created in `20260106012554_1ff77803-4d5e-44ce-aef7-4a3e02342957.sql`).

**Idempotent pattern:**

```sql
UPDATE public.email_templates
SET
  name = 'Wellness Assessment Invite',
  subject = replace(subject, '$99 Discovery Consultation', '$79 Wellness Assessment'),
  body_html = replace(replace(body_html, '$99 Discovery Consultation', '$79 Wellness Assessment'), '(706) 922-7454', '(706) 760-3470'),
  sms_text = replace(replace(sms_text, '$99 Discovery Consultation', '$79 Wellness Assessment'), '(706) 922-7454', '(706) 760-3470'),
  updated_at = now()
WHERE template_key = 'consultation_invite'
  AND (body_html LIKE '%$99 Discovery%' OR sms_text LIKE '%$99 Discovery%' OR subject LIKE '%$99 Discovery%');
```

Repeat for **`welcome`** template wrong phone; **`kit_payment`** copy may need archival vs rewrite (ZRT kit payment largely obsolete—**open question**).

**Reversibility:** store previous bodies in a `_backup` migration table or comment-only rollback script (optional).

---

## Part 4 — `MembershipComparison` component spec

**Path:** `src/components/marketing/MembershipComparison.tsx`

**Props:**

```ts
type Program = "trt" | "hrt" | "glp1" | "wellness";

interface MembershipComparisonProps {
  program: Program;
  className?: string;
  ctaHref?: string; // default: /consult or program-specific booking route
}
```

**Layout:** Responsive grid: `grid-cols-1 md:grid-cols-3` with columns **Service | Non-member (à la carte) | ELEVATED [Program] member**. On mobile, stack as cards; member column first after headline (“Recommended”).

**Styling:** `bg-background` / `text-foreground`; headers `font-playfair`; table borders `border-border`; member column `bg-accent/10 ring-2 ring-accent`; primary CTA button `bg-primary text-primary-foreground` (charcoal/camel per existing tokens—avoid hardcoding hex except as comment).

**Row model (each program):** Use **SOT Live** prices for à la carte column; member column shows **“Included”** where program bundles the service per SOT program table.

### TRT (`program="trt"`)

| Service | Non-member price (SOT) | Member (ELEVATED TRT) |
|---------|------------------------|-------------------------|
| Testosterone / TRT medication | **$179** fill (`price_1TWcp8…`) typical cadence—display **“from $179/fill”** with footnote: member gets medication **included** | **Included** |
| Monthly RN check-in | **$79** Maintenance visit | **Included** (monthly RN check-in per SOT) |
| Quarterly comprehensive lab panel | **$199** each (`price_1TWcoM…`) × 4/year shown as **$199/qtr** | **Included** (free quarterly Comprehensive per SOT) |
| Physician lab review / medical review | **$149** when clinically required (`price_1TWcn3…`) | **Included** when staff-initiated per SOT; footnote for patient-requested $149 |
| Unlimited messaging | Treat as **not sold standalone** (show “—” or “Ask for estimate”) vs **Included** | **Included** |

**Totals (display formulas):**

- **Month 1 (new patient, non-member à la carte path):** `79 + 199 + 179 + 79 = $536` for “self-pay stack” illustration *or* align headline number to SOT competitive line **`$527`** by adjusting assumptions (use **$249** first program month vs à la carte med fill—pick one story and document in component comments). **Recommendation:** use SOT official line **`$79 + $199 + $249 = $527`** for **member program start** column footnote, and build non-member column as sum of equivalent à la carte lines **without** forcing equality—highlight **savings**.  
- **Month 1 (ELEVATED TRT member):** `527` per SOT (`79 + 199 + 249`).  
- **Steady state monthly (member month ≥2):** **`$249/mo`** only.  
- **Non-member steady state (illustrative):** `179 + (199/3) + 79 ≈` **~$225+/mo** meds + amortized quarterly labs + monthly RN—show rounded; mark as **estimate**.  
- **Annual (member):** `527 + 249*11 = $3,266` (first year) then `249*12` year 2—**display “Year 1” vs “Year 2”** footnotes.  
- **Savings callout:** `nonMemberYear1 - memberYear1`.

### HRT (`program="hrt"`)

Same structure; replace testosterone fill with **Bi-Est $109** / **Progesterone $99** as representative non-member lines (pick primary estrogen line + note “multi-hormone” footnote). **Member monthly:** **`$229`**. Month 1 headline: **`79 + 199 + 229 = $507`**.

### GLP-1 (`program="glp1"`)

Non-member medication: **Semaglutide single fill $299** OR **Tirzepatide single fill $399**—expose prop `variant: 'sema'|'tirz'` or show two sub-rows. **Member:** **`$349/mo`** includes medication choice per SOT. Monthly RN **$79** vs included; quarterly **Expanded panel $299** vs included (SOT: GLP-1 includes **free quarterly Expanded Panel**). Month 1: **`79 + 199 + 349 = $627`** (uses Expanded baseline per SOT weight-loss positioning—**confirm** vs Comprehensive $199; SOT line 93 says “$199 (labs)” for generic first-month—in **open question**, prefer physician clarification: GLP-1 onboarding uses **Expanded $299** per program table line 26).

### Wellness (`program="wellness"`)

Non-member: IV walk-in canonical from `/iv-lounge` (pull from existing IV price table constant). Member: **`$199/mo`** + **2 free IVs/mo** + **20% off** additional à la carte IV/peptide/injectable. Comparison should show **two IV drips** equivalent value using **Myers $185** from `.cursorrules` as placeholder until IV SOT finalized—**flag** dependency on IV pricing doc.

**CTA button (member column footer):**  
`Join ELEVATED TRT — $249/mo` (swap program name + price per prop). Link to **`ctaHref`** default **`/weightloss`**, **`/hormones-men`**, etc., or unified **`/consult`**.

---

## Part 5 — Forbidden language audit (representative hits)

Instructions: each item → **delete**, **replace** (with pillar language), or **Phase 3** (full page / clinical tool rewrite).

| File | Pattern / string | Disposition |
|------|------------------|-------------|
| `src/lib/stripeConfig.ts` | “Medications **billed separately at FCC cost-plus**” | **Replace** with inclusive program description |
| `src/pages/Membership.tsx` | “**Billed separately at FCC cost-plus**” / “**Billed separately at cost**” heading / FAQ “**Why aren't medications included**” | **Replace** with pillars + SOT-compliant FAQ |
| `src/components/home/WhyElevatedSection.tsx` | “**pass through at cost**” | **Replace** |
| `src/pages/HormonesMen.tsx` / `HormonesWomen.tsx` | “**billed separately by FCC**” | **Replace** (supplier yes; separate billing no) |
| `src/pages/PatientResources.tsx` | “**Vitality Membership ($249/mo)**” / “**Concierge Membership ($499/mo)**” / prescriptions “**billed separately through the pharmacy**” | **Delete** FAQ entries; **replace** with ELEVATED |
| `supabase/functions/chat/index.ts` | Ketamine section, SPRAVATO pricing, “**$99 Ketamine Candidacy**”, Vitality, hormone mapping kit | **Replace** entire knowledge block |
| `supabase/functions/voice-session/index.ts` | Same | **Replace** |
| `supabase/functions/provider-chat/index.ts` | “**Vitality Membership - $249/month**”, “**Concierge Membership - $500/month**”, ZRT kit scripting, “**$149 consult**”, “**billed separately at member rate**” | **Replace** internal guide |
| `supabase/functions/send-consultation-invite-sms/index.ts` | “**$149 Strategy Session**” + “**$99** becomes a credit” | **Replace** |
| `supabase/functions/send-consultation-invite/index.ts` | “**Discovery Consultation**”, kit credit bullets | **Replace** |
| `src/pages/Pricing.tsx` | Schema + on-page ketamine / SPRAVATO / ZRT / Vitality | **Phase 3** for deep rewrite; **this PR:** remove/adjust **pricing** claims per user |
| `src/pages/Affordability.tsx` | SPRAVATO “**We accept major insurance**…” | **Phase 3** or neutral financing copy without ketamine as active service |
| `src/pages/TermsOfService.tsx` | ZRT kit fee paragraphs; ketamine refund rules | **Phase 3** legal rewrite |
| `src/pages/MentalWellnessPage.tsx` | Ketamine patient journey | **Phase 3** |
| `src/components/patient/OAuthOnboarding.tsx` | Ketamine pathway | **Phase 3** (large UX) |
| `src/pages/PricingComparison.tsx` | Comments “`// $99`” while 7900 cents | **Replace** during calculator rebuild |
| `src/pages/WeightLoss.tsx` | “**Get $99 Credit**” button text | **Replace** (contradicts $79) |
| `src/pages/WhatToExpect.tsx` | Meta ketamine **$400** | **Replace** (light touch) |
| `src/pages/IVLounge.tsx` | “**concierge access**” | **Replace** wording (not forbidden list but legacy tier) |
| `src/components/provider/MembershipAssignmentCard.tsx` / `PatientDatabase.tsx` | **VITALITY / CONCIERGE** tier selectors | **Replace** with ELEVATED program assignment UX (bigger than copy—**Part 7**) |
| `src/components/provider/CommunicationLog.tsx` | “Vitality Activation (legacy)” | **Replace** label |
| `src/lib/holgateLogic.ts` | Ketamine therapy recommendations | **Phase 3** clinical content |
| `src/components/provider/EncounterFormModal.tsx` / `TodayScheduleWidget.tsx` / `AppointmentPanel.tsx` | Ketamine / Spravato encounter types | **Phase 3** or hide from new scheduling |

**Note:** SOT line “Labs are **billed separately** from visits” is **allowed** clinical billing accuracy for **lab fee vs visit fee**—do not conflate with forbidden **membership medication** language.

---

## Part 6 — Execution order

1. **`stripeConfig` + shared TypeScript constants** first — downstream imports (`WeightLoss`, `QuickPaymentModal`, `PricingComparison`, selectors) need stable exports for live IDs.  
2. **New edge functions** (parallelizable after constants): program checkouts + lab + medication fills + medical review + phone follow-up. Deploy to **staging** with test keys mirroring live catalog where possible.  
3. **`stripe-webhook` + `create-membership-checkout` / replacements** before deleting legacy subscription checkouts—avoid breaking active subscriptions detecting old price IDs (consider **dual recognition window**).  
4. **Delete legacy checkout functions** only after **all `invoke()` paths** migrated (`WeightLoss`, `QuickPaymentModal`, `NeurotransmitterCard`, `MedicationConfirmed`, commented code cleaned).  
5. **`MembershipComparison.tsx`** built next (pure UI, uses static SOT numbers).  
6. **Marketing pages** import component + copy passes (can parallelize per page).  
7. **Consultation invite email/SMS + `email_templates` migration** near the same release as **`send-consultation-invite`** deploy (avoid DB saying $99 while edge sends $79).  
8. **AI knowledge functions** (`chat`, `voice-session`, `provider-chat`) **before** enabling any new public marketing campaign relying on assistant accuracy.  
9. **DB migration** can run **immediately before or after** edge deploy; if invite emails are DB-templated, migration **before** turning on new invite copy is safer.

---

## Part 7 — Risks and open questions

1. **Active Stripe subscriptions** on legacy price IDs (`price_1TUs3L…`, sema/tire, vitality): deleting checkout functions does **not** cancel Stripe subscriptions, but **webhook** logic must keep recognizing old prices until migrated or grandfathered.  
2. **`stripeConfig` rewrite blast radius:** many files import constants; TypeScript will guide refactors but expect **wide diff**.  
3. **`elevated_membership_status` / `membership_tier` DB enum:** UI still shows vitality/concierge—data model may need migration to **program enum** (`trt`/`hrt`/`glp1`/`wellness`)—possibly **larger than 2B**.  
4. **Member 20% discount:** SOT says checkout layer—requires reliable **“is active ELEVATED subscriber?”** signal; confirm whether `stripe-webhook` already maintains this or if edge must query Stripe each time.  
5. **GLP-1 onboarding lab price:** Program table says quarterly **Expanded** panel included; onboarding line 37 says initial **Comprehensive $199**—comparison math should **not** accidentally claim Expanded for first draw without clinical sign-off.  
6. **`verify-hormone-payment` + `hormone_mapping_payments`:** confirm no revenue dependency before deletion.  
7. **Staff clinical tools (ZRT upload UI, holgate logic):** keep operational for legacy patients? If yes, ensure **patient-facing** strings only change in 2B.  
8. **`PricingComparison.tsx`:** deeply inconsistent; may be faster to **rewrite** than patch comments.  
9. **SEO legal risk:** `Pricing.tsx` structured data still advertises ketamine services—coordinate with **Phase 3** legal/compliance.  
10. **SOT vs `.cursorrules`:** `.cursorrules` still lists older IV member discount **15%**; SOT says **20%**—**resolve** which document wins (SOT should supersede for this sweep).

---

*End of sweep plan. This file is planning-only; implementation belongs in subsequent PRs.*
