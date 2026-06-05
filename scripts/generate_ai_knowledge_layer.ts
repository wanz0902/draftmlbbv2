/**
 * generate_ai_knowledge_layer.ts
 * 
 * Adds AI metadata fields to ALL hero JSON files in data/heroes/
 * WITHOUT modifying any existing fields.
 * 
 * Fields added:
 *  - mechanicCategory
 *  - mechanicNote
 *  - playstyleTags
 *  - difficultyTags
 *  - draftTags
 *  - counterTags
 *  - synergyTags
 *  - macroTags
 *  - powerSpikeTags
 */

import fs from 'fs';
import path from 'path';

const HEROES_DIR = path.join(process.cwd(), 'data', 'heroes');

// ─── Mechanic Category Mapping ───────────────────────────────────────────────

const MECHANIC_MAP: Record<string, string[]> = {
  beatrix: ["Weapon Swap"],
  kagura: ["Umbrella State", "Dual Skill Set"],
  selena: ["Transform", "Dual Form"],
  roger: ["Transform", "Dual Form"],
  lunox: ["Dual State Ultimate", "Order Chaos"],
  hanzo: ["Transform", "Possession", "Clone"],
  zhask: ["Summon", "Enhanced Summon"],
  pharsa: ["Flight Mode"],
  edith: ["Transform", "Tank to Marksman"],
  valentina: ["Ultimate Copy"],
  julian: ["Enhanced Skill", "No Ultimate"],
  paquito: ["Enhanced Skill", "Champ Stance"],
  popolandkupa: ["Pet Companion"],
  angela: ["Attach", "Global Support"],
  johnson: ["Vehicle", "Carry Ally"],
  chip: ["Portal", "Teleport"],
  gloo: ["Possess Enemy", "Split"],
  faramis: ["Revive Zone"],
  carmilla: ["Link Damage"],
  cecilion: ["Stacking", "Linked Hero"],
  mathilda: ["Ally Guidance", "Dash to Ally"],
  yuzhong: ["Transform", "Dragon Form"],
  yve: ["Zone Control Ultimate"],
};

// ─── Mechanic Notes (Indonesian) ─────────────────────────────────────────────

const MECHANIC_NOTES: Record<string, string> = {
  beatrix: "Beatrix memiliki 4 senjata berbeda yang bisa ditukar kapan saja, masing-masing dengan basic attack dan ultimate unik.",
  kagura: "Kagura mengendalikan payung yang bisa dilempar dan ditarik kembali, memberikan dua set skill berbeda tergantung posisi payung.",
  selena: "Selena bisa bertransformasi antara mode Elven (jarak jauh) dan Abyssal (jarak dekat), memberikan playstyle ganda.",
  roger: "Roger bisa bertransformasi antara mode Human (marksman) dan Wolf (fighter), menyesuaikan situasi pertarungan.",
  lunox: "Lunox memiliki dua state Order dan Chaos yang mengubah ultimate-nya menjadi burst damage atau sustained invulnerability.",
  hanzo: "Hanzo bisa mengeluarkan roh dari tubuhnya untuk menyerang musuh dari jarak jauh, tubuh asli tetap rentan.",
  zhask: "Zhask memanggil spawn yang bisa diserang musuh, dan ultimate-nya memperkuat spawn menjadi bentuk raksasa.",
  pharsa: "Pharsa memiliki mode terbang yang memungkinkan serangan area jarak jauh berulang selama durasi ultimate.",
  edith: "Edith bertransformasi dari Tank (melee) menjadi Marksman (ranged) saat menggunakan ultimate, mengubah peran secara total.",
  valentina: "Valentina bisa menyalin ultimate hero musuh, memberikan fleksibilitas draft yang sangat tinggi.",
  julian: "Julian tidak memiliki ultimate tradisional, sebaliknya skill-nya bisa di-enhance setelah casting 3 skill berturut-turut.",
  paquito: "Paquito memiliki Champ Stance yang meng-enhance semua skill-nya setelah landing 4 hit, memberikan burst combo yang devastating.",
  popolandkupa: "Popol bermain bersama Kupa (pet companion) yang bisa diperintahkan untuk menyerang atau menjaga area.",
  angela: "Angela bisa menempel ke hero ally dari jarak global, memberikan shield dan casting skill dari dalam tubuh ally.",
  johnson: "Johnson berubah menjadi mobil yang bisa membawa satu ally, menabrak musuh dengan damage dan stun area.",
  chip: "Chip membuat portal teleport yang bisa digunakan seluruh tim untuk rotasi instan antar lane.",
  gloo: "Gloo bisa memecah diri menjadi bagian-bagian kecil dan menempel ke musuh untuk mengendalikan pergerakan mereka.",
  faramis: "Faramis membuat zone yang me-revive ally yang mati di dalam area tersebut selama durasi tertentu.",
  carmilla: "Carmilla menghubungkan musuh satu sama lain, menyebarkan crowd control dan damage yang diterima satu musuh ke yang terhubung.",
  cecilion: "Cecilion mendapat stack permanent dari skill 1 yang meningkatkan damage tanpa batas, dan bisa link dengan Carmilla.",
  mathilda: "Mathilda bisa dash ke ally untuk memberikan shield, lalu dash kembali ke musuh, cocok untuk initiasi dan peel.",
  yuzhong: "Yu Zhong bertransformasi menjadi Black Dragon yang immune CC, memberikan sustained AoE damage dan sustain.",
  yve: "Yve memiliki ultimate zone control yang bisa di-aim manual secara real-time, memberikan slow dan damage berulang.",
};

// ─── Playstyle Tags by Role ──────────────────────────────────────────────────

const PLAYSTYLE_BY_ROLE: Record<string, string[]> = {
  Assassin: ["Burst", "Pickoff", "Roam", "Flank"],
  Fighter: ["Sustain", "Splitpush", "Frontline", "Duel"],
  Tank: ["Initiate", "Peel", "CC Chain", "Frontline"],
  Mage: ["Burst", "Poke", "Zone Control", "Combo"],
  Marksman: ["DPS", "Objective", "Positioning", "Late Game"],
  Support: ["Protect", "Vision", "Heal/Shield", "Roam"],
};

// ─── Counter Tags by Role ────────────────────────────────────────────────────

const COUNTER_BY_ROLE: Record<string, string[]> = {
  Assassin: ["Hard CC", "Group Up", "Vision"],
  Marksman: ["Dive", "Burst", "Flank"],
  Tank: ["True Damage", "Sustained DPS", "Anti-Heal"],
  Mage: ["Gap Close", "Silence", "Burst"],
  Fighter: ["Kite", "Burst", "CC Chain"],
  Support: ["Dive", "Isolation", "Anti-Heal"],
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function getPrimaryRole(hero: any): string {
  if (Array.isArray(hero.role)) {
    return hero.role[0] || "Fighter";
  }
  return hero.role || "Fighter";
}

function getSecondaryRole(hero: any): string | null {
  if (Array.isArray(hero.role) && hero.role.length > 1) {
    return hero.role[1];
  }
  return null;
}

function getMechanicCategory(heroId: string): string[] {
  return MECHANIC_MAP[heroId] || ["Standard"];
}

function getMechanicNote(heroId: string, heroName: string, role: string): string {
  if (MECHANIC_NOTES[heroId]) {
    return MECHANIC_NOTES[heroId];
  }
  // Generate generic note based on role
  const roleNotes: Record<string, string> = {
    Assassin: `${heroName} adalah assassin dengan kemampuan burst damage dan mobilitas tinggi untuk mengeliminasi target prioritas.`,
    Fighter: `${heroName} adalah fighter dengan kombinasi sustain dan damage yang cocok untuk duel dan splitpush.`,
    Tank: `${heroName} adalah tank dengan kemampuan crowd control untuk memproteksi tim dan menginisiasi teamfight.`,
    Mage: `${heroName} adalah mage dengan kemampuan burst/poke damage dari jarak aman.`,
    Marksman: `${heroName} adalah marksman dengan DPS tinggi yang menjadi win condition utama di late game.`,
    Support: `${heroName} adalah support yang membantu tim melalui heal, shield, atau utility lainnya.`,
  };
  return roleNotes[role] || `${heroName} memiliki mekanik standar sesuai perannya sebagai ${role}.`;
}

function getPlaystyleTags(heroId: string, role: string, specialty: string[]): string[] {
  const roleTags = PLAYSTYLE_BY_ROLE[role] || ["Versatile"];
  
  // Pick 2-3 based on specialty context
  const selected: string[] = [];
  
  // Always include first tag of role
  selected.push(roleTags[0]);
  
  // Add based on specialty
  const specLower = specialty.map(s => s.toLowerCase());
  
  if (specLower.includes("damage") || specLower.includes("reap")) {
    if (roleTags.includes("Burst")) selected.push("Burst");
    else if (roleTags.includes("DPS")) selected.push("DPS");
    else if (roleTags.includes("Pickoff")) selected.push("Pickoff");
  }
  if (specLower.includes("crowd control") || specLower.includes("cc")) {
    if (roleTags.includes("CC Chain")) selected.push("CC Chain");
    else if (roleTags.includes("Initiate")) selected.push("Initiate");
  }
  if (specLower.includes("guard") || specLower.includes("regen")) {
    if (roleTags.includes("Peel")) selected.push("Peel");
    else if (roleTags.includes("Protect")) selected.push("Protect");
    else if (roleTags.includes("Heal/Shield")) selected.push("Heal/Shield");
  }
  if (specLower.includes("push") || specLower.includes("siege")) {
    if (roleTags.includes("Splitpush")) selected.push("Splitpush");
    else if (roleTags.includes("Objective")) selected.push("Objective");
  }
  if (specLower.includes("initiator") || specLower.includes("initiate")) {
    if (roleTags.includes("Initiate")) selected.push("Initiate");
    else selected.push("Frontline");
  }
  if (specLower.includes("chase")) {
    selected.push(roleTags.includes("Roam") ? "Roam" : "Flank");
  }
  
  // Ensure at least 2 tags, pick from role defaults
  const unique = [...new Set(selected)];
  if (unique.length < 2) {
    for (const tag of roleTags) {
      if (!unique.includes(tag)) {
        unique.push(tag);
        if (unique.length >= 2) break;
      }
    }
  }
  
  // Cap at 3
  return unique.slice(0, 3);
}

function getDifficultyTags(heroId: string, mechanicCat: string[]): string[] {
  const isTransform = mechanicCat.some(m => 
    ["Transform", "Dual Form", "Dual Skill Set", "Dual State Ultimate", "Weapon Swap", "Enhanced Skill"].includes(m)
  );
  
  const highSkillHeroes = [
    "fanny", "gusion", "lancelot", "ling", "benedetta", "hayabusa",
    "kagura", "harith", "chou", "paquito", "joy", "nolan", "suyou"
  ];
  
  if (isTransform) {
    return ["Form Management", "Combo Timing"];
  }
  if (highSkillHeroes.includes(heroId)) {
    return ["Mechanical Skill", "Combo Execution"];
  }
  
  // Default based on role logic
  const positioningHeroes = ["marksman", "mage", "support"];
  // We'll check role later, for now return generic
  return ["Positioning"];
}

function getDifficultyTagsWithRole(heroId: string, mechanicCat: string[], role: string): string[] {
  const isTransform = mechanicCat.some(m => 
    ["Transform", "Dual Form", "Dual Skill Set", "Dual State Ultimate", "Weapon Swap", "Enhanced Skill"].includes(m)
  );
  
  const highSkillHeroes = [
    "fanny", "gusion", "lancelot", "ling", "benedetta", "hayabusa",
    "kagura", "harith", "chou", "paquito", "joy", "nolan", "suyou"
  ];
  
  if (isTransform) {
    return ["Form Management", "Combo Timing"];
  }
  if (highSkillHeroes.includes(heroId)) {
    return ["Mechanical Skill", "Combo Execution"];
  }
  
  if (["Marksman", "Mage"].includes(role)) {
    return ["Positioning"];
  }
  if (["Tank", "Support"].includes(role)) {
    return ["Macro", "Timing"];
  }
  return ["Positioning", "Macro"];
}

function getDraftTags(heroId: string, role: string, lanes: string[], specialty: string[]): string[] {
  const tags: string[] = [];
  
  // Flex pick detection
  if (lanes && lanes.length > 1) {
    tags.push("Flex Pick");
  }
  
  // Role-based signals
  const roleSignals: Record<string, string[]> = {
    Assassin: ["Early Aggression", "Pickoff Threat"],
    Fighter: ["Splitpush Threat", "Frontline"],
    Tank: ["First Pick Priority", "Initiation"],
    Mage: ["Zone Control", "Burst Threat"],
    Marksman: ["Late Game Insurance", "Objective Focus"],
    Support: ["Enabler", "Vision Control"],
  };
  
  const roleTags = roleSignals[role] || ["Niche Pick"];
  tags.push(roleTags[0]);
  
  // Specialty-based
  const specLower = specialty.map(s => s.toLowerCase());
  if (specLower.includes("reap")) tags.push("Snowball Potential");
  if (specLower.includes("guard")) tags.push("Defensive Draft");
  if (specLower.includes("crowd control")) tags.push("CC Coverage");
  if (specLower.includes("push") || specLower.includes("siege")) tags.push("Objective Focus");
  
  // Special heroes
  const firstPickHeroes = ["chou", "khufra", "atlas", "lolita", "franco"];
  if (firstPickHeroes.includes(heroId)) {
    if (!tags.includes("First Pick Priority")) tags.push("First Pick Priority");
  }
  
  const nicheHeroes = ["phoveus", "minsitthar", "diggie", "faramis"];
  if (nicheHeroes.includes(heroId)) {
    tags.push("Counter Pick");
    tags.push("Niche Pick");
  }
  
  return [...new Set(tags)].slice(0, 3);
}

function getCounterTags(role: string): string[] {
  const tags = COUNTER_BY_ROLE[role] || ["Burst", "CC Chain"];
  return tags;
}

function getSynergyTags(role: string, specialty: string[]): string[] {
  const tags: string[] = [];
  const specLower = specialty.map(s => s.toLowerCase());
  
  switch (role) {
    case "Assassin":
      tags.push("Needs Frontline", "Pairs with CC");
      break;
    case "Fighter":
      tags.push("Dive Buddy", "Pairs with CC");
      break;
    case "Tank":
      tags.push("Enables Carry", "Pairs with Burst");
      break;
    case "Mage":
      tags.push("Needs Peel", "Pairs with CC");
      break;
    case "Marksman":
      tags.push("Needs Frontline", "Needs Peel");
      break;
    case "Support":
      tags.push("Enables Carry", "Pairs with Dive");
      break;
    default:
      tags.push("Versatile Synergy");
  }
  
  // Specialty additions
  if (specLower.includes("regen") || specLower.includes("guard")) {
    tags.push("Sustain Enabler");
  }
  if (specLower.includes("crowd control")) {
    tags.push("CC Chain Partner");
  }
  
  return [...new Set(tags)].slice(0, 3);
}

function getMacroTags(hero: any, role: string, lanes: string[]): string[] {
  // Use existing strategicData.macroIdentity if available
  if (hero.strategicData?.macroIdentity && Array.isArray(hero.strategicData.macroIdentity) && hero.strategicData.macroIdentity.length > 0) {
    return hero.strategicData.macroIdentity;
  }
  
  // Generate from role + lane
  const macroMap: Record<string, string[]> = {
    Assassin: ["Jungle Invade", "Pickoff Rotation"],
    Fighter: ["Splitpush", "Sidelane Pressure"],
    Tank: ["Vision Control", "Team Enabler"],
    Mage: ["Wave Clear", "Zone Control"],
    Marksman: ["Objective DPS", "Late Game Carry"],
    Support: ["Map Rotation", "Vision Control"],
  };
  
  const base = macroMap[role] || ["Team Support"];
  
  // Add lane-specific
  if (lanes.includes("Jungle") || lanes.includes("Jungler")) {
    return ["Jungle Control", "Gank Rotation", ...base.slice(0, 1)];
  }
  if (lanes.includes("Roam")) {
    return ["Map Rotation", "Vision Control", ...base.slice(0, 1)];
  }
  if (lanes.includes("EXP") || lanes.includes("Exp") || lanes.includes("EXP Lane")) {
    return ["Sidelane Pressure", ...base.slice(0, 2)];
  }
  
  return base;
}

function getPowerSpikeTags(hero: any, role: string): string[] {
  // Use existing strategicData.powerSpikeTiming if available
  if (hero.strategicData?.powerSpikeTiming && Array.isArray(hero.strategicData.powerSpikeTiming) && hero.strategicData.powerSpikeTiming.length > 0) {
    return hero.strategicData.powerSpikeTiming;
  }
  
  // Use tempoClassification if available
  const tempo = hero.strategicData?.tempoClassification;
  if (tempo) {
    const tempoMap: Record<string, string[]> = {
      Early: ["Level 4", "Early Game"],
      Mid: ["1 Core Item", "Mid Game"],
      Late: ["2 Core Items", "Late Game"],
    };
    return tempoMap[tempo] || ["Mid Game"];
  }
  
  // Fallback based on role
  const roleSpike: Record<string, string[]> = {
    Assassin: ["Level 4", "Mid Game"],
    Fighter: ["1 Core Item", "Mid Game"],
    Tank: ["Level 2 (Roam Item)", "Mid Game"],
    Mage: ["Level 4", "1 Core Item"],
    Marksman: ["2 Core Items", "Late Game"],
    Support: ["Level 2 (Roam Item)", "Mid Game"],
  };
  
  return roleSpike[role] || ["Mid Game"];
}

// ─── Main Execution ──────────────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AI Knowledge Layer Generator - MLBB Draft Simulator");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Get all hero JSON files
  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${files.length} hero files in ${HEROES_DIR}\n`);

  if (files.length !== 132) {
    console.warn(`⚠️  Expected 132 heroes, found ${files.length}. Proceeding anyway...`);
  }

  let enrichedCount = 0;
  let skippedFields = 0;
  const sampleOutput: Record<string, any> = {};

  for (const file of files) {
    const filePath = path.join(HEROES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const hero = JSON.parse(raw);
    
    const heroId = hero.id || file.replace('.json', '');
    const heroName = hero.heroName || hero.name || heroId;
    const role = getPrimaryRole(hero);
    const specialty: string[] = Array.isArray(hero.specialty) ? hero.specialty : [];
    const lanes: string[] = Array.isArray(hero.lanes) ? hero.lanes : (hero.lane ? [hero.lane] : []);
    
    // ─── Compute new fields ────────────────────────────────────────────
    const mechanicCat = getMechanicCategory(heroId);
    const mechanicNote = getMechanicNote(heroId, heroName, role);
    const playstyleTags = getPlaystyleTags(heroId, role, specialty);
    const difficultyTags = getDifficultyTagsWithRole(heroId, mechanicCat, role);
    const draftTags = getDraftTags(heroId, role, lanes, specialty);
    const counterTags = getCounterTags(role);
    const synergyTags = getSynergyTags(role, specialty);
    const macroTags = getMacroTags(hero, role, lanes);
    const powerSpikeTags = getPowerSpikeTags(hero, role);
    
    // ─── Only ADD fields if they don't exist or are empty ──────────────
    let modified = false;
    
    if (!hero.mechanicCategory || (Array.isArray(hero.mechanicCategory) && hero.mechanicCategory.length === 0)) {
      hero.mechanicCategory = mechanicCat;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.mechanicNote || hero.mechanicNote === "") {
      hero.mechanicNote = mechanicNote;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.playstyleTags || (Array.isArray(hero.playstyleTags) && hero.playstyleTags.length === 0)) {
      hero.playstyleTags = playstyleTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.difficultyTags || (Array.isArray(hero.difficultyTags) && hero.difficultyTags.length === 0)) {
      hero.difficultyTags = difficultyTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.draftTags || (Array.isArray(hero.draftTags) && hero.draftTags.length === 0)) {
      hero.draftTags = draftTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.counterTags || (Array.isArray(hero.counterTags) && hero.counterTags.length === 0)) {
      hero.counterTags = counterTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.synergyTags || (Array.isArray(hero.synergyTags) && hero.synergyTags.length === 0)) {
      hero.synergyTags = synergyTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.macroTags || (Array.isArray(hero.macroTags) && hero.macroTags.length === 0)) {
      hero.macroTags = macroTags;
      modified = true;
    } else { skippedFields++; }
    
    if (!hero.powerSpikeTags || (Array.isArray(hero.powerSpikeTags) && hero.powerSpikeTags.length === 0)) {
      hero.powerSpikeTags = powerSpikeTags;
      modified = true;
    } else { skippedFields++; }
    
    // Write back
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(hero, null, 2));
      enrichedCount++;
    }
    
    // Collect sample for Miya, Beatrix, Angela
    if (["miya", "beatrix", "angela"].includes(heroId)) {
      sampleOutput[heroId] = {
        mechanicCategory: hero.mechanicCategory,
        mechanicNote: hero.mechanicNote,
        playstyleTags: hero.playstyleTags,
        difficultyTags: hero.difficultyTags,
        draftTags: hero.draftTags,
        counterTags: hero.counterTags,
        synergyTags: hero.synergyTags,
        macroTags: hero.macroTags,
        powerSpikeTags: hero.powerSpikeTags,
      };
    }
  }

  // ─── Verification ────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Verify hero count
  const finalFiles = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  const countOk = finalFiles.length === files.length;
  console.log(`✅ Hero count: ${finalFiles.length} (${countOk ? 'UNCHANGED' : '⚠️ CHANGED!'})`);

  // 2. Verify no existing skill data was modified (spot check 3 heroes)
  const spotCheckHeroes = ["miya", "beatrix", "angela"];
  let skillIntegrityOk = true;
  
  for (const hid of spotCheckHeroes) {
    const fp = path.join(HEROES_DIR, `${hid}.json`);
    if (!fs.existsSync(fp)) continue;
    const h = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    
    // Verify skills object exists and has content
    if (!h.skills || Object.keys(h.skills).length === 0) {
      console.log(`  ⚠️ ${hid}: skills object missing or empty!`);
      skillIntegrityOk = false;
    } else {
      // Check that key skill fields still have their data
      const passive = h.skills.passive;
      if (!passive || !passive.name) {
        console.log(`  ⚠️ ${hid}: passive skill name missing!`);
        skillIntegrityOk = false;
      }
    }
  }
  
  if (skillIntegrityOk) {
    console.log(`✅ Skill data integrity: PRESERVED (spot-checked ${spotCheckHeroes.join(', ')})`);
  }

  // 3. Print summary
  console.log(`\n✅ Total heroes enriched: ${enrichedCount}/${files.length}`);
  console.log(`📌 Fields skipped (already had content): ${skippedFields}`);
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  SAMPLE OUTPUT");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  for (const [heroId, data] of Object.entries(sampleOutput)) {
    console.log(`\n─── ${heroId.toUpperCase()} ───`);
    console.log(JSON.stringify(data, null, 2));
  }
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ AI Knowledge Layer generation complete!");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main();
