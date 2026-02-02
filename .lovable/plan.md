

## Fix Dropdowns in Patient Pop-out Panel + Position Explanation

### Dropdown Issue - Root Cause

The global `SelectContent` in `select.tsx` correctly uses `z-[9999]`, **but individual components are overriding it** with `z-50`:

- **HormoneAddonSelector.tsx line 172**: `<SelectContent className="bg-background z-50">`
- **HormoneAddonSelector.tsx line 191**: `<SelectContent className="bg-background z-50">`  
- **AlaCartePaymentCard.tsx line 189**: `<SelectContent className="bg-background z-50">`

When Tailwind merges classes, the component's `z-50` comes **after** the global `z-[9999]`, causing it to override. The dropdown renders with z-50, which is the **same level as the slide-over panel** (z-50), so it appears behind or doesn't respond to clicks.

### Solution

Remove `z-50` from all `SelectContent` className props in these components:

| File | Line | Current | Fixed |
|------|------|---------|-------|
| `HormoneAddonSelector.tsx` | 172 | `className="bg-background z-50"` | `className="bg-background"` |
| `HormoneAddonSelector.tsx` | 191 | `className="bg-background z-50"` | `className="bg-background"` |
| `AlaCartePaymentCard.tsx` | 189 | `className="bg-background z-50"` | `className="bg-background"` |

### About the Panel Position

The panel appearing on the **right side of the screen** is intentional - it's a common design pattern called a "slide-over" or "drawer" panel. This keeps the main patient list visible on the left while showing details on the right, allowing quick switching between patients.

If you'd prefer the panel to be:
- **Centered as a modal** - Let me know and I can change that
- **Full screen** - Also possible to implement
- **Left side** - Can adjust if preferred

### Files to Modify

1. `src/components/provider/HormoneAddonSelector.tsx` - Remove z-50 from lines 172 and 191
2. `src/components/provider/AlaCartePaymentCard.tsx` - Remove z-50 from line 189

### Expected Result

After this fix:
- GLP-1 Medication dropdown - Opens and works
- Add Hormone Therapy dropdown - Opens and works
- Select Medication (À La Carte) dropdown - Opens and works
- All other dropdowns in the panel - Continue working

