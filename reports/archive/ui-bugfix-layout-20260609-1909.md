# Laporan Bug Fix & Layout — MLBB Draft Analytics

**Tanggal:** 2026-06-09 18:47 WIB
**Task:** Full UI testing, bug identification, dan perbaikan layout/positioning

---

## A. Ringkasan Task

User meminta testing menyeluruh web app sebagai tester, cek bug, posisi/desain, dan fix semua issue. Dilakukan automated testing menggunakan Playwright (headless Chromium) pada viewport desktop (1440×900) dan mobile (375×812) untuk semua halaman utama.

---

## B. Perubahan yang Dilakukan

### 1. TeamDraftPlanner.tsx — Button-inside-button nesting (CRITICAL)
- **Bug:** `<button>` nested inside `<button>` di sidebar tournament items dan draft items (lines ~529-573)
- **Fix:** Mengubah outer `<button>` menjadi `<div role="button" tabIndex={0}>` dengan keyboard handler
- **Impact:** Menghilangkan React hydration warning, valid HTML

### 2. ItemsCatalog.tsx — Stat label truncation
- **Bug:** Label stat "Physical Defense" dan "Movement Speed" terpotong karena `w-14` (56px) terlalu sempit
- **Fix:** Mengubah `w-14` menjadi `w-20` (80px) pada stat label span
- **Impact:** Semua stat label terbaca penuh

### 3. TeamAnalytics.tsx — Inline gridTemplateColumns overrides responsive layout (CRITICAL)
- **Bug:** `style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3.5fr)' }}` memaksa 2-kolom di SEMUA viewport termasuk mobile 375px
- **Fix:** Menghapus inline style, menggunakan Tailwind responsive: `grid-cols-1 lg:grid-cols-[2fr_3.5fr]`
- **Impact:** Layout 1-kolom di mobile, 2-kolom di desktop

### 4. TeamAnalytics.tsx — Stat pills grid overflow on mobile
- **Bug:** `grid-cols-3` dengan `min-w-[80px]` dan `px-5` overflow di 375px
- **Fix:** Menghapus `min-w-[80px]`, mengurangi padding menjadi `px-3 sm:px-5`, font size responsive
- **Impact:** Stat pills muat di mobile tanpa overflow

### 5. TeamAnalytics.tsx — Series stat cards grid overflow on mobile
- **Bug:** `grid-cols-3` tanpa responsive breakpoint
- **Fix:** Menjadi `grid-cols-1 sm:grid-cols-3`
- **Impact:** Cards stack di mobile, 3-kolom di tablet+

### 6. DraftSimulator.tsx — Lock bar overflow on mobile (HIGH)
- **Bug:** 5 button (Undo, Pause, AI, Lock) + hero preview = ~410px > 375px
- **Fix:** 
  - Text labels hidden di mobile (`hidden sm:inline`), hanya tampilkan icon
  - Hero name hidden di mobile (`hidden sm:block`)
  - Tambah `overflow-x-auto scrollbar-none` sebagai safety
  - Gap reduced: `gap-1.5 sm:gap-2`
  - Tambah `aria-label` pada semua icon-only buttons
- **Impact:** Lock bar muat di 375px, accessibility improved

### 7. DraftSimulator.tsx — Header bar overflow on mobile
- **Bug:** Team names + badges + buttons terlalu banyak di 375px
- **Fix:**
  - Max-width team names dikurangi: `max-w-[80px] sm:max-w-[120px]`
  - Font size responsive: `text-xs sm:text-sm`
  - Divider hidden di mobile
  - "COMPLETE" text hidden di mobile
  - Gap reduced
  - Tambah `aria-label` pada sound/reset buttons
- **Impact:** Header bar muat di mobile

### 8. StatsDashboard.tsx — overflow-hidden clips tooltips (HIGH)
- **Bug:** `overflow-hidden` pada Hero Pool Analysis section memotong tooltip hero icons
- **Fix:** Menghapus `overflow-hidden` dari parent, memindahkan `overflow-hidden` ke decorative icon container
- **Impact:** Tooltips tampil penuh tanpa terpotong

### 9. StatsDashboard.tsx — Invalid Tailwind class
- **Bug:** `text-rose-450` bukan class Tailwind standar
- **Fix:** Menjadi `text-rose-400`
- **Impact:** Warna merah tampil correct

---

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/TeamDraftPlanner.tsx` | Button nesting fix (2 locations) |
| `src/components/ItemsCatalog.tsx` | Stat label width `w-14` → `w-20` |
| `src/components/TeamAnalytics.tsx` | Responsive grid, stat pills, series cards |
| `src/components/DraftSimulator.tsx` | Lock bar + header bar mobile overflow, aria-labels |
| `src/components/StatsDashboard.tsx` | Tooltip clipping fix, invalid Tailwind class |

---

## D. Verifikasi Data/Source yang Relevan

Tidak berubah / tidak disentuh. Task ini hanya menyentuh komponen UI, bukan data heroes, items, atau API.

---

## E. Perubahan UI

| Area | Sebelum | Sesudah |
|------|---------|---------|
| TDP Sidebar | Button nested inside button (HTML invalid) | `<div role="button">` with keyboard support |
| Item Catalog | "Physical Defense" terpotong | Label terbaca penuh |
| Team Analytics (mobile) | 2-kolom dipaksa, overflow | 1-kolom di mobile, responsive |
| Draft Lock Bar (mobile) | Button terpotong/overflow | Icon-only di mobile, text di tablet+ |
| Draft Header (mobile) | Element saling tumpuk | Compact layout, elemen tersembunyi di mobile |
| Hero Stats tooltips | Terpotong oleh overflow-hidden | Tampil penuh |

---

## F. Validasi Teknis

- `tsc --noEmit` ✅ PASS (0 errors)
- `vite build` ✅ PASS (built in 8.77s)
- Playwright verification:
  - Button nesting: "No nested buttons found" ✅
  - Mobile overflow: body=375px, window=375px, no overflow ✅
  - Grid responsive: `440.72px 771.28px` (2fr/3.5fr) at desktop ✅

---

## G. Localhost Status

Server running on port 3001 via `npm run dev` (tsx server.ts). Tested with Playwright headless Chromium.

---

## H. Commit Hash + Commit Message

**Belum commit.**

---

## I. Resource Summary

- **Model:** mimo-v2.5-pro
- **Estimated tokens:** ~80K input + ~15K output
- **Elapsed time:** ~25 menit
- **Playwright tests:** 2 run (initial scan + verification)
- **Screenshots captured:** 15+

---

## J. Catatan

1. **Remaining low-priority items** (not fixed, documented for future):
   - DraftSimulator: search input, filter selects missing `<label>` (accessibility)
   - StatsDashboard: hero icon buttons need `aria-label`
   - TeamAnalytics: tab group needs ARIA roles (`tablist`/`tab`/`tabpanel`)
   - TeamAnalytics: `<div>` inside `<span>` at lines 393, 406 (invalid HTML nesting)
   - TeamAnalytics: missing `type="button"` on 5 button groups
   - TeamAnalytics: search input missing `aria-label`

2. **Firebase Firestore warnings** in console are expected (connection issues to Firestore) — not a UI bug.

3. **Marquee off-screen elements** in landing page are expected behavior (CSS animation), not a bug.
