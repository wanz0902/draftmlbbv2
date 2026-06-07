# Top Navbar & Status Badge Layout Fix

**Date:** 2026-06-08 06:31 WIB  
**Task:** Fix broken/messy top header layout, status badges, spacing

---

## A. Masalah Header Sebelumnya

1. Logo/brand, nav links, dan status badges semuanya terlalu rapat
2. ONLINE / USERS / LIVE ONLY badges overlap dan bertabrakan
3. Spacing antar section tidak seimbang
4. Teks dalam badges cramped dan tidak terbaca
5. LIVE ONLY badge redundant dengan ONLINE badge
6. Nav items dan status badges terlalu berdekatan
7. Tidak ada visual separator antar section

---

## B. Perbaikan Layout Header

### Struktur Baru: 3-Section Layout
```
[LEFT: Brand] — [CENTER: Nav Links] — [RIGHT: Badges | divider | Auth]
```

**Left section:**
- Brand card: Logo ML + "Draft Analyst MLBB" / "MPL ID Control Desk"
- Rounded border, compact, no overlap

**Center section:**
- Nav links: Home, Draft, Heroes (dropdown), Data (dropdown), TDP, Teams, Meta
- Proper `flex-1` center alignment
- Gap: `pl-6 pr-2` separation from logo

**Right section:**
- VisitorStatsBadge (ONLINE + USERS)
- Vertical divider (`h-5 w-px bg-white/[0.08]`)
- Sign In / Auth button
- `gap-3` between elements

---

## C. Perbaikan Badge ONLINE / USERS

### VisitorStatsBadge Changes:
| Aspect | Before | After |
|--------|--------|-------|
| Layout | Flex gap-2 | Flex gap-1.5 |
| Pill shape | `rounded-md px-2 py-1` | `rounded-lg px-2.5 py-1.5` |
| Min width | none | `min-w-[72px] justify-center` |
| Text size | `text-[10px]` | number: `text-[10px]`, label: `text-[9px]` |
| Label visibility | `hidden sm:inline` | same, but more subtle color |
| Overflow | Could collide | Consistent sizing prevents overlap |

### LIVE ONLY Badge:
- **Dihapus dari desktop header** — redundant dengan ONLINE badge
- **Dihapus dari mobile header** — juga redundant

---

## D. Perbaikan Spacing / Alignment

- Header padding: `px-3 py-3` → `px-4 py-2.5 sm:px-6 lg:px-8`
- Gap antar sections: explicit spacing per section
- Vertical alignment: `items-center` on all sections
- Separator: vertical divider antara badges dan auth
- Nav links: tighter padding, smaller text

---

## E. Responsive Behavior

- Desktop XL: full 3-section layout
- Desktop LG: badges + auth visible
- Tablet/SM: nav hidden, mobile menu
- Mobile: hamburger menu, badges in drawer

---

## F. QA Results

| Test | Status |
|------|--------|
| Header clean on Home page | ✅ |
| Header clean on TDP page | ✅ |
| No overlap between nav and badges | ✅ |
| ONLINE / USERS pills readable | ✅ |
| Sign In button aligned | ✅ |
| Routing still works | ✅ |
| No console errors | ✅ |
| Looks good on narrower width | ✅ |

---

## G. Validation Results

| Validasi | Status |
|----------|--------|
| `npm run validate:data` | **PASS** (132 heroes) |
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npx vite build` | **PASS** (6.48s) |

---

## H. Commit Hash

```
see below
```

---

## I. Localhost Status

- URL: `http://localhost:5173`
