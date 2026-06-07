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
| 1. Apa itu TDP | Lingkaran kosong Blue VS Red | Mini board dengan ban/pick contoh terisi (Fanny, Alice, Baxia, Claude, Arlott, Chip, Phoveus, Valentina) |
| 2. Tournament & Draft | Sidebar minimal | Sidebar dengan Draft 1 (5/20 filled), Draft 2, + ADD DRAFT |
| 3. Pilih Side | Toggle kosong | Toggle "Our Blue" + OURS badge |
| 4. Ban Plan | 5 lingkaran kosong | 5 ban terisi sebagian: Fanny, Chip, Arlott, Zhuxin, Kalea |
| 5. Pick Plan | 5 lingkaran kosong | 5 pick terisi sebagian: Baxia, Claude, Grock |
| 6. Role Lane | 5 lingkaran kosong + label | 5 hero terpetakan ke lane: Phoveus-EXP, Fanny-JGL, Valentina-MID, Claude-GOLD, Baxia-ROAM |
| 7. Backup Hero | 1 lingkaran + 6 kosong | EXP lane: Phoveus main + 6 backup terisi (Terizla, Y.Zhong, Edith, Khaleed, X.Borg, Cici) |
| 8. **BARU** Board Terisi | Tidak ada | Full board preview Blue + Red side, bans + picks + lanes + backups |
| 9. Coach Notes & Export | Area kosong + icon | Notes contoh + full board preview + Download icon + .png label |

---

## 3. Hero Contoh yang Dipakai

- **Blue Bans:** Fanny, Chip, Arlott
- **Blue Picks:** Baxia, Claude, Grock
- **Blue Lanes:** Phoveus (EXP), Fanny (JGL), Valentina (MID), Claude (GOLD), Baxia (ROAM)
- **Blue Backup EXP:** Terizla, Yu Zhong, Edith, Khaleed, X.Borg, Cici
- **Red Bans:** Zhuxin, Kalea, Nolan
- **Red Picks:** Phoveus, Valentina, Fredrinn, Gloo, Novaria
- **Red Lanes:** Gloo (ROAM), Nolan (GOLD), Valentina (MID), Fredrinn (JGL), Phoveus (EXP)

---

## 4. Perubahan Copywriting

### Slide 1
- **Before:** "TDP adalah workspace untuk merancang ban, pick..."
- **After:** "Bayangin ini papan strategi sebelum draft dimulai. Di sini kamu bisa atur ban, susun pick utama, siapin hero cadangan per lane, dan tulis catatan strategi. Kamu bisa bikin plan A, plan B, dan cadangan kalau hero incaran diambil atau diban lawan."

### Slide 7
- **Before:** "Di bawah setiap lane, ada 6 slot hero cadangan."
- **After:** "Setiap lane punya 6 slot hero cadangan. Ini penting banget. Kalau hero utama kamu kena ban, diambil lawan, atau draft berubah total, cadangan ini jadi rencana berikutnya."

### Slide 9 (Coach Notes)
- **Before:** "Tulis catatan strategi..."
- **After:** "Kalau draft plan kamu sudah siap, tekan Save untuk menyimpan hasil board ini sebagai gambar PNG. Hasil download bisa dipakai untuk arsip, diskusi tim, atau dibagikan ke coaching staff."

---

## 5. Perubahan Preview Export

- Slide 9 sekarang menampilkan: Coach Notes contoh → Full board preview → Download icon + .png label
- User bisa langsung melihat gambaran hasil akhir export

---

## 6. QA Result

| Test | Status |
|------|--------|
| Tutorial muncul normal | ✅ |
| Semua step punya contoh visual terisi | ✅ |
| Tidak ada lingkaran kosong doang | ✅ |
| Step final punya contoh export | ✅ |
| Teks tutorial lebih natural | ✅ |
| Next/back jalan | ✅ |
| Replay tutorial jalan | ✅ |
| Tidak ada error console | ✅ |
| Build pass | ✅ |
| Tampilan bagus di desktop | ✅ |

---

## 7. Validation Result

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (6.58s) |

---

## 8. Commit Hash

```
see below
```

---

## 9. Localhost Status

- URL: `http://localhost:5173`

---

## 10. Resource Usage

| Metric | Value |
|--------|-------|
| Tokens | ~30K input + ~12K output |
| Elapsed | ~5 minutes |
| Model | mimo-v2.5 |
