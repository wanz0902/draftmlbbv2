# TDP Hero Picker: Full 132 Roster + Role/Lane Filters

**Date:** 2026-06-08 06:52 WIB

---

## 1. Old Source/Count
- Source: `/api/hero-stats` → heroes_stats.json
- Count: ~82 heroes

## 2. New Source/Count
- Source: heroes_master.json (imported directly) + API fallback
- Count: 132 heroes

## 3. Filters Added
- All / EXP / Jungle / Mid / Gold / Roam
- Auto-selects matching filter based on slot type

## 4. Validation
| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx vite build` | **PASS** (6.97s) |

## 5. Localhost
`http://localhost:3001/`
