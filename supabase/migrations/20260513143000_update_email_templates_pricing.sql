-- =============================================================================
-- email_templates: pricing + clinic phone alignment (idempotent REPLACE / flags)
-- Authority: docs/pricing/pricing_source_of_truth.md
-- Audit: docs/audits/email_template_gap_2026-05-13.md
--
-- Template keys touched by this migration (row may or may not exist):
--   consultation_invite, consultation_payment_only, welcome, welcome_email,
--   kit_payment, labs_reviewed, lab_results_ready, treatment_authorized,
--   intake_reminder, appointment_reminder, subscription_activation,
--   rebooking_fee_charged, booking_confirmation, glp1_activation, rx_fax
-- Plus deactivation (is_active = false), no deletes:
--   template_key LIKE 'vitality%' (e.g. vitality_activation, vitality_welcome)
--   template_key ~* '^(zrt|hormone_mapping)' (legacy kit / saliva naming)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- consultation_invite
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  name = 'Wellness Assessment Invite',
  subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    'Your $99 Discovery Consultation Awaits', 'Your $79 Wellness Assessment Awaits'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    'Discovery Consultation', 'Wellness Assessment'),
    '$99 Discovery', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    'Book Your Consultation', 'Book Your Wellness Assessment'),
    'credit toward your Hormone Mapping Kit', 'Onboarding labs and programs are priced separately when you enroll'),
    'credit toward treatment', 'Onboarding is priced per visit and per service'),
  sms_text = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    sms_text,
    '$99 Discovery', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
    'credit toward treatment', 'Onboarding is priced per visit and per service'),
  updated_at = now()
WHERE template_key = 'consultation_invite';

-- -----------------------------------------------------------------------------
-- consultation_payment_only (may exist if created in admin; logged from edge)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    'Discovery Consultation', 'Wellness Assessment'),
    '$99 Discovery', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    'credit toward your Hormone Mapping Kit', 'Onboarding labs and programs are priced separately when you enroll'),
    'credit toward treatment', 'Onboarding is priced per visit and per service'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '$99 Discovery', '$79 Wellness Assessment'),
      '$149 Strategy Session', '$79 Wellness Assessment'),
      'Discovery Consultation', 'Wellness Assessment'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key = 'consultation_payment_only';

-- -----------------------------------------------------------------------------
-- welcome
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(
    subject,
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    'Schedule your initial consultation', 'Schedule your Wellness Assessment'),
    'initial consultation', 'Wellness Assessment'),
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470'),
      '$99 Discovery', '$79 Wellness Assessment')
    END,
  updated_at = now()
WHERE template_key = 'welcome';

-- -----------------------------------------------------------------------------
-- welcome_email (optional row; log key from send-welcome-email)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(
    subject,
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    'Schedule your initial consultation', 'Schedule your Wellness Assessment'),
    'initial consultation', 'Wellness Assessment'),
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470'),
      '$99 Discovery', '$79 Wellness Assessment')
    END,
  updated_at = now()
WHERE template_key = 'welcome_email';

-- -----------------------------------------------------------------------------
-- kit_payment — phone + legacy “shipped at-home kit” → in-office LabCorp draw
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  name = REPLACE(name, 'Kit Payment Request', 'Lab Panel Payment Request'),
  subject = REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    'Complete Your Lab Kit Payment', 'Complete Your Lab Panel Payment'),
    'Lab Kit', 'Lab Panel'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    'Your Lab Kit is Ready', 'Your Lab Order Is Ready'),
    'Complete Your Lab Kit Payment', 'Complete Your Lab Panel Payment'),
    'lab kit payment', 'lab panel payment'),
    'lab kit', 'lab panel'),
    'ship your at-home collection kit within 24-48 hours', 'schedule your in-office LabCorp draw; results typically post within 5-7 business days'),
    'we''ll ship your at-home collection kit within 24-48 hours', 'we''ll schedule your in-office LabCorp draw; results typically post within 5-7 business days'),
    'at-home collection kit', 'in-office LabCorp blood draw'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      'lab kit', 'lab panel'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key = 'kit_payment';

-- -----------------------------------------------------------------------------
-- appointment_reminder — phone + correct Evans clinic address
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '1230 Augusta West Parkway, Augusta, GA 30909', '7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key = 'appointment_reminder';

-- -----------------------------------------------------------------------------
-- labs_reviewed, treatment_authorized, intake_reminder — phones + common copy
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(
    subject,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '$99 Discovery', '$79 Wellness Assessment'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key IN ('labs_reviewed', 'treatment_authorized', 'intake_reminder');

-- -----------------------------------------------------------------------------
-- subscription_activation, lab_results_ready, booking_confirmation
-- (rows may only exist in some environments)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  name = REPLACE(REPLACE(name, '$99 Discovery', '$79 Wellness'), '$149 Strategy', '$79 Wellness'),
  subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '$99 Discovery Consultation', '$79 Wellness Assessment'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    'Clinical Strategy Session', 'Wellness Assessment'),
    'Vitality Membership', 'ELEVATED program membership'),
    'Concierge Membership', 'ELEVATED program membership'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '$99 Discovery', '$79 Wellness Assessment'),
      '$149 Strategy Session', '$79 Wellness Assessment'),
      'Discovery Consultation', 'Wellness Assessment'),
      'Vitality Membership', 'ELEVATED program membership'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key IN ('subscription_activation', 'lab_results_ready', 'booking_confirmation');

-- -----------------------------------------------------------------------------
-- rebooking_fee_charged — phones + align $79 rebooking wording to $99 (SOT)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    '$79 rebooking', '$99 rebooking'),
    'rebooking fee: $79', 'rebooking fee: $99'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    '$79 rebooking fee', '$99 rebooking fee'),
    'rebooking fee of $79', 'rebooking fee of $99'),
    'rebooking fee: $79', 'rebooking fee: $99'),
    'Pay $79 rebooking', 'Pay $99 rebooking'),
    '$149 Strategy Session', '$79 Wellness Assessment'),
    'Discovery Consultation', 'Wellness Assessment'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      '$79 rebooking', '$99 rebooking'),
      'rebooking fee: $79', 'rebooking fee: $99'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key = 'rebooking_fee_charged';

-- -----------------------------------------------------------------------------
-- glp1_activation, rx_fax — phone + Vitality/Concierge naming scrub if present
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET
  subject = REPLACE(REPLACE(REPLACE(REPLACE(
    subject,
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  body_html = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    body_html,
    'Vitality Membership', 'ELEVATED GLP-1 program'),
    'Concierge Membership', 'ELEVATED GLP-1 program'),
    'VITALITY MEMBER', 'ELEVATED MEMBER'),
    'CONCIERGE MEMBER', 'ELEVATED MEMBER'),
    '(706) 922-7454', '(706) 760-3470'),
    '(706) 973-3866', '(706) 760-3470'),
    '706-922-7454', '706-760-3470'),
    '706-973-3866', '706-760-3470'),
  sms_text = CASE
    WHEN sms_text IS NULL THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      sms_text,
      'Vitality Membership', 'ELEVATED program'),
      '(706) 922-7454', '(706) 760-3470'),
      '(706) 973-3866', '(706) 760-3470'),
      '706-922-7454', '706-760-3470'),
      '706-973-3866', '706-760-3470')
    END,
  updated_at = now()
WHERE template_key IN ('glp1_activation', 'rx_fax');

-- -----------------------------------------------------------------------------
-- Legacy Vitality-family templates — deactivate (do not delete rows)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET is_active = false, updated_at = now()
WHERE template_key LIKE 'vitality%';

-- -----------------------------------------------------------------------------
-- Legacy ZRT / hormone-mapping kit templates — deactivate (do not delete rows)
-- -----------------------------------------------------------------------------
UPDATE public.email_templates
SET is_active = false, updated_at = now()
WHERE template_key ~* '^(zrt|hormone_mapping)';
