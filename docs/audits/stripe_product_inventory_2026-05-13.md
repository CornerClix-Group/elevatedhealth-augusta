# Stripe product & price inventory — codebase audit

**Audit date:** 2026-05-13  
**Scope:** `src/` and `supabase/functions/` (read-only; no code or Stripe changes).  
**Pricing canonical reference:** `docs/pricing/pricing_source_of_truth.md` (effective 2026-05-13).  
**Note:** None of the new live program Price IDs (`price_1TWcPI…`, `price_1TWcPK…`, `price_1TWcPL…`, `price_1TWcPN…` on account suffix `CXbCBPFEeI`) appear anywhere in this repository yet. Category 1 below is a **forward migration mapping** from legacy test-era IDs currently in code.

---

## Summary table

| Metric | Count |
|--------|------:|
| **Total literal `price_1…` string occurrences** (`src/` + `supabase/functions/`, `.ts`/`.tsx` only; machine-counted) | **71** |
| **Distinct literal Stripe Price IDs** in those paths | **38** |
| **Category 1 — Direct replacements** (distinct legacy Price IDs that should converge on one of the four new ELEVATED program prices) | **6** |
| **Category 2 — Needs new live product** (SOT-aligned or à-la-carte “finalized later”; needs live Stripe Products/Prices or amount fixes) | **27** rows in Section 2 |
| **Category 3 — Sunset / remove** (discrete code surfaces listed in Section 3) | **25** |
| **Category 4 — Uncertain** (Section 4 bullet list) | **7** |

---

## Phase A — How this inventory was built

### `price_1…` search

- Scanned `src/**/*.ts(x)` and `supabase/functions/**/*.ts` for the regex `price_1[A-Za-z0-9]+`.
- Requested exclusions (`node_modules`, `*.test.*`, `*.spec.*`) produced no additional hits in this repo.

### `price_data` / `unit_amount` search

| File | Role | `unit_amount` / amount behavior |
|------|------|--------------------------------|
| `supabase/functions/create-consultation-checkout/index.ts` | Checkout | `7900` ($79 Wellness Assessment) |
| `supabase/functions/send-consultation-invite/index.ts` | Checkout | `9900` ($99) — product name “Discovery Consultation”; **comment/code mismatch** ($149 mentioned in comment) |
| `supabase/functions/create-iv-drip-checkout/index.ts` | Checkout | Dynamic `Math.round(therapy.price * 100)` / addon; uses fixed `price` when `stripe_price_id` present on payload |
| `supabase/functions/create-neurotransmitter-checkout/index.ts` | Checkout | `39900` — ZRT Neurotransmitter |
| `supabase/functions/create-metabolic-checkout/index.ts` | Checkout | `59900` — ZRT Metabolic kit |
| `supabase/functions/create-toxicity-checkout/index.ts` | Checkout | `29900` — ZRT Toxicity |
| `supabase/functions/create-total-body-checkout/index.ts` | Checkout | `99900` — bundled ZRT “Elevated Architecture” |
| `supabase/functions/update-subscription-addon/index.ts` | Subscription API | Reads `item.price.unit_amount` from Stripe (no hardcoded Price ID beyond the add-on ID) |
| `supabase/functions/get-business-metrics/index.ts` | Reporting | Aggregates `price.unit_amount` from Stripe API |
| `src/lib/stripeConfig.ts` | Config comment | `CONSULTATION_PRICES.discovery.priceId: null` — notes `price_data` usage |

**`unit_amount` in `src/`:** none found (amounts live in edge functions / config cents fields).

---

## Section 1: Category 1 — Direct replacements

**Target live Price IDs (business handoff — not in repo yet):**

| Program | Target live Price ID | SOT price |
|---------|----------------------|-----------|
| ELEVATED TRT | `price_1TWcPICXbCBPFEeInMGSsjDN` | $249/mo |
| ELEVATED HRT | `price_1TWcPKCXbCBPFEeIJKBf62b9` | $229/mo |
| ELEVATED GLP-1 | `price_1TWcPLCXbCBPFEeIK7tkeIAM` | $349/mo |
| ELEVATED WELLNESS | `price_1TWcPNCXbCBPFEeIXo6IDpPf` | $199/mo |

### Migration table (legacy → target)

| Legacy Price ID | Representative file(s) / line(s) | What it represents today | Replace with (new live program Price ID) | Notes |
|-----------------|-----------------------------------|---------------------------|------------------------------------------|-------|
| `price_1TUs3LEOtKRY99puWfQy8pHj` | `src/lib/stripeConfig.ts` ~61; `supabase/functions/create-membership-checkout/index.ts` ~104; `supabase/functions/stripe-webhook/index.ts` ~6 | Legacy **single-tier Elevated Membership** $199/mo | **`price_1TWcPNCXbCBPFEeIXo6IDpPf`** (ELEVATED WELLNESS) **or** route to TRT/HRT/GLP-1/WELLNESS per enrollment | Old marketing copy in `stripeConfig` still mentions cost-plus meds — conflicts SOT. Webhook must accept **all** program Price IDs you sell. |
| `price_1TUs38EOtKRY99puPpc6SFMs` | `src/lib/stripeConfig.ts` ~147; `supabase/functions/create-semaglutide-checkout/index.ts` ~32 | Semaglutide **member** $199/mo | **`price_1TWcPLCXbCBPFEeIK7tkeIAM`** | Superseded by single **ELEVATED GLP-1** $349/mo. |
| `price_1TUs3AEOtKRY99puDOseqLDZ` | `src/lib/stripeConfig.ts` ~152; `supabase/functions/create-semaglutide-checkout/index.ts` ~33 | Semaglutide **non-member** $249/mo | **`price_1TWcPLCXbCBPFEeIK7tkeIAM`** | Legacy split SKU sunset. |
| `price_1TUs39EOtKRY99puWAF4oZT7` | `src/lib/stripeConfig.ts` ~159; `supabase/functions/create-tirzepatide-checkout/index.ts` ~24 | Tirzepatide **member** $399/mo | **`price_1TWcPLCXbCBPFEeIK7tkeIAM`** | Legacy split SKU sunset. |
| `price_1SlZnyEOtKRY99puE9JNOrTR` | `src/lib/stripeConfig.ts` ~164; `supabase/functions/create-tirzepatide-checkout/index.ts` ~25; `supabase/functions/send-activation-sms/index.ts` ~50 | Tirzepatide **non-member** $499/mo | **`price_1TWcPLCXbCBPFEeIK7tkeIAM`** | Same ID reused in activation SMS helper. |
| `price_1SlZnwEOtKRY99puaBhrh2iB` | `supabase/functions/send-activation-sms/index.ts` ~49 | Keyed as **“semaglutide”** at $399/mo | **`price_1TWcPLCXbCBPFEeIK7tkeIAM`** | **Inconsistent** with `create-semaglutide-checkout` ($199/$249). Fix during migration. |

**Gap:** There are **no** existing hardcoded Price IDs for **ELEVATED TRT** or **ELEVATED HRT**; those are net-new checkout + webhook surfaces.

---

## Section 2: Category 2 — Needs new live product

These align with **current SOT** (or SOT’s “à la carte being finalized”) but need **live-mode** Stripe Products/Prices (or SOT-correct amounts) before launch.

| # | Suggested Stripe product name | Description | SOT price | Billing | Current code state |
|---|------------------------------|-------------|-----------|---------|-------------------|
| 1 | Wellness Assessment | RN intake (universal front door) | $79 | One-time | `create-consultation-checkout` — `price_data` `7900` |
| 2 | Medical Review | Physician telehealth review | $149 | One-time | No dedicated checkout located |
| 3 | Physician Phone Follow-Up | Non-member phone consult | $99 | One-time | No dedicated checkout; see Cat 3 for wrong $99 “Discovery” invite |
| 4 | Comprehensive Wellness Panel | LabCorp baseline | $199 | One-time | Not wired at $199; legacy `price_1T1AbV…` used with **$250** semantics |
| 5 | Expanded Panel | Advanced baseline | $299 | One-time | No checkout located |
| 6 | Rebooking Fee | No-show / late cancel | $99 | One-time | `price_1Sa5UF…` — verify Stripe amount = SOT |
| 7 | IV Lounge — drip | Walk-in IV per /iv-lounge | varies | One-time | `create-iv-drip-checkout` — dynamic `price_data` or DB `stripe_price_id` |
| 8 | Sermorelin Injection | Staff peptide add-on | $149/mo (UI) | Recurring | `price_1Sa3oy…` — `PeptideAddonSelector.tsx` |
| 9 | CJC-1295/Ipamorelin | Staff peptide add-on | $179/mo (UI) | Recurring | `price_1Sfm0o…` — regulatory decision **Category 4** |
| 10 | Tesamorelin | Staff peptide add-on | $399/mo (UI) | Recurring | `price_1SfibZ…` |
| 11 | NAD+ Troches | Staff peptide add-on | $99/mo (UI) | Recurring | `price_1Sa3x1…` |
| 12 | NAD+ Injection | Staff peptide add-on | $199/mo (UI) | Recurring | `price_1Sa3wa…` |
| 13 | NAD+ Nasal Spray | Staff peptide add-on | $99/mo (UI) | Recurring | `price_1Sfibe…` |
| 14 | PT-141 Kit (10-dose) | Staff peptide / sexual add-on | $225 (UI) | One-time | `price_1Sa3xI…` (also PT-141 drift vs `price_1Sa67Y…` — **Category 4**) |
| 15 | GHK-Cu Sublingual | Staff peptide add-on | $99/mo (UI) | Recurring | `price_1SfibX…uuRk…` |
| 16 | GHK-Cu Topical | Staff peptide / hair add-on | $149/mo (UI) | Recurring | `price_1SfibX…DbZK…` |
| 17 | Minoxidil + Finasteride | Hair restoration subscription | $129/mo | Recurring | `price_1SfijTE…` |
| 18 | Dutasteride protocol | Hair restoration subscription | $149/mo | Recurring | `price_1SfijUE…` (**two literals** in FE vs checkout — **Category 4**) |
| 19 | GHK-Cu scalp therapy | Hair restoration subscription | $149/mo | Recurring | `price_1SfijVE…` |
| 20 | Tadalafil | Sexual wellness | $99/mo | Recurring | `price_1SfijRE…` |
| 21 | Sildenafil | Sexual wellness | $79/mo | Recurring | `price_1SfijSE…` |
| 22 | PT-141 (Bremelanotide) | Sexual wellness one-time | $225 | One-time | `price_1Sa67Y…` (+ staff kit id — **Category 4**) |
| 23 | Oxytocin nasal spray | Sexual wellness | $89/mo | Recurring | `price_1SfijWE…` (+ staff id `price_1SfibUE…` — **Category 4**) |
| 24 | Testosterone cream fill | Non-member à la carte | $149 | One-time | `price_1Sga66…` |
| 25 | Bi-Est cream fill | Non-member à la carte | $89 | One-time | `price_1Sga67…` |
| 26 | Progesterone fill | Non-member à la carte | $79 | One-time | `price_1Sga69…` |
| 27 | Follow-up Consultation (non-member) | Alacarte “followUp” SKU | $99 | One-time | `price_1Sga6A…` — align copy to SOT **Maintenance $79** vs **Physician Phone $99** (clinical routing — **Category 4**) |

*Rows 24–27:* SOT emphasizes meds **included** in programs; retaining standalone non-member Rx fills is a **business** call (see Category 4).

---

## Section 3: Category 3 — Sunset references to remove

| Location | What to sunset / why |
|----------|---------------------|
| `supabase/functions/create-vitality-checkout/index.ts` ~67 | Vitality membership `price_1Sga64…` — SOT discontinues Vitality branding |
| `supabase/functions/send-vitality-activation-sms/index.ts` ~15 | Same Vitality Price ID |
| `supabase/functions/send-activation-sms/index.ts` ~51 | Vitality key |
| `supabase/functions/send-activation-sms/index.ts` ~49 | `PRICE_IDS.semaglutide` → `price_1SlZnw…` (legacy activation helper) |
| `supabase/functions/send-activation-sms/index.ts` ~50 | `PRICE_IDS.tirzepatide` → `price_1SlZny…` |
| `supabase/functions/send-activation-sms/index.ts` ~52 | `PRICE_IDS.hormoneAddon` → `price_1SmMlO…` |
| `supabase/functions/create-founding-membership-checkout/index.ts` ~18 | Founding **Wellness Pass** → `price_1TDovo…` |
| `supabase/functions/create-founding-membership-checkout/index.ts` ~22 | Founding **Longevity Protocol** → `price_1TDovp…` |
| `supabase/functions/create-founding-membership-checkout/index.ts` ~26 | Founding **Executive Concierge** → `price_1TDovs…` |
| `supabase/functions/send-patient-invite/index.ts` ~75 | `price_1SZiRM…` — Hormone Mapping $299 — SOT: ZRT / mapping kit discontinued |
| `src/lib/stripeConfig.ts` `DIAGNOSTIC_KIT_PRICES` ~34–43 | `price_1T1AbV…` — legacy ZRT reference |
| `src/lib/stripeConfig.ts` `ALACARTE_PRICES.labPanel` ~113–120 | Same ID with **$250** lab copy — conflicts SOT **$199** panel |
| `supabase/functions/create-alacarte-checkout/index.ts` ~62 | Lab panel branch using same legacy ID |
| `supabase/functions/create-semaglutide-checkout/index.ts` | Split semaglutide SKUs |
| `supabase/functions/create-tirzepatide-checkout/index.ts` | Split tirzepatide SKUs |
| `src/lib/stripeConfig.ts` `GLP1_MEDICATION_PRICES` + `WEIGHT_LOSS_PRICES` | Legacy GLP-1 matrix + weight-loss metadata |
| `supabase/functions/update-subscription-addon/index.ts` ~11 | `price_1SmMlO…` — $149/mo hormone subscription add-on (tier-style; not in SOT) |
| `supabase/functions/create-glp1-starter-checkout/index.ts` ~54 | `price_1SgcM9…` — starter month SKU (not in SOT program table) |
| `supabase/functions/create-glp1-continuation-checkout/index.ts` ~32 | `price_1Sd8Ch…` — continuation SKU (not in SOT program table) |
| `supabase/functions/send-consultation-invite/index.ts` ~81–93 | **Discovery Consultation** + `unit_amount: 9900` — SOT lists **$99 Discovery** as discontinued; replace with **$79** Wellness Assessment flow or remove |
| `supabase/functions/create-neurotransmitter-checkout/index.ts` | ZRT neurotransmitter `unit_amount: 39900` |
| `supabase/functions/create-metabolic-checkout/index.ts` | ZRT metabolic kit `unit_amount: 59900` |
| `supabase/functions/create-toxicity-checkout/index.ts` | ZRT toxicity `unit_amount: 29900` |
| `supabase/functions/create-total-body-checkout/index.ts` | ZRT bundle `unit_amount: 99900` |
| `supabase/functions/send-consultation-invite/index.ts` ~73–77 | `serviceLabels.ketamine` — ketamine not offered (copy cleanup) |

---

## Section 4: Category 4 — Uncertain (human judgment)

1. **Legacy membership vs ELEVATED WELLNESS only:** Same nominal $199/mo does not imply same service bundle; webhook and portal logic need a deliberate model (four program IDs vs legacy umbrella).  
2. **Non-member `create-alacarte-checkout` Rx fills:** SOT “meds included” vs operational need for rare à la carte fills.  
3. **`send-activation-sms` semaglutide uses `price_1SlZnw…` ($399)** vs **semaglutide checkout ($199/$249)** — resolve which Stripe Price is authoritative before messaging uses live data.  
4. **Dutasteride drift:** `…H5TqvFks` (checkout/config) vs `…pubB9WRUs1` (storefront + staff UI).  
5. **PT-141 drift:** `…Sa67Y…` (patient sexual wellness checkout) vs `…Sa3xI…` (staff peptide + sexual add-on selectors).  
6. **Oxytocin drift:** `…SfijW…` (checkout/config) vs `…SfibU…` (staff selector — possible `ij`/`ib` typo).  
7. **CJC-1295/Ipamorelin:** In staff UI with live Price ID; not spelled out in SOT discontinued table — needs clinical/regulatory decision vs pricing doc alone.

---

## Appendix A — All 38 unique `price_1…` IDs (occurrence count + primary role)

Machine count: **71** total string matches across `src/` + `supabase/functions/`.

| # | Price ID | Occurrences | Primary role(s) |
|---|----------|------------:|-------------------|
| 1 | `price_1T1AbVEOtKRY99pumPdgj1k3` | 3 | CFG + checkout (legacy lab / diagnostic) |
| 2 | `price_1TUs3LEOtKRY99puWfQy8pHj` | 3 | CFG + membership checkout + webhook |
| 3 | `price_1Sga66EOtKRY99puQgPWACIy` | 2 | CFG + alacarte checkout |
| 4 | `price_1Sga67EOtKRY99puoS8b5U6h` | 2 | CFG + alacarte checkout |
| 5 | `price_1Sga69EOtKRY99puO8NJ5bpx` | 2 | CFG + alacarte checkout |
| 6 | `price_1Sga6AEOtKRY99puEx0mC3jx` | 2 | CFG + alacarte checkout |
| 7 | `price_1TUs38EOtKRY99puPpc6SFMs` | 2 | CFG + semaglutide checkout |
| 8 | `price_1TUs3AEOtKRY99puDOseqLDZ` | 2 | CFG + semaglutide checkout |
| 9 | `price_1TUs39EOtKRY99puWAF4oZT7` | 2 | CFG + tirzepatide checkout |
| 10 | `price_1SlZnyEOtKRY99puE9JNOrTR` | 3 | CFG + tirzepatide checkout + activation SMS |
| 11 | `price_1SlZnwEOtKRY99puaBhrh2iB` | 1 | Activation SMS (keyed “semaglutide”) |
| 12 | `price_1SfijTEOtKRY99puE2WxgmrI` | 4 | CFG + hair checkout + FE |
| 13 | `price_1SfijUEOtKRY99puH5TqvFks` | 2 | CFG + hair checkout |
| 14 | `price_1SfijUEOtKRY99pubB9WRUs1` | 2 | FE only (dutasteride — drift vs #13) |
| 15 | `price_1SfijVEOtKRY99puXq7N3Lp2` | 2 | CFG + hair checkout |
| 16 | `price_1SfijREOtKRY99puq0ITndfC` | 4 | CFG + sexual checkout + FE |
| 17 | `price_1SfijSEOtKRY99pumi7jjNvs` | 4 | CFG + sexual checkout + FE |
| 18 | `price_1Sa67YEOtKRY99puQlYCjH4m` | 2 | CFG + sexual checkout (PT-141) |
| 19 | `price_1SfijWEOtKRY99puB9Rq4Lm3` | 2 | CFG + sexual checkout (oxytocin) |
| 20 | `price_1Sa5UFEOtKRY99pupEQlaFvN` | 2 | CFG + rebooking checkout |
| 21 | `price_1Sa3oyEOtKRY99puGS2t9EZv` | 1 | Staff peptide FE |
| 22 | `price_1Sfm0oEOtKRY99puEurPSCU6` | 1 | Staff peptide FE |
| 23 | `price_1SfibZEOtKRY99pud5SNVeXI` | 1 | Staff peptide FE |
| 24 | `price_1Sa3x1EOtKRY99pufL3wEyIN` | 1 | Staff peptide FE |
| 25 | `price_1Sa3waEOtKRY99puCB267VpA` | 1 | Staff peptide FE |
| 26 | `price_1SfibeEOtKRY99puUPRACDHQ` | 1 | Staff peptide FE |
| 27 | `price_1Sa3xIEOtKRY99puIXSB3L31` | 2 | Staff peptide + staff sexual FE |
| 28 | `price_1SfibXEOtKRY99puuRkJc5g3` | 1 | Staff peptide FE |
| 29 | `price_1SfibXEOtKRY99puDbZKu1zw` | 2 | Staff peptide + staff hair FE |
| 30 | `price_1SfibUEOtKRY99pujkcHdFLc` | 1 | Staff sexual FE (oxytocin — drift vs #19) |
| 31 | `price_1Sga64EOtKRY99pu6NpP45Qq` | 3 | Vitality checkout + SMS helpers |
| 32 | `price_1SmMlOEOtKRY99puBAxTpw99` | 2 | Subscription add-on + activation SMS |
| 33 | `price_1TDovoEOtKRY99pus14I47X3` | 1 | Founding checkout |
| 34 | `price_1TDovpEOtKRY99pu8sW2tl9N` | 1 | Founding checkout |
| 35 | `price_1TDovsEOtKRY99puPtteAgOu` | 1 | Founding checkout |
| 36 | `price_1SZiRMEOtKRY99pua6QMu12h` | 1 | Patient invite checkout |
| 37 | `price_1SgcM9EOtKRY99puXlVr5s6o` | 1 | GLP-1 starter checkout |
| 38 | `price_1Sd8ChEOtKRY99pu7iaAF3Jd` | 1 | GLP-1 continuation checkout |

**Checksum:** Sum of occurrences = **71**.

---

## Appendix B — `price_data` / `unit_amount` (no fixed Price ID)

Already summarized in Phase A; no additional `price_1` literals in those blocks.

---

*End of audit document.*
