# PR #12 — Edge Functions, Stripe Catalog & Member Discount — Plan & Risk Assessment

**Date:** 2026-05-13  
**Status:** Planning only (no code changes in this document)  
**Authority:** `docs/pricing/pricing_source_of_truth.md`, live price IDs in `src/lib/stripeConfig.ts`  
**Scope:** Supabase edge functions that create Stripe Checkout sessions, verify payments, send communications, and **`stripe-webhook`** — plus wiring of **`supabase/functions/_shared/member-discount.ts`**. Excludes AI prompt sweeps (PR #13).

---

## Executive summary

PR #12 migrates checkout paths from legacy/test Stripe price IDs and copy to the **live catalog**, introduces consistent **metadata** for webhook correlation, and applies the **20% member discount** on eligible à la carte flows where the Source of Truth (SOT) requires it. The highest-risk surface is **`stripe-webhook`**: incorrect price ID branches or metadata assumptions can mis-attribute revenue, skip patient updates, or grant membership state incorrectly. Execution should be **ordered** so no caller references a removed function name, and the webhook always recognizes **both old and new price IDs** during a defined compatibility window.

---

## Part 1 — Context from the current codebase

### Checkout line-item patterns (today)

1. **`price` (fixed Price object ID)**  
   Examples: `create-alacarte-checkout` uses `line_items: [{ price: product.priceId, quantity }]`. `create-vitality-checkout` uses a hardcoded legacy subscription price.  
   **Implication:** The amount charged is whatever Stripe has on that Price; you **cannot** change the unit amount at session creation without using a different Price, a **coupon**, **promotion code**, **Checkout discount**, or switching that line to **`price_data`**.

2. **`price_data` (inline amount + product name)**  
   Examples: `create-consultation-checkout` uses `unit_amount: 7900`; `create-iv-drip-checkout` falls back to `price_data` when `therapy.stripe_price_id` is missing.  
   **Implication:** Member discount can be applied by computing `unit_amount` after `applyMemberDiscount()` (or equivalent) — no separate Stripe Coupon required.

3. **Hybrid**  
   `create-iv-drip-checkout` uses fixed `price` for catalogued IV/add-ons when `stripe_price_id` exists, otherwise `price_data`.

### Metadata and `patient_id`

Multiple functions accept **`patient_id` / `patientId` in the JSON body** and pass **`patient_id: patient_id || ""`** (or similar) into **`checkout.session` metadata**. When missing, the webhook and downstream jobs must tolerate **empty string** and correlate instead via **`customer`**, **`client_reference_id`**, or **`customer_email`** — whatever that function already guarantees.

### Member discount helper (already present)

`supabase/functions/_shared/member-discount.ts` defines:

- `getActiveElevatedProgram(supabaseAdmin, patientId)` — requires a **non-null patient UUID** to query `patients`.
- `applyMemberDiscount(...)` — returns original `unitAmountCents` if not an active member.

**Important:** The helper **cannot** infer membership from Stripe Customer alone without a DB lookup keyed by `patientId` (or an extension that resolves `stripe_customer_id` → patient).

---

## Part 2 — Concern A: Fixed `price_id` checkouts and the 20% discount

### Problem statement

SOT member pricing for some à la carte items is **not** a separate Stripe Price today; the storefront shows member vs non-member **display** amounts derived from constants. If checkout continues to use a **single** Stripe Price ID at the **non-member** amount, members would be **overcharged** unless we apply a discount mechanism.

### Option matrix

| Approach | How it works | Pros | Cons |
|----------|----------------|------|------|
| **A. Stripe Coupon / Promotion Code (percent off)** | Create a **restricted** coupon (e.g. 20% off) applied only when `getActiveElevatedProgram` returns non-null; pass `discounts: [{ coupon: '...' }]` on Checkout Session **or** `allow_promotion_codes` with staff-only codes (usually wrong for automated member pricing). | Amount on Stripe invoice clearly shows discount; reconciles with Stripe reporting; Price catalog stays canonical for non-member. | Must **guard** coupon so it never applies to non-members; Stripe limits on coupon stacking; test mode vs live coupon IDs; coupon misuse if leaked. |
| **B. Checkout Session `discounts` with dynamic customer-specific coupon** | Programmatically create **one-time** Coupons or use **Customer-specific** promotion patterns. | Auditable line on invoice. | More moving parts; still need strict server-side gating by `patientId`. |
| **C. Switch discounted line items to `price_data`** | Resolve catalog SKU → base **unit_amount** in cents; call `applyMemberDiscount`; emit `price_data` with discounted amount and clear `product_data.name`. | Full control; no coupon leakage; aligns with existing consultation pattern. | **Diverges** from using Stripe Product/Price as single source for that SKU; reporting by Price ID is weaker unless you set `price_data.product_data.metadata` or use `price` for non-member and `price_data` only for member (two code paths). |
| **D. Separate Stripe Prices per SKU (member vs non-member)** | e.g. `price_semaglutide_member` vs `price_semaglutide_nonmember` in Stripe; pick `price` based on membership lookup. | Cleanest accounting; no coupon; webhook can branch on price ID trivially. | **More Prices to maintain**; must keep SOT and Stripe in sync; migration of old price IDs. |
| **E. Customer balance / post-hoc credit** | Charge full price then credit — **not recommended** for consumer trust. | — | Poor UX; support burden; regulatory perception. |

### Recommendation (default)

Use a **tiered strategy** by product class:

1. **Subscriptions / program enrollments (ELEVATED TRT, HRT, GLP-1, WELLNESS)**  
   Prefer **dedicated Stripe Price IDs** per program (**Option D**) — already the direction of the live catalog. No percentage coupon needed.

2. **One-off à la carte SKUs where member discount applies (SOT: 20% off eligible à la carte)**  
   Either:
   - **Option D** (preferred for accounting clarity): **member Price** and **non-member Price** in Stripe, select `price` after `getActiveElevatedProgram`; **or**
   - **Option C**: single catalog Price for reference display but checkout uses **`price_data`** with discounted `unit_amount` when member — document in code that Stripe Price is “reference” for non-member only.

3. **If short-term delivery requires one Price ID**  
   Use **Option A**: a **server-side-only** Stripe Coupon (20%) applied **only** when membership is verified via `patientId` + `getActiveElevatedProgram`, never exposed to the client as a user-enterable code. Log **`metadata.is_member_discount: 'true'`** and **`metadata.discount_reason: 'elevated_member_20pct'`** for webhook audits.

**Avoid:** letting the frontend pass “I am a member” without server verification — always resolve membership with **service role** Supabase + `patientId` (or email → patient mapping if explicitly designed).

---

## Part 3 — Concern B: `patientId` is null (anonymous / pre-account checkout)

### Observed behavior (patterns)

- `create-alacarte-checkout`: `patient_id: patient_id || ""` in metadata; **email required**.
- `create-semaglutide-checkout` / `create-tirzepatide-checkout`: optional `patientId`; conditional patient lookup when present.
- Webhook handlers historically expect metadata or Stripe customer linkage to update **`patients`**.

### Policy options

| Scenario | Member discount | Patient row updates |
|----------|-----------------|---------------------|
| **Logged-in patient checkout** | `patientId` known → `applyMemberDiscount` works. | Webhook can update that patient. |
| **Anonymous guest with email only** | **Do not** apply member discount unless you **resolve** email → patient with active subscription (heavier query; risk of email collision). Default: **no discount** for anonymous. | Webhook should match **`customer_email`** or **`client_reference_id`** post-hoc, or rely on **`checkout.session.completed`** → create pending fulfillment without `patients` update until account link. |
| **Staff-created checkout with patient** | Always pass `patient_id`. | Preferred path for GLP-1 / à la carte in portal. |

### Recommendation

1. **Treat member discount as requiring a verifiable patient UUID** unless product owner explicitly approves **email-based** membership resolution (with documented false-positive handling).

2. For **anonymous** flows: charge **non-member** price; after auth/account link, support **manual credit** or **refund difference** is operational — **out of scope for automated PR #12** unless explicitly added.

3. **Metadata contract:** always set `patient_id` when known; when unknown set **`patient_id: ''`** and add **`checkout_intent: 'guest'`** (new key) so webhook does not attempt patient updates that would no-op or throw.

---

## Part 6 — Risk assessment (by change cluster)

Each row rates **risk**, **failure mode**, **detection**, **rollback**.

### A. New or refactored checkout edge functions

| Risk | Level | Failure mode | Detection | Rollback |
|------|-------|--------------|-----------|----------|
| Wrong Price ID in session | **Critical** | Patient charged wrong amount | Stripe Dashboard; test checkout; amount in `payment_intent` | Redeploy prior function version; fix Price ID; partial refunds if live |
| Member discount not applied | **High** | Overcharge members; reputational + refund cost | Member reports; compare metadata `is_member` vs invoice | Hotfix deploy; Stripe refunds |
| Member discount over-applied | **High** | Under-revenue | Audit Stripe vs expected spreadsheet | Disable coupon / fix branch |
| Missing CORS / auth | **Medium** | 401 from browser | Network tab | Redeploy |
| Wrong `success_url` / `cancel_url` | **Medium** | User lands on wrong page | Manual test | Redeploy |

### B. `stripe-webhook`

| Risk | Level | Failure mode | Detection | Rollback |
|------|-------|--------------|-----------|----------|
| Unrecognized `price` on subscription | **Critical** | Subscription active in Stripe but DB never gets `elevated_membership_status` | Patients stuck “inactive”; subscription exists in Stripe | Webhook redeploy with expanded ID map; **backfill** script from Stripe API |
| Duplicate handling of same event | **Medium** | Double emails / double credits | `communication_logs`; idempotency keys | Fix idempotency; dedupe |
| Metadata assumption (`patient_id` always UUID) | **Medium** | Logic throws on `''` | Edge logs 500 | Defensive parse; redeploy |
| Legacy ZRT email paths | **Low** | Wrong email content | Content QA | Separate PR |

### C. Member discount helper wiring

| Risk | Level | Failure mode | Detection | Rollback |
|------|-------|--------------|-----------|----------|
| `getActiveElevatedProgram` false negative | **High** | Member charged full price | Support tickets | Fix query conditions (`elevated_program` casing, status values) |
| False positive (marked active incorrectly) | **Critical** | Discount to non-member | Revenue leak | DB audit on `elevated_membership_status`; fix RLS or data |
| RLS: function uses user-scoped client instead of service role | **Critical** | Always “not a member” | Logs; discount never applies | Use service role client only in checkout |

### D. Frontend callers

| Risk | Level | Failure mode | Detection | Rollback |
|------|-------|--------------|-----------|----------|
| Invoke renamed function | **High** | Checkout button dead | Console / network 404 | Feature flag or revert frontend |
| Missing `patientId` in body where required | **Medium** | Discount not applied | See above | Quick patch |

### E. Existing subscriptions (legacy Price IDs)

| Risk | Level | Failure mode | Detection | Rollback |
|------|-------|--------------|-----------|----------|
| Webhook stops recognizing old price | **Critical** | Renewals don’t update DB | Subscription events error in logs | Keep dual recognition window |
| Migrating customer to new price mid-cycle | **High** | Proration surprises | Stripe customer history | Stripe support + documented migration |

---

## Part 7 — Execution order (no dangling references)

**Goal:** At every commit on `main`, the repo should invoke only **existing** deployed function names (unless using feature flags — prefer not for Lovable sync complexity).

1. **Add** new edge functions (or **duplicate-then-cutover** pattern: `create-*-checkout-v2`) with **new** Stripe Price IDs, full metadata contract, and internal calls to `member-discount` where needed. **Deploy** to Supabase (staging first if available).  
   - *Parallel-safe:* Old functions remain; new URLs exist.

2. **Update `stripe-webhook`** to recognize **new price IDs** while **retaining** legacy IDs for a defined sunset period. Deploy webhook **before** switching all traffic if webhook is strictly backward-compatible (additive branches only).

3. **Update existing edge functions** (same names) to new IDs + copy **only when** webhook is already safe — *or* keep old functions and switch names in step 4 atomically in one release (single PR with coordinated deploy).

   **Preferred single-PR sequence inside the repo:**

   - **3a.** Webhook: additive price ID handling + tests.  
   - **3b.** Shared helpers (`member-discount`, optional `stripe-catalog.ts`).  
   - **3c.** Each checkout function: IDs + discount logic + metadata.  
   - **3d.** Remove dead code paths only after traffic verification.

4. **Update frontend** `supabase.functions.invoke('...')` to match final function names (if any rename). Ensure **`patientId`** is passed wherever membership pricing matters.

5. **Wire `applyMemberDiscount`** in each eligible checkout (server-side only). Add **structured logs** (no PHI): `{ product_key, patientIdPresent, isMember, program }`.

**Atomicity note:** Lovable + GitHub sync may require **one merged PR** that includes webhook + checkout + frontend to avoid a window where new prices fire but webhook drops events. If split PRs are mandatory, **feature flag** in webhook: `USE_NEW_PRICE_MAP=true` env var toggled only after deploy complete.

---

## Part 8 — Smoke test plan (Turn 3, pre-merge)

### 8.1 Stripe test mode (preferred for Turn 3)

- Use **Stripe CLI** (`stripe listen --forward-to …`) or Supabase webhook endpoint in **test mode** with **`STRIPE_SECRET_KEY`** test key.
- **Manual checkouts** from the app pointed at test keys (ensure test publishable key on preview env).

### 8.2 Simulated webhook events

| Event | Payload focus | Verify |
|-------|----------------|--------|
| `checkout.session.completed` | `metadata.patient_id`, `line_items` price IDs | Correct patient row update (or intentional skip for guest) |
| `customer.subscription.created` | New program price ID | `elevated_membership_status`, `elevated_program`, `stripe_subscription_id` set |
| `invoice.payment_succeeded` (renewal) | Existing subscription | No duplicate emails; status remains active |
| `customer.subscription.deleted` | Legacy + new price | `onboarding_status` / membership flags per current business rules |

**Tooling:** Stripe CLI `stripe trigger …` with **fixtures** customized if needed; or replay **signed** payloads captured from test checkouts.

### 8.3 Manual checkout flows (test mode)

1. **Non-member à la carte** — expect **no** coupon / full `unit_amount` or non-member Price.  
2. **Member à la carte** (patient with `elevated_membership_status=active` + valid `elevated_program`) — expect **20%** or correct member Price.  
3. **Guest checkout** (no `patientId`) — expect **non-member** pricing; metadata documents guest.  
4. **ELEVATED program subscription** — full monthly amount; success URL; portal link if applicable.

### 8.4 Live mode (optional, high caution)

Only if required before launch:

- **$1 Price** test product checkout, then **refund** — confirms live keys wired; **not** a substitute for full catalog testing.

### 8.5 After tests — verify

- Stripe **Dashboard**: PaymentIntent amount matches SOT for each scenario.  
- **Supabase**: `patients` columns for test subjects.  
- **`communication_logs`** / email sandbox: no duplicate sends.  
- **Logs**: no unhandled `price` branches (grep log drain for `"Unknown price"` patterns if you add them).

---

## Part 9 — Open questions (human judgment)

1. **Legacy price ID sunset:** How long will `stripe-webhook` honor **test-era** and **pre-live-migration** price IDs? Proposal: **90 days** after last successful production charge on legacy ID, with a **SQL audit** of Stripe + DB to confirm zero usage.

2. **In-flight subscriptions:** Live Stripe was reported empty before cutover — **verify** in Stripe Dashboard (live) that no active subscriptions reference legacy Prices before deleting branches. If any exist, document **migration playbook** (Stripe Billing portal plan change vs cancel + re-enroll).

3. **Member discount on IV / peptides:** SOT says IV walk-in pricing canonical on `/iv-lounge` and member **20%** off eligible à la carte — confirm **exact product classes** that receive the coupon vs program bundling to avoid double-discount (member buying inside program should not also get 20% off already-included items).

4. **Email-based patient resolution:** Do we ever want guest checkout to receive member pricing if email matches an active subscriber? (Risk: shared family email.) Default **no** unless clinical/business approves.

5. **Coupons vs Prices for reporting:** Finance may prefer **separate Prices** (Option D) for margin reporting — confirm with **Dennis / ops** before implementing coupon-heavy approach.

6. **`stripe-webhook` size and complexity:** Consider splitting handlers by domain (subscription vs one-time) in a **later** PR to reduce regression blast radius — **not** blocking PR #12 but note if file approaches unmaintainable size.

7. **HIPAA / logs:** Ensure new structured logs never include **full email** or **MRN** if current pattern is conservative; use patient UUID prefix only if needed.

---

## Appendix A — Quick reference: discount mechanism decision tree

```
Is line item using fixed Stripe Price?
├─ Yes, and member price exists as separate Stripe Price → use member `price` ID after DB check
├─ Yes, and only one Price exists → apply Stripe Coupon OR switch to price_data for member branch
└─ No (price_data) → compute unit_amount after applyMemberDiscount(...)
```

## Appendix B — `patientId` null decision tree

```
patientId present in request?
├─ Yes → run getActiveElevatedProgram; apply discount policy
└─ No  → charge non-member; metadata checkout_intent=guest; webhook skips patient FK updates
         (optional: resolve by stripe customer id if unique mapping exists — only if approved)
```

---

## Document control

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-05-13 | Cursor planning pass (no code changes) |

**Next step:** Review with medical director + ops (Stripe live vs test policy, coupon vs dual-price decision). Then implement PR #12 following **Part 7** with a single coordinated deploy window.
