import heroesMaster from "../data/heroes_master.json";

export function normalizeHeroName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getHeroSlug(name: string): string {
  if (!name) return "";
  const normalized = normalizeHeroName(name);

  // special manual overrides just in case
  if (normalized === "yisunshin" || normalized === "yss") return "yisunshin";
  if (normalized === "xborg" || normalized === "x.borg") return "xborg";

  const found = heroesMaster.find(
    (h) =>
      normalizeHeroName(h.hero_name) === normalized ||
      h.slug === normalized,
  );

  return found ? found.slug : normalized;
}

export function getHeroImageUrl(
  name: string,
  heroAssets: Record<string, string>,
): string {
  const fallbackLogo =
    "/raw-assets/regular_season_files/60px-ML_icon_Zhuxin.png";
  if (!name) return fallbackLogo;

  const slug = getHeroSlug(name);
  if (heroAssets[slug]) return heroAssets[slug];

  const normalized = normalizeHeroName(name);
  if (heroAssets[normalized]) return heroAssets[normalized];

  return fallbackLogo;
}

export function getHeroRole(name: string): string {
  if (!name) return "Unknown";
  const nm = String(name).toLowerCase().trim();

  const heroData = (heroesMaster as any[]).find(
    (h) =>
      h.hero_name.toLowerCase() === nm ||
      (nm.includes("popol") && h.hero_name.toLowerCase().includes("popol")),
  );

  if (heroData && heroData.role && heroData.role.length > 0) {
    if (Array.isArray(heroData.role)) {
      return heroData.role[0];
    }
    return heroData.role;
  }

  return "Unknown";
}

export function cleanText(
  val: any,
  fallback: string = "No Data Available",
): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") {
    const s = val.trim();
    if (
      s === "" ||
      s.toLowerCase() === "none" ||
      s.toLowerCase() === "undefined" ||
      s.toLowerCase() === "missing" ||
      s.toLowerCase() === "null"
    )
      return fallback;
    return s;
  }
  return String(val);
}

export function formatCooldown(val: any): string {
  if (!val) return "Passive";
  if (Array.isArray(val)) {
    return val.filter((v) => v).join("s / ") + "s";
  }
  const s = String(val).trim();
  if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "undefined")
    return "Passive";
  if (s.includes("/")) {
    return s
      .split("/")
      .map((v) => v.trim() + "s")
      .join(" / ");
  }
  return s + "s";
}

export function cleanArrayJoin(
  val: any,
  joiner: string = ", ",
  fallback: string = "No Data Available",
): string {
  if (!val) return fallback;
  if (Array.isArray(val)) {
    const filtered = val.filter((v) => {
      if (!v) return false;
      const s = String(v).trim().toLowerCase();
      return !(s === "" || s === "none" || s === "undefined" || s === "null");
    });
    if (filtered.length === 0) return fallback;
    return filtered.join(joiner);
  }
  return cleanText(val, fallback);
}
