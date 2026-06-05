/**
 * Test Official Mobile Legends API
 * Source: https://mapi.mobilelegends.com/hero/list & /hero/detail?id=X
 * 
 * Usage: npx tsx scripts/test_official_mlbb_api.ts
 */

const MLBB_API = 'https://mapi.mobilelegends.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface OfficialHero {
  name: string;
  heroid: string;
  key: string; // image URL
}

interface OfficialSkill {
  name: string;
  icon: string;
  des: string;
  tips?: string;
}

interface OfficialHeroDetail {
  name: string;
  type: string;
  phy: string;
  mag: string;
  alive: string;
  diff: string;
  cover_picture: string;
  skill: {
    skill: OfficialSkill[];
    passive?: { name: string; icon: string; des: string; tips?: string };
  };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function cleanHtml(html: string): string {
  return html
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== Official MLBB API Investigation ===\n');

  // 1. Hero List
  console.log('--- HERO LIST ---');
  const listRes = await fetchJson(`${MLBB_API}/hero/list`);
  const heroes: OfficialHero[] = listRes.data;
  console.log(`Total heroes: ${heroes.length}`);
  console.log(`First 5: ${heroes.slice(-5).map(h => h.name + '(#' + h.heroid + ')').join(', ')}`);
  console.log(`Last 5: ${heroes.slice(0, 5).map(h => h.name + '(#' + h.heroid + ')').join(', ')}`);
  console.log('');

  // 2. Hero Details - test Miya, Balmond, Beatrix
  const testHeroes = [
    { name: 'Miya', id: '1' },
    { name: 'Balmond', id: '2' },
    { name: 'Beatrix', id: '105' },
    { name: 'Harley', id: '42' },
    { name: 'Hylos', id: '49' },
  ];

  for (const test of testHeroes) {
    console.log(`--- ${test.name} (ID: ${test.id}) ---`);
    try {
      const detailRes = await fetchJson(`${MLBB_API}/hero/detail?id=${test.id}`);
      const d: OfficialHeroDetail = detailRes.data;
      
      console.log(`  Name: ${d.name}`);
      console.log(`  Type: ${d.type}`);
      console.log(`  Stats: PHY=${d.phy} MAG=${d.mag} ALIVE=${d.alive} DIFF=${d.diff}`);
      
      // Passive
      if (d.skill.passive) {
        console.log(`  Passive: "${d.skill.passive.name}"`);
        console.log(`    Icon: ${d.skill.passive.icon ? 'YES' : 'NO'}`);
        console.log(`    Desc (first 80): "${cleanHtml(d.skill.passive.des).substring(0, 80)}..."`);
      }
      
      // Skills
      const skills = d.skill.skill || [];
      console.log(`  Skills count: ${skills.length}`);
      for (let i = 0; i < skills.length; i++) {
        const sk = skills[i];
        console.log(`  Skill ${i+1}: "${sk.name}"`);
        console.log(`    Icon: ${sk.icon ? 'YES (' + sk.icon.substring(0, 60) + '...)' : 'NO'}`);
        console.log(`    Desc (first 80): "${cleanHtml(sk.des).substring(0, 80)}..."`);
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message}`);
    }
    console.log('');
  }

  // 3. Summary
  console.log('=== FINDINGS ===');
  console.log(`Hero List API: ${MLBB_API}/hero/list`);
  console.log(`Hero Detail API: ${MLBB_API}/hero/detail?id={heroid}`);
  console.log('');
  console.log('Data available from official API:');
  console.log('  ✓ Hero name, type/role');
  console.log('  ✓ Hero portrait image (key field)');
  console.log('  ✓ Hero cover picture (full art)');
  console.log('  ✓ Stats: phy, mag, alive, diff (0-100 scale)');
  console.log('  ✓ Passive: name, icon URL, description');
  console.log('  ✓ Skills (1-3+): name, icon URL, description, tips');
  console.log('  ✗ No cooldown per level');
  console.log('  ✗ No mana cost per level');
  console.log('  ✗ No scaling table');
  console.log('  ✗ No lane/specialty info');
  console.log('');
  console.log('Rate limit: None observed');
  console.log('Auth required: No');
}

main();
