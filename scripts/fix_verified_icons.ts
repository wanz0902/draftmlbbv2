import fs from 'fs';

const HEROES_DIR = 'data/heroes';

// === SELENA: Fix icon remapping + add missing ===
const sf = `${HEROES_DIR}/selena.json`;
const s = JSON.parse(fs.readFileSync(sf, 'utf8'));

// skill2 (Soul Eater) currently points to abyssal_arrow.png → fix to soul_eater.png
s.skills.skill2.iconUrl = '/raw-assets/skill_icons/selena/soul_eater.png';
s.skills.skill2.iconName = 'Soul_Eater';

// ultimate (Abyssal Arrow) currently points to primal_darkness.png → fix to abyssal_arrow.png
s.skills.ultimate.iconUrl = '/raw-assets/skill_icons/selena/abyssal_arrow.png';
s.skills.ultimate.iconName = 'Abyssal_Arrow';

// extra1 (Garotte) → new download
s.skills.extra1.iconUrl = '/raw-assets/skill_icons/selena/garotte.png';
s.skills.extra1.iconName = 'Garotte';

// extra2 (Primal Darkness) → use existing file (was wrongly assigned to ultimate before)
s.skills.extra2.iconUrl = '/raw-assets/skill_icons/selena/primal_darkness.png';
s.skills.extra2.iconName = 'Primal_Darkness';

// extra3 (Blessing of the Moon Goddess) → new download
s.skills.extra3.iconUrl = '/raw-assets/skill_icons/selena/blessing_of_the_moon_goddess.png';
s.skills.extra3.iconName = 'Blessing_of_the_Moon_Goddess';

fs.writeFileSync(sf, JSON.stringify(s, null, 2));
console.log('Selena: icons remapped + 3 new icons assigned');

// === ROGER: Add Wolf Transformation icon ===
const rf = `${HEROES_DIR}/roger.json`;
const r = JSON.parse(fs.readFileSync(rf, 'utf8'));
r.skills.ultimate.iconUrl = '/raw-assets/skill_icons/roger/wolf_transformation.png';
r.skills.ultimate.iconName = 'Wolf_Transformation';
fs.writeFileSync(rf, JSON.stringify(r, null, 2));
console.log('Roger: Wolf Transformation icon added');

// === ZHASK: Add Dominator's Descent icon ===
const zf = `${HEROES_DIR}/zhask.json`;
const z = JSON.parse(fs.readFileSync(zf, 'utf8'));
z.skills.ultimate.iconUrl = '/raw-assets/skill_icons/zhask/dominators_descent.png';
z.skills.ultimate.iconName = "Dominator's_Descent";
fs.writeFileSync(zf, JSON.stringify(z, null, 2));
console.log('Zhask: Dominators Descent icon added');

// === PHARSA: Add Wings by Wings icon ===
const pf = `${HEROES_DIR}/pharsa.json`;
const p = JSON.parse(fs.readFileSync(pf, 'utf8'));
p.skills.extra1.iconUrl = '/raw-assets/skill_icons/pharsa/wings_by_wings.png';
p.skills.extra1.iconName = 'Wings_by_Wings';
fs.writeFileSync(pf, JSON.stringify(p, null, 2));
console.log('Pharsa: Wings by Wings icon added');

// Verify hero count
const count = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json')).length;
console.log('\nHero count: ' + count);
if (count !== 132) { console.error('ABORT!'); process.exit(1); }
console.log('OK');
