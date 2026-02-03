

# Plan: Clarify and Enhance the Patient Consent Workflow

## Current State Summary

The system has two consent pathways:

1. **Hormone/Weight Loss Patients**: Complete consent during portal intake with signature capture, stored in database, downloadable/emailable via ConsentPDFCard
2. **Ketamine Patients**: Use external Osmind platform, manually tracked by provider

## Problem

The public intake form (`/intake?token=...`) only captures checkbox acknowledgments, not a formal typed signature like the patient portal does. Additionally, there's no way to send a consent link to patients who haven't accessed the portal.

---

## Proposed Solution

### Option A: Add Full Consent Step to Public Intake (Recommended)

Add a signature capture step to the public token-based intake form so patients who complete intake via the link also sign the consent formally.

**Changes Required:**

1. **Modify `src/pages/PublicIntake.tsx`**
   - Add signature input field to consent step
   - Require typed full legal name matching patient name
   - Update form submission to send signature to backend

2. **Modify `supabase/functions/submit-public-intake/index.ts`**
   - Store `consent_signature`, `consent_signature_date`, `consent_completed_at`, `consent_method: 'public_intake'` when signature provided

3. **Update `src/components/provider/ConsentPDFCard.tsx`**
   - Handle `consent_method: 'public_intake'` display

### Option B: Send Dedicated Consent Link (Alternative)

Create a separate consent-only link workflow for patients who already completed intake but need to sign consent.

**This would require:**
- New edge function to generate consent-only token
- New public consent page (`/consent?token=...`)
- More complex patient journey tracking

---

## Recommended Implementation: Option A

Add formal signature capture to the existing public intake flow.

### Step 1: Update Public Intake Consent Section

**File:** `src/pages/PublicIntake.tsx`

Add to form state:
```tsx
const [formData, setFormData] = useState({
  // ... existing fields
  consent_signature: "",  // NEW
});
```

Update consent step UI to include:
- Scrollable consent text (same content as ConsentStep component)
- Typed signature field with validation
- Signature must match patient name

### Step 2: Update Submit Function

**File:** `supabase/functions/submit-public-intake/index.ts`

When updating patient record, add:
```typescript
if (consent_signature) {
  updateData.consent_signature = consent_signature;
  updateData.consent_signature_date = new Date().toISOString();
  updateData.consent_completed_at = new Date().toISOString();
  updateData.consent_method = "public_intake";
}
```

### Step 3: Update ConsentPDFCard

**File:** `src/components/provider/ConsentPDFCard.tsx`

Update the method display:
```tsx
{consentMethod === 'internal' ? 'Patient Portal' : 
 consentMethod === 'public_intake' ? 'Intake Form' : 
 consentMethod?.toUpperCase()}
```

---

## Visual Flow After Implementation

```text
┌─────────────────────────────────────────────────────────────────┐
│                     CONSENT WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HORMONE/WEIGHT LOSS PATIENTS                                   │
│  ─────────────────────────────                                  │
│                                                                 │
│  Path 1: Patient Portal                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Login to    │ -> │ Complete     │ -> │ Sign Consent     │   │
│  │ Portal      │    │ Intake Steps │    │ (type name)      │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                 │
│  Path 2: Public Intake Link (ENHANCED)                          │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Click email │ -> │ Complete     │ -> │ Sign Consent     │   │
│  │ intake link │    │ All Steps    │    │ (type name)      │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                 │
│  KETAMINE PATIENTS                                              │
│  ─────────────────                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Provider    │ -> │ Patient uses │ -> │ Provider marks   │   │
│  │ sends Osmind│    │ Osmind to    │    │ complete in      │   │
│  │ invite      │    │ sign waivers │    │ dashboard        │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Access to Signed Consents

After implementation, providers can access signed consents from:

| Location | Access Method |
|----------|---------------|
| Patient Profile Modal | ConsentPDFCard shows status, signature, date |
| Download/Print | Click "Download/Print" button → opens printable HTML |
| Email to Patient | Click "Email to Patient" → sends formatted copy |
| Staff Tasks | Shows patients still needing consent |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/PublicIntake.tsx` | Add signature field and validation to consent step |
| `supabase/functions/submit-public-intake/index.ts` | Store signature data on submission |
| `src/components/provider/ConsentPDFCard.tsx` | Display `public_intake` method label |

---

## Technical Details

### Signature Validation Logic

```typescript
const canSubmit = 
  formData.hipaa_acknowledged && 
  formData.consent_acknowledged &&
  formData.consent_signature.trim().length >= 2 &&
  formData.consent_signature.trim().toLowerCase() === 
    patient?.full_name?.trim().toLowerCase();
```

### Database Fields Used

All consent data is stored in the `patients` table:

- `consent_signature` - The typed signature text
- `consent_signature_date` - When signature was captured
- `consent_completed_at` - Timestamp of completion
- `consent_method` - How consent was captured (`internal`, `public_intake`, `osmind`)
- `consent_sent_at` - When consent invite was sent (for tracking)

