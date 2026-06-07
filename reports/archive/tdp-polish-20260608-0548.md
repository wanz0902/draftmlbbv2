# TDP Polish Report — Slot Sizing + Hero Validation + Used State

**Date:** 2026-06-08 05:48 WIB  
**Task:** Team Draft Planner (TDP) UI polish — slot enlargement, hero verification, used-hero visual state

---

## A. Ringkasan Task

Perbaikan lanjutan Team Draft Planner (TDP) meliputi:
1. Pembesaran ukuran circle slot (ban/pick/backup) agar lebih proporsional
2. Verifikasi hero list TDP menggunakan full roster 132 hero
3. Visual state "used but still selectable" untuk hero yang sudah dipilih
4. Penulisan laporan mandatory ke file markdown

---

## B. Perubahan yang Dilakukan

### 1. Pembesaran Slot Lingkaran

| Komponen | Sebelum | Sesudah |
|----------|---------|---------|
| CircleSlot (outer) | h-16 w-16 (64px) | h-[72px] w-[72px] (72px) |
| CircleSlot (inner image) | h-12 w-12 (48px) | h-14 w-14 (56px) |
| MiniSlot (outer) | h-9 w-9 (36px) | h-10 w-10 (40px) |
| MiniSlot (inner image) | h-7 w-7 (28px) | h-8 w-8 (32px) |
| MiniSlot (clear button) | h-3 w-3 (12px) | h-3.5 w-3.5 (14px) |

### 2. Hero Count Display
- Menambahkan label `{heroes.length} heroes` di header hero picker modal
- User dapat melihat jumlah hero yang tersedia saat membuka picker

### 3. Used-Hero Visual State
- Hero yang sudah dipakai ditampilkan dengan **opacity 45%**
- Border hero card menjadi lebih tipis (`border-white/[0.04]`)
- Badge "USED" kecil di pojok kanan atas
- Hover effect menaikkan opacity ke 70%
- Hero **tetap bisa diklik** dan dipilih ulang

---

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/TeamDraftPlanner.tsx` | Pembesaran slot, hero count display, used-hero state |
| `AGENTS.md` | Menambahkan mandatory report workflow |

---

## D. Verifikasi Hero Source

| Parameter | Hasil |
|-----------|-------|
| Source file | `src/data/heroes_master.json` |
| API endpoint | `/api/hero-stats` (server.ts:907) |
| Jumlah hero master | **132** |
| Hero portraits | **132/132** present |
| Skill icon folders | **132/132** present |
| Duplikat | Tidak ada |
| Missing | Tidak ada |

**Kesimpulan:** TDP menggunakan full roster 132 hero dari canonical source project.

---

## E. Perubahan UI

### Slot/Lingkaran
- Ban slots: 56px → 72px (28% lebih besar)
- Pick slots: 56px → 72px (28% lebih besar)
- Backup slots: 32px → 40px (25% lebih besar)
- Semua slot tetap menggunakan circular dashed border saat kosong
- Spacing antar elemen tetap rapi

### Selected Hero State
- Opacity 45% untuk hero yang sudah dipakai
- Badge "USED" di pojok kanan atas
- Border lebih tipis untuk hero yang sudah dipakai
- Hover: opacity naik ke 70%
- Tetap clickable/selectable

---

## F. Validasi Teknis

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (0 errors, 132 heroes) |
| `npm run validate:assets` | **PASS** (0 errors, 132/132 portraits) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (9.29s) |

---

## G. Localhost Status

- Development server: `http://localhost:5173`
- Status: Dapat dijalankan dengan `npm run dev`
- TDP dapat diakses dari navbar tab "TDP"

---

## H. Commit Hash + Commit Message

```
b563d18 fix: enlarge TDP slots, show all 132 heroes, add used-but-selectable visual state
```

---

## I. Best Effort Resource Summary

| Metric | Value |
|--------|-------|
| Estimated Tokens Used | ~25K input + ~8K output |
| Elapsed Time | ~4 minutes |
| Model | mimo-v2.5 |
| Reasoning Level | Medium |

---

## J. Catatan

1. **Export/PNG:** Fungsi export menggunakan `html-to-image` tetap berfungsi setelah perubahan ukuran slot
2. **Layout:** Struktur utama TDP tidak berubah — sidebar, header, Blue/Red panels, bans/picks/lanes/coach notes tetap sama
3. **Data:** TDP menggunakan data hero dari `/api/hero-stats` yang dibaca dari `src/data/heroes_master.json` (132 hero)
4. **Warning:** Build menghasilkan chunk size warning (>500KB) — ini pre-existing dan bukan dari perubahan TDP
