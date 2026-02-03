
# Plan: Seamless Lab-to-Pharmacy Flow

## Problem Statement

Currently, after reviewing the Health Report with medication recommendations, providers must manually scroll to find the PharmacyOrderCard. This creates friction in what should be a streamlined clinical workflow.

## Solution

Add a direct "Apply Recommended Medications" action button within the HealthReportPreview component that:
1. Auto-selects the recommended medications in the PharmacyOrderCard
2. Optionally scrolls the view to the pharmacy card OR opens a quick-order modal inline

## Technical Approach

### Option A: Callback Pattern (Recommended)

Wire the HealthReportPreview to call a parent callback that sets the recommended medications, then auto-scrolls to the PharmacyOrderCard.

### Changes Required

**1. Update HealthReportPreview.tsx**

Add a callback prop and "Apply to Rx" button:

```typescript
interface HealthReportPreviewProps {
  patientId: string;
  patientName: string;
  patientGender?: string;
  onApplyMedications?: (medications: MedicationRecommendation[]) => void; // NEW
}
```

Add button in the Medication Recommendations section:
```tsx
{medications.length > 0 && (
  <Button 
    onClick={() => onApplyMedications?.(medications)}
    className="w-full bg-primary hover:bg-primary/90"
  >
    <Pill className="w-4 h-4 mr-2" />
    Apply Recommended Medications
  </Button>
)}
```

**2. Update ProviderDashboard.tsx**

Pass the callback prop to HealthReportPreview and add scroll-to behavior:

```tsx
// Add ref to PharmacyOrderCard section
const pharmacyCardRef = useRef<HTMLDivElement>(null);

// Handler function
const handleApplyFromHealthReport = (meds: MedicationRecommendation[]) => {
  setRecommendedMedications(meds);
  toast.success("Medications applied to Rx card");
  
  // Scroll to pharmacy card
  setTimeout(() => {
    pharmacyCardRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }, 100);
};

// In JSX
<HealthReportPreview
  patientId={selectedPatient.patient.id}
  patientName={selectedPatient.patient.full_name}
  patientGender={selectedPatient.patient.gender || 'female'}
  onApplyMedications={handleApplyFromHealthReport} // NEW PROP
/>

// Wrap PharmacyOrderCard with ref
<div ref={pharmacyCardRef}>
  <PharmacyOrderCard ... />
</div>
```

## Visual Flow After Implementation

```text
┌─────────────────────────────────────────────────────────────┐
│  HEALTH REPORT PREVIEW (Expanded)                           │
├─────────────────────────────────────────────────────────────┤
│  ✓ Labs Reviewed - Health Report Ready                      │
│                                                             │
│  [Lab Values Grid: E2, P4, T, Cortisol]                     │
│                                                             │
│  Clinical Story: "This patient presents with..."            │
│                                                             │
│  Medication Recommendations:                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Testosterone Cream - Male 150mg                        │ │
│  │ 150mg/g (Liposomal Base)                               │ │
│  │ Low testosterone (30-50 pg/mL) requires moderate...    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     [✨ Apply Recommended Medications]                 │ │  <-- NEW BUTTON
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Click
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHARMACY ORDER CARD (Auto-scrolled into view)              │
├─────────────────────────────────────────────────────────────┤
│  ✨ Holgate Recommended                                     │
│                                                             │
│  Medication: [Testosterone Cream - Male 150mg ▼]  <-- Auto-selected
│  Supply Duration: [30 Day Supply ▼]                         │
│                                                             │
│  Rx Preview: Testosterone 150mg/g (Liposomal Base)...       │
│                                                             │
│  [Prepare Portal Order]                                     │
└─────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/provider/HealthReportPreview.tsx` | Add `onApplyMedications` callback prop and "Apply" button |
| `src/pages/ProviderDashboard.tsx` | Pass callback to HealthReportPreview, add ref for scroll-to behavior |

## Benefits

1. **One-Click Flow**: Provider sees recommendations and applies them instantly
2. **Visual Confirmation**: Auto-scroll ensures the PharmacyOrderCard is visible and shows the "Holgate Recommended" badge
3. **No Modal Juggling**: Everything stays in context within the patient profile
4. **Preserves Override Option**: Provider can still manually select different medications if needed

## Alternative Considered

Embedding a mini pharmacy order form directly inside HealthReportPreview was considered but rejected because:
- The PharmacyOrderCard has significant logic (FCCPortalModal integration, Rx string building)
- Duplicating this would create maintenance overhead
- Scroll-to approach keeps a single source of truth for pharmacy ordering
