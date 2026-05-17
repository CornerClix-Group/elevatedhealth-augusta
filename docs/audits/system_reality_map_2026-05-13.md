# System Reality Map — Elevated Health Augusta

**Audit date:** 2026-05-13  
**Scope:** Static analysis of the repository at audit time. No runtime tests, no database queries, no access to hosted secrets.  
**Method:** File reads, `grep`, migration SQL, edge functions under `supabase/functions/`, and generated types `src/integrations/supabase/types.ts`.

Where static analysis cannot prove behavior, items are marked **UNVERIFIED:**.

---

## SECTION 1 — Patient entry points

Every path that creates or **materially binds** a row in `public.patients` (insert or first-time link of `user_id`).

### A. Self-serve consultation payment → booking (`$79` storefront path)

| Aspect | Evidence |
|--------|----------|
| **User-facing entry** | Public storefront consult checkout (e.g. `ConsultationModal` / pricing) invokes edge `create-consultation-checkout` (`src/lib/stripeConfig.ts` lines 12–21 reference `edgeFunction: "create-consultation-checkout"`). Success redirect: `ConsultationConfirmed` reads `session_id` (`src/pages/ConsultationConfirmed.tsx` lines 57–61, 70–118). |
| **Components** | `src/pages/ConsultationConfirmed.tsx` invokes `verify-consultation-payment` then reads `consultation_bookings` by `stripe_session_id` (lines 78–95). |
| **Edge functions** | `supabase/functions/create-consultation-checkout/index.ts` — creates Stripe Checkout only (lines 95–120); **does not insert `patients`**. `supabase/functions/verify-consultation-payment/index.ts` — inserts/updates `consultation_bookings` (lines 147–193); **updates** `patients` `onboarding_status` to `consultation_paid` **by email** (lines 195–205) — **0 rows updated if no patient exists yet**. |
| **Patient row creation** | **UNVERIFIED:** whether a `patients` row always exists before payment. If not, `verify-consultation-payment` booking insert succeeds but patient status update is a no-op until another path creates the patient. **`book-consult-appointment`** creates `patients` when patient self-books a slot (`supabase/functions/book-consult-appointment/index.ts` lines 379–395) with `onboarding_status: "consultation_pending"` (line 391) when no row by email. |
| **Auth.users** | Not created by checkout alone; `CreateAccount` uses `signUp` (below). |
| **Walk-in without online booking** | **UNVERIFIED** for this lane; booking still requires paid `consultation_bookings` status for self-serve path (`book-consult-appointment` lines 352–355). |

### B. Staff invite — “Send consultation invite” (`InvitePatientCard`)

| Aspect | Evidence |
|--------|----------|
| **UI** | `src/components/provider/InvitePatientCard.tsx` — `handleSendInvite` invokes `send-consultation-invite` (lines 214–225). |
| **Edge** | `supabase/functions/send-consultation-invite/index.ts` — creates Stripe session (lines 82–108), inserts **`consultation_bookings`** (lines 116–124), sends Resend email. **No `patients` insert** in the portion read (lines 1–131). |
| **Auth / patient table** | Invite establishes **booking + payment link**, not necessarily a `patients` row until payment or conversion. |

### C. Admin — “Add existing patient” (`AddExistingPatientCard`)

| Aspect | Evidence |
|--------|----------|
| **UI** | `src/components/provider/AddExistingPatientCard.tsx` lines 88–99 — `supabase.functions.invoke("add-existing-patient", …)`. |
| **Edge** | `supabase/functions/add-existing-patient/index.ts` — checks duplicate email (lines 173–192), then **`patients` insert** (lines 261–267+) with `onboarding_status` mapped from `patient_status` (lines 234–255; default `treatment_active`). Optional Resend welcome email. |
| **Auth.users** | **Not** created here — email/name/phone only on `patients` until patient signs up. |
| **Walk-in** | Allowed in the sense of “no prior booking”; staff supplies identity. |

### D. Admin — “Convert consultation” (`ConsultationTracker`)

| Aspect | Evidence |
|--------|----------|
| **UI** | `src/components/provider/ConsultationTracker.tsx` — `patients` **update** or **insert** from `consultation` row (lines 249–270); GLP-1 branch uses different status `awaiting_medical_clearance` (lines 220–236). Invokes `send-welcome-email` fire-and-forget (lines 278–286). |
| **Auth** | Caller is staff (RLS); patient auth unchanged. |

### E. Patient portal account creation (`CreateAccount`)

| Aspect | Evidence |
|--------|----------|
| **URL** | Routed as `/patient/create-account` per file header `src/pages/CreateAccount.tsx` lines 1–14. |
| **Flow** | `signUp` → `patients.update` by `email` with `user_id` + `onboarding_status: "account_created"` (lines 98–122); if no row, **`patients.insert`** (lines 127–135). Then `send-welcome-email` and `send-welcome-sms` invoked (lines 139–155). |
| **Auth.users** | **Yes** — `supabase.auth.signUp` (line 98). |
| **Critical static issue** | `send-welcome-email` **requires staff/admin JWT** (`supabase/functions/send-welcome-email/index.ts` lines 97–103). After `signUp`, the session is the **new patient user**, not staff — **static conclusion:** `CreateAccount` welcome email invoke **likely returns 403** unless an undocumented bypass exists. **UNVERIFIED:** production logs. |

### F. IV self-book / staff book (`book-iv-appointment`)

| Aspect | Evidence |
|--------|----------|
| **Edge** | `supabase/functions/book-iv-appointment/index.ts` lines 395–411 — find or create `patients` by email; new rows get `onboarding_status: "iv_only"`, `primary_program: "iv"` (lines 403–408). |
| **Auth** | **UNVERIFIED:** whether IV flow always supplies `customerEmail`; if missing, `patientId` null → 500 (lines 414–417). |

### G. Consult self-book slot (`book-consult-appointment` patient path)

| Aspect | Evidence |
|--------|----------|
| **Edge** | `supabase/functions/book-consult-appointment/index.ts` lines 379–395 — insert patient if missing with `consultation_pending` / `consultation_booking_id`. |

### H. Stripe webhook (`stripe-webhook`)

| Aspect | Evidence |
|--------|----------|
| **Behavior** | **`patients` updates only**, not inserts: e.g. `checkout.session.completed` one-time `consultation` → `consultation_paid` by email (`supabase/functions/stripe-webhook/index.ts` lines 172–176); `hormone_mapping` / `lab_kit` → `labs_paid` (lines 185–195); subscription branch sets `treatment_active`, membership fields (lines 246–254). |
| **Auth.users** | **No** — webhook uses service role Supabase client (lines 146–150). |

### I. Quiz / funnel (`HRTQuizModal`, etc.)

| Aspect | Evidence |
|--------|----------|
| **Evidence** | `grep` in `src/components/HRTQuizModal.tsx` finds **no** `patients` / `insert` — quiz is marketing/navigation, **not** a patient creation path in code reviewed. |

### J. Other mentions

- **`AddPatientModal`** (`src/components/provider/AddPatientModal.tsx`) — routes to `InvitePatientCard` / `AddExistingPatientCard`; **no direct `patients.insert` in that file** (audit: file not re-read in full this session; child cards carry creation).
- **Eligibility queue** — **UNVERIFIED** in this audit whether `eligibility_review_requests` inserts patients (not traced in time available).

### K. “Working end-to-end?”

| Path | Static assessment |
|------|-------------------|
| add-existing-patient | Coherent: staff JWT → insert patient. **UNVERIFIED:** email delivery. |
| send-consultation-invite | Creates booking + Stripe; **price mismatch risk:** function uses **$99** (`send-consultation-invite/index.ts` lines 92, 210) while `create-consultation-checkout` / verify flow document **$79** (`create-consultation-checkout` line 106; `verify-consultation-payment` lines 21, 236). |
| CreateAccount | **High risk:** welcome email edge function auth mismatch (Section 4). |
| verify-consultation-payment | May leave **no patient row** until booking; update by email is no-op if no patient. |

---

## SECTION 2 — Patient state machine

### Schema source for `onboarding_status`

- Column is **`TEXT`**, not a Postgres `ENUM` — comment lists allowed values: `supabase/migrations/20251218142614_f9e6e78f-22b1-4db6-9131-41b139d0afeb.sql` lines 4–27.
- **Documented values (comment):**  
  `pending_invite`, `account_created`, `consultation_paid`, `consultation_scheduled`, `consultation_complete`, `labs_paid`, `kit_shipped`, `sample_received`, `results_ready`, `labs_reviewed`, `protocol_approved`, `pending_pharmacy_order`, `treatment_active`, `high_risk_review`, `rebooking_fee_required`, `subscription_canceled`.

### Additional statuses observed in **code** (not all in comment)

| Value | Where set / used |
|-------|------------------|
| `consultation_pending` | `book-consult-appointment/index.ts` line 391; `ConsultationTracker.tsx` line 256 |
| `iv_only` | `book-iv-appointment/index.ts` line 407 |
| `awaiting_medical_clearance` | `ConsultationTracker.tsx` line 232 |
| `consultation_completed` | **UI option** mapping in `add-existing-patient/index.ts` lines 246–247 (maps to DB string `consultation_completed`) — **differs spelling** from comment’s `consultation_complete` |
| `onboarding`, `intake_complete`, `active` | Older comment in `20251201210917_d8835f0c-34a7-4acb-bac7-fb830a9bea51.sql` lines 3–4 — **may be legacy** vs current comment |

### Other patient “state” columns (types)

From `src/integrations/supabase/types.ts` `patients.Row` (lines 2133–2187):  
`elevated_membership_status`, `risk_status`, `is_archived`, `intake_completed`, `lab_path`, `membership_tier`, `stripe_subscription_id`, etc.

### Example transitions (non-exhaustive)

| Transition | Trigger |
|------------|---------|
| → `consultation_paid` | `verify-consultation-payment` (lines 195–199); `stripe-webhook` checkout `payment_type === "consultation"` (lines 172–176) |
| → `labs_paid` | `stripe-webhook` for `hormone_mapping` / `lab_kit` (lines 185–195) |
| → `treatment_active` | `stripe-webhook` subscription branch (lines 246–254); **also** default for `add-existing-patient` (lines 234–238) |
| → `labs_reviewed` | `ProviderDashboard.tsx` — `handleMarkLabsReviewed` (starts line 602); button `onClick` at line 2381 |
| → `protocol_approved` | Patient panel callbacks in `ProviderDashboard.tsx` (e.g. `onApproveProtocol` updates) — **exact line numbers UNVERIFIED** beyond grep hits |
| → `subscription_canceled` | `stripe-webhook` (lines 323–337) |
| → `account_created` | `CreateAccount.tsx` lines 114–116 |

### Linear vs arbitrary

- **Not enforced in DB as an enum** — any string can be written if RLS/service role allows; **arbitrary jumps are possible** from staff/service code.
- **UI workflows** often assume sequences (e.g. labs reviewed before health report) — enforced in **UI conditionals**, not solely in DB.

### Dead / inconsistent states

- **`consultation_complete` vs `consultation_completed`** — spelling mismatch between migration comment and `add-existing-patient` mapping — **risk of fragmented reporting**.
- **Legacy `ConsultationTracker` badges** still list `converted_to_ketamine` etc. (`ConsultationTracker.tsx` lines 318–319) — **legacy paths** per comments.

---

## SECTION 3 — Independent action inventory

Legend: **Block** = hard UI/disable prevents action; **Warn** = toast/copy only; **None** = no gate found in quick static pass.

| # | Action | UI entry (representative) | Prior state / gate | Walk-in (no booking history) | Independence (static) |
|---|--------|---------------------------|--------------------|------------------------------|-------------------------|
| 1 | Order prescription (FCC portal / fax) | `PharmacyOrderCard` → `PrescriptionPortalModal` (`src/components/provider/PharmacyOrderCard.tsx` imports modal line 9+) | **UNVERIFIED:** full modal preconditions; disabled flags tied to form validation (`PrescriptionPortalModal.tsx` ~lines 886–911) | If `patients` row exists, likely yes | **Mostly independent** of onboarding if staff can open dashboard for patient |
| 2 | Order labs (Labcorp / ZRT) | `LabcorpOrderModal`, `ZRTRequisitionGenerator`, lab path cards inside `ProviderDashboard.tsx` (e.g. lines 2264–2274 region) | **UNVERIFIED:** each subflow | **UNVERIFIED** | **UNVERIFIED** without per-component read |
| 3 | One-time charge (admin) | `QuickPaymentModal` (`src/components/provider/QuickPaymentModal.tsx`) — builds checkout URL / send link | Needs **selected patient** + product; uses edge functions per product (lines 100+) | Requires **patient row** with email for links | **Independent** of consult completion if patient exists |
| 4 | Message patient | `QuickMessageModal` (`src/components/provider/QuickMessageModal.tsx` lines 60–112) | Patient must exist in DB | Same | **Independent** — **does not send SMS/email**; inserts `messages` only (Section 4) |
| 5 | Send payment link | `AlaCartePaymentCard` (`src/components/provider/AlaCartePaymentCard.tsx` lines 92–132); `QuickPaymentModal` | Needs patient email for email path | Needs patient record | **Independent** modulo Stripe/checkout |
| 6 | Book appointment (provider) | `OfficeSchedule.tsx`, `StaffBookingModal`, `book-consult-appointment` staff branch | **UNVERIFIED:** staff path patient resolution | Staff can create booking — **UNVERIFIED** patient auto-create rules for staff lane | **UNVERIFIED** |
| 7 | Mark labs reviewed | `ProviderDashboard.tsx` / lab card button (grep `handleMarkLabsReviewed`) | UI conditional: only if status not in terminal list (lines 2368–2369 region) | N/A | **Gated** by `onboarding_status` display rules |
| 8 | Approve protocol / create order | `authorizeAndSendOrder` in `ProviderDashboard.tsx` (~lines 694+); button gated by `high_risk_review` (lines 2780–2781) | **Block** for high risk | **UNVERIFIED** | **Partially gated** |
| 9 | Superbill | `SuperbillGenerator` component usage in dashboard | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| 10 | Archive patient | `handleArchivePatient` (`ProviderDashboard.tsx` grep lines 637+) | toggles `is_archived` | Yes if patient row | **Independent** |
| 11 | Refund | **No** `refund` implementation found in `src/` beyond legal copy (`TermsOfService.tsx`, `ConsultationModal.tsx`) | N/A | N/A | **Not exposed as admin UI** in static search |
| 12 | Resend welcome email | `ResendWelcomeEmailButton.tsx` lines 31–38 — `send-welcome-email` | Staff session — OK | N/A | **Independent** |
| 13 | Kit link / send kit | `stripeConfig.ts` lines 24–31 state hormone kit checkout **removed** / deprecated | **Dead / removed** per comments | N/A | **Not a live path** in documented config |
| 14 | Other clinical actions | SOAP, fax history, inventory, peptides, etc. | Each has own component | **UNVERIFIED** per feature | **UNVERIFIED** |

---

## SECTION 4 — Communication reliability audit

### 1. Admin “Send Email” / templates

- **UNVERIFIED:** single “Send Email” button trace in this audit window.  
- **`QuickEmailModal`** exists (`src/components/provider/QuickEmailModal.tsx` — not fully read); likely staff-composed email.

### 2. “Send Message” / Quick message (`QuickMessageModal`)

| Step | What happens |
|------|----------------|
| Click Send | `messages` **insert** + `conversations` update (`src/components/provider/QuickMessageModal.tsx` lines 68–110). |
| Twilio / Resend | **Not called** in this file. |
| Patient notification | **UNVERIFIED:** whether Supabase Realtime or push notifies patient; **no outbound SMS/email** in this handler. |
| Portal “sent” | Toast “Message sent…” (line 112) reflects **DB insert success**, **not** carrier delivery. |

**Static conclusion:** If the user expected SMS/email, **this path only supports in-app chat persistence** — mismatch with user expectation is **consistent with code**.

### 3. Patient portal messages

- **Component:** `PatientChatWidget` (`src/components/chat/PatientChatWidget.tsx`) uses `useSecureChat('patient', patientId)` (lines 20–27) — reads/writes same conversation model.  
- **Delivery / push:** **UNVERIFIED** (depends on `useSecureChat` implementation and Realtime subscriptions — not fully expanded in this audit).

### 4. Transactional email

| Flow | Provider | Config |
|------|----------|--------|
| Consult paid receipt | Resend in `verify-consultation-payment/index.ts` (lines 88–91, 233+) | `RESEND_API_KEY` env |
| Membership welcome | Resend in `stripe-webhook/index.ts` (lines 122, 269–275) | Same |
| Consult invite | Resend in `send-consultation-invite/index.ts` (line 27+) | Same |
| Welcome email edge | Resend `send-welcome-email/index.ts` (line 24) | Same |

**SMS (consult receipt path):** `verify-consultation-payment` defines `sendSMS` with Sinch (`SINCH_ACCESS_KEY`, `SINCH_SECRET_KEY`) lines 35–69 — **UNVERIFIED** whether all code paths call it after email.

### 5. Fax (Sinch)

- **`send-rx-fax`** edge function (not re-read in full this session) — per `.cursorrules` uses Sinch fax.  
- **Webhook:** `sinch-fax-webhook` — failure handling **UNVERIFIED** in this audit.

### 6. Staff SMS alerts

- `stripe-webhook` invokes `send-staff-alert-sms` (lines 281–298) with `SUPABASE_ANON_KEY` — **UNVERIFIED** end-to-end.

### Logging / delivery status

- Edge functions generally `console.log` / `logStep` only — **no** `communication_logs` trace verified for QuickMessage path.  
- **`send-welcome-email`** header comment references `communication_logs` writes — **UNVERIFIED** in body without full file read.

---

## SECTION 5 — Payment & Stripe configuration

| Question | Answer |
|----------|--------|
| **sk_test vs sk_live** | Edge functions read `Deno.env.get("STRIPE_SECRET_KEY")` (e.g. `stripe-webhook/index.ts` line 118). **UNVERIFIED:** actual value in deployed Supabase secrets. **`.env.example`** (`/.env.example` lines 9–11) lists **only** Supabase vars — **no** Stripe keys in repo template. |
| **Stripe customer ID on patient** | Generated types **`patients.Row`** (`src/integrations/supabase/types.ts` lines 2133–2187) include **`stripe_subscription_id`** but **no `stripe_customer_id`**. **UNVERIFIED:** whether a migration added column not reflected in types. |
| **Customer creation timing** | `create-consultation-checkout` lists Stripe customers by email and attaches `customer` if found (lines 82–88). **Lazy** association at checkout. |
| **Saved payment methods / admin charge** | **UNVERIFIED:** no UI path found in this audit for “charge saved card without Checkout.” `QuickPaymentModal` generates Checkout sessions / links. |
| **Refunds** | **No** admin refund UI found (grep Section 3). |
| **Webhook events handled** | `stripe-webhook/index.ts` (file ends line 355): `checkout.session.completed` (from line 153); `customer.subscription.deleted` / `customer.subscription.updated` (lines 314–348). **No other `event.type` branches** in this file. |
| **Production charges count** | **UNVERIFIED:** requires live DB query. |

**Launch posture:** Inability to confirm `sk_live` vs `sk_test` from repo → **treat Stripe mode as UNVERIFIED launch-critical**.

---

## SECTION 6 — Patient portal (patient perspective)

Routes from `src/App.tsx` include `PatientLogin`, `PatientDashboard`, `PatientIntake`, `CreateAccount`, `HealthReport`, `PatientServices`, etc. (lines 39–55, 70–72).

| Experience question | Evidence / gap |
|----------------------|----------------|
| **Post-invite landing** | **Varies:** invite emails point to checkout or `/patient/create-account?email=` (`CreateAccount.tsx` lines 39–40). **UNVERIFIED:** exact copy in every template. |
| **Account / password** | Email/password via `signUp` / `signInWithPassword` (`CreateAccount.tsx` lines 98–160). |
| **First login destination** | After create, `navigate("/patient/intake")` (line 160). |
| **Dashboard content** | `PatientDashboard.tsx` uses hooks `usePatient`, regimen, labs, kit, chat widget (lines 67–71, 14–15). **Empty/error states:** **UNVERIFIED** per tab. |
| **Prescriptions / labs / messages** | Orders via `useLatestOrder`; labs via `useLatestLabResult`; chat widget present. **Accuracy of data** — **UNVERIFIED**. |
| **Edit contact info** | `EditProfileModal` imported (line 13). **UNVERIFIED:** fields allowed. |
| **Re-book / reschedule** | **UNVERIFIED** in patient UI (not traced). |
| **Pay outstanding balance** | **UNVERIFIED:** dedicated “pay balance” surface not found in `PatientDashboard` excerpt. |
| **Embarrassing / “coming soon”** | **UNVERIFIED** full scan; code comments hide neuro/metabolic cards (`PatientDashboard.tsx` lines 72–79, 85–94). |

---

## SECTION 7 — Launch gap analysis

### LIST A — BLOCKERS

1. **Consult pricing inconsistency ($99 invite vs $79 checkout)** — Align `send-consultation-invite` amounts/copy with `create-consultation-checkout` / `verify-consultation-payment` or confirm intentional dual pricing.  
2. **`CreateAccount` → `send-welcome-email` auth mismatch** — Patient JWT cannot satisfy staff-only edge function; fix auth model (separate public function, service role from trusted server only, or remove invoke).  
3. **“Message sent” toast without outbound delivery** — `QuickMessageModal` only inserts DB rows; add real channel or rename UX to “Posted to portal chat.”  
4. **Stripe mode / live keys** — Confirm `sk_live`, webhook signing secret, and price IDs in production Supabase + Vite env before taking money.  
5. **`onboarding_status` spelling drift (`consultation_complete` vs `consultation_completed`)** — Normalize values and migrations/comments to prevent broken filters.  
6. **Patient row may be missing when consult paid** — If `verify-consultation-payment` updates by email and no row exists, downstream features assuming a patient row may fail — ensure insert or document required ordering.

### LIST B — MAJOR FRICTION

1. **Dual consult entry paths** (invite vs self-checkout) with different Stripe products — staff confusion and reconciliation friction.  
2. **Legacy onboarding labels and ketamine-era strings** in UI badges and comments — staff trust and cleanup cost.  
3. **Webhook welcome email content** references ZRT kit / prescription timing (`stripe-webhook/index.ts` HTML lines 47–58) — may not match current ops (per `.cursorrules` LabCorp path).  
4. **No refund tooling in admin UI** — forces manual Stripe Dashboard operations.  
5. **Chat relies on patient logging in** — no external notification path verified for new messages.

### LIST C — POLISH

1. Regenerate `supabase` types if columns drifted (`stripe_customer_id` mentioned in docs but absent from types snippet).  
2. Consolidate `logStep` / `console.log` into persistent `communication_logs` for supportability.  
3. Remove or gate legacy ketamine / ZRT quiz copy in patient-facing surfaces.  
4. **`.env.example`** — document optional Stripe/Resend/Twilio keys for local dev (without secrets).

### Addendum — `send-booking-confirmation` chain

- **File:** `supabase/functions/send-booking-confirmation/index.ts`
- **SMS:** Sinch REST `https://us.sms.api.sinch.com/...` (line 118+); uses env keys (see `formatPhoneNumber` lines 55–61).
- **Email:** Direct `fetch("https://api.resend.com/emails"` (line 239); skips if `RESEND_API_KEY` missing (lines 231–232).
- **Invoked from:** `book-consult-appointment` (lines 439–448 in prior read) and `book-iv-appointment` (lines 446–458) via `supabase.functions.invoke` — failures are `console.warn` only (non-blocking).

---

## SECTION 1 addendum — `AddPatientModal` wiring

- **File:** `src/components/provider/AddPatientModal.tsx` (not line-audited in full this session) — composes `InvitePatientCard` and `AddExistingPatientCard` per earlier repo knowledge; **UNVERIFIED:** exact line numbers for child components in this audit pass.

---

## SECTION 3 addendum — `QuickPaymentModal` edge routing

- **File:** `src/components/provider/QuickPaymentModal.tsx` — `getEdgeFunction` (from line 100) maps product keys to checkout edge functions (e.g. membership, consultation, GLP-1, à la carte). **Static:** staff generates Stripe Checkout URL or sends link — **no** in-app card capture.

---

**End of audit.** For any launch decision, re-verify against **deployed** Supabase schema, **RLS policies**, and **live** Stripe/Resend/Twilio dashboards — this document is **code-only**.
