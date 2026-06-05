import fs from 'fs';

const HEROES_DIR = 'data/heroes';

function fixKagura() {
  const f = `${HEROES_DIR}/kagura.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const s = d.skills;

  // Correct mapping per Liquipedia structure:
  // passive: Yin Yang Gathering (correct)
  // skill1: Seimei Umbrella Open (With Umbrella) — already correct
  // skill2: Seimei Umbrella Open (Without Umbrella) — WRONG LABEL, should be Skill 1 (Without)
  // ultimate: Rasho Umbrella Flee (With Umbrella) — WRONG LABEL, should be Skill 2 (With)
  // extra1: Rasho Umbrella Flee (Without Umbrella) — should be Skill 2 (Without)
  // extra2: Yin Yang Overturn (With Umbrella) — should be Ultimate (With)
  // extra3: Yin Yang Overturn (Without Umbrella) — should be Ultimate (Without)

  // Fix skill2 → Skill 1 (Without Umbrella)
  s.skill2.skillSlot = 'skill1';
  s.skill2.displayLabel = 'Skill 1 (Without Umbrella)';
  s.skill2.variant = 'Without Umbrella';

  // Fix ultimate → Skill 2 (With Umbrella)
  s.ultimate.skillSlot = 'skill2';
  s.ultimate.displayLabel = 'Skill 2 (With Umbrella)';
  s.ultimate.variant = 'With Umbrella';

  // Fix extra1 → Skill 2 (Without Umbrella)
  s.extra1.skillSlot = 'skill2';
  s.extra1.displayLabel = 'Skill 2 (Without Umbrella)';
  s.extra1.variant = 'Without Umbrella';

  // Fix extra2 → Ultimate (With Umbrella) — already correct from last fix
  s.extra2.skillSlot = 'ultimate';
  s.extra2.displayLabel = 'Ultimate (With Umbrella)';
  s.extra2.variant = 'With Umbrella';

  // Fix extra3 → Ultimate (Without Umbrella) — already correct from last fix
  s.extra3.skillSlot = 'ultimate';
  s.extra3.displayLabel = 'Ultimate (Without Umbrella)';
  s.extra3.variant = 'Without Umbrella';

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('✅ Kagura: All slots corrected');
}

function fixSelena() {
  const f = `${HEROES_DIR}/selena.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const s = d.skills;

  // Based on user-confirmed structure:
  // passive: Symbiosis (correct)
  // skill1: Abyssal Trap → Skill 1 (Elven Form)
  // skill2: Soul Eater → Skill 1 (Abyssal Form)
  // ultimate: Abyssal Arrow → Skill 2 (Elven Form)
  // extra1: Garotte → Skill 2 (Abyssal Form)
  // extra2: Primal Darkness → Ultimate (Transform to Abyssal)
  // extra3: Blessing of the Moon Goddess → Ultimate (Transform to Elven)

  s.skill1.displayLabel = 'Skill 1 (Elven Form)'; s.skill1.variant = 'Elven Form'; s.skill1.skillSlot = 'skill1';
  s.skill2.displayLabel = 'Skill 1 (Abyssal Form)'; s.skill2.variant = 'Abyssal Form'; s.skill2.skillSlot = 'skill1';
  s.ultimate.displayLabel = 'Skill 2 (Elven Form)'; s.ultimate.variant = 'Elven Form'; s.ultimate.skillSlot = 'skill2';
  s.extra1.displayLabel = 'Skill 2 (Abyssal Form)'; s.extra1.variant = 'Abyssal Form'; s.extra1.skillSlot = 'skill2';
  s.extra2.displayLabel = 'Ultimate (Transform to Abyssal)'; s.extra2.variant = 'Transform to Abyssal'; s.extra2.skillSlot = 'ultimate';
  s.extra3.displayLabel = 'Ultimate (Transform to Elven)'; s.extra3.variant = 'Transform to Elven'; s.extra3.skillSlot = 'ultimate';

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('✅ Selena: Form labels applied');
}

function fixLunox() {
  const f = `${HEROES_DIR}/lunox.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const s = d.skills;

  // Based on user-confirmed structure:
  // passive: Dreamland Twist (correct)
  // skill1: Starlight Pulse → Skill 1 (Light Form)
  // skill2: Chaos Assault → Skill 1 (Dark Form)
  // ultimate: Cosmic Fission → Skill 2
  // extra1: Order & Chaos → Special Mechanic
  // extra2: Power of Order: Brilliance → Ultimate (Light Form)
  // extra3: Power of Chaos: Darkening → Ultimate (Dark Form)

  s.skill1.displayLabel = 'Skill 1 (Light Form)'; s.skill1.variant = 'Light Form'; s.skill1.skillSlot = 'skill1';
  s.skill2.displayLabel = 'Skill 1 (Dark Form)'; s.skill2.variant = 'Dark Form'; s.skill2.skillSlot = 'skill1';
  s.ultimate.displayLabel = 'Skill 2'; s.ultimate.variant = ''; s.ultimate.skillSlot = 'skill2';
  s.extra1.displayLabel = 'Special Mechanic'; s.extra1.variant = ''; s.extra1.skillSlot = 'special';
  s.extra2.displayLabel = 'Ultimate (Light Form)'; s.extra2.variant = 'Light Form'; s.extra2.skillSlot = 'ultimate';
  s.extra3.displayLabel = 'Ultimate (Dark Form)'; s.extra3.variant = 'Dark Form'; s.extra3.skillSlot = 'ultimate';

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('✅ Lunox: Light/Dark form labels applied');
}

function fixHanzo() {
  const f = `${HEROES_DIR}/hanzo.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const s = d.skills;

  // Based on user-confirmed structure:
  // passive: Ame no Habakiri (correct)
  // skill1: Ninjutsu: Demon Feast → Skill 1 (Human Form)
  // skill2: Forbidden Ninjutsu: Soul Snatch → Skill 2 (Human Form)
  // ultimate: Ninjutsu: Dark Mist → Skill 3 (Human Form)
  // extra1: Forbidden Ninjutsu: Black Mist → Skill 1 (Demon Form)
  // extra2: Kinjutsu: Pinnacle Ninja → Ultimate (Transform)
  // extra3: Ninjutsu Flee: Return → Skill 2 (Demon Form)

  s.skill1.displayLabel = 'Skill 1 (Human Form)'; s.skill1.variant = 'Human Form'; s.skill1.skillSlot = 'skill1';
  s.skill2.displayLabel = 'Skill 2 (Human Form)'; s.skill2.variant = 'Human Form'; s.skill2.skillSlot = 'skill2';
  s.ultimate.displayLabel = 'Skill 3 (Human Form)'; s.ultimate.variant = 'Human Form'; s.ultimate.skillSlot = 'skill3';
  s.extra1.displayLabel = 'Skill 1 (Demon Form)'; s.extra1.variant = 'Demon Form'; s.extra1.skillSlot = 'skill1';
  s.extra2.displayLabel = 'Ultimate (Transform)'; s.extra2.variant = 'Transform'; s.extra2.skillSlot = 'ultimate';
  s.extra3.displayLabel = 'Skill 2 (Demon Form)'; s.extra3.variant = 'Demon Form'; s.extra3.skillSlot = 'skill2';

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('✅ Hanzo: Human/Demon form labels applied');
}

async function fixRoger() {
  const f = `${HEROES_DIR}/roger.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // Re-fetch from Official API to fix empty skill1
  try {
    const res = await fetch('https://mapi.mobilelegends.com/hero/detail?id=39', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const json = await res.json();
    const skills = json.data?.skill?.skill;
    if (skills && skills.length >= 4) {
      // Official API order: [0]=Open Fire, [1]=Hunter's Steps, [2]=Wolf Transformation, [3]=Full Moon Curse
      // Map: skill1=Open Fire, skill2=Hunter's Steps, ultimate=Wolf Transformation, passive=Full Moon Curse
      const cleanHtml = (h: string) => h.replace(/<font[^>]*>/gi,'').replace(/<\/font>/gi,'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

      // Fix skill1 (was empty)
      d.skills.skill1.name = skills[0].name; // Open Fire
      d.skills.skill1.description = cleanHtml(skills[0].des);
      d.skills.skill1.tips = cleanHtml(skills[0].tips || '');
      d.skills.skill1.iconName = skills[0].name.replace(/\s+/g, '_');

      // Verify skill2 and ultimate are correct
      if (d.skills.skill2.name === 'Open Fire' && skills[1].name === "Hunter's Steps") {
        // skill2 is currently Open Fire but should be Hunter's Steps based on Official
        // Actually current: skill2=Open Fire, ult=Hunter's Steps
        // Official: [0]=Open Fire (S1), [1]=Hunter's Steps (S2), [2]=Wolf Transformation (Ult)
        d.skills.skill2.name = skills[1].name;
        d.skills.skill2.description = cleanHtml(skills[1].des);
        d.skills.ultimate.name = skills[2].name;
        d.skills.ultimate.description = cleanHtml(skills[2].des);
      }

      // Add labels
      d.skills.skill1.displayLabel = 'Skill 1 (Human Form)'; d.skills.skill1.variant = 'Human Form'; d.skills.skill1.skillSlot = 'skill1';
      d.skills.skill2.displayLabel = 'Skill 2 (Human Form)'; d.skills.skill2.variant = 'Human Form'; d.skills.skill2.skillSlot = 'skill2';
      d.skills.ultimate.displayLabel = 'Ultimate (Transform)'; d.skills.ultimate.variant = 'Transform'; d.skills.ultimate.skillSlot = 'ultimate';

      // Add mechanicNote
      d.mechanicNote = 'Roger has additional Wolf Form abilities after transformation (Lycan Pounce, Bloodthirsty Howl). Detailed Wolf Form skill data not currently available in local source.';
      d.needsEnrichment = true;

      console.log('✅ Roger: Fixed from Official API. skill1=' + d.skills.skill1.name + ', skill2=' + d.skills.skill2.name + ', ult=' + d.skills.ultimate.name);
    } else {
      console.log('⚠️ Roger: Official API response unexpected');
    }
  } catch (err: any) {
    console.log('❌ Roger: API fetch failed: ' + err.message);
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
}

async function main() {
  console.log('=== Fixing Special Heroes ===\n');
  fixKagura();
  fixSelena();
  fixLunox();
  fixHanzo();
  await fixRoger();

  // Verify hero count
  const count = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json')).length;
  console.log('\nHero file count: ' + count);
  if (count !== 132) { console.error('ABORT: Hero count changed!'); process.exit(1); }
  console.log('✅ Hero count: 132');
}

main();
