# TDP Onboarding Replay & Exit Flow Improvement

**Date:** 2026-06-08 06:18 WIB  
**Task:** Improve TDP tutorial replay confirmation, restart notice, and back/exit interaction

---

## A. Ringkasan Task

Perbaikan flow onboarding TDP meliputi:
1. Replay confirmation modal sebelum restart tutorial
2. Restart notice saat tutorial diulang dari step terakhir
3. Exit confirmation saat user klik close/back di tutorial
4. Reminder banner di workspace setelah tutorial selesai
5. Copywriting yang lebih friendly dan jelas

---

## B. Perubahan yang Dilakukan

### Task A — Replay Reminder Banner
- Banner kecil di bawah header: "Butuh panduan? Buka ulang tutorial TDP kapan saja."
- Tombol ✕ untuk dismiss banner
- Hanya muncul setelah tutorial pertama kali diselesaikan
- Dismiss tidak permanen (muncul lagi saat refresh)

### Task B — Replay Confirmation Modal
- Klik tombol `?` (HelpCircle) di header → muncul modal konfirmasi
- Title: "Ulangi Tutorial TDP?"
- Body: "Tutorial akan dimulai dari awal dan menjelaskan ulang Ban, Pick, Role Lane, Backup Hero, Coach Notes, dan Export."
- Buttons: "Batal" / "Ya, mulai dari awal"
- Confirm → buka tutorial dari Step 1
- Cancel → tetap di workspace

### Task C — Exit/Back Confirmation
- Klik "Tutup" (X) di Step 0 → muncul modal konfirmasi
- Title: "Keluar dari tutorial?"
- Body: "Kamu bisa lanjut ke workspace sekarang atau ulang tutorial dari awal kapan saja."
- 3 buttons:
  - "Lanjut ke Workspace" → simpan localStorage, masuk workspace
  - "Mulai Ulang" → restart dari Step 1
  - "Tetap di Tutorial" → tetap di step saat ini
- Klik "Kembali" di step > 0 → navigasi biasa (tidak perlu konfirmasi)

### Task D — Restart Notice
- Saat klik "Ulangi Penjelasan" di step terakhir
- Notice "Tutorial diulang dari awal." muncul di atas progress dots
- Auto-hilang setelah 2 detik
- Step reset ke 0

### Task E — First-Time Flow
- Tidak berubah: tutorial muncul otomatis jika `tdp_tutorial_completed` belum ada
- 5 step slideshow tetap sama
- Final step: "Ya, mulai TDP" / "Ulangi Penjelasan" / "Lewati tutorial"

### Task F — Copywriting
- "Tutorial diulang dari awal." (restart notice)
- "Keluar dari tutorial?" (exit modal)
- "Lanjut ke Workspace" / "Mulai Ulang" / "Tetap di Tutorial"
- "Ulangi Tutorial TDP?" (replay modal)
- "Ya, mulai dari awal" / "Batal"
- "Butuh panduan? Buka ulang tutorial TDP kapan saja." (reminder)
- "Ulangi Penjelasan" (final step button)

### Task G — localStorage
- Key: `tdp_tutorial_completed` (tetap)
- Nilai: `true` saat tutorial diselesaikan
- Tidak ada key tambahan yang diperlukan

---

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/TdpOnboarding.tsx` | Exit confirmation modal, restart notice, better copy |
| `src/components/TeamDraftPlanner.tsx` | Replay confirmation modal, reminder banner |

---

## D. QA Results

| Test | Status |
|------|--------|
| Clear localStorage → open TDP → tutorial from Step 1 | ✅ |
| Finish tutorial → workspace opens | ✅ |
| Refresh TDP → workspace opens (not forced tutorial) | ✅ |
| Click Tutorial/Help → confirmation appears | ✅ |
| Confirm replay → tutorial starts from Step 1 | ✅ |
| Cancel replay → remains in workspace | ✅ |
| During tutorial, click close/back → exit confirmation appears | ✅ |
| "Ulangi Penjelasan" on final step → restarts with notice | ✅ |
| Export image still works | ✅ |
| No console errors | ✅ |

---

## E. Validasi

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (6.69s) |

---

## F. Commit Hash

```
(generated during commit)
```

---

## G. Localhost Status

- URL: `http://localhost:5173`
- Status: Dapat dijalankan dengan `npm run dev`

---

## H. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~25K input + ~10K output |
| Elapsed | ~5 minutes |
| Model | mimo-v2.5 |
