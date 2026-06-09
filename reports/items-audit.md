# Items Audit Report

**Date:** 2026-06-09  
**File:** `data/items.json` (3824 lines)

---

## A. Total Items in Catalog

**106 items** total.

### Category Distribution

| Category  | Count |
|-----------|-------|
| Attack    | 33    |
| Magic     | 28    |
| Defense   | 25    |
| Movement  | 8     |
| Roaming   | 4     |
| Jungling  | 3     |
| Unknown   | 5     |

### Source Distribution

| Source      | Count |
|-------------|-------|
| liquipedia  | 101   |
| mlbbhub     | 5     |

---

## B. Items With Empty `stats` (field present but `[]`)

**15 items** have empty `stats` arrays:

| Item                | Category | Notes |
|---------------------|----------|-------|
| Power Potion        | Attack   | Consumable — stats via ability only |
| Rock Potion         | Defense  | Consumable — stats via ability only |
| Magic Potion        | Magic    | Consumable — stats via ability only |
| Bloody Retribution  | Jungling | Enchantment — no passive stats |
| Flame Retribution   | Jungling | Enchantment — no passive stats |
| Ice Retribution     | Jungling | Enchantment — no passive stats |
| Conceal             | Roaming  | Enchantment — no passive stats |
| Dire Hit            | Roaming  | Enchantment — no passive stats |
| Encourage           | Roaming  | Enchantment — no passive stats |
| Favor               | Roaming  | Enchantment — no passive stats |
| Allow Throw         | Unknown  | **mlbbhub item — likely invalid/placeholder** |
| Broken Heart        | Unknown  | **mlbbhub item — likely invalid/placeholder** |
| Demon Boots         | Unknown  | **mlbbhub duplicate of "Demon Shoes"** |
| Magic Boots         | Unknown  | **mlbbhub duplicate of "Magic Shoes"** |
| Throw Forbidden     | Unknown  | **mlbbhub item — likely invalid/placeholder** |

**Assessment:** Potions, enchantments, and retribution items having empty stats is expected by design. The 5 mlbbhub "Unknown" category items are problematic (see Section H).

---

## C. Items With Missing/Empty `abilities`

No items are missing the `abilities` field entirely — all 106 have the field present.

**43 items** have `abilities: []` (empty array). These are all **base components** and **boots** with no passive/active abilities:

### Attack Components (14)
Dagger, Expert Gloves, Fury Hammer, Iron Hunting Bow, Javelin, Knife, Legion Sword, Magic Blade, Malefic Gun, Ogre Tomahawk, Regular Spear, Rogue Meteor, Swift Crossbow, Vampire Mallet

### Defense Components (10)
Ares Belt, Dreadnaught Armor, Healing Necklace, Hero's Ring, Leather Jerkin, Magic Resist Cloak, Molten Essence, Silence Robe, Steel Legplates, Vitality Crystal

### Magic Components (10)
Azure Blade, Book of Sages, Flower of Hope, Lantern of Hope, Magic Necklace, Magic Wand, Mystery Codex, Mystic Container, Power Crystal, Tome of Evil

### Movement (4)
Arcane Boots, Magic Shoes, Swift Boots, Boots

### Unknown/mlbbhub (4)
Allow Throw, Broken Heart, Demon Boots, Magic Boots, Throw Forbidden

**Assessment:** Empty abilities on basic components is expected. The 5 Unknown/mlbbhub items also lack abilities, reinforcing they are likely invalid entries.

---

## D. Items With Missing `slug`

**0 items** — all 106 entries have a `slug` field.

---

## E. Duplicate / Suspect Entries

### Name: "Demon Boots" (category: Unknown, source: mlbbhub)
- Slug: `demon-boots`, gold: 0, stats: `[]`, abilities: `[]`
- **Appears to be a duplicate of "Demon Shoes"** (category: Movement, slug: `demon-shoes`, gold: 720, stats: `[+40 Movement Speed, +30 Mana Regen]`)
- No heroes reference "Demon Boots" in builds; they use "Demon Shoes" directly.

### Name: "Magic Boots" (category: Unknown, source: mlbbhub)
- Slug: `magic-boots`, gold: 0, stats: `[]`, abilities: `[]`
- **Appears to be a duplicate of "Magic Shoes"** (category: Movement, slug: `magic-shoes`, gold: 710, stats: `[+40 Movement Speed, +10% Cooldown Reduction]`)
- No heroes reference "Magic Boots" in builds.

### Other Invalid mlbbhub Entries
- **Allow Throw** — slug: `allow-throw`, Unknown category, empty stats/abilities
- **Broken Heart** — slug: `broken-heart`, Unknown category, empty stats/abilities
- **Throw Forbidden** — slug: `throw-forbidden`, Unknown category, empty stats/abilities

These 5 items (all from `mlbbhub` source, `Unknown` category) are **invalid/placeholder entries** that should be removed or corrected.

---

## F. Hero `items` Array Cross-Reference

### Overview
- **131 hero JSON files** in `data/heroes/`
- **131 heroes** have item data in `proBuilds` arrays
- **82 unique item name strings** found across all hero `proBuilds`

### Resolution Analysis (using `src/lib/itemResolver.ts` logic)

| Resolution Method | Count | Examples |
|-------------------|-------|---------|
| Direct catalog match | 51 | `Berserker's Fury`, `Arcane Boots`, `Immortality` |
| Alias resolution | 2 | `Haas' Claws` → `Haas's Claws`, `Necklace of Durance` → `Concentrated Energy` |
| Compound (enchant+boot) | 29 | `Encourage Tough Boots` → `Tough Boots (+encourage)`, `Flame Arcane Boots` → `Arcane Boots (+flame)` |
| **Unresolved** | **0** | — |

### Verdict

**All 82 unique item name strings from hero JSONs can be resolved** to catalog entries using the existing `itemResolver.ts` logic. No items are broken or unresolvable.

### Enchantments Used in Hero Builds (Compound Names)

| Enchantment | Boots Paired With |
|-------------|-------------------|
| Beast | Arcane Boots, Magic Shoes, Tough Boots |
| Conceal | Rapid Boots, Warrior Boots |
| Encourage | Arcane Boots, Demon Shoes, Magic Shoes, Rapid Boots, Swift Boots, Tough Boots, Warrior Boots |
| Favor | Demon Shoes, Magic Shoes, Rapid Boots, Tough Boots |
| Flame | Arcane Boots, Magic Shoes, Rapid Boots, Swift Boots, Tough Boots, Warrior Boots |
| Ice | Arcane Boots, Magic Shoes, Rapid Boots, Tough Boots |
| Smite | Magic Shoes, Rapid Boots, Tough Boots |

### Aliases Referenced in Hero Builds

| Raw Name | Resolves To |
|----------|-------------|
| `Haas' Claws` | `Haas's Claws` |
| `Necklace of Durance` | `Concentrated Energy` |

Both are handled by `ITEM_ALIASES` in `src/lib/itemResolver.ts:31-62`.

---

## G. Server Endpoint: `/api/items`

**Yes, the endpoint exists.** Defined at `server.ts:993-996`:

```typescript
app.get("/api/items", (req, res) => {
  res.json(getItemsList());
});
```

### How `getItemsList()` Works (server.ts:337-409)

1. **Scans the `aset_item/` directory** for `.png/.webp/.jpg/.jpeg` image files
2. **Derives item name** from filename (strips `Item_` prefix and `_ML.png` suffix)
3. **Enriches** by matching against `data/items.json` using `normalizeName()` for fuzzy matching
4. Returns: name, category (from directory name), image URL, gold, stats, uniqueAttributes, passive, description, abilities, buildFrom, buildsInto, slug, source info, and `isEnriched` flag

### Key Detail
Items are served based on **what images exist on disk**, enriched by catalog data. If an item is in `items.json` but has no image in `aset_item/`, it will **not** appear in the API response. Conversely, items with images but no catalog entry will appear with `isEnriched: false`.

---

## H. Recommendations

1. **Remove or quarantine the 5 mlbbhub "Unknown" items**: `Allow Throw`, `Broken Heart`, `Demon Boots`, `Magic Boots`, `Throw Forbidden`. These are empty, invalid, and two are duplicates of existing items.

2. **"Demon Boots" vs "Demon Shoes"**: If the game internally calls them "Demon Boots" in some regions, add an alias in `itemResolver.ts` rather than keeping a separate catalog entry.

3. **"Magic Boots" vs "Magic Shoes"**: Same as above — alias, not duplicate.

4. **Consider documenting potion/enchantment empty-stats convention**: The empty `stats: []` on potions and enchantments is correct but undocumented. A brief comment in the schema or README would prevent future confusion.

5. **No hero item mismatches found**: All 82 item name strings used in hero `proBuilds` resolve correctly. No data integrity issues here.

---

*Audit generated by Kilo agent. Data files were read-only — no source data was modified.*
