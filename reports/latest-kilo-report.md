# TDP Guided Tour — Target Audit & Fix

**Date:** 2026-06-08 07:50 WIB

---

## Root Cause of Step 5 Wrong Target

`data-tour-target="tour-draft-header"` was on the ENTIRE `<header>` element which wraps BOTH the top row (title + toggle + buttons) AND the bottom row (Bans/Picks/Complete progress bar). This meant Step 4's highlight covered the entire header area including the Bans/Picks/Complete row, making Step 5's narrower toggle highlight appear to be in the wrong position.

**Fix:** Moved `data-tour-target="tour-draft-header"` from `<header>` to the breadcrumb/title `<div>` only.

---

## Full Target Audit

| Step | Tour Config Target | DOM data-tour-target | Element | Status |
|------|-------------------|---------------------|---------|--------|
| 1 | tour-sidebar | tour-sidebar | `<aside>` sidebar | ✅ Correct |
| 2 | tour-new-tournament | tour-new-tournament | `<button>` +NEW | ✅ Correct |
| 3 | tour-add-draft | tour-add-draft | `<button>` +ADD DRAFT | ✅ Correct |
| 4 | tour-draft-header | tour-draft-header | `<div>` breadcrumb/title (FIXED: was entire `<header>`) | ✅ Fixed |
| 5 | tour-side-toggle | tour-side-toggle | `<div>` OUR BLUE/RED toggle group | ✅ Correct |
| 6 | tour-ban-slots | tour-ban-slots | `<div>` Blue side ban section | ✅ Correct |
| 7 | tour-pick-slots | tour-pick-slots | `<div>` Blue side pick section | ✅ Correct |
| 8 | tour-role-lane | tour-role-lane | `<div>` First EXP lane column | ✅ Correct |
| 9 | tour-backup-slots | tour-backup-slots | `<div>` 6 backup circles under EXP | ✅ Correct |
| 10 | tour-coach-notes | tour-coach-notes | `<div>` Coach Notes area | ✅ Correct |
| 11 | tour-save-btn | tour-save-btn | `<button>` Save/Export button | ✅ Correct |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/TeamDraftPlanner.tsx` | Moved `data-tour-target="tour-draft-header"` from `<header>` to breadcrumb/title `<div>` |
| `reports/latest-kilo-report.md` | Updated |
| `reports/archive/tdp-guided-tour-target-audit-20260608-0750.md` | New |

---

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (7.49s) |

---

## Localhost

`http://localhost:3001/`
