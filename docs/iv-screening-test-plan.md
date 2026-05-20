# IV Screening + Booking Gate Test Plan

## Scope

Validate the launch-blocking flow:

1. Service selection
2. Medical screening
3. Screening decision (cleared/warned/blocked)
4. Guarded slot picker
5. Stripe payment
6. Appointment creation + intake linkage

## Test Cases

1. **All NO answers -> cleared -> slot picker accessible**
   - Start at `/book/iv`, choose a service, continue to screening.
   - Submit all hard/soft contraindication questions as `No`, check disclaimer.
   - Expect `screening_result = cleared`.
   - Expect redirect to `/book/iv/slots?...`.
   - Expect slot picker visible and usable.

2. **`has_chf=true` -> blocked -> no slot picker access**
   - Submit screening with CHF = Yes.
   - Expect redirect to `/book/iv/blocked/:intake_id`.
   - Expect block reason list contains CHF contraindication text.
   - Confirm there is no CTA/path from blocked page to slot picker.

3. **`has_g6pd_deficiency=true` + Vitamin C service -> blocked**
   - Choose a service where `requires_g6pd_clearance=true` (e.g., Vitamin C / Ascorbic Acid, Myers, Glutathione).
   - Submit with G6PD deficiency = Yes.
   - Expect `screening_result = blocked`.
   - Expect block reasons include G6PD contraindication text.

4. **`has_g6pd_deficiency=true` + B12 service -> NOT blocked by G6PD rule**
   - Choose service without `requires_g6pd_clearance` (e.g., B12 IM).
   - Submit with only G6PD deficiency = Yes and all other answers No.
   - Expect **no G6PD block reason**.
   - Expected overall result:
     - `cleared` if no other warning/block flags are set.
   - Clarification: G6PD only blocks when the selected service has `requires_g6pd_clearance=true`.

5. **`has_diabetes=true` alone -> warned -> acknowledgment required**
   - Submit with diabetes = Yes and no block flags.
   - Expect redirect to `/book/iv/warnings/:intake_id`.
   - Expect warning reason list includes diabetes warning.
   - Continue button disabled by behavior until acknowledgment checkbox checked.
   - After acknowledging, expect update to `warned_acknowledged` and redirect to slot picker.

6. **`has_sesame_allergy=true` + Vit D3 service -> blocked**
   - Choose service with `contraindicates_sesame_allergy=true` (Vitamin D3 IM).
   - Submit with sesame allergy = Yes.
   - Expect blocked result and sesame allergy block reason.

7. **Direct access to slot picker without intake -> redirect**
   - Navigate directly to `/book/iv/slots?serviceId=<id>` without `intake_id`.
   - Expect redirect to `/book/iv/screening?serviceId=<id>`.

8. **Reuse blocked intake id in slot picker -> redirect**
   - Use `intake_id` whose result is `blocked`.
   - Attempt `/book/iv/slots?serviceId=<id>&intake_id=<blocked-id>`.
   - Expect guard redirect back to `/book/iv/screening?serviceId=<id>`.

9. **Hard-block intake triggers follow-up notifications + queue visibility**
   - Submit screening with any hard-block condition (e.g., CHF = Yes).
   - Expect `screening_result = blocked`.
   - Expect patient receives "next steps" email with safety consult deep link.
   - Expect `admin@elevatedhealthaugusta.com` receives blocked-intake staff alert.
   - Expect intake appears in `/admin/intake-follow-ups` with `follow_up_status = new`.

10. **Safety consult deep link books $0 consult without Stripe**
   - Open patient email CTA link: `/book/consult/safety?intake_id=<blocked-id>`.
   - Expect blocked intake validation + prefilled demographic context.
   - Pick slot and confirm.
   - Expect appointment created directly (no Stripe checkout).
   - Expect `iv_intake_responses.safety_consult_appointment_id` populated.
   - Expect `iv_intake_responses.follow_up_status = consult_scheduled`.

11. **Admin status transition writes audit trail**
   - In `/admin/intake-follow-ups/:id`, update status from `new` -> `contacted`.
   - Expect row updates in UI/status badge immediately after refresh.
   - Expect audit entry written via trigger in `audit_log` with old/new status mapping.

## Additional Integrity Checks

- After successful paid booking, verify `iv_intake_responses.appointment_id` is set for the used `intake_id`.
- Verify `book-iv-appointment` still rejects unpaid sessions.
- Verify slot-token replay protection still works in the gated IV flow.
