# Macro Map Planner — Phase 1.1

**Date:** 2026-06-08 09:30 WIB

## Changes from Phase 1
- Map asset: `public/macro-map/mlbb-map.webp` (261KB, found from `aset map.webp`)
- Undo: per-phase stacks (early/mid/late separate)
- Layers: brokenWalls, dangerousGrass, flyingCloud, objectives — all toggleable + persisted
- Cleanup: removed unused heroAssets prop

## Validation
| Check | Status |
|-------|--------|
| validate:data | PASS |
| validate:assets | PASS |
| tsc | PASS |
| build | PASS (10.25s) |

## Localhost
`http://localhost:3001/`
