# Kilo Report — Hero Card Layout Redesign (v2 — MLBBHub-inspired Direction)

**Timestamp**: 2026-06-08 12:10 WIB
**Task**: Rework hero card design to closely match MLBBHub premium dark esports card direction

---

## A. Ringkasan Task

Rework total desain hero cards pada kedua halaman (Hero Intelligence Database dan Hero Stats) agar mendekati referensi MLBBHub. Perubahan sebelumnya terlalu berbeda dari referensi — card terlalu pendek, nama hero terlalu kecil, clip-path salah, dan hover effects kurang. Rework ini menggunakan referensi CSS yang diekstrak dari MLBBHub: angular clip-path, taller image area (h-56/h-64), larger hero name (text-lg), Win/Pick/Ban stats columns, role-colored hover effects, dan corner accent borders.

## B. Perubahan yang Dilakukan

1. **`src/index.css`**: Menambahkan CSS utilities `.clip-angular`, `.clip-angular-sm`, `.clip-angular-lg` — beveled corner clip-path yang merupakan signature visual MLBBHub.

2. **`src/components/HeroIntelCard.tsx` (rewrite total)**:
   - Card container: `clip-angular` beveled corners, bukan `rounded-xl`
   - Image area: `h-56 md:h-64` (fixed height, bukan `aspect-[3/4]`)
   - Background: gradient `from-[#1a1a2a] to-[#0d1225]` (darker, closer to MLBBHub)
   - Role badges: Square icon boxes (28x28px, 20x20px) top-left, bukan text pills
   - Lane badges: Small square boxes below role badges
   - Tier badge: Gradient square (8x8) dengan glow shadow, bukan text pill
   - Hero name: `text-lg` bold display font (18px), bukan `text-[12px]`
   - Specialty subtitle: `text-[11px]` di bawah nama
   - Stats row: Win/Difficulty columns + Win Rate bar (bukan inline text)
   - View Intel CTA: Role-colored dengan arrow
   - Hover: `-translate-y-2`, role-colored radial glow, corner accent borders, bottom glow line
   - Grid: `grid-cols-2 sm:3 lg:4 xl:5` (responsive 2-5 columns)

3. **`src/components/HeroCard.tsx` (rewrite total)**:
   - Sama seperti HeroIntelCard tapi menggunakan `HeroStats` data
   - Win/Pick/Ban stats columns dengan labels
   - Selected state: amber border + bottom glow line

4. **`src/components/HeroIntelligenceDashboard.tsx`**:
   - Grid: `sm:3 lg:4 xl:5` (sama seperti MLBBHub: 2/3/4/5)

## C. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/index.css` | Added `.clip-angular*` CSS utilities |
| `src/components/HeroIntelCard.tsx` | Rewrite total — MLBBHub-inspired design |
| `src/components/HeroCard.tsx` | Rewrite total — MLBBHub-inspired design |
| `src/components/HeroIntelligenceDashboard.tsx` | Grid columns update |

## D. Verifikasi Data/Source yang Relevan

Tidak berubah / tidak disentuh.
- Hero data: `/api/heroes` dan `/api/hero-stats` (sama)
- Hero images: `getHeroImageUrl()` dari `heroUtils.ts` (sama)
- Tier data: hanya ditampilkan jika ada, tidak ada fake data
- Click behavior: tetap sama (card → HeroDetailPanel overlay)

## E. Perubahan UI (Sebelum → Sesudah v2)

| Area | v1 (sebelumnya) | v2 (sekarang, MLBBHub direction) |
|------|---------|---------|
| Clip path | `rounded-xl` | `clip-angular` (beveled corners) |
| Card height | `aspect-[3/4]` (fixed ratio) | `h-56 md:h-64` (fixed height, fills grid) |
| Background | `bg-[#0a0f1a]` | `linear-gradient(180deg, #1a1a2a, #0d1225)` |
| Hero name | `text-[12px]` | `text-lg` (18px, bold display font) |
| Role badges | Text pills, `text-[7px]` | Square boxes (28x28, 20x20) with role color |
| Tier badge | Text pill amber | Gradient square (S=gold, A=bronze, B=blue) with glow |
| Stats | Inline: `{wr}% {p}P {b}B` | Columns: Win / Pick / Ban with labels + bar |
| Hover lift | `-translate-y-1` (4px) | `-translate-y-2` (8px) |
| Hover glow | Border color change only | Radial role-colored glow + corner accents + bottom glow line |
| Grid | 2/3/4/5 columns | 2/3/4/5 columns (MLBBHub responsive pattern) |

## F. Validasi Teknis

| Command | Hasil |
|---------|-------|
| `npm run lint` (tsc --noEmit) | PASS (no errors) |
| `npm run build` (vite build + esbuild) | PASS |

## G. Localhost Status

- Dev server berjalan di **http://localhost:3001/**
- Hero Intelligence Database page dapat di-inspect

## H. Commit Hash

Belum di-commit — menunggu approval user.

## I. Resource Summary

- Model: mimo-v2.5
- Total tool calls: ~12
- Waktu: ~10 menit
- Token usage: estimation only

## J. Catatan

- **Mengapa perubahan v1 tidak terlihat**: User melihat halaman Hero Intelligence Database, bukan Hero Stats. `HeroCard.tsx` hanya diintegrasikan ke `StatsDashboard.tsx`. Perubahan v1 pada `HeroIntelCard.tsx` sudah benar targetnya, tapi desainnya masih terlalu berbeda dari referensi MLBBHub.
- **Perubahan v2**: Rework total berdasarkan analisis CSS dari MLBBHub — clip-angular, taller cards, larger names, Win/Pick/Ban columns, role-colored hover effects, corner accents, bottom glow line.
- **Original design**: Menggunakan pola visual yang terinspirasi MLBBHub (clip-path, gradients, hover patterns) dengan warna dan spacing sendiri. Bukan pixel-perfect copy.
- Click behavior tetap sama: card click → HeroDetailPanel overlay.
- Tidak ada perubahan pada data values, API, DB, scraper, AI, atau draft engine.
