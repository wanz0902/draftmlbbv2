# Macro Map Planner — Phase 1 Foundation

**Date:** 2026-06-08 09:00 WIB

---

## 1. Ringkasan

Fitur baru "Macro Map Planner" ditambahkan sebagai halaman baru di project. Phase 1 mencakup:
- Layout: left toolbar + center map canvas + right panel + bottom notes
- Drawing tools: Move, Draw, Arrow, Lasso, Lasso Eraser, Eraser, Coordinate Detector
- Phase planning: Early / Mid / Late dengan data terpisah per phase
- Data model: normalized coordinates (0-1), per-phase storage
- Persistence: localStorage (`macro_map_planner_v1`)
- Export: PNG via html-to-image + JSON
- Navigation: Navbar "Macro" link + App.tsx routing

## 2. Files Changed

| File | Change |
|------|--------|
| `src/components/MacroMapPlanner.tsx` | **BARU** — Full component |
| `src/App.tsx` | Import + route + tabLabels + bypass |
| `src/components/Navbar.tsx` | Map icon import + "Macro" nav item |
| `logs/macro-map-progress.log` | Progress log |
| `reports/latest-kilo-report.md` | Updated |
| `reports/archive/macro-map-planner-phase1-20260608-0900.md` | New |

## 3. Feature Route

- Nav: Macro (Map icon)
- Tab ID: `macro`
- URL: `http://localhost:3001/` → click "Macro" in navbar

## 4. Asset Status

- **Map asset:** TIDAK ADA — menggunakan placeholder grid
- **Expected path:** `public/macro-map/mlbb-map.png`
- **Status:** User perlu menambahkan map image asset sendiri

## 5. Tools Implemented

| Tool | Status | Description |
|------|--------|-------------|
| Move | ✅ | Default tool |
| Draw | ✅ | Freehand line, stored as points array |
| Arrow | ✅ | Click/drag from start to end with arrowhead |
| Lasso Area | ✅ | Polygon/freehand filled zone |
| Lasso Eraser | ✅ | Click zone to remove |
| Eraser | ✅ | Click drawing/arrow/marker to remove |
| Undo | ✅ | 100-step undo stack per plan |
| Clear Phase | ✅ | Clears all objects in current phase |
| Color Toggle | ✅ | Ally (cyan) / Enemy (rose) |
| Coordinate Detector | ✅ | Click map → show normalized % coordinates + copy |

## 6. Phase Planning

| Phase | Status |
|-------|--------|
| Early Game | ✅ Separate drawings/arrows/zones/notes |
| Mid Game | ✅ Separate drawings/arrows/zones/notes |
| Late Game | ✅ Separate drawings/arrows/zones/notes |
| Reset Early | ✅ |
| Reset Mid | ✅ |
| Reset Late | ✅ |

## 7. localStorage Schema

Key: `macro_map_planner_v1`
```json
{
  "version": 1,
  "activePhase": "early",
  "phases": {
    "early": { "drawings": [], "arrows": [], "zones": [], "markers": [], "notes": "" },
    "mid": { ... },
    "late": { ... }
  },
  "settings": { "showTrail": true, "showHpBar": true }
}
```

## 8. Export Status

| Format | Status |
|--------|--------|
| PNG | ✅ via html-to-image, file: `macro-plan-{phase}-{date}.png` |
| JSON | ✅ Full plan export, file: `macro-plan-{date}.json` |

## 9. QA Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Macro nav opens page | ✅ |
| 2 | Map area displays (placeholder grid) | ✅ |
| 3 | Phase tabs Early/Mid/Late work | ✅ |
| 4 | Drawing tool draws line | ✅ |
| 5 | Arrow tool draws arrow | ✅ |
| 6 | Lasso tool creates filled zone | ✅ |
| 7 | Lasso eraser removes zone | ✅ |
| 8 | Eraser removes drawing/arrow | ✅ |
| 9 | Undo works | ✅ |
| 10 | Clear current phase works | ✅ |
| 11 | Coordinate detector shows coordinate | ✅ |
| 12 | Phase switching preserves separate data | ✅ |
| 13 | Notes save per phase | ✅ |
| 14 | localStorage persists after refresh | ✅ |
| 15 | Export PNG works | ✅ |
| 16 | Export JSON works | ✅ |
| 17 | Reset Early/Mid/Late works | ✅ |
| 18 | No console errors | ✅ |
| 19 | Existing TDP/Hero/Data pages still work | ✅ |

## 10. Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (8.30s) |

## 11. Known Limitations

1. **No real map image** — uses placeholder grid
2. **No hero placement on map** — right panel shows role rows but no drag-to-map
3. **No coordinate persistence for special layers** — toggles not yet functional
4. **No undo per-phase only** — undo stack is global
5. **Arrow arrowhead may not scale** with SVG viewBox changes

## 12. Localhost

`http://localhost:3001/`

## 13. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~80K input + ~30K output |
| Elapsed | ~10 minutes |
| Model | mimo-v2.5 |
