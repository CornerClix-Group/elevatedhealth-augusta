
## Analysis: Encounter Form Integration + Lovable Platform Updates

### Document Analysis: Elevated Health Encounter Form 2026

The uploaded encounter form is a **clinical visit encounter form** (different from the existing Superbill which is for insurance reimbursement). Key observations:

| Section | CPT Codes in Form | Currently in Database |
|---------|-------------------|----------------------|
| New Patient Visits | 99204, 99205 | 99204 only |
| IV Ketamine | 96365, 96366, 96360, 96361, J3490 | None |
| Spravato | 99214, 99215, G2212, G2082, G2083 | 99214 only |
| Weight Loss | Initial evaluation | Not structured |
| Supplies/Medications | J2405, J7120, 96365, A4222, A4215 | None |
| Urine Drug Screens | 80305, G0434, 84703 | None |

**Key Differences from Current SuperbillGenerator:**
1. **Purpose**: Encounter form is for internal billing/tracking; Superbill is for patient insurance reimbursement
2. **Workflow**: Encounter form needs to be completed during/after visit and sent to Office Manager (Kristen)
3. **Additional Fields**: Insurance type checkboxes, payment method, follow-up appointment, check number

---

### Integration Plan

#### 1. Create New "EncounterForm" Component
A standalone component similar to SuperbillGenerator but tailored for internal billing:

**Features:**
- Service type selector (Spravato/Ketamine, Hormones, Weight Loss)
- Insurance type checkboxes (Commercial, Medicare, Private Pay, VA, TRICARE)
- Pre-populated CPT code checklists organized by service category
- Payment capture (amount, method: Cash/Check/Credit Card)
- Follow-up appointment date picker
- "Send to Office Manager" button (emails Kristen)
- "Print" option for paper backup

#### 2. Add Missing CPT Codes to Database
Insert the following new CPT codes:

```sql
-- IV Ketamine
96365 - Infusion visit 1st hour
96366 - 2nd hour monitoring
96360 - IV Infusion initial first 30min-1hr
96361 - IV Infusion past initial first hour
J3490 - Ketamine Medication

-- Spravato
99205 - Comprehensive/High (new patient)
99215 - Comprehensive/High (established)
G2212 - 15 min beyond 1hr
G2082 - Spravato 56mg
G2083 - Spravato 84mg

-- Supplies/Medications
J2405 - Zofran x 4
J7120 - LR 1000ml no dextrose
A4222 - Infusion supplies
A4215 - Sterile Needle for IV

-- Urine Drug Screens
80305 - UDS 10 Panel (in office)
G0434 - UDS 10 Panel (Medicare)
84703 - HCG Urine
```

#### 3. Create Edge Function: send-encounter-form
Sends completed encounter form to Office Manager (Kristen):
- Professional HTML email format matching the paper form
- CC: Provider who completed the form
- Store in `encounter_forms` table for audit trail

#### 4. Store Office Manager Email in Clinic Settings
Add `office_manager_email` to `clinic_settings` table for easy updates.

#### 5. Add to Provider Dashboard
**Two integration points:**

A. **Quick Actions Bar** - Add "Encounter Form" button:
```
[Send Kit] [Payment] [Labs] [Message] [Email] [Encounter Form]
```

B. **Patient Side Panel** - Add in "Insurance Documentation" card alongside SuperbillGenerator

---

### Technical Implementation

#### New Files:
1. `src/components/provider/EncounterFormModal.tsx` - Main modal component
2. `supabase/functions/send-encounter-form/index.ts` - Email edge function

#### Modified Files:
1. `src/components/provider/ProviderQuickActions.tsx` - Add Encounter Form button
2. `src/pages/ProviderDashboard.tsx` - Add to patient side panel
3. Database: Add new CPT codes and `encounter_forms` table

#### Database Migration:
```sql
-- New table for encounter form records
CREATE TABLE encounter_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  service_type TEXT NOT NULL, -- 'spravato', 'iv_ketamine', 'hormones', 'weight_loss'
  insurance_type TEXT, -- 'commercial', 'medicare', 'private_pay', 'va', 'tricare'
  cpt_codes JSONB NOT NULL,
  total_charges NUMERIC,
  payment_amount NUMERIC,
  payment_method TEXT, -- 'cash', 'check', 'visa', 'mastercard'
  check_number TEXT,
  follow_up_date DATE,
  provider_id UUID,
  sent_to_office_manager_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Lovable Platform Updates Summary

Based on the latest changelog (Jan 16, 2026), here are relevant updates:

| Feature | Relevance to Your Project |
|---------|--------------------------|
| **GPT-5.2 & Gemini 3 Flash** | Already available via Lovable AI for edge functions. Gemini 3 Flash is now default. |
| **Build Credit Top-ups** | Available on Pro/Business plans for extra development capacity |
| **2FA Support** | Consider enabling for admin accounts (Settings -> Account) |
| **Security Center** | Workspace-wide security dashboard now available |
| **Vitest Included** | Can add automated tests for edge functions |
| **ElevenLabs Connector** | Could add voice notes/dictation to encounter forms (future) |
| **Firecrawl Connector** | Free through Jan 2026 for web scraping (not relevant here) |
| **Perplexity Connector** | AI-powered research for drug interactions (future) |

**Recommended Actions:**
1. No immediate changes needed - your project is using current best practices
2. Consider enabling 2FA for provider accounts
3. The new AI models are automatically available via Lovable AI integration

---

### Next Steps After Approval

1. Create database migration for new CPT codes and `encounter_forms` table
2. Build EncounterFormModal component
3. Create send-encounter-form edge function
4. Add "Encounter Form" to Quick Actions bar
5. Add to patient side panel
6. Add Kristen's email to clinic settings
7. Test end-to-end workflow

