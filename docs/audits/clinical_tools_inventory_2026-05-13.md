# Clinical tools inventory — codebase audit (2026-05-13)

**Scope:** Read-only inventory of clinical- and provider-facing “tool” surfaces (components and key pages). No code was modified.  
**Search basis:** `src/components/provider/` (74 TSX files), `src/components/patient/`, routed pages (`ClinicalProtocol*`, `EligibilityReviewQueue`, `InventoryDashboard`), grep patterns for Library / Lookup / Queue / Gate / Dashboard / Engine / Generator / Scorecard, and `ProviderDashboard` import wiring.

---

## Executive summary

| Category | Meaning | Approx. count* |
|----------|---------|----------------|
| **1 — Active clinical tools** | Wired into live provider or staff flows; supports diagnosis-adjacent ops, labs, Rx, protocols, triage, or patient safety. | **~42** |
| **2 — Discontinued / ketamine-era** | Legacy service lines (ketamine / SPRAVATO), ZRT-at-home kit narrative, or hormone-mapping kit flows tied to old Réveil-era UX. Flag for Phase 3 cleanup per `.cursorrules`. | **~14** |
| **3 — Dormant / experimental** | Implemented but not imported, replaced by another component, or clearly “build in progress.” | **~8** |
| **4 — Provider / ops tooling** | Scheduling, team, payments, comms, inventory ops—not “clinical decision” tools but used alongside care. | **~18** |

\*Counts overlap slightly (one file can touch legacy + active); numbers are **component/page rows** in the master table below, not deduplicated line items.

**Primary clinical hub:** `src/pages/ProviderDashboard.tsx` embeds most provider-side tools (labs, consults, treatment plans, medications, encounters, etc.). Staff scheduling lives in `OfficeSchedule` / `MyScheduleManager`; inventory FEFO in `InventoryDashboard` + `DispenseFromInventoryModal`.

---

## Master table — tools and clinical surfaces

Legend: **Read** = primary DB reads; **Write** = inserts/updates; **Edge** = Supabase Edge Function.

| Path | Purpose (one line) | Primary users | Wired? | Reads (tables / sources) | Writes | Notes / bugs |
|------|-------------------|---------------|--------|---------------------------|--------|--------------|
| `src/pages/ProviderDashboard.tsx` | Monolithic provider workspace: triage, patient detail, labs, Rx-adjacent cards, consults, plans. | Physician (admin), RN/staff with access | **Yes** | Many via child components (`patients`, `lab_results`, `consultation_bookings`, `symptom_logs`, etc.) | Via children | Very large file; legacy types (e.g. `lab_path` zrt/labcorp) still in interfaces. |
| `src/components/provider/LabAnalysisCard.tsx` | Surfaces lab results for selected patient; opens manual lab entry. | Provider | **Yes** (dashboard) | `lab_results` | — | Opens `NewLabResultModal`. |
| `src/components/provider/NewLabResultModal.tsx` | Manual LabCorp/ZRT lab result entry + Holgate-style analysis panel. | Provider | **Yes** (via LabAnalysisCard) | `lab_results`, `patients` | `lab_results` insert/update | ZRT path still in UI; embeds `HolgateAnalysisPanel`. |
| `src/components/provider/HolgateAnalysisPanel.tsx` | Renders narrative “clinical impression,” findings, med recs from `holgateLogic` / `medicationMapping`. | Provider | **Yes** (inside NewLabResultModal) | Props only (no direct Supabase) | — | Pure presentation; quality depends on upstream parsing. |
| `src/components/provider/LabInterpretationEngine.tsx` | Large manual entry UI for hormone/neuro/metabolic values → Holgate analysis + optional save to `lab_results`. | Provider | **No** | — (would use patient context if mounted) | `lab_results` insert | **Dormant:** no `import` elsewhere in `src/` (grep 2026-05-13). |
| `src/components/provider/LabResultsQueue.tsx` | Queue-style list of patients / lab results for review. | Provider / staff | **Yes** (dashboard tab) | `patients`, `lab_results` | — | |
| `src/components/provider/LabPdfUploader.tsx` | Upload lab PDFs to storage + metadata. | Provider | **Yes** | Storage `lab-documents` | Metadata via upload | |
| `src/components/provider/LabcorpOrderModal.tsx` | Create patient document / order flow for LabCorp paperwork. | Provider | **Yes** | `patient_documents`, `patient-documents` bucket, `patients` | `patient_documents` | |
| `src/components/provider/LabCorpRequisition.tsx` | Printable/emailable LabCorp requisition panels (men’s safety, thyroid, CMP). | Provider | **Yes** (dashboard) | None (static templates) | — | Parent wires `onEmailRequisition`. |
| `src/components/provider/ZRTRequisitionGenerator.tsx` | Printable ZRT saliva kit requisition / panel content. | Provider | **Yes** (dashboard) | None (static templates) | — | **Legacy ZRT / at-home kit** positioning vs current LabCorp-first SOT. |
| `src/components/provider/AILabPanelCard.tsx` | Calls AI to recommend a lab panel for a patient. | Provider | **Yes** (dashboard) | — | — | **Edge:** `recommend-lab-panel` with `patient_id`. |
| `src/components/provider/BloodWorkHistory.tsx` | Timeline of `lab_results` for patient. | Provider | **Yes** | `lab_results` | — | |
| `src/components/provider/HealthReportPreview.tsx` | Preview health report from lab data. | Provider | **Yes** | `lab_results` | — | |
| `src/components/provider/MedicalClearanceCard.tsx` | Clearance / eligibility fields on patient. | Provider | **Yes** | `patients` | `patients` | |
| `src/components/provider/EncounterFormModal.tsx` | Structured encounter with CPT selection; supports **Spravato / IV ketamine** panel groups in UI. | Provider | **Yes** | `cpt_codes` | `encounter_forms` | **Cat 2:** ketamine encounter types still in dropdowns. |
| `src/components/provider/SOAPNotesPanel.tsx` | List SOAP notes for patient. | Provider | **Yes** | `soap_notes` | — | **Cat 2:** `ketamine` label still in badge map. |
| `src/components/provider/SOAPNoteEditor.tsx` | Create/edit SOAP notes + templates. | Provider | **Yes** | `soap_templates`, `soap_notes` | `soap_notes` | Ketamine visit type option present. |
| `src/components/provider/TreatmentPlanPanel.tsx` | CRUD treatment plans per patient. | Provider | **Yes** | `treatment_plans` | `treatment_plans` | Ketamine `service_line` branch in labels. |
| `src/components/provider/MedicationPanel.tsx` | CRUD medications. | Provider | **Yes** | `medications` | `medications` | Ketamine option in visit/service UI. |
| `src/components/provider/PrescriptionPortalModal.tsx` | Order / portal workflow; embeds **FCC formulary lookup**. | Provider | **Yes** | `clinic_settings`, `orders` | `orders` | FCC lookup is static `fccFormulary` lib, not DB. |
| `src/components/provider/FCCFormularyLookup.tsx` | Searchable FCC SKU catalog (clipboard helper). | Provider | **Yes** (inside PrescriptionPortalModal) | `FCC_FORMULARY` (local TS) | — | No Supabase. |
| `src/components/provider/PharmacySelector.tsx` | Pick pharmacy from directory. | Provider | **Yes** | `pharmacies` | — | |
| `src/components/provider/PharmacyOrderCard.tsx` | Display / actions for pharmacy orders (implementation varies). | Provider | **Yes** | (check child) | — | |
| `src/components/provider/CustomPharmacyPreparationPicker.tsx` | Custom prep picker for orders. | Provider | Likely **Yes** in Rx flow | — | — | Narrow file; paired with order flows. |
| `src/components/provider/FaxHistoryLog.tsx` | Fax / order transmission history. | Provider | **Yes** | `orders` | — | |
| `src/components/provider/ConsultationTracker.tsx` | Pipeline for paid consults; staff actions. | Kristen / staff, provider | **Yes** | `consultation_bookings`, `patients` | Both | Comments note ketamine path removed; some statuses still reference legacy. |
| `src/components/provider/PatientPipeline.tsx` | Kanban-style consult pipeline. | Staff / provider | **Yes** | `consultation_bookings`, `patients` | Updates via actions | |
| `src/components/provider/CreditCodeLookup.tsx` | Look up booking by credit / consult code. | Staff | **Yes** | `consultation_bookings` | — | |
| `src/components/provider/LogFreeConsultationModal.tsx` | Log complimentary consult (includes ketamine option in form). | Staff | **Yes** | `consultation_bookings` | insert | **Cat 2:** ketamine service option. |
| `src/components/provider/AppointmentPanel.tsx` | CRUD appointments; ketamine visit types. | Staff / provider | **Yes** | `appointments` | `appointments` | **Cat 2:** ketamine appointment types. |
| `src/components/provider/TodayScheduleWidget.tsx` | Today’s schedule snippet with badges. | Provider / staff | **Yes** | `consultation_bookings` | — | **Cat 2:** ketamine/spravato badge keys. |
| `src/components/provider/MyScheduleManager.tsx` | Caroline’s recurring schedule + blocks. | RN (Caroline) | **Yes** (routed) | `provider_schedules`, `schedule_blocks`, `appointments` | schedules/blocks | |
| `src/components/booking/StaffBookingModal.tsx` | Staff books IV or consult slots for patients. | Kristen / Caroline / staff | **Yes** | (via booking RPCs / tables) | bookings | Critical operational tool. |
| `src/pages/OfficeSchedule.tsx` | Office-wide calendar (Kristen). | Office manager | **Yes** | schedule-related | — | Page-level tool. |
| `src/components/provider/ClinicalProtocolEditor.tsx` | Authoring / versioning clinical protocols (rich editor). | Admin / medical director | **Yes** (`App.tsx` route) | `user_roles`, `clinical_protocols`, `clinical_protocol_versions` | versions | |
| `src/pages/ClinicalProtocolLibrary.tsx` | Browse published protocols by category. | Staff / admin | **Yes** | `clinical_protocols`, `clinical_protocol_versions`, `user_roles` | — | Read-heavy. |
| `src/pages/ClinicalProtocolDetail.tsx` | View/edit single protocol + reviewer workflow. | Admin / MD | **Yes** | `clinical_protocols`, `clinical_protocol_versions` | versions | Uses `clinicalProtocolDecisionFlags` helpers. |
| `src/components/patient/SafetyGate.tsx` | Blocks self-scheduling when intake flags fire; collects callback; opens eligibility queue via edge. | **Patient** (gated) | **Yes** | — | **Edge:** `send-safety-callback-request` → `eligibility_review_requests` | Intentional RLS posture per `.cursorrules`. |
| `src/pages/EligibilityReviewQueue.tsx` | Staff queue for `eligibility_review_requests` triage. | Staff + admin | **Yes** | `eligibility_review_requests`, patients join as needed | status / notes / links | Wired to `StaffBookingModal`. |
| `src/pages/InventoryDashboard.tsx` | SKU/lot overview, FEFO, reorder signals. | Staff / provider | **Yes** | `inventory_skus`, `inventory_lots`, `inventory_dispensations` | via modals | Page-level. |
| `src/components/provider/DispenseFromInventoryModal.tsx` | Record dose / waste / correction on lots. | RN / staff | **Yes** | `inventory_skus`, `inventory_lots`, `patients` | `inventory_lots`, dispensations | |
| `src/components/provider/InventoryAlerts.tsx` | Low-stock / expiry surfacing. | Staff | **Yes** | `inventory_skus`, `inventory_lots` | — | |
| `src/components/provider/KitStatusAdmin.tsx` | Hormone mapping kit / payment linkage admin. | Staff | **Yes** | `hormone_mapping_payments`, `patients` | `patients`, payments | **Cat 2 / 3:** ZRT-era “kit” tracking. |
| `src/components/provider/StaffTasksTab.tsx` | Waivers, consult tasks; **ketamine waiver** bucket. | Staff | **Yes** | `hormone_mapping_payments`, `consultation_bookings`, `patients` | various | **Cat 2:** dedicated ketamine waiver section. |
| `src/components/provider/IntakeSummaryCard.tsx` | Summarizes intake for provider view. | Provider | **Yes** | props / patient | — | |
| `src/components/provider/PatientJourneyTracker.tsx` | Journey milestones for patient. | Provider | **Yes** | mixed | — | |
| `src/components/provider/PatientNotesCard.tsx` | Free-text clinical notes. | Provider | **Yes** | `clinical_notes` | `clinical_notes` | |
| `src/components/provider/PatientStatusCard.tsx` | Status / pipeline card for patient. | Provider | **Yes** | props | — | |
| `src/components/provider/PatientDatabase.tsx` | Searchable patient list + filters (includes ketamine program filter). | Admin / staff | **Yes** | `patients` | archive updates | **Cat 2:** ketamine filter values. |
| `src/components/provider/ConsentPDFCard.tsx` | Consent workflow card; text references Osmind ketamine. | Provider | **Yes** | patient props | — | **Cat 2:** ketamine consent copy. |
| `src/components/provider/InsuranceReimbursementHub.tsx` | Superbill / reimbursement guidance; lists IV ketamine as example line items. | Staff / billing | **Yes** | `patients` | — | **Cat 2:** ketamine line-item examples. |
| `src/components/provider/SuperbillGenerator.tsx` | Build superbills from CPT/ICD picks. | Staff | **Yes** | `cpt_codes`, `icd10_codes`, `clinic_settings` | `superbills` | |
| `src/components/provider/ProviderAssistant.tsx` | **Provider-facing chatbot** → `provider-chat` edge (single message, not multi-turn schema). | Provider / staff | **Yes** (dashboard) | — | — | Response key `data.response` (edge contract). |
| `src/components/provider/ProviderNPIManager.tsx` | Store NPI / signature blobs in `clinic_settings` + storage. | Admin | **Yes** | `clinic_settings`, `provider-signatures` bucket | `clinic_settings`, storage | Ops, not clinical logic. |
| `src/components/provider/ResourceManager.tsx` | Upload/manage patient resource PDFs. | Admin / staff | **Yes** | `patient_resources`, `patient-resources` bucket | insert/delete | |
| `src/components/provider/TeamManagement.tsx` | Roles / team admin. | Admin | **Yes** | user-related | — | |
| `src/components/provider/ManageRolesModal.tsx` | Assign `user_roles`. | Admin | **Yes** | `user_roles` | — | |
| `src/components/provider/InviteProviderModal.tsx` | Invite providers. | Admin | **Yes** | invite flow | — | |
| `src/components/provider/InvitePatientCard.tsx` | Invite patients; sets `service_type` from interests. | Staff | **Yes** | patients edge | patients | |
| `src/components/provider/AddExistingPatientCard.tsx` | Add patient manually; interest list includes ketamine. | Staff | **Yes** | patients | patients | **Cat 2:** ketamine interest option. |
| `src/components/provider/MembershipAssignmentCard.tsx` | Assign / adjust membership fields on patient. | Staff | **Yes** | `patients` | `patients` | |
| `src/components/provider/AlaCartePaymentCard.tsx` | Provider-initiated à la carte Stripe checkouts. | Provider / staff | **Yes** | patient context | — | Edge invokes. |
| `src/components/provider/QuickPaymentModal.tsx` | Quick payments including consult SKUs. | Staff | **Yes** | `patients` | — | Comments reference retired SKUs. |
| `src/components/provider/QuickLogVisitButton.tsx` | Log membership visit. | Staff | **Yes** | — | `membership_visit_log` | |
| `src/components/provider/QuickMessageModal.tsx` | Secure chat thread starter. | Staff | **Yes** | `patients`, `conversations`, `messages` | messages | |
| `src/components/provider/QuickEmailModal.tsx` | Template email + log comms. | Staff | **Yes** | `patients`, `email_templates` | `communication_logs` | |
| `src/components/provider/QuickLabsReviewedModal.tsx` | Mark labs reviewed on patient record. | Provider | **Yes** | `patients` | `patients` | |
| `src/components/provider/CommunicationLog.tsx` | View logged communications. | Staff | **Yes** | `communication_logs` | — | |
| `src/components/provider/DashboardActivityWidget.tsx` | Recent consult / patient activity snapshot. | Provider | **Yes** | `consultation_bookings`, `patients` | — | |
| `src/components/provider/NextActionsWidget.tsx` | Suggested next actions from patient rows. | Provider | **Yes** | `patients` | — | |
| `src/components/provider/DashboardWelcomeState.tsx` | Onboarding shortcuts on dashboard. | Provider | **Yes** | — | — | Mostly presentational. |
| `src/components/provider/ProviderQuickActions.tsx` | Role-gated quick links. | Provider | **Yes** | `user_roles` | — | |
| `src/components/provider/ProviderLayout.tsx` | Shell; loads `user_roles` for nav. | Provider | **Yes** | `user_roles` | — | |
| `src/components/provider/EditPatientProfileModal.tsx` | Edit demographics / PHI fields. | Provider / staff | **Yes** | `patients` | `patients` | |
| `src/components/provider/ResendWelcomeEmailButton.tsx` | Trigger welcome comms. | Staff | **Yes** | edge | — | |
| `src/components/provider/HormoneAddonSelector.tsx` | Hormone add-on checkout helper. | Provider | **Yes** | pricing props | — | Commercial. |
| `src/components/provider/PeptideAddonSelector.tsx` | Peptide add-on checkout helper. | Provider | **Yes** | — | — | |
| `src/components/provider/HairRestorationAddonSelector.tsx` | Hair add-on checkout helper. | Provider | **Yes** | — | — | Feature-flagged storefront elsewhere. |
| `src/components/provider/SexualWellnessAddonSelector.tsx` | Sexual wellness add-on helper. | Provider | **Yes** | — | — | Hidden storefront per rules. |
| `src/components/provider/SupplementPlanCard.tsx` | Supplement plan display tied to Holgate / “Dr. Holgate” protocols. | Provider | **Yes** | props | — | Marketing/protocol naming. |
| `src/components/patient/HealthOverview.tsx` | Patient-facing lab/symptom visualization (replaces older scorecard UX in dashboard). | **Patient** | **Yes** (`PatientDashboard`) | props from parent | — | Parent loads `labResult` / logs. |
| `src/components/patient/BiologicalScorecard.tsx` | Older “Biological Scorecard” UI with ZRT-ish framing. | Patient | **Dormant** | props | — | **No imports** elsewhere in `src/` (orphaned file). |
| `src/components/patient/NeurotransmitterCard.tsx` | ZRT neurotransmitter kit upsell / payment UI. | Patient | **Dormant (commented out)** | would use hooks if enabled | — | `PatientDashboard` / `MentalWellnessPage`: import and JSX block are **commented**; **legacy / ketamine-era**. |
| `src/components/patient/KitTracker.tsx` | Tracks ZRT-style kit shipment states. | Patient | **Yes** (conditional) | props | — | **Cat 2:** ZRT kit narrative. |
| `src/components/patient/OnboardingProgress.tsx` | Onboarding checklist incl. “strategy” language in places. | Patient | **Yes** | props | — | Copy may need SOT alignment (separate task). |
| `src/components/patient/SymptomCheckIn.tsx` | Symptom questionnaire (if routed). | Patient | Routed from app | symptom logs | inserts | Feeds Holgate / dashboard triage. |

---

## Category roll-up (for chatbot prompt design)

### Category 1 — Active clinical tools (reference in provider chatbot)

- **Triage & workspace:** `ProviderDashboard` (parent), `PatientStatusCard`, `PatientPipeline`, `ConsultationTracker`, `NextActionsWidget`, `DashboardActivityWidget`.
- **Labs:** `LabAnalysisCard`, `NewLabResultModal`, `LabResultsQueue`, `LabPdfUploader`, `LabcorpOrderModal`, `LabCorpRequisition`, `BloodWorkHistory`, `HealthReportPreview`, `AILabPanelCard`, `QuickLabsReviewedModal`.
- **Protocols:** `ClinicalProtocolLibrary`, `ClinicalProtocolDetail`, `ClinicalProtocolEditor`.
- **Safety / eligibility:** `SafetyGate` (patient), `EligibilityReviewQueue` (staff).
- **Meds & orders:** `MedicationPanel`, `PrescriptionPortalModal`, `FCCFormularyLookup`, `PharmacySelector`, `PharmacyOrderCard`, `FaxHistoryLog`, `DispenseFromInventoryModal`, `InventoryDashboard`, `InventoryAlerts`.
- **Encounters & documentation:** `EncounterFormModal`, `SOAPNotesPanel`, `SOAPNoteEditor`, `PatientNotesCard`, `TreatmentPlanPanel`, `SuperbillGenerator`.
- **Scheduling:** `MyScheduleManager`, `AppointmentPanel`, `TodayScheduleWidget`, `StaffBookingModal`, `OfficeSchedule` page.
- **Patient-facing clinical UX (portal):** `HealthOverview`, `KitTracker` (until ZRT fully retired), `OnboardingProgress`, `SymptomCheckIn` (if enabled).

### Category 2 — Ketamine / SPRAVATO / ZRT-era (Phase 3 cleanup; do not promote in chatbot)

- **Explicit ketamine / Spravato UI:** `EncounterFormModal` (spravato / IV ketamine panels), `AppointmentPanel`, `TreatmentPlanPanel`, `MedicationPanel`, `SOAPNotesPanel`, `SOAPNoteEditor`, `TodayScheduleWidget`, `PatientDatabase` filters, `LogFreeConsultationModal`, `AddExistingPatientCard`, `StaffTasksTab` (ketamine waivers), `ConsentPDFCard` (Osmind ketamine copy), `InsuranceReimbursementHub` (IV ketamine examples).
- **ZRT / at-home kit flows:** `ZRTRequisitionGenerator`, `KitStatusAdmin`, `KitTracker`, `NeurotransmitterCard` / commented imports, `BiologicalScorecard` (orphaned).

### Category 3 — Dormant / experimental / follow-up

- **`LabInterpretationEngine.tsx`** — Full engine UI + save path; **not mounted anywhere.**
- **`BiologicalScorecard.tsx`** — **No consumer** in repo.
- **`NeurotransmitterCard`** — JSX and import **commented out** on `PatientDashboard`; treat as **inactive** unless re-enabled.

### Category 4 — Provider / ops (keep; describe as “operations” not “clinical engines”)

- `ProviderNPIManager`, `TeamManagement`, `ManageRolesModal`, `InviteProviderModal`, `ResourceManager`, `AlaCartePaymentCard`, `QuickPaymentModal`, `QuickMessageModal`, `QuickEmailModal`, `CommunicationLog`, `CreditCodeLookup`, `MembershipAssignmentCard`, `ProviderAssistant` (meta-tool), `ProviderLayout`, `ProviderQuickActions`, `DashboardWelcomeState`, `InvitePatientCard`, `EditPatientProfileModal`, `ResendWelcomeEmailButton`, `QuickLogVisitButton`, addon selector components (commercial).

---

## Recommendations (for upcoming `provider-chat` prompt update)

1. **Name real tools the assistant may suggest:** `ClinicalProtocolLibrary` / `ClinicalProtocolDetail`, `EligibilityReviewQueue`, `LabResultsQueue` + `NewLabResultModal`, `PrescriptionPortalModal` + FCC lookup, `InventoryDashboard` + dispense modal, `StaffBookingModal`, `MyScheduleManager`, `SuperbillGenerator`, `SOAPNotesPanel`, `TreatmentPlanPanel`, `MedicationPanel`, `EncounterFormModal` (with caveat that ketamine encounter types are legacy), `ProviderDashboard` as the main hub.
2. **Do not** instruct the model to route patients to ketamine, SPRAVATO, ZRT home kits, or “Vitality membership” as active SOT—those strings still exist inside legacy components and **`provider-chat` / `chat` edge prompts** (separate audit recommended).
3. **Flag Phase 3:** Remove ketamine/spravato enums from encounter/appointment/medication UIs; retire `ZRTRequisitionGenerator` or gate behind explicit internal flag; delete or repurpose `LabInterpretationEngine` if unused.
4. **Resolve wiring:** Either **mount** `LabInterpretationEngine` somewhere intentional or **delete** to avoid duplicate lab logic vs `NewLabResultModal` + Holgate.
5. **Patient portal:** Prefer documenting **`HealthOverview`** over **`BiologicalScorecard`** unless the latter is re-wired.

---

*End of audit. Method: static analysis + grep; production behavior may differ if routes are feature-flagged outside this repo.*
