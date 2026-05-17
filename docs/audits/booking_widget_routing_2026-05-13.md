# Audit: Booking widget → Stripe Checkout routing (2026-05-13)

**Scope:** Read-only audit. No code or Stripe objects were modified.

**Question:** The homepage/booking flow modal (“What brings you in today?”) opens Stripe Checkout showing legacy product copy (“Hormone Optimization — Clinical Strategy Session”, “credit toward treatment”) while the amount is $79. Is routing wrong?

---

## Executive summary

| Question | Finding |
|----------|---------|
| Is the **wrong price ID** being sent from the app for this modal? | **No (per current repo).** All three lanes use the same edge function and the same hardcoded live price ID `price_1TWcmaCXbCBPFEeImikpoTPo` (`LIVE_CORE_SERVICES.wellnessAssessment`). |
| Is each lane supposed to hit **CORE_SERVICES.wellnessAssessment** (`prod_UVe4fac4EOfgDG` / `price_1TWcmaCXbCBPFEeImikpoTPo`)? | **Yes (per repo + `docs/pricing/pricing_source_of_truth.md`).** There is no per-lane Stripe price in the checkout path. |
| Why would Checkout still show **legacy** product title/description? | **Stripe-hosted catalog copy.** `create-consultation-checkout` uses `line_items: [{ price: <id> }]`. Stripe Checkout displays the **Product name and description attached to that Price in the Stripe Dashboard**, not the `SERVICE_CONFIG` strings in the edge function (those are used for **session metadata** only, e.g. `product_display_lane`). If the live Checkout matches old marketing strings, the leading explanation is that **`price_1TWcmaCXbCBPFEeImikpoTPo` still points at a Product (or Price display data) whose name/description were never updated in Stripe**—or production is serving an **older deployed** version of the edge function (see below). |
| Does **UI** still violate SOT on “credits”? | **Yes.** The modal and `/consult` still render **“Applied as credit if you proceed.”** |

---

## Phase A — Modal location and wiring

### A.1 Where is the modal?

- **Primary component:** `src/components/ConsultationModal.tsx`  
  - Title: **“What brings you in today?”** (line ~119).  
  - Three options match the audit prompt (Hormone Optimization / Medical Weight Loss / Peptide Protocols) with `serviceType` values `hormone`, `weight_loss`, `peptide`.

- **Homepage “Booking widget”:** `src/components/BookingWidget.tsx` does **not** duplicate the three options. It calls `openBooking()` from `src/contexts/BookingContext.tsx`, which toggles global modal state.

- **Global mount:** `src/App.tsx` renders  
  `ConsultationModal` with `isOpen={isBookingOpen}` / `onClose={closeBooking}` from `useBooking()`.  
  So the **same** `ConsultationModal` is what opens from the homepage widget.

- **Parallel implementation:** `src/pages/Consult.tsx` repeats the same three options and the same `supabase.functions.invoke("create-consultation-checkout", { body: { serviceType } })` pattern (not the modal file, but same backend path).

### A.2 Per option: handler, edge function, payload, navigation

For **each** of the three options in `ConsultationModal`:

| Step | Detail |
|------|--------|
| **Click target** | The whole row `onClick` → `handlePaidConsultation(option.serviceType)` (`ConsultationModal.tsx` ~134). |
| **Edge function** | `supabase.functions.invoke("create-consultation-checkout", { body: { serviceType } })` (~94–96). |
| **Payload** | **Only** `serviceType`: `"hormone"` \| `"weight_loss"` \| `"peptide"`. **No** `price_id`, **no** `product_id` from the client. |
| **After success** | `window.open(data.url, "_blank")`, then `onClose()` (~100–102). |

### A.3 Edge function → Stripe

**File:** `supabase/functions/create-consultation-checkout/index.ts`

- Reads `body.serviceType`, validates against `["hormone", "weight_loss", "peptide"]`.
- Builds `SERVICE_CONFIG[serviceType]` for **metadata / internal labeling only** (names like “Wellness Assessment — Hormone Optimization” — **not** “Clinical Strategy Session” in the current repo).
- Creates Checkout with:

```ts
line_items: [{ price: LIVE_CORE_SERVICES.wellnessAssessment, quantity: 1 }]
```

- `LIVE_CORE_SERVICES.wellnessAssessment` is defined in `supabase/functions/_shared/live-prices.ts` as **`price_1TWcmaCXbCBPFEeImikpoTPo`**.

**Frontend SOT mirror:** `src/lib/stripeConfig.ts` → `CORE_SERVICES.wellnessAssessment` lists:

- `priceId: "price_1TWcmaCXbCBPFEeImikpoTPo"`
- `productId: "prod_UVe4fac4EOfgDG"`

**Conclusion (routing):** In the **current repository**, all three modal options route to the **same** Stripe Price ID intended to be the Wellness Assessment SKU. There is **no** separate Stripe product per lane in this path.

---

## Phase B — Stripe product metadata & codebase strings

### B.1 Stripe MCP / live API

- **No Stripe MCP server** is enabled in this workspace’s MCP folder (only `cursor-ide-browser` and `cursor-app-control`).  
- **This audit cannot read live Stripe Product/Price objects** from the dashboard. To confirm names/descriptions on `prod_UVe4fac4EOfgDG` and on `price_1TWcmaCXbCBPFEeImikpoTPo`, a human with Stripe access (or a Stripe CLI/API call) must verify in **live mode** account `acct_1SQrM7CXbCBPFEeI` (per `stripeConfig.ts` / pricing SOT).

### B.2 Codebase search: “Clinical Strategy Session” / “credit toward treatment”

- **Not present** in `create-consultation-checkout/index.ts` or `ConsultationModal.tsx` as the Checkout product title (modal uses different strings).
- **Still present** elsewhere (examples): `supabase/functions/chat/index.ts`, `supabase/functions/voice-session/index.ts`, `supabase/functions/provider-chat/index.ts` — **not** in the booking modal → checkout path audited here.
- **`src/lib/stripeConfig.ts`** defines `CONSULTATION_CREDIT` with description: *“Credit toward treatment when consultation is paid first”* — legacy framing; not injected into Stripe by the modal, but shows the old product narrative still lives in config/docs-adjacent code.

### B.3 Multiple “$79” SKUs in the codebase (not all are this checkout)

From **`src/lib/stripeConfig.ts`** (live catalog section and related):

| SKU / constant | Amount | Role |
|----------------|--------|------|
| `CORE_SERVICES.wellnessAssessment` | $79 one-time | **Intended** consult-gated entry; `price_1TWcma…` / `prod_UVe4fac4…` |
| `SEXUAL_WELLNESS_PRODUCTS.sildenafil` | **7900 cents** billed as **$79/mo** subscription | Different product/price IDs (`price_1TWcxGCXbCBPFEeIezbJUMS1`, etc.) — not used by `create-consultation-checkout` |
| Deprecated blocks (`ALACARTE_PRICES.progesterone`, etc.) | Some list 7900 cents | Legacy / test-era IDs — not the modal path |

**Implication:** “Multiple $79 products in Stripe” is plausible for the **account overall**; the booking modal path is still **narrowed in code** to **`price_1TWcmaCXbCBPFEeImikpoTPo`** only. Listing *every* $79 Product in the live Stripe account requires Dashboard/API, not repo alone.

### B.4 Mismatch vs screenshot copy

Observed user report (Checkout):

- Title along the lines of: **“Hormone Optimization — Clinical Strategy Session”**
- Description mentioning **“$79 credit toward treatment”**

Current repo `SERVICE_CONFIG.hormone` uses **“Wellness Assessment — Hormone Optimization”** and a description that **does not** include “Clinical Strategy Session” or “credit toward treatment.”

Therefore the screenshot copy **does not match** the edge function’s `SERVICE_CONFIG` strings. That strongly supports: **Checkout line item text is coming from Stripe’s Product/Price catalog**, not from those TS strings—unless production is running an **older** `create-consultation-checkout` that used `price_data` or different IDs (deployment verification needed).

---

## Phase C — Answers required by the audit brief

1. **Which file is the booking widget modal in?**  
   **`src/components/ConsultationModal.tsx`**, opened globally from **`src/App.tsx`** when **`BookingWidget`** (or anything else) calls **`openBooking()`** from **`BookingContext`**.

2. **For each of the three options, which edge function and which Stripe price?**  
   **All three:** `create-consultation-checkout` with body `{ serviceType }` → **`line_items[0].price` = `price_1TWcmaCXbCBPFEeImikpoTPo`** (`LIVE_CORE_SERVICES.wellnessAssessment`). Per repo/SOT, that price is tied to **`prod_UVe4fac4EOfgDG`**.

3. **Is each routing to the correct CORE_SERVICES.wellnessAssessment IDs?**  
   **Per current repo: yes** — single price ID for all lanes; matches `CORE_SERVICES.wellnessAssessment` / `live-prices.ts`.

4. **If Checkout shows a legacy product, which legacy product is it?**  
   **Cannot be determined from the repo alone.** The code does not embed that legacy title. **Verify in Stripe** which Product name/description is attached to **`price_1TWcmaCXbCBPFEeImikpoTPo`**, and confirm production Supabase Edge deployment matches this repo’s `create-consultation-checkout`.

5. **Recommended fix**

   - **Stripe (likely required):** In live Stripe, open **Price `price_1TWcmaCXbCBPFEeImikpoTPo`** → confirm it points to **Product `prod_UVe4fac4EOfgDG`**. Update **Product name and description** (and Price nickname if used) to **Wellness Assessment** + SOT-aligned copy (no “strategy session,” no “credit toward treatment” if that language is retired).  
   - **Deployment check:** Confirm Lovable/Supabase deployed **`create-consultation-checkout`** matches repo (no old `price_data` build).  
   - **Code / UI (follow-up, separate from Stripe):** Remove or rewrite **“Applied as credit if you proceed”** in **`ConsultationModal.tsx`** (~151–152) and **`Consult.tsx`** (~101) to align with current SOT (non-refundable assessment; labs/programs priced separately). Optionally use `price_data` + neutral product name **only if** you intentionally want Checkout copy decoupled from Stripe catalog (trade-offs: catalog drift vs Stripe reporting).

### “Applied as credit if you proceed” — where rendered?

| Location | Snippet |
|----------|---------|
| `src/components/ConsultationModal.tsx` | Under the **$79** price, `text-[10px]` paragraph: **“Applied as credit if you proceed”** (~151–152). |
| `src/pages/Consult.tsx` | Under **$79**: **“Applied as credit if you proceed”** (~101). |

This is **patient-facing UI**, not Stripe-hosted, and conflicts with SOT direction to drop discontinued “credit” framing.

---

## Follow-up checklist (outside this audit)

- [ ] Stripe Dashboard (live): inspect **`price_1TWcmaCXbCBPFEeImikpoTPo`** linked Product name/description.  
- [ ] Supabase: confirm deployed **`create-consultation-checkout`** source matches git (especially `line_items`).  
- [ ] Remove/replace modal + `/consult` “Applied as credit” strings.  
- [ ] Optionally grep/clean remaining “Clinical Strategy Session” / “credit toward treatment” in **chat/voice/provider** edge prompts.

---

*Audit performed against repository state on 2026-05-13. No Stripe API calls; no code changes.*
