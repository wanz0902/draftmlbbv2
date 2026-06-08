# TDP Guided Tour — Scroll Reset Fix

**Date:** 2026-06-08 07:41 WIB

---

## Root Cause

Previous version had `measure()` as a `useCallback` depending on `currentStep`, and `scrollIntoView()` was called inside `measure()`. On scroll:

1. Scroll event → `measure()` → `scrollIntoView()` → triggers new scroll event → `measure()` again
2. The `measuringRef` guard could fail under rapid events
3. More critically: the `useEffect` re-ran when `measure` changed, and the scroll→scrollIntoView→scroll chain could trigger re-renders that caused step state to be read stale or reset

The fundamental problem was **scrollInsideView was called on every scroll event**, creating a feedback loop.

## Fix Strategy

**Separated step state from position state completely:**

| Concern | Handler |
|---------|---------|
| Step change | `useEffect([step])` → `scrollToAndMeasure()` — scrolls target into view + measures |
| Scroll/resize | `useEffect()` with stable `measureOnly()` — reads rect WITHOUT scrollIntoView |
| Step reading | `stepRef.current` — always fresh, never stale |

**Key architectural changes:**

1. **`stepRef`** — ref that always holds current step index. Scroll listener reads from ref, not closure.
2. **`scrollToAndMeasure()`** — called only when step changes. Scrolls target into view, then measures via rAF.
3. **`measureOnly()`** — called on scroll/resize. Only reads `getBoundingClientRect()` and updates highlight/tooltip. NO scrollIntoView.
4. **`didScrollRef`** — prevents the scroll event fired by `scrollIntoView` from triggering `measureOnly()` (avoids double-measure on step change).
5. **Scroll listener does NOT call `scrollIntoView`** — only re-reads rect coordinates.

## What Changed

| Before | After |
|--------|-------|
| `measure` called on scroll (with scrollInsideView) | `measureOnly` called on scroll (NO scrollInsideView) |
| `scrollIntoView` on every scroll event | `scrollIntoView` only on step change |
| `currentStep` from closure (could be stale) | `stepRef.current` (always fresh) |
| `measuringRef` guard (fragile) | `didScrollRef` flag (prevents scroll-after-scrollIntoView) |

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (6.74s) |

## Localhost

`http://localhost:3001/`
