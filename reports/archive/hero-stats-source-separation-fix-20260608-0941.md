# Kilo Report — Hero Stats Source Separation Fix

**Timestamp**: 2026-06-08 09:41 WIB
**Task**: URGENT BUGFIX — Separate MPL hero stats from full hero roster

---

## A. Ringkasan Task

Hero Stats page ("Statistik Hero MPL ID") menampilkan 132 hero (full roster) alih-alih hanya 82 hero MPL yang memiliki data pick/ban/winrate/presence nyata. Root cause: endpoint `/api/hero-stats` melakukan merge `heroes_master.json` (132 hero) ke dalam data MPL stats (82 hero), menginflasi jumlah hero di Hero Stats page.

## B. Perubahan yang Dilakukan

1. **server.ts**: Menghapus blok merge `heroes_master.json` dari endpoint `/api/hero-stats` (sebelumnya baris 953-985). Endpoint sekarang hanya mengembalikan 82 hero dari `heroes_stats.json`.
2. **src/App.tsx**: Import `heroes_master.json` dan mengirim `heroesMaster.length` (132) ke LandingPage sebagai `heroesCount`, sehingga home page tetap menampilkan jumlah roster lengkap.
3. **src/components/StatsDashboard.tsx**: Mengubah label dari `TOTAL HERO:` menjadi `HERO TERDATA MPL:` untuk kejelasan.
4. **src/components/StatsDashboard.tsx**: Menambahkan dev-mode assertion yang memperingatkan jika component menerima >100 hero (indikasi regression).

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `server.ts` | Hapus merge heroes_master.json dari `/api/hero-stats` |
| `src/App.tsx` | Import heroes_master, kirim heroesMaster.length ke LandingPage |
| `src/components/StatsDashboard.tsx` | Ubah label + tambah dev assertion |

## D. Verifikasi Hero Source

| Endpoint | Sebelum | Sesudah | Status |
|----------|---------|---------|--------|
| `/api/hero-stats` | 132 hero (82 MPL + 50 roster) | **82 hero (MPL only)** | FIXED |
| `/api/heroes` | 132 hero | **132 hero** | Unchanged |
| Hero Stats page | TOTAL HERO: 132 | **HERO TERDATA MPL: 82** | FIXED |
| Landing page heroes | 132 | **132** | Unchanged |
| TDP roster | 132 | **132** (fallback ke heroesMaster) | Unchanged |

## E. Perubahan UI

- Label di Hero Stats page: `TOTAL HERO: 132` → `HERO TERDATA MPL: 82`
- Tidak ada hero roster-only dengan stats kosong di Hero Stats page
- Home page tetap menampilkan `Heroes: 132`
- TDP tetap menampilkan 132 hero di picker

## F. Validasi Teknis

| Command | Hasil |
|---------|-------|
| `npx tsc --noEmit` | PASS (no errors) |
| `npm run validate:data` | PASS (132 heroes, 72 series, 174 games, 0 errors) |
| `npm run validate:assets` | PASS (132/132 portraits, 111 items, 132 skill folders) |
| `npm run build` | PASS (vite build + esbuild server) |

## G. Localhost Status

- Dev server berjalan di **http://localhost:3001/**
- `/api/hero-stats` mengembalikan **82 hero** (semua dengan data pick/ban/wrangle nyata)
- `/api/heroes` mengembalikan **132 hero** (full roster untuk TDP/Hero Intelligence)

## H. Commit Hash

- Commit: `3952b60`
- Message: `fix: separate MPL hero stats from full hero roster`
- Branch: `master`
- Files changed: 4 (server.ts, StatsDashboard.tsx, latest-kilo-report.md, archive report)

## I. Resource Summary

- Model: mimo-v2.5
- Total tool calls: ~20
- Waktu: ~8 menit

## J. Catatan

- TDP sudah memiliki fallback logic di baris 402-406: jika `heroes.length < 100`, menggunakan `heroesMaster` langsung. Ini berarti setelah fix, TDP otomatis mengambil 132 hero dari heroes_master.json.
- DraftSimulator sudah mengimport `heroesMaster` langsung dan membangun `fullHeroPool` dari sana, enriching dengan stats dari `heroes` prop. Tetap berfungsi dengan benar.
- Dev assertion di StatsDashboard akan memperingatkan di console jika regression terjadi lagi (heroes > 100).
