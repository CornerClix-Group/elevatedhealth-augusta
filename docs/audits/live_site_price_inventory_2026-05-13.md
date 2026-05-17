# Live site price inventory & membership messaging audit

**Audit date:** 2026-05-13  
**Site:** https://elevatedhealthaugusta.com  

**Method**

1. **Live (preferred):** `curl` for `robots.txt`, `sitemap.xml`, and raw HTML; **headless browser** (accessibility snapshots + on-page search) for React-rendered content. The app is a **Vite SPA** — static HTML is mostly an empty `#root`; **prices and body copy reflect what renders after JS**, not what `curl` alone returns.
2. **Source proxy (noted explicitly):** Where the live URL **404s**, **redirects to login**, or email copy is **not** in the SPA, findings cite `src/pages/*.tsx` or `supabase/functions/...` with the caveat: *“Reflects repository source; live rendered output may differ until deployed.”*

**Required “Everything Included” substance (stakeholder brief)**  
Copy must preserve the meaning of:

- Your **monthly medication is included**
- **Lab review** and **protocol adjustments** are included
- **Unlimited messaging** is included
- **One price, no hidden fees**

**Forbidden on patient-facing surfaces (brief)**  
Avoid: “Plus pharmacy costs”, “Plus consultation fees”, vague “Additional charges may apply”, “Starting at” without full price adjacent, “$X/month then $Y for …”.

---

## Summary: unique prices & price-like strings

| Price / string | Approx. # of distinct patient-facing surfaces* | Where it appears (examples) |
|----------------|-----------------------------------------------|-----------------------------|
| **$79** | 12+ | Home, Pricing, Weight loss, Hormones (gateway + M/W), Peptides, Membership, What-to-expect, Pricing comparison (FAQ), Affordability, Schedule consult (post-login UI — source), Consult page (source; live gated) |
| **$99** | 4 | What-to-expect (badge vs title conflict); Weight loss (CTAs); Terms (rebooking fee); staff consult invite **email** (edge fn — source) |
| **$100** (financing) | 1 | Pricing — Klarna “4 payments of ~$100” (legacy ketamine card context) |
| **$129 / $179** (per mo) | 1 | Peptides — stack member / non-member (on-page search on live `/peptides`) |
| **$139** | 1 | Affordability — “IV drips” entry price |
| **$145** / **$45** (competitor) | 1 | Weight loss — Ro comparison footnote only |
| **$149** | 1 | Pricing — optional “MD evaluation” alongside $79 wellness |
| **~$183/mo** (financing) | 1 | Pricing — Affirm on legacy series |
| **$185** | 2 | IV Lounge — pregnancy IV package; walk-in band upper end **$95–$185** |
| **$199** (flat) | 3+ | Weight loss — semaglutide member; membership headline; comparison footnotes |
| **$199/mo** | 9+ | Hormones M/W + gateway, Peptides, Weight loss, Membership, IV Lounge, Pricing (legacy Vitality context) |
| **$249 / $499** | 2 | Weight loss — GLP-1 non-member sema / tire |
| **$250** | 4+ | Home / How it works — Hormone Mapping Kit; Affordability; Membership flow copy |
| **$295 / $345** | 2 | Weight loss — Weight Optimization Panel member/non-member |
| **$299 / $399** | 1 | Terms of Service — legacy “Diagnostic Fees” |
| **$329** | 1 | Pricing comparison — à la carte onboarding component |
| **$345 / $395** | 4 | Hormones women/men + gateway — lab panels |
| **$399 / $499** | 3 | Weight loss — tirzepatide member/non-member; comparison table |
| **$400** (per session) | 1 | What-to-expect — IV ketamine accordion (live) |
| **$2,400 – $3,200** | 1 | What-to-expect — ketamine induction total |
| **$400/month** | 1 | What-to-expect — ketamine maintenance |
| **$450 – $750** | 1 | IV Lounge — NAD+ infusions |
| **$95 – $185** | 1 | IV Lounge — walk-in drip band |
| **$25** | 1 | IV Lounge — per booster |
| **15% off** | 2 | IV Lounge — member add-ons; Membership bullets |
| **$50** | 1 | Pricing — “$50/month medication credit” (Vitality-era hormone card) |
| **“Save $100/month”** | 1 | Pricing — Vitality testosterone card |
| **$4,500+** / **$2,988** / yr | 1 | Pricing — annual comparison strip |
| **$2,638** / **$4,463.80** / **$1,825.80** | 1 | Pricing comparison — calculator outputs |
| **$40 – $200/mo** | 1 | Membership — “typically” for compounded meds (excluded column) |
| **$1,140/year** | 1 | Weight loss — savings vs competitor |
| **$99.75** | 1 | Affordability — Klarna/Affirm illustrative split |
| **$99.75**-style math | — | (Same row — not a product price) |
| **50–80%** | 1 | Insurance & Reimbursement — OON reimbursement narrative |

\*Surfaces = live URL + post-login-only + email HTML in repo + legal page; not deduplicating repeated mentions on one page.

**OG / Twitter meta (source + live behavior)**  
Per-route `<meta>` with dollar amounts is defined in **page components** (React Helmet). **`curl` of deep links returns the same `index.html` shell** — crawlers without JS often see **only** the default site description (no per-page prices). Where Helmet **does** embed prices in **source**, examples include: **WeightLoss, Pricing, Membership, MilitaryVeteran, HairRestoration, SexualWellness, Consult** (`src/pages/...`). Live social previews should be verified in a JS-capable fetch (e.g. Facebook Sharing Debugger) after deploy.

**Image `alt` text containing prices**  
`rg` over `src/` found **no** `alt="..."` strings containing `$`.

---

## robots.txt & sitemap.xml

- **robots.txt:** `User-agent: *` → `Allow: /`; sitemap URL declared.  
- **sitemap.xml:** Lists core marketing URLs (`/`, `/hormones`, `/hormones-women`, `/hormones-men`, `/weightloss`, `/peptides`, `/iv-lounge`, `/pricing`, `/what-to-expect`, `/affordability`, `/membership`, `/military-veteran`, `/consult`, `/schedule-consult`, legal).  
- **Not in sitemap** but in app: e.g. `/pricing-comparison`, `/insurance-reimbursement`, `/about`, `/patient/login`.

---

## Page: `/`

### Prices currently displayed

- **$79** — Wellness Assessment (How it works step 1 body) — CTAs **“Book a $79 consultation”** (footer/contact area) — lower **“Start with a $79 Wellness Assessment”**  
- **$250** — Hormone Mapping Kit (step 2 diagnostic copy) — narrative only  

### Membership inclusions messaging

- **Present (partial / indirect):** `WhyElevatedSection`: *“No surprise bills. Ever.”* + *“Memberships and à la carte services are posted publicly. Labs and medications **pass through at cost** — we don't mark them up.”*  
- **MISSING for “Everything Included” brief:** Hero does **not** state that **monthly medication**, **lab review/protocol adjustments**, and **unlimited messaging** are included in one price.  
- **Conflict with brief:** “Pass through at cost” for meds/labs reads as **not** “medication included in membership,” vs required positioning.

### Inconsistencies found

- Hero CTA **“Book a consultation”** omits **$79**; elsewhere on home **$79** is explicit.

---

## Page: `/pricing`

### Prices currently displayed

(Live snapshot; legacy blocks still render.)

- **$79** — Provider strategy / wellness assessment; credited toward first treatment — **“Book $79 Wellness Assessment”**  
- **$149** — Optional MD evaluation (same closing band as $79)  
- **~$100** — Klarna (legacy mental-health / ketamine financing line)  
- **~$183/mo** — Affirm (legacy series)  
- **$4,500+** / **$2,988**/yr — Annual comparison callout  
- **$100/mo** “save” — Vitality testosterone card  
- **$50/mo** — Medication credit (Vitality hormone card)  
- Legacy **ketamine / Spravato** structure with session economics (see prior audit for full list)  
- Hormone section: **Vitality Membership**, **Elevated+**, ZRT-style **Hormone Mapping Panel** framing  

### Membership inclusions messaging

- **Present:** Hero-adjacent philosophy: *“No hidden fees. No surprise bills.”* JSON-LD FAQ (in source) claims membership includes **medication**, labs, messaging (conflicts with other parts of site/membership page). GLP-1 subsection uses **“all-inclusive membership”** and bullets: medication/supplies/shipping **included**, unlimited messaging, etc.  
- **MISSING as unified banner:** No single **“Everything Included”** promise above all program cards with the four required bullets.  
- **Forbidden / risky vs brief:** Multiple “**+ financing**” strings OK; problem is **split membership story** (Vitality vs Elevated) and legacy **ketamine** pricing.

### Inconsistencies found

- Same page mixes **Elevated**-era and **Réveil/Vitality/ketamine** economics; contradicts “one price, no hidden fees” story.

---

## Page: `/services`

### Prices currently displayed

- **None** — **404** (live).

### Membership inclusions messaging

- **MISSING** (page does not exist).

### Inconsistencies found

- N/A

---

## Page: `/hormones-men`

### Prices currently displayed

- **$79** — Initial consultation — **“Book your $79 consultation”**  
- **$395 / $345** — Male hormone panel  
- **$199/mo** — Elevated Membership strip  

### Membership inclusions messaging

- **Weak / implicit:** Steps describe care; **no** hero banner with the four required inclusion lines. Pricing table row notes **testosterone “billed separately by FCC”** (source: `HormonesMen.tsx`) — **conflicts** with “monthly medication included” positioning.

### Inconsistencies found

- “Billed separately” language on a program detail page vs global membership promise.

---

## Page: `/hormones-women`

### Prices currently displayed

- **$79** — Initial consultation — **“Book your $79 consultation”**  
- **$395 / $345** — Female hormone panel  
- **$199/mo** — Elevated Membership  

### Membership inclusions messaging

- **Partial:** Step 04 *“All included with membership”* (visits/labs cadence) — not the four-bullet **Everything Included** promise.  
- **Conflict:** Creams **“billed separately by FCC”** (source) vs medication-included narrative.

### Inconsistencies found

- Same as men’s page regarding **FCC billing** copy.

---

## Page: `/weight-loss` and `/weightloss`

### Prices currently displayed

(Alias `/weight-loss` serves same app as `/weightloss` — live **200**.)

- **$79** — Wellness assessment; credited — multiple CTAs  
- **$99** — **“Book $79 Wellness Assessment — Get $99 Credit”** and **“Not Sure Which? Book a Consultation - $99”** (**internal conflict**)  
- **$345 / $295** — Weight optimization panel  
- **$199/mo** — Membership strip  
- **$199 / $249** — Semaglutide member/non-member  
- **$399 / $499** — Tirzepatide member/non-member  
- **$399/mo** & **$499/mo** in comparison table; **$1,140/year** savings line  
- Competitor **$45 / $145** footnote (Ro — not your price)  

### Membership inclusions messaging

- **Present:** Section labels **“All-inclusive”**, **“No hidden fees”** (small green text); bullets include **FDA-approved GLP-1 medication included**, eligibility screening **included**, **unlimited provider messaging**.  
- **Gap:** Does not use stakeholder **exact** four pillars in one block; **“No hidden fees”** sits next to CTAs that still mention **$99**.

### Inconsistencies found

- **$79** vs **$99** on same page (CTAs and “credit” copy).

---

## Page: `/peptide-therapy` and `/peptides`

### Prices currently displayed

- **$79** — Consult — **“Book your $79 consultation”**  
- **from $245** / **members from $195** — Lab panel strip  
- **$199/mo** — Membership  
- **$245–$345** / **$195–$295** — Lab ranges in steps  
- **$129/mo** & **$179/mo** (and related stack grid) — member/non-member stacks (confirmed on live via `$129` search)  

### Membership inclusions messaging

- **Partial:** “What’s included” section label on protocol cards; no single **Everything Included** membership banner with the four required lines.

### Inconsistencies found

- Many numeric tiers; ensure any “starting at” language (if added) includes adjacent full price per brief.

---

## Page: `/sexual-wellness`

### Prices currently displayed

- **Live route:** **404** (no prices rendered).  
- **Source proxy (`SexualWellness.tsx`):** Meta still references **$99 private consultation**; page body mixes **$79** and **$99** in places — *if route is re-enabled, reconcile before deploy.*

### Membership inclusions messaging

- **MISSING** on live (404).

### Inconsistencies found

- Source meta vs intended $79 consult if page goes live again.

---

## Page: `/hair-restoration`

### Prices currently displayed

- **Live:** **404**.  
- **Source proxy:** Helmet uses **$79** assessment in meta; storefront has product **$129/mo** etc. — not audited line-by-line here (not live).

### Membership inclusions messaging

- **MISSING** on live (404).

### Inconsistencies found

- N/A (live)

---

## Page: `/iv-therapy`

### Prices currently displayed

- **None** — **404**. Canonical live IV pricing is on **`/iv-lounge`**.

### Membership inclusions messaging

- **MISSING**.

### Inconsistencies found

- Users/bookmarks expecting `/iv-therapy` hit **404** while **`/iv-lounge`** holds drip pricing.

---

## Page: `/iv-lounge`

### Prices currently displayed

- **$95 – $185** — Walk-in drip band  
- **$450 – $750** — NAD+ infusions  
- **15% off** — Member add-ons  
- **$25** — Booster add-on each  
- **$185** — Pregnancy / hyperemesis package  
- **$199/mo** — Elevated Membership callout  

### Membership inclusions messaging

- **Partial:** Walk-in “RN start & monitoring included” (IV-specific). **No** membership **Everything Included** four-pillar block (IV is not membership-only).

### Inconsistencies found

- None fatal within IV page alone; compare **$139** IV mention on `/affordability`.

---

## Page: `/membership`

### Prices currently displayed

- **$199/mo** — Headline  
- **$79** — Initial consult (strip + FAQ)  
- **from $245** / **members from $195** — Labs  
- **$40 – $200/mo** — Typical compounded med pass-through (excluded column)  

### Membership inclusions messaging

- **Present:** “**What your membership covers**”, “**Included in your $199/mo**” checklist (visits, supplies, member-rate labs, SMS line, portal, IV discount, priority booking, quarterly MD).  
- **MISSING vs new brief:** Checklist does **not** say **monthly medication is included**; explicitly **excludes** meds with **“Billed separately at FCC cost-plus”** and FAQ **“Why aren’t medications included in the price?”** — **directly conflicts** stakeholder **Forbidden** / **Everything Included** requirements.  
- **“One price, no hidden fees”** — not stated verbatim; subtext emphasizes pass-through invoices.

### Inconsistencies found

- **Included** vs **billed separately** columns contradict the required single-story membership positioning.

---

## Page: `/consult`

### Prices currently displayed

- **Live:** Unauthenticated users are **redirected to `/patient/login`** — **no** consult pricing in browser.  
- **Source proxy (`Consult.tsx`):** **$79** in title/meta and on-card copy for booking options.

### Membership inclusions messaging

- **MISSING** on live path (login wall).

### Inconsistencies found

- Public URL in sitemap does **not** deliver consult storefront without auth.

---

## Page: `/what-to-expect`

### Prices currently displayed

- **$79** — Step 2 title + **“Book $79 Wellness Assessment”**  
- **$99** — Step 2 duration chip: *“$99 · Credited toward treatment”* (**same card as $79 title**)  
- **$400** / **$2,400–$3,200** / **$400/month** — IV ketamine accordion (live expanded content)  

### Membership inclusions messaging

- **Absent / wrong topic:** Page is still **ketamine/SPRAVATO** oriented (H1, FAQs). **No** Elevated **Everything Included** membership promise.

### Inconsistencies found

- **$79** vs **$99** on one step; ketamine dollar amounts vs $79 wellness CTAs; document title references ketamine.

---

## Page: `/pricing-comparison`

### Prices currently displayed

- **$2,638** — “Vitality Membership” 12-mo model (**$250** + **$2,388**)  
- **$4,463.80** — À la carte estimate (**$329** onboarding + services)  
- **$1,825.80 (41%)** — Savings line  
- **$79** — FAQ mentions wellness assessment credit  

### Membership inclusions messaging

- **Present:** “**All-inclusive hormone optimization**”, bullets: all hormone **medications included**, quarterly labs **included**, unlimited messaging **included**; comparison table “What’s **Included**”.  
- **Gap:** Brand is **“Vitality Membership”**, not aligned with **Elevated Membership $199/mo** story elsewhere; **not** the stakeholder’s four-line **Everything Included** block as single source of truth.

### Inconsistencies found

- **Vitality** all-inclusive math vs **Membership** page saying meds are **not** included — **direct contradiction** across URLs.

---

## Page: `/how-it-works` and `/faq` and `/book`

### Prices currently displayed

- **None** — **404** for each (live).

### Membership inclusions messaging

- **MISSING** (no page).

### Inconsistencies found

- N/A

---

## Page: `/schedule-consult` — booking widget & price before checkout

### Prices currently displayed

- **Live (unauthenticated):** Redirects to **`/patient/login`** — **no** slot picker, **no** price.  
- **Source proxy (`ScheduleConsult.tsx`):** Post-login UI shows **$79** for the paid consult context; rebooking CTA **“Pay $79 rebooking fee”** when `onboarding_status === rebooking_fee_required`**. Comments** reference **$79** consult.

### Membership inclusions messaging

- **MISSING.**

### Inconsistencies found

- Public “self-book consult” URL does not show anonymous booking + price.

---

## Page: `/about`

### Prices currently displayed

- **None** in captured live tree.

### Membership inclusions messaging

- **MISSING.**

### Inconsistencies found

- None.

---

## Page: `/affordability`

### Prices currently displayed

- **$99.75** — Example installment math  
- **$79** — Assessment credit section  
- **$250** — Hormone / metabolic mapping after credit  
- **$139** — IV drips “no membership needed”  

### Membership inclusions messaging

- **Partial:** *“No long-term contracts. **No hidden fees.** Just care.”*  
- **MISSING:** Four-pillar **Everything Included** block.

### Inconsistencies found

- **$139** IV vs **`/iv-lounge`** **$95–$185** band.  
- Wrong phone **(706) 973-3866** in hero (live) vs **760-3470** sitewide.

---

## Page: `/insurance-reimbursement`

### Prices currently displayed

- **50–80%** — OON reimbursement narrative  

### Membership inclusions messaging

- **MISSING** (insurance-focused; ketamine/SPRAVATO FAQ still in source).

### Inconsistencies found

- Not a price inconsistency; topic drift vs current product mix.

---

## Page: `/terms-of-service`

### Prices currently displayed

- **$299 / $399** — Legacy diagnostic fee framing  
- **$99** — Rebooking fee  

### Membership inclusions messaging

- **MISSING.**

### Inconsistencies found

- Legacy ketamine refund copy still in terms (live snapshot in prior pass).

---

## Page: `/military-veteran`

### Prices currently displayed

- **None** in accessibility tree (live).  

### Membership inclusions messaging

- **MISSING.**

### Inconsistencies found

- **Document title** (source/live) still references **ketamine** for veterans; OG mentions **$79** assessment (verify in browser after deploy).

---

## Consultation invitation emails (edge function — source proxy)

**File:** `supabase/functions/send-consultation-invite/index.ts`

### Prices currently displayed

- **$99** — Email body and Stripe `unit_amount: 9900` (billing mismatch vs $79 checkout elsewhere — known issue).

### Membership inclusions messaging

- **Partial:** HTML block *“Your Consultation Includes:”* with bullets (30-min visit, assessment, etc.).  
- **MISSING:** Stakeholder **Everything Included** four-pillar **membership** promise (email is consult-only, but still patient-facing).  
- **Forbidden-adjacent:** Heavy **fee + credit** framing without aligning fee to **$79**.

### Inconsistencies found

- **$99** in email vs **$79** on public storefronts and `create-consultation-checkout`.

---

## Patient portal — post-login dashboard (`PatientServices` — source proxy)

### Prices currently displayed

- **None** in service cards (`PatientServices.tsx` — active services are hormone + weight loss descriptions without dollar amounts).

### Membership inclusions messaging

- **MISSING:** No **Everything Included** / **no hidden fees** / medication-included banner on dashboard.

### Inconsistencies found

- `PatientResources.tsx` FAQ (if linked from portal) still references **“Vitality Membership ($249/mo)”** and **“Prescriptions are billed separately through the pharmacy”** — **forbidden-pattern** language and **wrong price** vs $199.

---

## Gap analysis — “Everything Included” messaging

| Surface | Prices OK? | Everything Included / four-pillar messaging | Priority gap |
|---------|------------|---------------------------------------------|--------------|
| **Home `/`** | Partial | **MISSING** in hero; WhyElevated contradicts “meds included” | **High** — hero + secondary band |
| **`/pricing`** | Messy / legacy | Partial scattered; **no** unified banner; contradicts self | **High** |
| **`/hormones-men`**, **`/hormones-women`**, **`/hormones`** | Yes | **MISSING**; FCC “billed separately” **conflicts** | **High** |
| **`/weightloss`** | $79/$99 conflict | Partial (“all-inclusive”, “no hidden fees” for GLP-1 track only) | **High** — fix $99 + add membership promise |
| **`/peptides`** | Yes | **MISSING** unified banner | **Medium** |
| **`/iv-lounge`** | Yes | IV-only inclusions; **not** membership promise | **Low** (optional IV-specific clarity) |
| **`/membership`** | Exposes pass-through | **Opposite** of brief today (meds **excluded** copy) | **Critical** — must reconcile with legal/pricing before patient messaging |
| **`/pricing-comparison`** | Vitality math | Says meds **included** — **conflicts** with `/membership` | **Critical** |
| **`/consult`** | Gated live | N/A live | **High** if public consult URL is required |
| **`/schedule-consult`** | Gated live | N/A | **Medium** |
| **`/what-to-expect`** | Ketamine + $99/$79 | Wrong page topic | **High** — retire or rewrite |
| **`/affordability`** | IV $139 conflict | Weak “no hidden fees” only | **Medium** |
| **Consult invite email** | $99 wrong | Partial includes-list | **High** |
| **Patient dashboard** | N/A | **MISSING** | **High** |
| **404 routes** (`/services`, `/faq`, etc.) | N/A | N/A | Redirect or ship pages |

---

## Forbidden-language spot check (repository)

The following **patient-facing** strings **conflict** with the stakeholder “Forbidden” list or the **Everything Included** substance (source locations — verify on live after copy changes):

- `Membership.tsx` — **“Billed separately at FCC cost-plus”**, **“Billed separately at cost”**, FAQ **“Why aren’t medications included…”**  
- `HormonesMen.tsx` / `HormonesWomen.tsx` — **“billed separately by FCC”**  
- `WhyElevatedSection.tsx` — labs/meds **“pass through at cost”**  
- `stripeConfig.ts` / Membership meta — meds **billed separately** in product description  
- `PatientResources.tsx` — **“billed separately through the pharmacy”**  
- `Treatments.tsx` (if still linked anywhere) — **“Starting at $400/session”**  

---

*End of report. No application code was modified; this file is audit-only.*
