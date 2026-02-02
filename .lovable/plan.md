

# Unified Patient Data Model & Easier Delete Access

## The Two Issues You're Experiencing

### Issue 1: Pipeline entries don't show in "All Patients"

Currently:
- **Pending Consults** come from `consultation_bookings` table (leads)
- **All Patients** come from `patients` table (converted leads)

You want: Everyone in the pipeline to also show in "All Patients" - a unified view.

### Issue 2: No visible delete option in the pipeline

The delete button exists but is **hidden in the edit panel**. You have to:
1. Click a consultation to select it
2. Edit panel appears on the right
3. Delete button is at the bottom of that panel

This is not discoverable. You want inline delete buttons visible directly in the list.

---

## What I'll Implement

### 1. Auto-Create Patient Record When Consultation is Paid

When someone pays for a consultation, automatically create a corresponding entry in the `patients` table with status `consultation_pending`. This ensures they appear in "All Patients" immediately.

| Stage | consultation_bookings status | patients onboarding_status |
|-------|------------------------------|---------------------------|
| Paid consultation | `pending` | `consultation_pending` (NEW) |
| Consultation completed | `completed` | `consultation_complete` |
| Converted to treatment | `converted_to_*` | `invited` / `kit_link_sent` / etc. |

### 2. Update PatientDatabase to Include Consultation-Stage Patients

Add `consultation_pending` and `consultation_complete` to the status filters in "All Patients" so they're visible.

### 3. Add Inline Delete/Archive Buttons to Pipeline

Add visible trash/archive icons directly on each row in:
- `ConsultationTracker.tsx` - each consultation row
- `PatientPipeline.tsx` - each pipeline item

No need to open an edit panel to delete.

---

## Technical Implementation

### Step 1: Update ConsultationTracker with Inline Delete

Add trash icon button directly on each consultation row, next to the status badge:

```typescript
// In the consultation row, add:
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="sm"
    className="h-6 w-6 p-0 text-gray-400 hover:text-orange-600"
    onClick={(e) => {
      e.stopPropagation();
      archiveConsultation(consult.id);
    }}
  >
    <Archive className="h-3 w-3" />
  </Button>
  <Button
    variant="ghost"
    size="sm"
    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
    onClick={(e) => {
      e.stopPropagation();
      setConsultationToDelete(consult);
    }}
  >
    <Trash2 className="h-3 w-3" />
  </Button>
</div>
```

### Step 2: Add Delete Icons to PatientPipeline

Same pattern - inline trash/archive icons on each pipeline item row.

### Step 3: Sync Consultations to Patients Table

Modify the consultation creation flow to also create a patient record:

Option A: **Database trigger** - When a row is inserted into `consultation_bookings`, automatically insert a corresponding row into `patients` with `onboarding_status = 'consultation_pending'`

Option B: **Update existing consultations** - Create a one-time sync function to create patient records for existing consultations

I recommend **Option A** (database trigger) for clean ongoing sync.

### Step 4: Update Patient Status Labels

Add new statuses to `PatientDatabase.tsx`:

```typescript
const statusLabels = {
  consultation_pending: { label: "Pending Consult", variant: "outline" },
  consultation_complete: { label: "Consult Complete", variant: "secondary" },
  // ... existing statuses
};
```

---

## Database Migration: Auto-Sync Trigger

```sql
-- Create function to sync consultation to patient
CREATE OR REPLACE FUNCTION sync_consultation_to_patient()
RETURNS TRIGGER AS $$
BEGIN
  -- When consultation is created, create a patient record if not exists
  INSERT INTO public.patients (
    full_name,
    email,
    phone,
    onboarding_status,
    consultation_booking_id,
    created_at
  )
  VALUES (
    COALESCE(NEW.customer_name, 'Unknown'),
    NEW.customer_email,
    NEW.customer_phone,
    'consultation_pending',
    NEW.id,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    consultation_booking_id = NEW.id,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_consultation_created
  AFTER INSERT ON public.consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_consultation_to_patient();
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `ConsultationTracker.tsx` | Add inline Archive/Delete icons on each row |
| `PatientPipeline.tsx` | Add inline Archive/Delete icons on each row |
| `PatientDatabase.tsx` | Add `consultation_pending` status to filters |
| Database | Create trigger to auto-sync consultations to patients table |
| Database | Backfill existing consultations to patients table |

## Expected Outcome

1. New consultations automatically appear in "All Patients" with status "Pending Consult"
2. Archive and Delete icons visible directly on each row - one-click to remove
3. Unified view of all leads and patients in a single "All Patients" list
4. Pipeline still works for visual workflow tracking

