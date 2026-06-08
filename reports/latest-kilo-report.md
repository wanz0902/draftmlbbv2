# TDP Guided Tour — Rectangle Spotlight Fix

**Date:** 2026-06-08 08:05 WIB

---

## What Was Wrong Before

- Previous version used circular cyan markers (48px circles with pulse animation)
- Circle markers didn't wrap target elements, looked ugly, and didn't clearly indicate which UI element was being explained
- Markers positioned at element center, not around the element

## Fix Applied

Replaced circle markers with **target-sized rectangular spotlight**:
- Reads `getBoundingClientRect()` from actual DOM element
- Adds per-step padding (8px for buttons, 10-12px for medium, 14px for large)
- Renders as fixed-position rectangle with cyan border + glow
- Rectangle wraps the exact element + padding

### Highlight Calculation
```
rect = element.getBoundingClientRect()
pad = cfg.padding (8-14px depending on target)
hl.top = rect.top - pad
hl.left = rect.left - pad
hl.width = rect.width + pad * 2
hl.height = rect.height + pad * 2
```

### Per-Step Padding

| Step | Target | Padding |
|------|--------|---------|
| 1 | Sidebar | 14px |
| 2 | +NEW button | 8px |
| 3 | +ADD DRAFT | 8px |
| 4 | Draft header | 10px |
| 5 | Side toggle | 8px |
| 6 | Ban row | 12px |
| 7 | Pick row | 12px |
| 8 | Role lanes | 10px |
| 9 | Backup slots | 10px |
| 10 | Coach notes | 12px |
| 11 | Save button | 8px |

## Files Changed

| File | Change |
|------|--------|
| `src/components/TdpGuidedTour.tsx` | Replaced circle markers with rectangular spotlight, added per-step padding |
| `reports/latest-kilo-report.md` | Updated |
| `reports/archive/tdp-guided-tour-rectangle-spotlight-fix-20260608-0805.md` | New |

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (7.04s) |

## Localhost

`http://localhost:3001/`
