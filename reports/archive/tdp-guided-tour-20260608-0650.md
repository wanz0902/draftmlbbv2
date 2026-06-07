# TDP 2-Layer Tutorial: Intro + Interface Guided Tour

**Date:** 2026-06-08 06:50 WIB  
**Task:** Rework TDP tutorial into Intro + Interface Guided Tour with real hero images

---

## 1. Apa yang Salah Sebelumnya

- Tutorial hanya slideshow dengan lingkaran kosong
- Tidak ada guided tour overlay di atas interface TDP asli
- User tidak ditunjukkan langsung elemen interface
- Kilo selalu report localhost:5173, padahal project jalan di port 3001

---

## 2. New 2-Part Tutorial Flow

### Part A — Intro Tutorial
Short onboarding + mini board preview dengan hero images nyata (FallbackImage + getHeroImageUrl)

### Part B — Interface Guided Tour
Interactive overlay di atas workspace TDP asli dengan 11 highlight/callout steps

---

## 3. Guided Tour Target Sections

| # | Target | Title |
|---|--------|-------|
| 1 | tour-sidebar | Sidebar & Draft Plans |
| 2 | tour-new-tournament | Tambah Tournament |
| 3 | tour-add-draft | Tambah Draft |
| 4 | tour-draft-header | Draft Header |
| 5 | tour-side-toggle | Side Toggle |
| 6 | tour-ban-slots | Ban Slots |
| 7 | tour-pick-slots | Pick Slots |
| 8 | tour-role-lane | Role Lane |
| 9 | tour-backup-slots | Backup Hero |
| 10 | tour-coach-notes | Coach Notes |
| 11 | tour-save-btn | Save / Export |

---

## 4. Hero Preview Source

- Source: `/api/hero-stats` → `src/data/heroes_master.json` (132 heroes)
- URL: `getHeroImageUrl(name, heroAssets)`
- Sample: Fanny, Chip, Arlott, Claude, Baxia, Phoveus, Valentina, Fredrinn, Yu Zhong, Terizla

---

## 5. localStorage Keys

| Key | Purpose |
|-----|---------|
| `tdp_tutorial_completed` | Intro selesai |
| `tdp_guided_tour_completed` | Guided tour selesai |

---

## 6. Localhost

- URL: **`http://localhost:3001/`**
- `npm run dev` → Express + Vite middleware on port 3001

---

## 7. QA Results

All 14 tests PASS.

---

## 8. Validation

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** |
| `npm run validate:assets` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx vite build` | **PASS** (6.93s) |
