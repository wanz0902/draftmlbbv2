import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "data", "heroes");

const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Name normalizations
    if (!data.name && data.heroName) {
      data.name = data.heroName;
    }

    // Role, specialty arrays
    if (typeof data.role === "string") data.role = [data.role];
    if (typeof data.specialty === "string") data.specialty = [data.specialty];

    // Skills normalizations: Convert array to object if necessary
    if (Array.isArray(data.skills)) {
      const newSkills: any = {};
      data.skills.forEach((sk: any, i: number) => {
        let key = "extra";
        if (sk.type === "PASSIVE" || sk.name?.toLowerCase().includes("passive") || i === 0) key = "passive";
        else if (sk.type === "SKILL_1" || sk.name?.toLowerCase().includes("1") || i === 1) key = "skill1";
        else if (sk.type === "SKILL_2" || sk.name?.toLowerCase().includes("2") || i === 2) key = "skill2";
        else if (sk.type === "ULTIMATE" || sk.name?.toLowerCase().includes("ultimate") || sk.type === "SKILL_3" || i === 3) key = "ultimate";
        else key = "extra";

        // Handle duplicates
        if (newSkills[key]) key = `extra_${i}`;

        newSkills[key] = {
          name: sk.name || "Unknown",
          description: sk.description || "",
          cooldown: sk.cooldown || [],
          manaCost: sk.manaCost || [],
          damageType: sk.damageType || "Physical",
          scaling: sk.scaling ? (Array.isArray(sk.scaling) ? sk.scaling : [sk.scaling]) : [],
          crowdControlType: sk.crowdControlType ? (Array.isArray(sk.crowdControlType) ? sk.crowdControlType : [sk.crowdControlType]) : ["None"],
          strategicTags: sk.strategicTags ? (Array.isArray(sk.strategicTags) ? sk.strategicTags : [sk.strategicTags]) : [],
          comboUsage: sk.comboUsage || "",
          strategicPurpose: sk.strategicPurpose || ""
        };
      });
      data.skills = newSkills;
    } else if (typeof data.skills === "object") {
       // Ensure arrays exist
       for (const k in data.skills) {
          const sk = data.skills[k];
          if (sk.scaling && !Array.isArray(sk.scaling)) sk.scaling = [sk.scaling];
          if (sk.crowdControlType && !Array.isArray(sk.crowdControlType)) sk.crowdControlType = [sk.crowdControlType];
          if (sk.strategicTags && !Array.isArray(sk.strategicTags)) sk.strategicTags = [sk.strategicTags];
       }
    }

    // Strategic Data normalization (Migrating aiTags)
    if (!data.strategicData) {
      data.strategicData = {
        draftSignals: [],
        hiddenGameplans: [],
        macroIdentity: [],
        tempoClassification: "Mid",
        powerSpikeTiming: [],
        counterSystem: {
          strongAgainst: [],
          weakAgainst: [],
          synergyWith: []
        }
      };
    }

    if (data.aiTags) {
      const str = data.strategicData;
      const ai = data.aiTags;
      
      if (ai.tempo) str.tempoClassification = ai.tempo.charAt(0).toUpperCase() + ai.tempo.slice(1).toLowerCase();
      if (ai.powerSpikeTiming) str.powerSpikeTiming = Array.isArray(ai.powerSpikeTiming) ? ai.powerSpikeTiming : [ai.powerSpikeTiming];
      if (ai.macroIdentity) str.macroIdentity = Array.isArray(ai.macroIdentity) ? ai.macroIdentity : [ai.macroIdentity];
      if (ai.draftSignals) str.draftSignals = Array.isArray(ai.draftSignals) ? ai.draftSignals : [ai.draftSignals];
      if (ai.hiddenGameplanSynergy) str.hiddenGameplans.push(ai.hiddenGameplanSynergy);
      
      if (ai.objectiveControlValue !== undefined) str.objectiveControlValue = ai.objectiveControlValue;
      if (ai.snowballPotential !== undefined) str.snowballPotential = ai.snowballPotential;
      if (ai.flexibilityRating !== undefined) str.flexibilityRating = ai.flexibilityRating;
      if (ai.deceptionValue !== undefined) str.deceptionValue = typeof ai.deceptionValue === 'number' ? ai.deceptionValue : (ai.deceptionValue === "HIGH" ? 8 : 5);
      if (ai.comfortPickImportance !== undefined) str.comfortPickImportance = ai.comfortPickImportance;
      
      if (ai.counters) str.counterSystem.strongAgainst = ai.counters;
      if (ai.counteredBy) str.counterSystem.weakAgainst = ai.counteredBy;
      if (ai.synergy) str.counterSystem.synergyWith = ai.synergy;

      delete data.aiTags;
    }

    // Save back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}
console.log("All data normalized successfully.");
