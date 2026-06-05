import fs from 'fs';
import path from 'path';

function cleanWikitext(text: string) {
  if (!text) return null;
  let cleaned = text.replace(/<[^>]*>/g, "");
  cleaned = cleaned.replace(/{{bgcolortext\|[^|]+\|([^}]+)}}/ig, "$1");
  cleaned = cleaned.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1");
  cleaned = cleaned.replace(/{{[^|]+\|([^}]+)}}/g, "$1");
  cleaned = cleaned.replace(/'''/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function parseInfobox(wt: string, heroName: string) {
  let infoboxWikitext = '';
  const infoboxStart = wt.indexOf('{{Infobox hero');
  if(infoboxStart !== -1) {
      let braceCount = 0;
      let infoboxEnd = -1;
      for (let i = infoboxStart; i < wt.length; i++) {
        if (wt.slice(i, i + 2) === '{{') braceCount++;
        if (wt.slice(i, i + 2) === '}}') {
          braceCount--;
          if (braceCount === 0) { infoboxEnd = i + 2; break; }
        }
      }
      infoboxWikitext = wt.substring(infoboxStart, infoboxEnd !== -1 ? infoboxEnd : wt.length);
  }

  const extractField = (key: string) => {
    const match = infoboxWikitext.match(new RegExp(`\\|${key}\\s*=\\s*([^\\n|]+)`));
    return match ? match[1].trim() : null;
  };

  const hp = parseInt(extractField('hp') || '', 10);
  const spec1 = extractField('specialty1');
  const spec2 = extractField('specialty2');
  
  return {
    identity: {
      name: extractField('name') || heroName,
      title: extractField('title') || null,
      role: extractField('primaryrole') || extractField('role') || null,
      lane: extractField('lane') || null,
      release_date: extractField('releasedate') || null,
      specialty: spec1 && spec2 ? `${spec1} / ${spec2}` : (spec1 || spec2 || null),
      resource: extractField('resourcebar') || null,
      region: extractField('region') || null,
      city: extractField('city') || null
    },
    base_stats: {
      hp: !isNaN(hp) ? hp : null,
      hp_regen: parseInt(extractField('hpreg') || '', 10) || null,
      mana: parseInt(extractField('mana') || '', 10) || null,
      mana_regen: parseInt(extractField('manareg') || '', 10) || null,
      physical_attack: parseInt(extractField('phyatk') || '', 10) || null,
      physical_defense: parseInt(extractField('phydef') || '', 10) || null,
      magic_power: parseInt(extractField('mp') || '', 10) || parseInt(extractField('magicpower') || '', 10) || 0,
      magic_defense: parseInt(extractField('magdef') || '', 10) || null,
      attack_speed: extractField('atkspeed') || null,
      movement_speed: parseInt(extractField('movespeed') || '', 10) || null,
    }
  };
}

function parseSkills(wt: string) {
  const result: any = {};
  // Find AbilityCard instances
  const cards = [...wt.matchAll(/{{AbilityCard([\s\S]*?)}}/g)];
  
  const getField = (cardWt: string, key: string) => {
      const m = cardWt.match(new RegExp(`\\|${key}\\s*=\s*([^\\n|]+)`));
      return m ? m[1].trim() : "";
  };
  
  const getDesc = (cardWt: string) => {
      const m = cardWt.match(/\|desc\s*=([\s\S]*?)(?:\n\|scale\s*=|$)/);
      return m ? m[1].trim() : "";
  };
  
  // Extract scale
  const getScale = (cardWt: string) => {
      const m = cardWt.match(/{{AbilityScale([\s\S]*?)}}/);
      if(!m) return '';
      const rows = m[1].trim().split('\n').map(line => {
          const match = line.match(/\|(\w+)\s*=\s*(.+)/);
          return match ? `${match[1]} ${match[2]}` : null;
      }).filter(Boolean);
      return " " + rows.join(" ");
  };

  let skillCounter = 1;
  for(let cardMatch of cards) {
      const cardWt = cardMatch[1];
      const name = getField(cardWt, 'name');
      let desc = cleanWikitext(getDesc(cardWt)) || '';
      const scaleStr = cleanWikitext(getScale(cardWt)) || '';
      if(!name) continue;
      
      let key = 'passive';
      if(result['passive'] && skillCounter === 1) { key = 'skill_1'; skillCounter++; }
      else if(skillCounter === 2) { key = 'skill_2'; skillCounter++; }
      else if(skillCounter === 3) { key = 'skill_3'; skillCounter++; }
      else if(skillCounter >= 4) { key = 'ultimate'; skillCounter++; }
      
      const type = getField(cardWt, 'type');
      const cd = getField(cardWt, 'cd') || getField(cardWt, 'cooldown');
      const mana = getField(cardWt, 'mana') || getField(cardWt, 'manacost');
      const vamp = getField(cardWt, 'vamp') || getField(cardWt, 'spellvamp');
      
      let parts = [];
      if (name) parts.push(name);
      if (type) parts.push(type);
      let stats = [];
      if (cd) stats.push(`CD: ${cd.replace(/<[^>]*>/g, '').trim()}`);
      if (mana) stats.push(`Mana Cost: ${mana.replace(/<[^>]*>/g, '').trim()}`);
      if (vamp) stats.push(`Spell Vamp Ratio: ${vamp.includes('%') ? vamp : vamp + '%'}`);
      if (stats.length > 0) parts.push(stats.join(" | "));
      
      if (desc) parts.push(desc);
      if (scaleStr) parts.push(scaleStr);
      
      result[key] = parts.join(" ");
  }

  return result;
}

async function scrapeHero(heroName: string): Promise<any> {
  const res = await fetch(`https://liquipedia.net/mobilelegends/api.php?action=parse&page=${encodeURIComponent(heroName)}&prop=wikitext&format=json`, {
    headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" }
  });
  const json = await res.json();
  if (!json.parse || !json.parse.wikitext) return null;
  let wt = json.parse.wikitext['*'];
  
  let redirectMatch = wt.match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  if (redirectMatch) {
	  return await scrapeHero(redirectMatch[1]);
  }

  const infobox = parseInfobox(wt, heroName);
  if (!infobox) return null;

  return {
    ...infobox,
    esports_stats: {
      win_rate: "N/A"
    },
    skills: parseSkills(wt)
  };
}

async function run() {
    try {
        const res = await fetch("https://liquipedia.net/mobilelegends/api.php?action=query&list=categorymembers&cmtitle=Category:Hero&cmlimit=250&format=json", {
        headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" }
        });
        const data = await res.json();
        const heroes = data.query.categorymembers.map((member: any) => member.title);
        console.log("TOTAL HERO:", heroes.length);
        
        let allDict: any = {};
        const outPath = path.join(process.cwd(), 'data', 'heroes_liquipedia.json');
        if (fs.existsSync(outPath)) {
          allDict = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        }

        for(const hero of heroes) {
            if (allDict[hero]) continue;
            console.log("Scraping: " + hero);
            try {
                let heroData = await scrapeHero(hero);
                if (heroData) {
                   allDict[hero] = heroData;
                   fs.writeFileSync(outPath, JSON.stringify(allDict, null, 2));
                }
            } catch (e: any) {
                console.log("Failed: " + hero + " " + e.message);
                // Probably rate limited, break so we can retry later or sleep longer
                break;
            }
            await new Promise(r => setTimeout(r, 2500)); // Respectful delay (2.5s) to avoid CF blocks
        }
        console.log("Saved to data/heroes_liquipedia.json");
    } catch(e) {
        console.error(e);
    }
}

if (process.argv[1] && process.argv[1].endsWith('scrapeLiquipediaApi.ts')) {
    run();
}
