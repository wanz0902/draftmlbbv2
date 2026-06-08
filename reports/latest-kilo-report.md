# TDP Guided Tour — Full Audit & Target Refactor

**Date:** 2026-06-08 08:02 WIB

---

## Root Cause Analysis

### Why highlights were wrong:

1. **`tour-pick-slots`** was attached to a `<div>` wrapping the ENTIRE picks section: label + ALL 5 lane columns + ALL backup grids + ALL labels. The pick highlight covered 300px+ tall area instead of just the 5 pick circles.

2. **`tour-role-lane`** (singular) was on a column div wrapping pick circle + badge + backup grid + labels. Too broad.

3. **Spotlight rectangle system** was inherently fragile — large highlight boxes easily wrap wrong containers and look terrible when targets are adjacent.

4. **No numbered markers** — users couldn't tell exactly which element the tour was pointing at.

### Structural fixes:

- Separated pick circles row from lane/badge/backup columns in BoardPanel
- `tour-pick-slots` now wraps ONLY: Picks label + 5 pick circles
- New `tour-role-lanes` wraps ONLY: the 5 lane badges + backup grids row
- `tour-backup-slots` wraps ONLY: 6 backup circles grid

---

## Tour Design Refactor

**Before:** Spotlight rectangle (big cyan border box around target element)

**After:** Numbered marker + tooltip
- Small glowing cyan circle (48px) at target center with pulse animation
- Tooltip positioned near marker with step number badge
- Much more precise and visually clear
- No fragile large rectangle wrapping

---

## Full Target Audit (final)

| Step | Tour Target ID | DOM Element | Status |
|------|---------------|-------------|--------|
| 1 | tour-sidebar | `<aside>` sidebar | ✅ |
| 2 | tour-new-tournament | `<button>` +NEW | ✅ |
| 3 | tour-add-draft | `<button>` +ADD DRAFT | ✅ |
| 4 | tour-draft-header | `<div>` breadcrumb/title | ✅ |
| 5 | tour-side-toggle | `<div>` OUR BLUE/RED toggle | ✅ |
| 6 | tour-ban-slots | `<div>` ban section (label + 5 circles) | ✅ |
| 7 | tour-pick-slots | `<div>` pick circles row ONLY | ✅ Fixed |
| 8 | tour-role-lanes | `<div>` lane badges + backups row | ✅ Fixed |
| 9 | tour-backup-slots | `<div>` 6 backup circles grid | ✅ |
| 10 | tour-coach-notes | `<div>` coach notes area | ✅ |
| 11 | tour-save-btn | `<button>` Save button | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/TdpGuidedTour.tsx` | Full rewrite: numbered markers, simplified copy, stable measurement |
| `src/components/TeamDraftPlanner.tsx` | Separated pick circles from lane columns, renamed role-lane → role-lanes |

---

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (6.60s) |

## Localhost

`http://localhost:3001/`
