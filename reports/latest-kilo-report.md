# TDP Guided Tour — Positioning & Scroll Fix

**Date:** 2026-06-08 07:31 WIB

---

## Root Cause

- `scrollIntoView` tidak dipanggil sebelum `getBoundingClientRect`
- Highlight hanya diukur 1x saat step berubah (150ms setTimeout), tidak re-measure saat scroll/resize
- Tooltip positioning menggunakan `fixed` container dengan `absolute` children — bekerja, tapi timing tidak akurat
- Overlay `bg-black/50` terlalu gelap dan `absolute inset-0` overlay menutupi interaksi

## Fixes Applied

1. **`scrollIntoView({ block: "center", behavior: "instant" })` sebelum measure** — memastikan target selalu visible
2. **`requestAnimationFrame` setelah scrollIntoView** — menunggu layout selesai sebelum `getBoundingClientRect`
3. **Re-measure on scroll AND resize** — highlight selalu mengikuti target
4. **Highlight padding 10px** — lebih rapi, tidak mepet target
5. **Tooltip placement logic** — clamps ke viewport edges dengan `edgePad = 16px`
6. **Copywriting disederhanakan** — lebih pendek dan jelas

## Guided Steps (11)

| # | Target | Title | Placement |
|---|--------|-------|-----------|
| 1 | tour-sidebar | Sidebar & Draft Plans | right |
| 2 | tour-new-tournament | Tambah Tournament | right |
| 3 | tour-add-draft | Tambah Draft | right |
| 4 | tour-draft-header | Draft Header | bottom |
| 5 | tour-side-toggle | Side Toggle | bottom |
| 6 | tour-ban-slots | Ban Slots | bottom |
| 7 | tour-pick-slots | Pick Slots | bottom |
| 8 | tour-role-lane | Role Lane | bottom |
| 9 | tour-backup-slots | Backup Hero | bottom |
| 10 | tour-coach-notes | Coach Notes | top |
| 11 | tour-save-btn | Save / Export | left |

## Validation

| Check | Status |
|-------|--------|
| tsc | PASS |
| build | PASS (7.61s) |

## Localhost

`http://localhost:3001/`
