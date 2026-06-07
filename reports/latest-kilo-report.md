# TDP Hero Picker: Full 132 Roster + Role/Lane Filters

**Date:** 2026-06-08 06:52 WIB

---

## 1. Apa yang Salah Sebelumnya

- TDP hero picker menggunakan `/api/hero-stats` yang hanya mengembalikan ~82 heroes (heroes_stats.json subset)
- Tidak ada lane/role filter di hero picker
- User harus scroll manual mencari hero yang tepat untuk lane tertentu

## 2. Old Source / Count

- **Source:** `App.tsx` → `fetch("/api/hero-stats")` → `HERO_STATS_FILE` (heroes_stats.json)
- **Count:** ~82 heroes (hanya hero yang punya MPL match stats)

## 3. New Source / Count

- **Source:** `heroes_master.json` di-import langsung ke TDP sebagai fallback data
- **Fallback logic:** Jika API mengembalikan >= 100 heroes, gunakan API data. Jika kurang, gunakan `heroes_master.json` langsung
- **Count:** 132 heroes (full canonical roster)
- **Lane data:** `HERO_LANE_MAP` dibangun dari `heroes_master.json` → hero_name → lanes[]

## 4. Lane/Role Filters

| Filter | Matching |
|--------|----------|
| All | Semua hero |
| EXP | Heroes dengan lane "EXP" di master data |
| Jungle | Heroes dengan lane "Jungle" atau role "Jungler" |
| Mid | Heroes dengan lane "Mid" atau "Mid Lane" |
| Gold | Heroes dengan lane "Gold" atau "Gold Lane" |
| Roam | Heroes dengan lane "Roam"/"Roamer"/"Support" atau role "Tank"/"Support" |

## 5. Auto-filter Behavior

| Slot Type | Default Filter |
|-----------|----------------|
| Ban slot | All |
| Pick slot (lane) | Lane matching (EXP/Jungle/Mid/Gold/Roam) |
| Backup slot (lane) | Lane matching |

## 6. Files Changed

| File | Perubahan |
|------|-----------|
| `src/components/TeamDraftPlanner.tsx` | Import heroes_master, HERO_LANE_MAP, laneFilter state, filter chips, fallback roster |

## 7. Validation

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npx tsc --noEmit` | **PASS** |
| `npx vite build` | **PASS** (6.97s) |

## 8. Localhost

`http://localhost:3001/`
