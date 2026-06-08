# Laporan Sinkronisasi mlbb.tools V2

## A. Ringkasan Task
Re-scrape data hero dari mlbb.tools untuk 132 hero dengan semua section yang sebelumnya kurang. Termasuk: base stats, power curve (fix dari SVG), combos, skill level priority, connections, synergy dengan % aktual, region/race, difficulty label, dan matchup explanation text.

## B. Perubahan yang Dilakukan
- Update `scripts/sync-mlbb-tools.ts` dengan parser untuk semua section baru
- Re-scrape 132 hero dari mlbb.tools menggunakan Playwright
- Fix power curve: parse nilai TEXT dari SVG (38/62/88) bukan kalkulasi path
- Tambah combos (2 per hero: LANING, TEAMFIGHT)
- Tambah skill level priority (19 hero yang punya section ini)
- Tambah connections dengan relationship type
- Fix synergy: 5 hero dengan % aktual dari web
- Tambah base stats, difficulty label, region, race
- Tambah power curve: dominantPhase, spikeLevels, coreItems, description
- Tambah matchup explanation text

## C. File yang Diubah
- 132 file `data/heroes/*.json` — updated dengan semua field baru
- `scripts/sync-mlbb-tools.ts` — script scraper V2
- `reports/sync-mlbb-tools-report.md` — laporan sync

## D. Verifikasi Data/Source
- Sumber: https://mlbb.tools/heroes/{slug} (132 halaman)
- 132 hero diproses, 0 gagal total
- 131 hero sukses penuh
- 1 hero partial: Marcel (powerCurve tidak tersedia di mlbb.tools)

## E. Perubahan UI
Tidak ada perubahan UI.

## F. Validasi Teknis
- `npm run validate:data` → **PASS** (132 heroes, 0 errors)
- `npm run validate:assets` → **PASS** (132/132 portraits, 132/132 skill icons)
- `npx tsc --noEmit` → **CLEAN** (0 errors)
- `npm run build` → **SUCCESS** (vite + esbuild, 8.65s)

## G. Localhost Status
Tidak running.

## H. Commit Hash + Commit Message
- **Commit:** `34c6852`
- **Message:** `feat: complete hero data sync from mlbb.tools (combos, skill priority, connections, power curve fix)`

## I. Resource Summary
- Model: mimo-v2.5
- Estimated tokens: ~80K input, ~30K output
- Elapsed time: ~25 menit (132 hero × 12 detik wait + 2 detik rate limit)

## J. Catatan
- **skillLevelPriority** hanya tersedia untuk 19/132 hero (section tidak ada di mlbb.tools untuk hero lain)
- **Marcel** missing powerCurve karena hero baru di mlbb.tools
- **videoUrl** dan **skillVideos** tetap null — user perlu upload manual
- Script tersedia untuk re-run: `npx tsx scripts/sync-mlbb-tools.ts --full`
