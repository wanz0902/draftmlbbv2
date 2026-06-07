# TDP Tutorial Preview Polish — Filled Examples + Export Mock

**Date:** 2026-06-08 06:36 WIB  
**Task:** Improve TDP tutorial with filled example previews and natural copywriting

---

## 1. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/TdpOnboarding.tsx` | Full rewrite: semua preview terisi, export mock, copywriting natural |

---

## 2. Slide yang Diperbaiki

| Slide | Before | After |
|-------|--------|-------|
| 1. Apa itu TDP | Lingkaran kosong Blue VS Red | Mini board dengan ban/pick contoh terisi |
| 2. Tournament & Draft | Sidebar minimal | Sidebar dengan Draft 1 (5/20 filled) |
| 3. Pilih Side | Toggle kosong | Toggle "Our Blue" + OURS badge |
| 4. Ban Plan | 5 lingkaran kosong | 5 ban terisi sebagian |
| 5. Pick Plan | 5 lingkaran kosong | 5 pick terisi sebagian |
| 6. Role Lane | 5 lingkaran kosong + label | 5 hero terpetakan ke lane |
| 7. Backup Hero | 1 lingkaran + 6 kosong | EXP lane: Phoveus main + 6 backup terisi |
| 8. **BARU** Board Terisi | Tidak ada | Full board preview Blue + Red |
| 9. Coach Notes & Export | Area kosong + icon | Notes + full board + Download icon + .png |

---

## 3. Hero Contoh yang Dipakai

- **Blue Bans:** Fanny, Chip, Arlott
- **Blue Picks:** Baxia, Claude, Grock
- **Blue Lanes:** Phoveus-EXP, Fanny-JGL, Valentina-MID, Claude-GOLD, Baxia-ROAM
- **Blue Backup EXP:** Terizla, Yu Zhong, Edith, Khaleed, X.Borg, Cici
- **Red Bans:** Zhuxin, Kalea, Nolan
- **Red Lanes:** Gloo-ROAM, Nolan-GOLD, Valentina-MID, Fredrinn-JGL, Phoveus-EXP

---

## 4. Perubahan Copywriting

Human-friendly, coach-like Indonesian. No tech jargon. No "tidak perlu AI/MPL".

---

## 5. Perubahan Preview Export

Slide 9: Coach Notes contoh → Full board preview → Download icon + .png label

---

## 6. QA Result

| Test | Status |
|------|--------|
| Tutorial muncul normal | ✅ |
| Semua step ada contoh visual terisi | ✅ |
| Tidak ada lingkaran kosong doang | ✅ |
| Step final ada contoh export | ✅ |
| Teks lebih natural | ✅ |
| Next/back jalan | ✅ |
| Replay jalan | ✅ |
| No errors | ✅ |
| Build pass | ✅ |

---

## 7. Validation Result

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx vite build` | **PASS** (6.58s) |

---

## 8. Commit Hash

```
see below
```

---

## 9. Localhost Status

- URL: `http://localhost:5173`
