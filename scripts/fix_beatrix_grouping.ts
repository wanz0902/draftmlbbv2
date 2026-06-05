import fs from 'fs';

const f = 'data/heroes/beatrix.json';
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
const oldSkills = d.skills;
const newSkills: Record<string, any> = {};

const variants = ['Bennett', 'Nibiru', 'Renner', 'Wesker'];
const mgSlots = ['passive', 'skill1', 'skill2', 'ultimate'];

// 4 Mechanical Genius → all Passive with weapon variant
for (let i = 0; i < 4; i++) {
  const key = 'passive' + (i === 0 ? '' : String(i + 1));
  const src = oldSkills[mgSlots[i]];
  if (src) {
    newSkills[key] = { ...src, skillSlot: 'passive', displayLabel: `Passive (${variants[i]})`, variant: variants[i], displayName: `Mechanical Genius (${variants[i]})` };
  }
}

// Masterful Gunner → Skill 1
if (oldSkills.extra1) {
  newSkills.skill1 = { ...oldSkills.extra1, skillSlot: 'skill1', displayLabel: 'Skill 1', variant: '', displayName: '' };
}

// Tactical Reposition → Skill 2
if (oldSkills.extra2) {
  newSkills.skill2 = { ...oldSkills.extra2, skillSlot: 'skill2', displayLabel: 'Skill 2', variant: '', displayName: '' };
}

// Ultimate variants
const ultSrc = ['extra3', 'extra4', 'extra5', 'extra6'];
for (let i = 0; i < 4; i++) {
  const key = 'ultimate' + (i === 0 ? '' : String(i + 1));
  const src = oldSkills[ultSrc[i]];
  if (src) {
    newSkills[key] = { ...src, skillSlot: 'ultimate', displayLabel: `Ultimate (${variants[i]})`, variant: variants[i], displayName: `${src.name} (${variants[i]})` };
  }
}

// Need Backup → Special Skill
if (oldSkills.extra7) {
  newSkills.special = { ...oldSkills.extra7, skillSlot: 'special', displayLabel: 'Special Skill', variant: '', displayName: '' };
}

d.skills = newSkills;
fs.writeFileSync(f, JSON.stringify(d, null, 2));

console.log('Beatrix restructured:');
for (const [k, v] of Object.entries(newSkills)) {
  console.log(`  ${k}: ${(v as any).displayLabel} — ${(v as any).name}`);
}
console.log(`\nTotal skills: ${Object.keys(newSkills).length}`);
