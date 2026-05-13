# Email templates audit — pricing / phone gap closure (2026-05-13)

**Authority:** `docs/pricing/pricing_source_of_truth.md`  
**Method:** No direct production DB access from this environment. Rows and default copy were taken from the **canonical seed migration** `supabase/migrations/20260106012554_1ff77803-4d5e-44ce-aef7-4a3e02342957.sql` (sole `INSERT INTO public.email_templates` in repo). Additional `template_key` values are inferred from **edge function `communication_logs` inserts** and **QuickEmailModal** usage where they may have been created later in the admin UI.

---

## 1) `template_key` values defined in repo migrations (baseline seed)

| template_key | Stale content in seed (summary) | Target copy / behavior |
|--------------|--------------------------------|-------------------------|
| `welcome` | `(706) 922-7454`; “Schedule your **initial consultation**” | Clinic phone **(706) 760-3470**; “Schedule your **Wellness Assessment**” |
| `consultation_invite` | Name/subject/body/SMS: **$99 Discovery Consultation**, Discovery wording; `(706) 922-7454` | **$79 Wellness Assessment** naming; phone **760-3470**; remove Discovery framing |
| `kit_payment` | Name “Kit Payment Request”; subject “**Lab Kit** Payment”; body: ship **at-home collection kit**; wrong phone | Rename to **lab panel** language; in-office **LabCorp** draw; phone **760-3470** |
| `labs_reviewed` | Wrong phone only in seed | Phone **760-3470** |
| `treatment_authorized` | Wrong phone only in seed | Phone **760-3470** |
| `intake_reminder` | SMS wrong phone; body has no phone | SMS **760-3470** |
| `appointment_reminder` | Wrong phone; **wrong address** (“1230 Augusta West Parkway, Augusta, GA 30909”) | Phone **760-3470**; address **7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809** |

---

## 2) Keys referenced in application / edge code but **not** in the seed migration

These may or may not exist as rows in production (e.g. created in **Email Templates** admin). If present, they should receive the same phone / pricing hygiene via idempotent `UPDATE … WHERE template_key = …`.

| template_key (inferred) | Source | If present — stale patterns to fix |
|-------------------------|--------|--------------------------------------|
| `consultation_payment_only` | `send-consultation-invite/index.ts` logs | Same as invite: old phones, Discovery / Strategy / $99 / $149 |
| `welcome_email` | `send-welcome-email/index.ts` logs only (email body is hardcoded in function) | If a DB row exists: phones + “initial consultation” language |
| `vitality_activation` | `send-vitality-activation/index.ts` | **Deactivate** (`is_active = false`) — legacy Vitality tier per SOT |
| `glp1_activation` | `send-glp1-activation/index.ts` logs; optional DB template for staff | Phones; any embedded Vitality/Concierge/$399/$499 legacy lines if stored in DB |
| `rx_fax` | `send-rx-fax/index.ts` | Phone only if template row exists |

**Not found in repo migrations:** `subscription_activation`, `rebooking_fee_charged`, `lab_results_ready`, `booking_confirmation`. They are included in the extended migration so **if** operations added them in production, they get phone + common phrase fixes without error.

---

## 3) Vitality / ZRT-style templates

| Policy | Detail |
|--------|--------|
| **Vitality** | `UPDATE … SET is_active = false` where `template_key` matches `vitality%`. **No row deletes.** |
| **ZRT / hormone mapping** | Deactivate keys matching `^zrt` or `^hormone_mapping` (regex), **no deletes**. Preserves history and foreign references. |

---

## 4) Forbidden / deprecated phrase → replacement (email/SMS bodies)

| Stale phrase | Replacement |
|---------------|---------------|
| `(706) 922-7454`, `(706) 973-3866` | `(706) 760-3470` |
| `$99 Discovery Consultation`, `Your $99 Discovery Consultation Awaits` | `$79 Wellness Assessment` / `Your $79 Wellness Assessment Awaits` |
| `$99 Discovery`, `$149 Strategy Session` | `$79 Wellness Assessment` where used as entry-offer wording |
| `Discovery Consultation` | `Wellness Assessment` |
| `Clinical Strategy Session` | `Wellness Assessment` |
| `credit toward your Hormone Mapping Kit` / `credit toward treatment` | Neutral: paid upfront; labs/programs quoted separately (short form in SQL) |
| Rebooking copy `$79` when clearly “rebooking fee” context | `$99` per SOT **Rebooking Fee** |
| Wrong clinic address on `appointment_reminder` | Evans Town Center address (see table above) |

---

## 5) Migration coverage (Phase B)

All of the above is implemented in **`supabase/migrations/20260513143000_update_email_templates_pricing.sql`** as additional idempotent `REPLACE` chains and targeted `UPDATE`s. Rows that do not exist are skipped (0 rows updated).

---

## 6) Post-deploy verification (ops)

Run in SQL editor (redact output if sharing):

```sql
select template_key, is_active,
       (body_html like '%922-7454%' or body_html like '%973-3866%') as body_bad_phone,
       (coalesce(sms_text,'') like '%922-7454%' or coalesce(sms_text,'') like '%973-3866%') as sms_bad_phone
from public.email_templates
order by template_key;
```

Expect `body_bad_phone` / `sms_bad_phone` false for all active templates after migration apply.
