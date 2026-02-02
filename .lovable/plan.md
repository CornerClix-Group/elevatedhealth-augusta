

# Provider Dashboard: Data Flow Clarification & Archive/Delete for Consultations

## Understanding the Current Data Model

Your dashboard has **two separate data sources** that represent different stages of the patient journey:

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT JOURNEY DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   STAGE 1: LEADS (consultation_bookings table)                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Paid $99 consultation                                                     │   │
│   │  • Has credit code                                                           │   │
│   │  • Stored in: consultation_bookings                                          │   │
│   │  • Visible in: "Pending Consult" pipeline, "Consultations" tab               │   │
│   │  • NOT a patient yet - just a lead                                           │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                                 │
│                        "Convert to Patient" button                                   │
│                                    ▼                                                 │
│   STAGE 2: PATIENTS (patients table)                                                │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Created when staff clicks "Convert to Patient"                            │   │
│   │  • Stored in: patients                                                       │   │
│   │  • Visible in: "All Patients" tab, patient database                          │   │
│   │  • Has onboarding_status, membership, etc.                                   │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Why Your Test Entry Doesn't Appear in "All Patients"

**By design**, `consultation_bookings` and `patients` are separate tables:

- **Pending Consults** = Leads who paid for a consultation but haven't been converted yet
- **All Patients** = People who have been formally added to the patient system

This is intentional because:
1. Not all consultations convert to patients (some don't qualify, some don't show up)
2. You need to review and approve each consultation before creating a patient record
3. Different data is tracked at each stage

---

## What I'll Implement

### 1. Archive/Delete Functionality for Consultations

Add the ability to archive or delete consultation bookings that don't work out:

| Action | Behavior |
|--------|----------|
| **Archive** | Marks status as "archived" - hidden from main view, can be restored |
| **Delete** | Permanently removes the record (with confirmation dialog) |
| **Restore** | Brings archived consultations back to view |

### 2. UI Changes to ConsultationTracker

- Add "Archive" button in the edit panel
- Add "Delete" button (with confirmation) in the edit panel
- Add "Show Archived" toggle in the filter bar
- Add "archived" status option with gray styling

### 3. Add Visual Clarification

- Add a small info tooltip explaining "Pending Consults = Leads, All Patients = Converted"
- Make the "Convert to Patient" workflow more prominent

---

## Technical Implementation

### File: `src/components/provider/ConsultationTracker.tsx`

**Changes:**

1. **Add state for archive view toggle:**
```typescript
const [showArchived, setShowArchived] = useState(false);
```

2. **Add archive/delete handlers:**
```typescript
const archiveConsultation = async (id: string) => {
  await supabase
    .from("consultation_bookings")
    .update({ status: "archived" })
    .eq("id", id);
  toast.success("Consultation archived");
  loadConsultations();
};

const deleteConsultation = async (id: string) => {
  // Note: RLS doesn't allow DELETE, so we'll add an RLS policy
  // For now, archive is the primary method
};
```

3. **Update filter logic:**
```typescript
const filteredConsultations = showArchived 
  ? consultations.filter(c => c.status === "archived")
  : filterStatus === "all" 
    ? consultations.filter(c => c.status !== "archived")
    : consultations.filter(c => c.status === filterStatus);
```

4. **Add "Archived" status option and badge:**
```typescript
case "archived":
  return <Badge variant="outline" className="text-gray-500 border-gray-300">Archived</Badge>;
```

5. **Add UI buttons in edit panel:**
- Archive button (orange, with Archive icon)
- Delete button (red, with confirmation dialog)
- Restore button (when viewing archived items)

6. **Add toggle button in filter bar:**
```typescript
<Button
  variant={showArchived ? "default" : "outline"}
  onClick={() => setShowArchived(!showArchived)}
>
  <Archive className="h-4 w-4 mr-2" />
  {showArchived ? "Viewing Archived" : "Show Archived"}
</Button>
```

### Database: Add DELETE RLS Policy

Add an RLS policy to allow staff/admins to delete consultation bookings:

```sql
CREATE POLICY "Staff and admins can delete bookings"
  ON public.consultation_bookings
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'staff'::app_role)
  );
```

---

## Summary

| Task | Description |
|------|-------------|
| 1. Add "archived" status handling | Gray badge, excluded from main view by default |
| 2. Add Archive button | Changes status to "archived" |
| 3. Add Delete button | Permanently removes (with confirmation) |
| 4. Add "Show Archived" toggle | View/restore archived consultations |
| 5. Add Restore button | Changes archived back to "pending" or "nurture" |
| 6. Add DELETE RLS policy | Allow staff to permanently delete |
| 7. Add info tooltip | Explain lead vs patient distinction |

This approach:
- Keeps the existing data model intact (which is correct EHR design)
- Adds the missing ability to clean up consultations that don't work out
- Provides both soft-delete (archive) and hard-delete (permanent) options
- Maintains audit trail for archived items

