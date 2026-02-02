

## Fix Payment Link Generation & Delivery System

### Problem Summary
The "Send Payment Link" modal in the Provider Dashboard is broken because:
1. **The "Send Link" button sends the wrong data** - it sends `product_type` but the edge function expects a `payment_url`
2. **No Stripe checkout session is created** before attempting to send the email/SMS
3. **The "Copy" button works** because it correctly generates the URL first

### Solution Overview
Refactor `QuickPaymentModal.tsx` to:
1. First generate the Stripe checkout URL by calling the appropriate checkout edge function
2. Then send that URL via email or SMS using the `send-alacarte-payment-link` or `send-alacarte-payment-sms` functions

### Technical Implementation

**Step 1: Update `handleSend()` in `QuickPaymentModal.tsx`**

The current code:
```typescript
// BROKEN: Sends product_type instead of generating URL first
await supabase.functions.invoke(edgeFunction, {
  body: {
    product_type: selectedProduct, // ← Edge function expects payment_url, not product_type
  },
});
```

The fix:
```typescript
// Step 1: Generate the Stripe checkout URL
const checkoutFunction = getEdgeFunction(selectedProduct);
const checkoutBody = getCheckoutBody(selectedProduct, selectedPatient);
const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(checkoutFunction, {
  body: checkoutBody,
});
if (checkoutError || !checkoutData?.url) throw new Error("Failed to generate payment link");

// Step 2: Send the URL via email or SMS
const sendFunction = sendMethod === "email" ? "send-alacarte-payment-link" : "send-alacarte-payment-sms";
await supabase.functions.invoke(sendFunction, {
  body: {
    patient_email: selectedPatient.email,
    patient_phone: selectedPatient.phone,
    patient_name: selectedPatient.full_name,
    payment_url: checkoutData.url,  // ← Now we pass the actual URL
    product_name: getProductDisplayName(selectedProduct),
    amount: getProductDisplayPrice(selectedProduct),
  },
});
```

**Step 2: Add helper functions for product info**

Add these helpers to map product keys to display names and prices:
```typescript
const getProductDisplayName = (product: string): string => {
  const found = PRODUCTS.find(p => p.value === product);
  return found?.label || product;
};

const getProductDisplayPrice = (product: string): string => {
  const found = PRODUCTS.find(p => p.value === product);
  return found?.price || "";
};
```

**Step 3: Fix edge function body mapping for all product types**

Update `getCheckoutBody()` to include patient email for all product types, ensuring each checkout function receives the data it expects.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/provider/QuickPaymentModal.tsx` | Refactor `handleSend()` to generate URL first, then send; add helper functions |

### Edge Functions Involved (no changes needed)
- `send-alacarte-payment-link` - Already expects `payment_url` ✓
- `send-alacarte-payment-sms` - Already expects `payment_url` ✓
- `create-alacarte-checkout` - Returns `url` ✓
- `create-semaglutide-checkout` - Returns `url` ✓
- `create-tirzepatide-checkout` - Returns `url` ✓
- `create-hormone-membership-checkout` - Returns `url` ✓
- `create-consultation-checkout` - Returns `url` ✓
- `create-iv-ketamine-checkout` - Returns `url` ✓

### Testing Checklist
After implementation:
- Select a patient and a product (e.g., "IV Ketamine Infusion")
- Click "Send Link" with Email selected → Patient receives email with working Stripe link
- Click "Send Link" with SMS selected → Patient receives SMS with working Stripe link
- Click Copy button → URL copied to clipboard, paste and verify it opens Stripe checkout
- Verify all product types work: memberships, subscriptions, one-time payments

### Additional Enhancement: Better Product Mapping
Add missing products from `stripeConfig.ts` to the PRODUCTS array for comprehensive coverage:
- Sexual wellness options
- Hair restoration options
- Peptide therapy
- Lab panels

