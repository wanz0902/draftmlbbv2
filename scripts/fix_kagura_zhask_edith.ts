import fs from 'fs';

// === KAGURA: Relabel extra1/2/3 ===
const kf = 'data/heroes/kagura.json';
const k = JSON.parse(fs.readFileSync(kf, 'utf8'));
if (k.skills.extra1) { k.skills.extra1.skillSlot = 'skill2'; k.skills.extra1.displayLabel = 'Skill 2 (Without Umbrella)'; k.skills.extra1.variant = 'Without Umbrella'; }
if (k.skills.extra2) { k.skills.extra2.skillSlot = 'ultimate'; k.skills.extra2.displayLabel = 'Ultimate (With Umbrella)'; k.skills.extra2.variant = 'With Umbrella'; }
if (k.skills.extra3) { k.skills.extra3.skillSlot = 'ultimate'; k.skills.extra3.displayLabel = 'Ultimate (Without Umbrella)'; k.skills.extra3.variant = 'Without Umbrella'; if (k.skills.extra3.name === 'Yin yang Overturn') k.skills.extra3.name = 'Yin Yang Overturn'; }
fs.writeFileSync(kf, JSON.stringify(k, null, 2));
console.log('Kagura: relabeled extra1→Skill2(WO), extra2→Ult(W), extra3→Ult(WO)');

// === ZHASK: Swap Hive Clones ↔ Dominator's Descent ===
const zf = 'data/heroes/zhask.json';
const z = JSON.parse(fs.readFileSync(zf, 'utf8'));
const oldUlt = z.skills.ultimate;
const oldExtra = z.skills.extra1;
oldUlt.skillSlot = 'skill3'; oldUlt.displayLabel = 'Skill 3';
oldExtra.skillSlot = 'ultimate'; oldExtra.displayLabel = 'Ultimate';
z.skills.skill3 = oldUlt;
z.skills.ultimate = oldExtra;
delete z.skills.extra1;
fs.writeFileSync(zf, JSON.stringify(z, null, 2));
console.log('Zhask: Hive Clones→Skill 3, Dominators Descent→Ultimate');

// === EDITH: mechanicNote only ===
const ef = 'data/heroes/edith.json';
const e = JSON.parse(fs.readFileSync(ef, 'utf8'));
e.mechanicNote = 'Edith transforms into Marksman Form after using Ultimate. Marksman Form skills (Divine Retribution, Lightning Bolt) not currently available in local source.';
e.needsEnrichment = true;
fs.writeFileSync(ef, JSON.stringify(e, null, 2));
console.log('Edith: mechanicNote added');

// Verify
const count = fs.readdirSync('data/heroes').filter(f => f.endsWith('.json')).length;
console.log('Hero file count: ' + count);
if (count !== 132) { console.error('ABORT!'); process.exit(1); }
console.log('OK');
