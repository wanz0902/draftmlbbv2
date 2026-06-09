# Hero Data Full Audit Report
**Generated:** 2026-06-09 14:02:43
**Hero files scanned:** 132

---

## 1. Summary Counts

| Field | Present | Missing | Coverage |
|-------|---------|---------|----------|
| Skill Videos (key exists) | 132 | 0 | 100.0% |
| Skill Videos (all URLs null) | 131 | 1 | 99.2% |
| Skill Videos (any URL populated) | 1 | 131 | 0.8% |
| Items | 131 | 1 | 99.2% |
| Pro Builds | 131 | 1 | 99.2% |
| Combos | 132 | 0 | 100.0% |
| Skills (all 4 slots) | 132 | 0 | 100.0% |
| Hero Image | 132 | 0 | 100.0% |
| Base Stats | 132 | 0 | 100.0% |
| Matchup System | 132 | 0 | 100.0% |

---

## 2. Skill Videos - Deep Analysis

All 132 heroes have a `skillVideos` object, but **every single URL is `null`**.

This means the `skillVideos` field is a **placeholder skeleton** - the key exists but contains no actual video data.

**Per-skill null breakdown:**

| Skill Slot | Null Count | Hero Count |
|-----------|------------|------------|
| passive | 131 | 132 |
| skill1 | 131 | 132 |
| skill2 | 131 | 132 |
| ultimate | 131 | 132 |

**Heroes with at least one populated skill video URL:** 
- Akai

---

## 3. Missing Items (1 heroes)

- Marcel

---

## 4. Missing Combos (0 heroes)

None - all heroes have combo data.

---

## 5. Missing Pro Builds (1 heroes)

- Marcel

---

## 6. Missing Skills Detail (0 heroes)

None - all heroes have complete skill data (passive, skill1, skill2, ultimate).

---

## 7. Missing Base Stats (0 heroes)

None - all heroes have base stats.

---

## 8. Missing Matchup System (0 heroes)

None - all heroes have matchup system data.

---

## 9. Missing Hero Image (0 heroes)

None - all heroes have image data (via heroImage, image, or skill icon URLs).

---

## 10. Items Catalog (data/items.json)

- **Total items:** 106
- **Missing name:** 0
- **Missing gold:** 0
- **Missing stats:** 15
- **Missing category:** 0
- **Missing slug:** 0
- **Missing buildFrom:** 0
- **Missing abilities:** 0

**Items missing stats array:**
- Power Potion
- Rock Potion
- Magic Potion
- Bloody Retribution
- Flame Retribution
- Ice Retribution
- Conceal
- Dire Hit
- Encourage
- Favor
- Allow Throw
- Broken Heart
- Demon Boots
- Magic Boots
- Throw Forbidden

---

## 11. itemResolver.ts Analysis

The item resolver at `src/lib/itemResolver.ts` implements a 5-layer resolution strategy:

1. **Explicit aliases** - handles apostrophe variants (Haas' Claws), typos (Tought Boots), legacy items (Necklace of Durance -> Concentrated Energy), and common shorthand.
2. **Direct catalog match** - case-insensitive lookup against items.json.
3. **Compound roaming/boot resolution** - strips enchantment prefixes (Encourage, Conceal, Flame, etc.) from boot names.
4. **Fuzzy match** - strips all punctuation and compares normalized strings.
5. **Fallback** - returns original name with generated icon paths, marking `isResolved: false`.

**Assessment:** The resolution logic is sound and comprehensive. Edge cases handled include curly quotes, NFKD normalization, boot/enchantment compounds. The `ENCHANTMENT_PREFIXES` list covers beast, encourage, conceal, dire hit, favor, flame, ice, bloody, smite, brave smite. Future roaming boots may need updates to this list.

**Potential issue:** The `resolveCompoundName` function has a two-pass approach (prefix-first and suffix-first). The suffix-first pass has a subtle bug: if `normalized === boot` (e.g. just "tough boots"), it skips because `normalized !== boot` is false, so it won't match the prefix. But this is correct behavior - plain boot names should resolve via the direct catalog match in step 2.

---

## 12. server.ts - /api/heroes Endpoint Analysis

The `/api/heroes` endpoint (line 822) calls `getStructuredHeroes()` which:

1. Reads all heroes from SQLite DB (`heroes` table).
2. Merges with individual JSON files from `data/heroes/{slug}.json`.
3. Cross-references `heroes_stats.json` for pick/ban/win rates.
4. Filters out rejected heroes from `rejected_heroes.json`.
5. Maps fields including: `skill_videos`, `pro_builds`, `combos`, `matchup_system`, `base_stats`, `connections`, `community_builds`, etc.

**Key observations:**
- `skill_videos` is mapped from `fileHero?.skillVideos || null` (line 805). Since all 132 heroes have `skillVideos` with null URLs, the API will return `skill_videos: { passive: null, skill1: null, skill2: null, ultimate: null }` for every hero.
- Items in the API response are hardcoded as `[]` (line 762) - items are only served via `/api/items`, not embedded per-hero in the structured endpoint.
- Pro builds come from `fileHero?.proBuilds || []` (line 797).
- Combos come from `fileHero?.combos || []` (line 798).
- Base stats use a fallback chain: DB stats -> fileHero.baseStats -> hardcoded defaults.

**Data flow concern:** The `/api/heroes` endpoint reads from SQLite DB first (`db.prepare("SELECT * FROM heroes")`), then overlays file data. If a hero exists in the DB but not as a JSON file (or vice versa), the merge logic handles it. However, the DB `skills` column is parsed from JSON string, and placeholder detection (`isPlaceholderSkills`) checks for generic names like "Passive", "Skill 1" etc.

---

## 13. Critical Findings

### CRITICAL: Skill Videos are Empty Placeholders
While all 132 heroes technically have the `skillVideos` key, **every URL value is `null`**. This means:
- The skill video feature is **non-functional** - no actual video content is available.
- 100% of heroes need their skill video URLs populated.
- The field appears to have been scaffolded during data generation but never filled.

### MINOR: Marcel Missing Items and Pro Builds
The hero "Marcel" is missing both `items` and `proBuilds` data. This is the only hero with these gaps.

### MINOR: Items Catalog Gaps
- 0 items (0.0%) missing gold cost value.
- 15 items (14.2%) missing stats array.
- 0 items (0.0%) missing abilities/passive.

### INFO: Item Resolution is Solid
The `itemResolver.ts` handles the vast majority of naming variations correctly. The 5-layer approach with explicit aliases, catalog match, compound resolution, fuzzy match, and fallback is well-designed.

---

## 14. Recommendations

1. **Populate skill video URLs** - All 132 heroes need their `skillVideos.passive`, `skillVideos.skill1`, `skillVideos.skill2`, and `skillVideos.ultimate` populated with actual video URLs.
2. **Add Marcel pro builds and items** - The only hero missing build data.
3. **Fill items catalog gaps** - Add gold values and stats for the ~12-15 items missing them.
4. **Consider embedding recommended items per hero** - Currently the API returns `items: []` for every hero. If the frontend needs per-hero item recommendations, this data should be populated.