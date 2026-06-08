# TDP Guided Tour — Portal + Fixed Position Fix

**Date:** 2026-06-08 08:12 WIB

---

## Root Cause

The highlight rectangles were offset/wrong because the `position: fixed` overlay was rendered INSIDE the TDP component tree. Ancestor CSS properties (`overflow-hidden`, `backdrop-blur-sm`, `overflow-y-auto`) can create stacking contexts that affect how `fixed` positioning maps to viewport coordinates. The `absolute` children of the `fixed inset-0` parent were NOT getting correct viewport coordinates.

## Fix

### 1. React Portal to document.body
Render the entire tour overlay via `createPortal(overlay, document.body)`. This places the overlay at the top level of the DOM, completely outside the TDP component tree. No ancestor CSS can affect its positioning.

### 2. All fixed positioning
Changed from `position: fixed` parent + `position: absolute` children to **all `position: fixed`**:
- Dim background: `position: fixed; inset: 0`
- Highlight: `position: fixed; top/left/width/height`
- Tooltip: `position: fixed; top/left/width`

All use viewport coordinates directly from `getBoundingClientRect()`.

### 3. Double requestAnimationFrame
After `scrollIntoView`, use double `requestAnimationFrame` to ensure layout is fully settled before measuring:
```
scrollIntoView → rAF → rAF → measure
```

### 4. Tighter targets
- `tour-ban-slots`: now wraps ONLY the circles row (not label + circles)
- `tour-pick-slots`: now wraps ONLY the circles row (not circles + lanes + backups)
- `tour-role-lanes`: wraps only the lane badge
- `tour-backup-slots`: wraps only the 6-circle grid
- All padding reduced to 6-8px

## Files Changed

| File | Change |
|------|--------|
| `src/components/TdpGuidedTour.tsx` | Portal + all fixed positioning + double rAF |
| `src/components/TeamDraftPlanner.tsx` | Tighter target wrapping |

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (6.78s) |

## Localhost

`http://localhost:3001/`
