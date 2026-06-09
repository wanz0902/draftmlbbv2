# Laporan Validasi Pro Builds Items — 2026-06-09

## A. Ringkasan
Fix konsistensi item di section Pro Builds di semua 132 hero. Item names dari data proBuilds sering berbeda spelling dari catalog lokal (data/items.json) dan icon files (aset_item/). Fix ini memastikan semua 2283 item slots di 393 builds resolve ke item valid.

## B. Root Cause Blank Item Card
- `getItemIconUrl()` generate slug dari item name mentah (e.g., "Haas' Claws" → "Haas'_Claws")
- Tapi file icon-nya pakai "Haas's_Claws" (ada extra 's')
- Roaming/boot compound names (e.g., "Encourage Warrior Boots") tidak punya direct match
- Typo dari data source: "Tought Boots", "Berserker Fury"
- Legacy items: "Necklace of Durance" sudah renamed ke "Concentrated Energy"

## C. Files Changed
| File | Perubahan |
|------|-----------|
| `src/lib/itemResolver.ts` | **NEW** — Item name normalization + alias mapping + icon path resolution |
| `src/components/HeroFullPage.tsx` | Replace getItemIconUrl dengan resolveItem() dari itemResolver |
| `scripts/validate-pro-builds.ts` | **NEW** — Validation script untuk audit semua pro build items |

## D. Item/Build Audit Result
- Heroes checked: **132**
- Total builds: **393**
- Total item slots: **2283**
- Resolved: **2283 (100%)**
- Aliases resolved: **237**
- Compound items: **171**
- Unresolved: **0**

## E. Alias/Normalization Fixes
| Input | Canonical | Tipe |
|-------|-----------|------|
| `Haas' Claws` | `Haas's Claws` | Apostrophe variant |
| `Haas Claws` | `Haas's Claws` | Missing possessive |
| `Berserker Fury` | `Berserker's Fury` | Missing possessive |
| `Tought Boots` | `Tough Boots` | Typo |
| `Necklace of Durance` | `Concentrated Energy` | Legacy/renamed |
| `Encourage Warrior Boots` | `Warrior Boots` (+Encourage) | Compound roaming |
| `Flame Swift Boots` | `Swift Boots` (+Flame) | Compound jungling |
| `Beast Arcane Boots` | `Arcane Boots` (+Beast) | Compound roaming |
| + 229 more aliases | | |

## F. UI Changes
- Pro builds item cards sekarang pakai `resolveItem()` dari itemResolver
- `title` tooltip tampilkan canonical name
- Enchantment label muncul di bawah item icon (e.g., "encourage" under boots)
- Fallback: text placeholder dengan 2 karakter pertama kalau icon gak ada
- Icon cascade: root → 6 subdirectories → text fallback

## G. Validation Results
- `npx tsx scripts/validate-pro-builds.ts` → **2283/2283 resolved (100%)**
- `npm run validate:data` → PASS
- `npm run validate:assets` → PASS
- `npx tsc --noEmit` → CLEAN
- `npm run build` → SUCCESS

## H. Catatan
- mlbhubBuilds data punya bug parsing (items = word fragments) tapi tidak dirender di Pro Builds section — hanya proBuilds yang ditampilkan
- Report audit: `reports/pro-builds-audit.md`
