/**
 * Item Name Resolver — normalizes MLBB item names from various sources
 * to canonical names in our local catalog (data/items.json + aset_item/).
 *
 * Handles:
 * - Apostrophe variants: Haas' Claws → Haas's Claws
 * - Typos: Tought Boots → Tough Boots
 * - Missing possessives: Berserker Fury → Berserker's Fury
 * - Roaming/boot compounds: Encourage Warrior Boots → Warrior Boots (+Encourage enchantment)
 * - Jungling/boot compounds: Flame Swift Boots → Swift Boots (+Flame Retribution)
 * - Legacy items: Necklace of Durance → Concentrated Energy (renamed)
 * - Case/punctuation normalization
 */

import itemsCatalog from "../../data/items.json";

// === CANONICAL ITEM NAMES (from catalog) ===
const CATALOG_NAMES = new Set<string>();
const CATALOG_LOWER_TO_NAME = new Map<string, string>();
const CATALOG_LOWER_TO_CATEGORY = new Map<string, string>();

for (const item of itemsCatalog as any[]) {
  if (item.name) {
    CATALOG_NAMES.add(item.name);
    CATALOG_LOWER_TO_NAME.set(item.name.toLowerCase(), item.name);
    CATALOG_LOWER_TO_CATEGORY.set(item.name.toLowerCase(), item.category || "");
  }
}

// === EXPLICIT ALIASES ===
const ITEM_ALIASES: Record<string, string> = {
  // Apostrophe variants
  "haas' claws": "Haas's Claws",
  "haas claws": "Haas's Claws",
  "haas s claws": "Haas's Claws",

  // Missing possessives
  "berserker fury": "Berserker's Fury",
  "berserkers fury": "Berserker's Fury",

  // Typos
  "tought boots": "Tough Boots",

  // Legacy/renamed items
  "necklace of durance": "Concentrated Energy",

  // Alternate spellings
  "hunter strike": "Hunter Strike",
  "hunters strike": "Hunter Strike",
  "hunter's strike": "Hunter Strike",

  // Common shorthand
  "sky piecer": "Sky Piercer",

  // "Smite" is a legacy enchantment name — map to Encourage as default
  "smite magic shoes": "Magic Shoes",
  "smite arcane boots": "Arcane Boots",
  "smite tough boots": "Tough Boots",
  "smite swift boots": "Swift Boots",
  "smite rapid boots": "Rapid Boots",
  "smite warrior boots": "Warrior Boots",
};

// === ROAMING / ENCHANTMENT PREFIXES ===
const ENCHANTMENT_PREFIXES = [
  "beast",
  "encourage",
  "conceal",
  "dire hit",
  "favor",
  "flame",
  "ice",
  "bloody",
  "smite",
  "brave smite",
];

// === BOOT NAMES ===
const BOOT_NAMES = new Set([
  "arcane boots",
  "magic shoes",
  "swift boots",
  "tough boots",
  "warrior boots",
  "rapid boots",
  "demon shoes",
  "boots",
]);

// === NORMALIZE FUNCTION ===
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2018\u2019\u201A\uFFFD]/g, "'") // curly quotes → straight
    .replace(/['']/g, "'") // normalize apostrophe
    .replace(/\s+/g, " ")
    .trim();
}

// === RESOLVE COMPOUND ROAMING/BOOT NAMES ===
function resolveCompoundName(raw: string): { boots: string; enchantment: string | null } | null {
  const normalized = normalizeName(raw);

  for (const prefix of ENCHANTMENT_PREFIXES) {
    if (normalized.startsWith(prefix + " ")) {
      const rest = normalized.slice(prefix.length + 1).trim();
      if (BOOT_NAMES.has(rest)) {
        // Find canonical boot name
        const canonical = CATALOG_LOWER_TO_NAME.get(rest) || rest;
        return { boots: canonical, enchantment: prefix };
      }
    }
  }

  // Check if it ends with a boot name and has a prefix
  for (const boot of BOOT_NAMES) {
    if (normalized.endsWith(" " + boot) || normalized === boot) {
      if (normalized !== boot) {
        const prefix = normalized.slice(0, normalized.length - boot.length).trim();
        if (ENCHANTMENT_PREFIXES.includes(prefix)) {
          const canonical = CATALOG_LOWER_TO_NAME.get(boot) || boot;
          return { boots: canonical, enchantment: prefix };
        }
      }
    }
  }

  return null;
}

// === MAIN RESOLVE FUNCTION ===
export interface ResolvedItem {
  canonicalName: string;
  originalName: string;
  iconPath: string;
  iconFallbackPaths: string[];
  category: string;
  isResolved: boolean;
  isCompound: boolean;
  enchantment: string | null;
}

const ITEM_SUBDIRS = ["attack", "magic", "defense", "movement", "roaming", "jungling"];

function buildIconPaths(slug: string): { root: string; subdirs: string[] } {
  return {
    root: `/raw-assets/aset_item/Item_${slug}_ML.png`,
    subdirs: ITEM_SUBDIRS.map(d => `/raw-assets/aset_item/${d}/Item_${slug}_ML.png`),
  };
}

export function resolveItem(rawName: string): ResolvedItem {
  const normalized = normalizeName(rawName);
  const originalName = rawName;

  // 1. Check explicit aliases first
  const aliasTarget = ITEM_ALIASES[normalized];
  if (aliasTarget) {
    const canonicalLower = aliasTarget.toLowerCase();
    const canonical = CATALOG_LOWER_TO_NAME.get(canonicalLower) || aliasTarget;
    const category = CATALOG_LOWER_TO_CATEGORY.get(canonicalLower) || "";
    const slug = canonical.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, "_");
    const paths = buildIconPaths(slug);
    return {
      canonicalName: canonical,
      originalName,
      iconPath: paths.root,
      iconFallbackPaths: paths.subdirs,
      category,
      isResolved: true,
      isCompound: false,
      enchantment: null,
    };
  }

  // 2. Check direct catalog match
  const directMatch = CATALOG_LOWER_TO_NAME.get(normalized);
  if (directMatch) {
    const category = CATALOG_LOWER_TO_CATEGORY.get(normalized) || "";
    const slug = directMatch.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, "_");
    const paths = buildIconPaths(slug);
    return {
      canonicalName: directMatch,
      originalName,
      iconPath: paths.root,
      iconFallbackPaths: paths.subdirs,
      category,
      isResolved: true,
      isCompound: false,
      enchantment: null,
    };
  }

  // 3. Try compound roaming/boot resolution
  const compound = resolveCompoundName(rawName);
  if (compound) {
    const canonicalLower = compound.boots.toLowerCase();
    const canonical = CATALOG_LOWER_TO_NAME.get(canonicalLower) || compound.boots;
    const category = CATALOG_LOWER_TO_CATEGORY.get(canonicalLower) || "";
    const slug = canonical.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, "_");
    const paths = buildIconPaths(slug);
    return {
      canonicalName: canonical,
      originalName,
      iconPath: paths.root,
      iconFallbackPaths: paths.subdirs,
      category,
      isResolved: true,
      isCompound: true,
      enchantment: compound.enchantment,
    };
  }

  // 4. Fuzzy match: strip all punctuation and compare
  const stripped = normalized.replace(/[^a-z0-9\s]/g, "").trim();
  for (const [catLower, catName] of CATALOG_LOWER_TO_NAME) {
    const catStripped = catLower.replace(/[^a-z0-9\s]/g, "").trim();
    if (stripped === catStripped) {
      const category = CATALOG_LOWER_TO_CATEGORY.get(catLower) || "";
      const slug = catName.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, "_");
      const paths = buildIconPaths(slug);
      return {
        canonicalName: catName,
        originalName,
        iconPath: paths.root,
        iconFallbackPaths: paths.subdirs,
        category,
        isResolved: true,
        isCompound: false,
        enchantment: null,
      };
    }
  }

  // 5. Not resolved — return original name as-is with generated paths
  const slug = normalized.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, "_");
  const paths = buildIconPaths(slug);
  return {
    canonicalName: rawName,
    originalName,
    iconPath: paths.root,
    iconFallbackPaths: paths.subdirs,
    category: "",
    isResolved: false,
    isCompound: false,
    enchantment: null,
  };
}

// === BULK RESOLVE FOR PRO BUILDS ===
export function resolveBuildItems(items: string[]): ResolvedItem[] {
  return items.map(item => resolveItem(item));
}
