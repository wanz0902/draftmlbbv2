# TDP Tutorial Completeness & Copy Improvement

**Date:** 2026-06-08 06:26 WIB  
**Task:** Complete TDP onboarding tutorial flow with natural Indonesian copy

---

## A. Old Tutorial Issue

Tutorial sebelumnya hanya 5 step dan copy-nya kaku/robotik:
- Tidak menjelaskan Tournament & Draft sidebar
- Tidak menjelaskan Blue/Red side toggle
- Tidak ada contoh draft yang sudah terisi
- Copy terlalu teknikal: "tidak perlu AI, tidak perlu data MPL"
- Preview visual terlalu sederhana (hanya placeholder kosong)

---

## B. New Tutorial Steps (9 steps)

| # | Title | Content |
|---|-------|---------|
| 1 | Apa itu TDP? | Papan kerja untuk nyusun rencana draft. Human copy, no tech jargon. |
| 2 | Tournament & Draft List | Sidebar: Tournament = folder, Draft = rencana. + NEW, + ADD DRAFT. |
| 3 | Pilih Side Kita | Blue/Red toggle, OURS badge explanation. |
| 4 | Ban Plan | 5 ban slots per side, isi hero yang mau diban. |
| 5 | Pick Plan | 5 pick slots per side, hero utama komposisi. |
| 6 | Role Lane Plan | EXP/JGL/MID/GOLD/ROAM, lane order explanation. |
| 7 | Backup Hero Per Lane | 6 cadangan per lane, kapan dipakai. |
| 8 | Contoh Draft Terisi | Visual draft yang sudah terisi (ban, pick, lane, backup). |
| 9 | Coach Notes & Export | Catatan strategi + tombol Save/Export PNG. |

---

## C. Copywriting Changes

### Before (stiff)
"TDP adalah workspace untuk merancang ban, pick, hero utama per lane, hero cadangan, dan catatan strategi. Ini tool manual — tidak perlu AI, tidak perlu data MPL. Semua diatur sendiri."

### After (natural)
"Team Draft Planner adalah papan kerja untuk nyusun rencana draft sebelum match. Di sini kamu bisa atur ban, susun pick utama, siapin hero cadangan per lane, dan tulis catatan strategi biar draft kamu nggak asal jalan."

### Key copy patterns:
- "Mulai dari bikin tournament dulu, lalu tambahkan draft plan di dalamnya."
- "Kalau hero utama kamu kena ban, backup hero di bawah lane bisa jadi rencana berikutnya."
- "Setelah selesai, tekan Save untuk download gambar draft dan bagikan ke tim."

---

## D. Preview Visual Changes

| Step | Visual |
|------|--------|
| Intro | Blue/Red board mini-preview with empty slots |
| Sidebar | Mini sidebar with Tournament 1, Draft 1, Draft 2, + ADD DRAFT |
| Side Toggle | Blue/Red toggle + OURS badge |
| Ban | 5 ban circles, some filled, some empty |
| Pick | 5 pick circles, some filled, some empty |
| Lane | 5 lane labels (EXP/JGL/MID/GOLD/ROAM) |
| Backup | 1 main slot + 6 backup circles (2 filled, 4 empty) |
| Filled Example | Complete draft preview with ban, pick, lane, backup filled |
| Notes+Export | Notes area with example text + Save button |

---

## E. Files Changed

| File | Perubahan |
|------|-----------|
| `src/components/TdpOnboarding.tsx` | Rewrite total: 9 steps, natural copy, better visuals |
| `reports/latest-kilo-report.md` | Laporan terbaru |
| `reports/archive/tdp-tutorial-complete-20260608-0626.md` | Arsip timestamp |

---

## F. QA Results

| Test | Status |
|------|--------|
| Clear localStorage → tutorial from Step 1 | ✅ |
| Step 1 copy is more natural | ✅ |
| Tutorial includes Tournament/Add Draft | ✅ |
| Tutorial includes Blue/Red side | ✅ |
| Tutorial includes filled ban/pick preview | ✅ |
| Tutorial includes backup hero explanation | ✅ |
| Tutorial includes export explanation | ✅ |
| "Ya, mulai TDP" enters workspace | ✅ |
| Replay tutorial still works | ✅ |
| Export PNG still works | ✅ |
| No console errors | ✅ |

---

## G. Validation Results

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (6.58s) |

---

## H. Commit Hash

```
see below
```

---

## I. Localhost Status

- URL: `http://localhost:5173`
- Status: Dapat dijalankan dengan `npm run dev`

---

## J. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~35K input + ~15K output |
| Elapsed | ~6 minutes |
| Model | mimo-v2.5 |
