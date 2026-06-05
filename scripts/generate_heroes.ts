import fs from 'fs';

const stats = JSON.parse(fs.readFileSync('./data/heroes_stats.json', 'utf8'));
console.log(`Found ${stats.length} heroes`);

for (const stat of stats) {
    const heroName = stat.hero_name;
    const heroId = heroName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `./data/heroes/${heroId}.json`;
    
    if (!fs.existsSync(filename)) {
        const heroData = {
            id: heroId,
            heroName: heroName,
            role: "FIGHTER", // Placeholder
            secondaryRole: "TANK",
            specialty: ["Damage", "Push"],
            lane: "EXP",
            releaseYear: 2020,
            difficulty: 5,
            metaTier: "A",
            baseStats: {
                hp: 2500, hpRegen: 30, mana: 500, manaRegen: 15, physicalAttack: 110, physicalDefense: 20, magicPower: 0, magicDefense: 10, attackSpeed: 0.8, attackSpeedRatio: 100, movementSpeed: 250
            },
            skills: [
                {
                    name: "Passive Skill", type: "PASSIVE", description: "Passive description.", cooldown: [], manaCost: [], damageType: "PHYSICAL", scaling: ["100% Physical Attack"], crowdControlType: ["NONE"], strategicTags: ["Passive"]
                },
                {
                    name: "Skill 1", type: "SKILL_1", description: "Skill 1 description.", cooldown: [10, 9, 8], manaCost: [50, 60, 70], damageType: "PHYSICAL", scaling: ["100% Physical Attack"], crowdControlType: ["NONE"], strategicTags: ["Damage"]
                },
                {
                    name: "Skill 2", type: "SKILL_2", description: "Skill 2 description.", cooldown: [12, 11, 10], manaCost: [60, 70, 80], damageType: "PHYSICAL", scaling: ["100% Physical Attack"], crowdControlType: ["NONE"], strategicTags: ["Mobility"]
                },
                {
                    name: "Ultimate", type: "ULTIMATE", description: "Ultimate description.", cooldown: [40, 35, 30], manaCost: [100, 120, 150], damageType: "PHYSICAL", scaling: ["200% Physical Attack"], crowdControlType: ["STUN"], strategicTags: ["CC", "Burst"]
                }
            ],
            aiTags: {
                heroDraftIdentity: "All-Rounder",
                tempo: "MID",
                powerSpikeTiming: "Level 4",
                draftSignalValue: "Standard pick",
                hiddenGameplanSynergy: "Synergizes with generic team comps.",
                objectiveControlValue: 5,
                snowballPotential: 5,
                flexibilityRating: 5,
                deceptionValue: 5,
                comfortPickImportance: "Medium",
                counterRisk: "Medium",
                draftPhilosophyTags: ["Standard"],
                macroIdentity: ["Clear", "Push"],
                counterSystem: {
                    strongAgainst: [], weakAgainst: [], synergyWith: []
                }
            }
        };
        fs.writeFileSync(filename, JSON.stringify(heroData, null, 2));
    }
}
console.log('Done generating hero files.');
