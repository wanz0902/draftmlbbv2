# TDP Onboarding Tutorial + Board Contrast Improvement

**Date:** 2026-06-08 06:06 WIB  
**Task:** Add interactive TDP onboarding tutorial + improve board contrast/readability

---

## A. Ringkasan Task

Menambahkan tutorial interaktif onboarding untuk TDP serta meningkatkan kontras/readability board TDP.

---

## B. Perubahan yang Dilakukan

### Task A — Onboarding Tutorial

1. **File baru:** `src/components/TdpOnboarding.tsx`
   - 5-step interactive slideshow
   - Step 1: Apa itu TDP (workspace overview + visual Blue VS Red)
   - Step 2: Ban & Pick Plan (5 bans + 5 picks visual)
   - Step 3: Role Lane Plan (EXP/JGL/MID/GOLD/ROAM visual)
   - Step 4: Backup Hero Plan (6 cadangan per lane visual)
   - Step 5: Coach Notes & Export
   - Final step: "Ya, mulai TDP" / "Ulangi" / "Lewati tutorial"
   - Progress dots indicator
   - Premium dark esports design

2. **Integrasi ke TeamDraftPlanner.tsx:**
   - Import `TdpOnboarding` + `isTdpTutorialCompleted`
   - State `showTutorial` gated by localStorage
   - Render `TdpOnboarding` overlay when `showTutorial=true`
   - Replay button (HelpCircle icon) di header workspace

3. **localStorage key:** `tdp_tutorial_completed`
   - Disimpan `true` saat user klik "Ya, mulai TDP" atau "Lewati tutorial"
   - Dipastikan tutorial muncul lagi jika localStorage di-clear

### Task B — Board Contrast Improvement

| Komponen | Sebelum | Sesudah |
|----------|---------|---------|
| Page bg | `#060b16` | `#0a0f1c` |
| Sidebar bg | `#070c18` | `#0c1222` |
| Sidebar border | `white/[0.06]` | `white/[0.08]` |
| Header bg | `#080e1a/80` | `#0e1525/90` |
| Header border | `white/[0.06]` | `white/[0.08]` |
| Panel bg | (none) | `#0e1525/60` |
| Panel border | `white/[0.04-0.10]` | `white/[0.08-0.15]` |
| Empty slot border | `white/[0.06-0.08]` | `white/[0.10-0.12]` |
| Empty slot bg | `white/[0.01-0.02]` | `white/[0.02]` |
| Section labels | `slate-500` | `slate-400` |
| Coach notes bg | `white/[0.02]` | `white/[0.04]` |
| Coach notes border | `white/[0.06]` | `white/[0.08]` |
| Coach notes placeholder | `slate-700` | `slate-600` |
| Ring color (filled) | `white/[0.03]` | `white/[0.04]` |
| Coach notes area bg | `#070c18/80` | `#0c1222/90` |

---

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/TdpOnboarding.tsx` | **BARU** — komponen tutorial 5-step |
| `src/components/TeamDraftPlanner.tsx` | Integrasi tutorial + contrast improvement |
| `reports/latest-kilo-report.md` | Laporan terbaru |
| `reports/archive/tdp-onboarding-20260608-0606.md` | Arsip timestamp |

---

## D. Cara Tutorial Bekerja

1. User buka TDP route dari navbar
2. Cek localStorage key `tdp_tutorial_completed`
3. Jika belum ada/null → tampilkan tutorial overlay
4. Jika sudah ada `true` → langsung masuk workspace
5. Tutorial menampilkan 5 step slideshow interaktif
6. Step navigation: "Selanjutnya" / "Kembali"
7. Step terakhir: "Ya, mulai TDP" / "Ulangi" / "Lewati tutorial"
8. Klik "Ya, mulai TDP" → simpan ke localStorage, masuk workspace
9. Klik "Lewati tutorial" → simpan ke localStorage, masuk workspace
10. Klik "Ulangi" → restart dari Step 1

---

## E. Cara User Ulang Tutorial

- Tombol `?` (HelpCircle) di header workspace
- Klik → `setShowTutorial(true)` → tutorial muncul lagi
- Tidak menghapus localStorage, jadi tutorial tetap muncul di kunjungan berikutnya

---

## F. Background/Contrast yang Diperbaiki

- Page background sedikit lebih terang
- Sidebar lebih terpisah dari background
- Panel Blue/Red punya bg sendiri + border lebih kuat
- Empty slots lebih visible (dashed border lebih tebal)
- Labels lebih terbaca (slate-400 vs slate-500)
- Coach notes lebih readable
- Tetap dark premium, tidak bright

---

## G. Status Export Image

- Export PNG menggunakan `html-to-image` **tetap berfungsi**
- Tidak ada perubahan pada fungsi `handleExportPng()`
- Background export: `#0a0f1c` (updated)

---

## H. Validasi

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npm run validate:assets` | **PASS** (132/132) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (8.29s) |

---

## I. Commit Hash

```
(generated during commit)
```

---

## J. Localhost Status

- URL: `http://localhost:5173`
- Status: Dapat dijalankan dengan `npm run dev`

---

## K. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~40K input + ~15K output |
| Elapsed | ~8 minutes |
| Model | mimo-v2.5 |
