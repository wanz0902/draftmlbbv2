# TDP 2-Layer Tutorial: Intro + Interface Guided Tour

**Date:** 2026-06-08 06:50 WIB  
**Task:** Rework TDP tutorial into Intro + Interface Guided Tour with real hero images

---

## 1. Apa yang Salah Sebelumnya

- Tutorial hanya slideshow dengan lingkaran kosong, tidak menampilkan hero image
- Tidak ada guided tour overlay di atas interface TDP yang sebenarnya
- User tidak ditunjukkan langsung: ini sidebar, ini ban slot, ini backup hero
- Copywriting masih kurang natural
- Kilo selalu report localhost:5173, padahal project jalan di port 3001

---

## 2. New 2-Part Tutorial Flow

### Part A — Intro Tutorial (`TdpOnboarding.tsx`)
- **Short, natural onboarding** menjelaskan apa itu TDP
- Copy: "Papan strategi untuk nyusun rencana draft sebelum match."
- **Mini board preview dengan hero images nyata** dari 132 hero roster
- Menggunakan `FallbackImage` + `getHeroImageUrl` (sama seperti TDP picker)
- Hero sample: Fanny, Chip, Arlott, Claude, Baxia, Phoveus, Valentina, Fredrinn, Yu Zhong, Terizla
- Feature badges: 5 Ban per Side, 5 Pick per Side, 6 Backup per Lane, Export PNG
- Buttons: "Mulai Tur Interface" / "Lewati dan Masuk TDP"

### Part B — Interface Guided Tour (`TdpGuidedTour.tsx`)
- **Interactive overlay di atas workspace TDP asli**
- Highlight/callout style: dim background, glow border pada target, tooltip dengan penjelasan
- 11 steps dengan target nyata:

| # | Target | Title |
|---|--------|-------|
| 1 | `tour-sidebar` | Sidebar & Draft Plans |
| 2 | `tour-new-tournament` | Tambah Tournament |
| 3 | `tour-add-draft` | Tambah Draft |
| 4 | `tour-draft-header` | Draft Header |
| 5 | `tour-side-toggle` | Side Toggle |
| 6 | `tour-ban-slots` | Ban Slots |
| 7 | `tour-pick-slots` | Pick Slots |
| 8 | `tour-role-lane` | Role Lane |
| 9 | `tour-backup-slots` | Backup Hero |
| 10 | `tour-coach-notes` | Coach Notes |
| 11 | `tour-save-btn` | Save / Export |

- Buttons: Kembali / Selanjutnya / Lewati / Selesai
- Auto-detect element position, scroll/resize aware

---

## 3. Files Changed

| File | Perubahan |
|------|-----------|
| `src/components/TdpOnboarding.tsx` | Rewrite: short intro + real hero images + feature badges |
| `src/components/TdpGuidedTour.tsx` | **BARU**: interactive overlay guided tour |
| `src/components/TeamDraftPlanner.tsx` | Integration: 2 tutorial flow, data-tour-target attrs, replay modal |
| `reports/latest-kilo-report.md` | Laporan terbaru |
| `reports/archive/tdp-guided-tour-20260608-0650.md` | Arsip timestamp |

---

## 4. Hero Preview Source

- Source: `/api/hero-stats` → `src/data/heroes_master.json` (132 heroes)
- URL: `getHeroImageUrl(name, heroAssets)` dari `src/lib/heroUtils.ts`
- Fallback: `FallbackImage` component (initials jika image gagal load)
- Sample heroes: Fanny, Chip, Arlott, Claude, Baxia, Phoveus, Valentina, Fredrinn, Yu Zhong, Terizla

---

## 5. localStorage Keys

| Key | Purpose |
|-----|---------|
| `tdp_tutorial_completed` | Intro tutorial selesai |
| `tdp_guided_tour_completed` | Guided tour selesai |

Flow:
1. First time → Intro Tutorial → "Mulai Tur Interface" → Guided Tour → Workspace
2. Skip intro → workspace langsung (guided tour belum selesai)
3. Returning user → workspace langsung + "Buka Tutorial" reminder
4. Click Tutorial → modal: "Ulangi Intro" / "Tur Interface" / "Batal"

---

## 6. Localhost Status

- `npm run dev` → Express server dengan Vite middleware
- Port: **3001** (dari `server.ts` line 61: `const PORT = Number(process.env.PORT || 3001)`)
- URL: **`http://localhost:3001/`**
- Tidak ada separate Vite dev server di 5173

---

## 7. QA Results

| Test | Status |
|------|--------|
| Clear localStorage → intro tutorial appears | ✅ |
| Intro has natural copy | ✅ |
| Intro shows real hero images | ✅ |
| Click "Mulai Tur Interface" → guided tour starts | ✅ |
| Real TDP visible behind guided tour | ✅ |
| Each step highlights correct UI section | ✅ |
| Back/Next works | ✅ |
| Skip works | ✅ |
| Finish enters workspace | ✅ |
| "Buka Tutorial" button works | ✅ |
| Replay options: Ulangi Intro / Tur Interface / Batal | ✅ |
| Save/export PNG still works | ✅ |
| No console errors | ✅ |

---

## 8. Validation Results

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npm run validate:assets` | **PASS** (132/132) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (6.93s) |

---

## 9. Commit Hash

```
see below
```

---

## 10. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~45K input + ~18K output |
| Elapsed | ~10 minutes |
| Model | mimo-v2.5 |
