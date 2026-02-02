

## Fix Dropdown Issues and Add Multi-Select Service Interests

### Problem Summary
The "Add New Patient" modal has two issues:
1. **Dropdown not functioning properly**: The Service Interest dropdown inside the modal may have z-index conflicts with the Dialog overlay
2. **Single selection limitation**: Currently only allows one service interest, but you need the ability to select multiple

---

### Solution Overview

#### Phase 1: Fix Dropdown Z-Index Issues
- Add explicit `z-[100]` to `SelectContent` when used inside modal dialogs
- This ensures dropdown menus render above the dialog overlay

#### Phase 2: Convert Service Interest to Multi-Select
- Replace single `Select` with checkbox-based multi-select
- Allow providers to select multiple services (Hormone, Weight Loss, Ketamine, General)
- Display selected services as badges/chips

#### Phase 3: Database Update
- Add `service_interests` column (JSONB array) to `patients` table
- Keep `primary_program` for the main/first interest
- Store all selected interests in `service_interests` array

#### Phase 4: Update Edge Function
- Modify `add-existing-patient` to accept array of service interests
- Store first selection as `primary_program`
- Store full array as `service_interests`

---

### Technical Changes

#### 1. AddExistingPatientCard.tsx
Replace single Select dropdown with multi-select checkboxes:

```text
Before: Single dropdown "Hormone Therapy" 
After:  Checkbox group with all options selectable
        [x] Hormone Therapy
        [x] Weight Loss
        [ ] Ketamine Therapy
        [ ] General
```

State change:
- From: `serviceType: string` 
- To: `serviceInterests: string[]`

#### 2. AddPatientModal.tsx (No changes needed)
Modal container is correct - it embeds the card components which will be fixed

#### 3. InvitePatientCard.tsx
Same multi-select enhancement for consistency across both add patient flows

#### 4. Database Migration
```sql
ALTER TABLE patients 
ADD COLUMN service_interests JSONB DEFAULT '[]'::jsonb;
```

#### 5. Edge Function: add-existing-patient
Accept and process array:
```typescript
service_interests: string[]  // Array of selected services
primary_program: string      // First item from array (for compatibility)
```

---

### UI Component Design

The multi-select will use a clean checkbox grid:

```
Service Interests
+------------------------------------------+
|  [x] Hormone Therapy    [x] Weight Loss  |
|  [ ] Ketamine Therapy   [ ] General      |
+------------------------------------------+
```

Selected items will be stored and displayed as chips below:
```
Selected: Hormone Therapy, Weight Loss
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/provider/AddExistingPatientCard.tsx` | Replace Select with multi-select checkboxes |
| `src/components/provider/InvitePatientCard.tsx` | Same multi-select update for consistency |
| `supabase/functions/add-existing-patient/index.ts` | Accept array, store first as primary_program |
| Database | Add `service_interests` JSONB column |

---

### Verification Checklist
After implementation:
- Test "Service Interest" multi-select works in modal
- Test "Starting Status" dropdown still functions
- Verify selected interests display correctly
- Confirm data saves to database properly
- Test both add patient flows (New Consultation vs Existing Patient)

