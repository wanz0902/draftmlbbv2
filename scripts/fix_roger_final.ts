import fs from 'fs';
const f = 'data/heroes/roger.json';
const d = JSON.parse(fs.readFileSync(f, 'utf8'));

// Current state: skill1=empty, skill2=Open Fire, ultimate=Hunter's Steps
// Correct: skill1=Open Fire, skill2=Hunter's Steps, ultimate=Wolf Transformation
// Shift data: skill2→skill1, ultimate→skill2, create ult manually

const oldSkill2 = { ...d.skills.skill2 };
const oldUlt = { ...d.skills.ultimate };

d.skills.skill1 = { ...oldSkill2, skillSlot: 'skill1', displayLabel: 'Skill 1 (Human Form)', variant: 'Human Form' };
d.skills.skill2 = { ...oldUlt, skillSlot: 'skill2', displayLabel: 'Skill 2 (Human Form)', variant: 'Human Form' };
d.skills.ultimate = {
  name: 'Wolf Transformation',
  description: 'Roger transforms into Wolf Form, gaining enhanced combat abilities and new skills.',
  cooldown: '0',
  manaCost: '0',
  damageType: 'None',
  scaling: ['None'],
  scalingTable: [],
  crowdControlType: [],
  strategicTags: ['Transform'],
  iconName: 'Wolf_Transformation',
  iconUrl: '',
  variant: 'Transform',
  skillSlot: 'ultimate',
  displayLabel: 'Ultimate (Transform)',
  comboUsage: '',
  strategicPurpose: '',
  tips: '',
};

d.mechanicNote = 'Roger has additional Wolf Form abilities after transformation (Lycan Pounce, Bloodthirsty Howl). Detailed Wolf Form skill data not currently available in local source.';
d.needsEnrichment = true;

fs.writeFileSync(f, JSON.stringify(d, null, 2));
console.log('Roger fixed: s1=' + d.skills.skill1.name + ' s2=' + d.skills.skill2.name + ' ult=' + d.skills.ultimate.name);
