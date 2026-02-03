
# Pricing Page Fixes & Consistency Plan

## Issues Identified

### 1. Broken "Elevated for Her" and "Elevated for Him" Links (404 Errors)
**Problem**: On the pricing page, the navigation uses `/hormones/women` and `/hormones/men`, but the actual routes defined in `App.tsx` are `/hormones-women` and `/hormones-men` (with hyphens, not slashes).

**Evidence**: Console logs show:
- `404 Error: User attempted to access non-existent route: /hormones/women`
- `404 Error: User attempted to access non-existent route: /hormones/men`

**Files Affected**:
- `src/pages/Pricing.tsx` (lines 927 and 942)

---

### 2. Metabolic Reset Membership Pricing Inconsistency
**Problem**: The pricing page shows "$399/month" generically for the Metabolic Reset Membership, but Semaglutide and Tirzepatide have different prices:
- Semaglutide: $399/mo
- Tirzepatide: $499/mo

**Current Display**: Line 644 shows a single "$399" price without differentiating medications.

**Files Affected**:
- `src/pages/Pricing.tsx` (Weight Loss section around lines 630-670)

---

### 3. Hormone Mapping Panel Inaccuracies
**Problem**: The description on line 783 says:
> "A comprehensive at-home Saliva & Blood Spot kit. We test Estrogen, Testosterone, Progesterone, Cortisol, and **Thyroid**..."

**Issues**:
- Incorrectly mentions "Blood Spot kit" — it's actually a **saliva-only** ZRT Saliva Profile III kit
- Includes **Thyroid** which is NOT tested in this panel

**Correct Description**: "ZRT Saliva Profile III — Comprehensive saliva test covering Estradiol, Testosterone, Progesterone, DHEA-S & Cortisol"

**Files Affected**:
- `src/pages/Pricing.tsx` (line 783)

---

### 4. Concierge Membership Option Should Be Removed
**Problem**: The Concierge Membership section (lines 844-921) should be removed from the pricing page.

**Note**: The `MembershipTierSelector` component also includes Concierge as a tier — this may need to remain for internal use but should be hidden from public pricing.

**Files Affected**:
- `src/pages/Pricing.tsx` (lines 844-922 — "Concierge Upgrade" section)

---

### 5. Lab Panel À La Carte Price Wrong ($149 → $349)
**Problem**: The Lab Panel shows $149 in the À La Carte section (line 1645), but it should be **$349**.

**Files Affected**:
- `src/pages/Pricing.tsx` (lines 1631-1651)
- `src/lib/stripeConfig.ts` (line 262-269 — `ALACARTE_PRICES.labPanel`)
- Potentially other files referencing this price

---

### 6. Stripe Test Payment Rejection
**Problem**: Test payments are being rejected.

**Possible Causes**:
1. Using wrong test card number (should use `4242 4242 4242 4242`)
2. Missing or expired test card details
3. Stripe account in test mode but using live API keys (or vice versa)

**Verification Needed**: Check STRIPE_SECRET_KEY is a test key (starts with `sk_test_`), not a live key.

---

## Implementation Plan

### Phase 1: Fix Broken Links
| File | Change |
|------|--------|
| `src/pages/Pricing.tsx` line 927 | Change `navigate("/hormones/women")` → `navigate("/hormones-women")` |
| `src/pages/Pricing.tsx` line 942 | Change `navigate("/hormones/men")` → `navigate("/hormones-men")` |

### Phase 2: Fix Metabolic Reset Medication Pricing Display
Update the Weight Loss section to clearly show both medication options:

```text
Semaglutide: $399/mo
Tirzepatide: $499/mo
```

Show these as two distinct price points in the Treatment step, matching `stripeConfig.ts` which already has correct prices:
- `WEIGHT_LOSS_PRICES.semaglutide.amount = 39900`
- `WEIGHT_LOSS_PRICES.tirzepatide.amount = 49900`

### Phase 3: Correct Hormone Mapping Description
Update the Hormone Mapping Panel description:

**Before**:
> "A comprehensive at-home Saliva & Blood Spot kit. We test Estrogen, Testosterone, Progesterone, Cortisol, and Thyroid..."

**After**:
> "ZRT Saliva Profile III — Comprehensive at-home saliva test covering Estradiol, Testosterone, Progesterone, DHEA-S & Cortisol to engineer your custom protocol."

### Phase 4: Remove Concierge Membership Section
Remove the entire "Concierge Upgrade" section (approximately lines 844-922) from the Hormone Optimization area on the pricing page.

### Phase 5: Update Lab Panel Pricing
| File | Location | Change |
|------|----------|--------|
| `src/lib/stripeConfig.ts` | `ALACARTE_PRICES.labPanel` | Update `amount: 14900` → `amount: 34900`, `displayPrice: "$149"` → `displayPrice: "$349"` |
| `src/pages/Pricing.tsx` | À La Carte section | Update displayed price from $149 to $349 |
| `src/pages/PricingComparison.tsx` | Calculator logic | Verify it references updated `stripeConfig` values (it does use imports) |

### Phase 6: Investigate Stripe Payment Issues
1. Check if `STRIPE_SECRET_KEY` secret is configured correctly (test mode key)
2. Verify the test card being used is correct:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
3. Review network responses for specific error messages

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Pricing.tsx` | Fix navigation routes, update Metabolic Reset pricing display, correct Hormone Mapping description, remove Concierge section, update Lab Panel price |
| `src/lib/stripeConfig.ts` | Update `ALACARTE_PRICES.labPanel` to $349 |

### Stripe Price ID Note
The Lab Panel currently uses price ID `price_1Sga6CEOtKRY99puOXGAaRwh` with amount 14900 ($149). This needs to be either:
- Updated in Stripe to $349 (recommended), OR
- A new price created at $349 and the config updated with the new price ID

---

## Verification Checklist

After implementation:
- [ ] "Elevated for Her" card navigates to `/hormones-women` 
- [ ] "Elevated for Him" card navigates to `/hormones-men`
- [ ] Weight Loss section shows Semaglutide $399/mo and Tirzepatide $499/mo separately
- [ ] Hormone Mapping says "ZRT Saliva Profile III" with no mention of blood spot or thyroid
- [ ] Concierge Membership section is removed from pricing page
- [ ] Lab Panel shows $349 in À La Carte section
- [ ] `stripeConfig.ts` shows Lab Panel at $349
- [ ] Stripe test payment works with test card `4242 4242 4242 4242`
