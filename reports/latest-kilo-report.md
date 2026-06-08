# Macro Map Planner — Phase 1.1

**Date:** 2026-06-08 09:30 WIB

## Yang Kurang di Phase 1
1. Map asset tidak ada → sekarang ada `public/macro-map/mlbb-map.webp`
2. Undo stack global → sekarang per-phase (early/mid/late terpisah)
3. Layer toggles tidak functional → sekarang toggle persist + render placeholder markers
4. MacroMapPlanner menerima heroAssets prop yang tidak diperlukan → dihapus

## Files Changed
| File | Change |
|------|--------|
| `src/components/MacroMapPlanner.tsx` | Map image support, per-phase undo, layer toggles |
| `src/App.tsx` | Removed heroAssets prop passthrough |
| `public/macro-map/mlbb-map.webp` | Map asset (from `aset map.webp`) |
| `logs/macro-map-progress.log` | Updated with Phase 1.1 entries |
| `reports/latest-kilo-report.md` | Updated |
| `reports/archive/macro-map-planner-phase1-1-20260608-0930.md` | New |

## Map Asset Status
- **Path:** `public/macro-map/mlbb-map.webp`
- **Status:** Found (261KB), loaded via SVG `<image>` element
- **Fallback:** Placeholder grid with message if image fails to load

## Undo Per-Phase
- `undoStacks` is `Record<Phase, MacroPlan[]>` — separate stack per Early/Mid/Late
- Undo in Early only affects Early data
- Undo stack limit: 100 per phase

## Special Layer Toggles
| Layer | Key | Status |
|-------|-----|--------|
| Broken Walls | brokenWalls | ✅ Toggle + placeholder markers |
| Dangerous Grass | dangerousGrass | ✅ Toggle + placeholder zones |
| Flying Cloud | flyingCloud | ✅ Toggle + placeholder text |
| Objectives | objectives | ✅ Toggle + Turtle/Lord markers |

All persist in `plan.settings.layers` via localStorage.

## Validation
| Check | Status |
|-------|--------|
| validate:data | PASS (132 heroes) |
| validate:assets | PASS (132/132) |
| tsc | PASS |
| build | PASS (10.25s) |

## Localhost
`http://localhost:3001/`
