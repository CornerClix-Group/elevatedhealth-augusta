

# Enhance Public Intake: HIPAA Link + Intake Summary Display

## Overview

Two improvements to the public intake system:
1. Add a clickable link to the full HIPAA Notice in the consent section
2. Create a visible "Medical Intake Summary" card in the Provider Dashboard showing submitted intake data

---

## Part 1: Add HIPAA Link to Consent Step

### Current State
The consent step shows a brief HIPAA summary but no link to the full document.

### Change Required
Add a link to `/hipaa-notice` that opens in a new tab.

**File:** `src/pages/PublicIntake.tsx`

Update the HIPAA section (around line 598-611) to include:

```tsx
<p className="text-sm text-slate-600 mb-4">
  We are committed to protecting your health information. Your personal health information (PHI) will be used only for treatment, payment, and healthcare operations as permitted by HIPAA regulations. We maintain strict security measures to protect your information.{" "}
  <a 
    href="/hipaa-notice" 
    target="_blank" 
    rel="noopener noreferrer"
    className="text-teal-600 hover:text-teal-700 underline"
  >
    Read full HIPAA Notice
  </a>
</p>
```

---

## Part 2: Add Medical Intake Summary Card to Provider Dashboard

### Purpose
Show providers the intake data submitted by patients in an easy-to-read format within the patient profile modal.

### New Component: `IntakeSummaryCard`

This component will display:
- Completed date and time
- Personal info (DOB, Gender, Address)
- Allergies (highlighted if present)
- Current medications
- Previous surgeries
- Family history checkboxes
- Safety screening results (with risk highlighting)
- Treatment goals

**New File:** `src/components/provider/IntakeSummaryCard.tsx`

### Provider Dashboard Integration

Add the component to the patient profile modal in `ProviderDashboard.tsx`, showing it when:
- Patient has `intake_completed = true` AND
- Patient has `medical_history.intake_completed_at` timestamp

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/PublicIntake.tsx` | MODIFY | Add "Read full HIPAA Notice" link to consent section |
| `src/components/provider/IntakeSummaryCard.tsx` | CREATE | New card component to display intake summary |
| `src/pages/ProviderDashboard.tsx` | MODIFY | Add IntakeSummaryCard to patient profile modal |

---

## IntakeSummaryCard Design

```text
┌──────────────────────────────────────────────────────────────────┐
│ 📋 Medical Intake Summary                    Completed: Jan 15  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Personal Information                                            │
│  ───────────────────                                             │
│  DOB: 03/15/1985 (38 years)                                     │
│  Gender: Female                                                  │
│  Address: 123 Main St, Augusta, GA 30909                        │
│                                                                  │
│  Allergies                                                       │
│  ───────────                                                     │
│  ⚠️ Penicillin, Sulfa drugs                                     │
│                                                                  │
│  Current Medications                                             │
│  ────────────────────                                            │
│  Lisinopril 10mg daily, Vitamin D3                              │
│                                                                  │
│  Safety Screening                         Status: ELEVATED       │
│  ────────────────────                                            │
│  ⚠️ Cardiac conditions noted                                    │
│  ✓ Not pregnant/nursing                                         │
│  ✓ No liver/kidney disease                                      │
│                                                                  │
│  Family History                                                  │
│  ──────────────                                                  │
│  ✓ Cardiac  ✓ Diabetes  ○ Cancer  ○ Mental Health               │
│                                                                  │
│  Treatment Goals                                                 │
│  ───────────────                                                 │
│  "Looking to improve energy levels and reduce hot flashes.      │
│   Have tried other treatments but haven't found relief."        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Risk Status Badge Logic

The intake summary will show risk status with color coding:

| Risk Level | Badge Color | Trigger Conditions |
|------------|-------------|---------------------|
| HIGH | Red | Pregnant/nursing |
| ELEVATED | Orange | Cardiac conditions, liver/kidney disease, substance history (ketamine) |
| STANDARD | Green | No safety flags |

---

## Summary

| Enhancement | Benefit |
|-------------|---------|
| HIPAA link | Patients can read full policy before acknowledging |
| Intake Summary Card | Providers see all intake data at a glance |
| Risk highlighting | Safety flags prominently displayed |
| Allergy visibility | Critical medication info immediately visible |

