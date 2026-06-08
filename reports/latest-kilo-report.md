# Laporan Redesign Hero Detail Page — 2026-06-09

## A. Ringkasan Task
Revisi halaman Hero Detail / Hero Intelligence website MLBB dengan fokus 2 perbaikan utama:
1. Hero Header — buat proper cinematic overview (tidak kosong/aneh)
2. Abilities — video skill interaktif dengan skill tabs yang mengontrol video

## B. Perubahan yang Dilakukan

### 1. Hero Header (HeroFullPage.tsx)
- Tambah **short summary** dari `mechanicNote` (max 200 chars) dengan border-left accent
- Tambah **Power Spike Tags** sebagai badge hijau (dari `powerSpikeTags`)
- Gradient text name dari role color (bukan putih biasa)
- Stat chips: Win Rate, Pick Rate, Ban Rate, Meta Score, Rank
- Regional/race badges dengan icon

### 2. Abilities + Video (HeroFullPage.tsx)
- Video dipindahkan ke **di dalam abilities card** (bukan section terpisah)
- Skill tabs langsung di bawah video — visual connected
- Label overlay: "SKILL NAME — Click tabs below to switch"
- **Video behavior yang benar**:
  - `autoPlay` + `onEnded=pause` (play sekali, berhenti di akhir)
  - Tidak `loop` (berhenti setelah selesai)
  - `muted` selalu (autoplay browser aman)
  - `preload="auto"` untuk loading cepat
  - `key={videoKey}` + `ref={videoRef}` untuk remount control

### 3. Video Control Logic
- `videoRef` + `videoKey` state untuk programmatic control
- `useEffect([selectedSkill, videoKey])` → pause + reset + load + play
- `handleSkillChange()` → set selectedSkill + increment videoKey
- Skill tabs onclick → `handleSkillChange(key)`

### 4. Supporting Changes
- **server.ts**: Tambahan 20 field ke `/api/heroes/:id` response (camelCase aliases)
- **HeroDetailPanel.tsx**: Skill video player di modal (auto-play loop, switches per skill)
- **HeroIntelligenceDashboard.tsx**: Hero card click → langsung buka HeroFullPage
- **types/hero.ts**: Extended DetailedHero interface (+110 lines)
- **App.tsx**: HeroFullPage routing via `heroDetailTarget` state

## C. File yang Diubah
| File | Perubahan |
|------|-----------|
| `src/components/HeroFullPage.tsx` | **NEW** — Full page hero detail (1710 lines) |
| `src/components/HeroDetailPanel.tsx` | +26 lines — skill video player di modal |
| `src/components/HeroIntelligenceDashboard.tsx` | +35 lines — card click → full page |
| `src/App.tsx` | +25 lines — routing HeroFullPage |
| `server.ts` | +21 lines — camelCase field aliases |
| `src/types/hero.ts` | +110 lines — extend DetailedHero type |
| `data/heroes/akai.json` | Updated skillVideos paths |

## D. Data Sources
- Hero data: `/api/heroes/{slug}` → reads `data/heroes/{id}.json`
- Hero portraits: `heroAssets[slug]` → `/raw-assets/aset_hero/{role}/85px-ML_icon_*.png`
- Skill icons: `skills[key].iconUrl` → `/raw-assets/skill_icons/{hero}/{skill}.png`
- Item icons: `/raw-assets/aset_item/Item_{Name}_ML.png`
- Skill videos: `skillVideos[skillKey]` → `/videos/heroes/{heroId}/video-{N}-{M}.mp4`

## E. Fallback Rules
- Video tidak ada → tampilkan hero portrait dengan animated glow overlay
- Skill data tidak ada → "No description available"
- Stats tidak ada → hide field secara rapi
- Meta score/rank 0 → tidak tampilkan chip

## F. Validasi
- `npx tsc --noEmit` → **CLEAN** (0 errors)
- `npm run build` → **SUCCESS**

## G. Behavior Skill Video (Rinci)
1. Default: Passive video play sekali saat halaman dibuka
2. Klik skill tab → video switch + restart dari awal + auto play
3. Klik skill yang sama → restart dari awal + auto play
4. Video selesai → pause (tidak loop)
5. Browser block autoplay → handle gracefully, video tetap visible

## H. Responsive
- Desktop: 2-column layout (60% + 40%), hero header portrait 280px
- Tablet: video adapts, skill selector tetap usable
- Mobile: stacked layout, skill icons 48-56px touch-friendly

## I. Anti-Copy Compliance
- Hero header: full-width banner dengan gradient role-color (bukan card panel)
- Abilities: video di dalam card + vertical selector (bukan horizontal row + accordion)
- Warna: cyan + amber dual-accent (bukan blue/cyan seperti referensi)
- Glass morphism cards dengan role glow
