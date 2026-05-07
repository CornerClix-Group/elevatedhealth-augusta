## Goal

Pivot the top-of-funnel offer from a $149 MD consult to a **$79 RN Wellness Assessment** (Caroline-led, scope-of-practice safe) and add three additional RN-billable services. Keep the MD physician evaluation available as a downstream upgrade, not the entry point.

## New service offerings

| Service | Price | Provider | Duration | Notes |
|---|---|---|---|---|
| RN Wellness Assessment | **$79** | Caroline (RN) | 30 min | New top-of-funnel; replaces $149 consult as default |
| IV Start & Monitoring Fee | **$35** | RN | per drip | **Bundled into displayed IV menu prices** — no line-item at checkout |
| Injection Admin Fee | **$20** | RN | per inj. | Separate line on B12, lipo, peptide teach-and-inject |
| RN Follow-Up / Coaching | **$49** | Caroline (RN) | 15 min | Between-visit check-ins |
| MD Physician Evaluation | $149 | MD | 30 min | Now an internal escalation, not public entry point |

**Credit logic:** $79 RN assessment credits 100% toward any treatment (IV, membership, injection, peptide, hormone) when redeemed within 30 days. No MD consult required.

## Marketing/public-site changes (frontend only)

1. **Replace primary CTA copy site-wide** — wherever the site currently says "Book a $149 Consultation" / "$149 Strategy Session" → "Book a $79 RN Wellness Assessment." Affected files include (non-exhaustive):
   - `src/components/BookingWidget.tsx`, `ConsultationModal.tsx`, `FloatingMobileCTA.tsx`, `FoundingMemberBanner.tsx`, `Insurance.tsx`, `KetamineTherapy.tsx`, `TreatmentsPricing.tsx`, `HowGLP1Works.tsx`, `WhyTransdermalCream.tsx`, `WhatToExpect.tsx`
   - `src/pages/Consult.tsx` (primary), `Affordability.tsx`, `WeightLoss.tsx`, `Hormones*.tsx`, `IVKetamine.tsx`, `IVLounge.tsx`, `PeptideTherapy.tsx`, `HairRestoration.tsx`, `MilitaryVeteran.tsx`, `Spravato.tsx`, `SexualWellness.tsx`, `WhatToExpect.tsx`, `HowKetamineWorks.tsx`
   - SEO: `SEOSchema.tsx` price/offer schema → $79
   - Chat: `ChatBot.tsx`, `AssistantHub.tsx` knowledge base
2. **`src/pages/Consult.tsx`** becomes the RN Assessment booking page. Add a small secondary line: *"Need a physician evaluation for prescription therapies? We'll schedule the MD visit ($149) after your assessment if clinically appropriate."*
3. **`PricingComparison.tsx` / `CompareQuizModal.tsx`** — recompute the value calculator with $79 entry point.
4. **`CreditCodeInput.tsx`** — credit code copy says "$79 RN Assessment credit applied" instead of $149.
5. **IV menu pages (`IVLounge.tsx`, `IVKetamine.tsx`)** — add $35 to each displayed drip price (math only, no "+$35 fee" disclaimer).
6. **Founding Member banner** — remove or rewrite the $149 reference.

## Internal staff-facing changes (frontend)

1. **`StaffPricingCheatsheet.tsx` / `StaffQuickCard.tsx`** — add the four new RN line items, scope-of-practice notes ("RN cannot diagnose / prescribe; escalate to MD for Rx requests"), and the credit redemption rule.
2. **Provider dashboard quick-pay (`QuickPaymentModal.tsx`)** — add the four new services to the quick-charge picker.
3. **`AddPatientModal.tsx` / `InvitePatientCard.tsx`** — service-type dropdowns include "RN Wellness Assessment."

## Booking/calendar

The current public booking flow points to a single Calendly-style URL for the $149 consult. Add a **second calendar URL** for the RN Assessment (Caroline's calendar) and route the public CTA there. The MD calendar URL stays available for internal escalations from the provider dashboard.

## Backend (minimal)

No schema changes required — existing `consultation_bookings` and `service_interests` cover this. We'll just add `'rn_assessment'`, `'rn_followup'`, `'iv_admin_fee'`, `'injection_admin'` as recognized service slugs in:
- `src/lib/services.ts` or equivalent service catalog (read first before editing)
- The credit-code edge function logic (lookup table for valid credit-bearing services)

## Out of scope for this prompt

- Stripe products: I'll **not** auto-create new Stripe price IDs in this build — you'll want to create them in your Stripe dashboard and paste the IDs back, or I can use the Stripe MCP to create them in a follow-up.
- Practice-management schema migration from the uploaded `schema.sql` — that's a separate, much larger build (Prompts 1–8 from your `lovable-prompts-pms.md`). Flag this for a dedicated session.

## Verification

After implementation: load `/consult`, homepage, `/affordability`, `/iv-lounge`, `/hormones`, `/staff-quick-card` and confirm $149 is gone from public-facing copy and $79 RN Wellness Assessment is the consistent CTA. Staff cheatsheet shows all four new RN services with scope-of-practice notes.
