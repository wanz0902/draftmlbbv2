const fs = require('fs');
const path = require('path');

function cleanWikitext(text) {
  if (!text) return null;
  let cleaned = text.replace(/<[^>]*>/g, "");
  cleaned = cleaned.replace(/{{bgcolortext\|[^|]+\|([^}]+)}}/ig, "$1");
  cleaned = cleaned.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1");
  cleaned = cleaned.replace(/{{[^|]+\|([^}]+)}}/g, "$1");
  cleaned = cleaned.replace(/'''/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function parseInfobox(wt, heroName) {
  const infoboxStart = wt.indexOf("{{Infobox hero");
  if (infoboxStart === -1) return null;
  let braceCount = 0;
  let infoboxEnd = -1;
  for (let i = infoboxStart; i < wt.length; i++) {
    if (wt.slice(i, i + 2) === "{{") braceCount++;
    if (wt.slice(i, i + 2) === "}}") {
      braceCount--;
      if (braceCount === 0) {
        infoboxEnd = i + 2;
        break;
      }
    }
  }
  const infoboxWikitext = wt.substring(infoboxStart, infoboxEnd !== -1 ? infoboxEnd : wt.length);
  const extractField = (key) => {
    const match = infoboxWikitext.match(new RegExp(`\\|${key}\\s*=\\s*([^\\n|]+)`));
    return match ? match[1].trim() : null;
  };

  const hp = parseInt(extractField("hp"), 10);
  const spec1 = extractField("specialty1");
  const spec2 = extractField("specialty2");
  const specialty = [];
  if (spec1) specialty.push(spec1);
  if (spec2) specialty.push(spec2);

  return {
    heroName: extractField("name") || heroName,
    role: extractField("primaryrole") || extractField("role") || null,
    lane: extractField("lane") || null,
    specialty: specialty.length > 0 ? specialty : ["Unknown"],
    baseStats: {
      hp: !isNaN(hp) ? hp : 2500,
      hpRegen: parseInt(extractField("hpreg"), 10) || 30,
      mana: parseInt(extractField("mana"), 10) || 0,
      manaRegen: parseInt(extractField("manareg"), 10) || 0,
      physicalAttack: parseInt(extractField("phyatk"), 10) || 100,
      physicalDefense: parseInt(extractField("phydef"), 10) || 15,
      magicPower: parseInt(extractField("mp"), 10) || parseInt(extractField("magicpower"), 10) || 0,
      magicDefense: parseInt(extractField("magdef"), 10) || 10,
      attackSpeed: parseFloat(extractField("atkspeed")) || 0.8,
      movementSpeed: parseInt(extractField("movespeed"), 10) || 250,
    }
  };
}

function parseSkills(wt) {
  const result = {};
  const cards = [...wt.matchAll(/{{AbilityCard([\s\S]*?)}}/g)];
  
  const getField = (cardWt, key) => {
      const m = cardWt.match(new RegExp(`\\|${key}\\s*=\s*([^\\n|]+)`));
      return m ? m[1].trim() : "";
  };
  
  const getDesc = (cardWt) => {
      const m = cardWt.match(/\|desc\s*=([\s\S]*?)(?:\n\|scale\s*=|$)/);
      return m ? cleanWikitext(m[1]) : "";
  };

  let skillCounter = 1;
  for(let cardMatch of cards) {
      const cardWt = cardMatch[1];
      const name = getField(cardWt, 'name');
      if(!name) continue;
      
      let key = 'passive';
      if(result['passive'] && skillCounter === 1) { key = 'skill1'; skillCounter++; }
      else if(skillCounter === 2) { key = 'skill2'; skillCounter++; }
      else if(skillCounter === 3) { key = 'skill3'; skillCounter++; }
      else if(skillCounter >= 4) { key = 'ultimate'; skillCounter++; }
      else { key = 'passive'; }
      
      result[key] = { 
          name: name,
          description: getDesc(cardWt),
          damageType: getField(cardWt, 'type').toUpperCase() || "NONE",
          cooldown: [getField(cardWt, 'cd') || getField(cardWt, 'cooldown')],
          manaCost: [getField(cardWt, 'mana') || getField(cardWt, 'manacost')]
      };
  }

  return result;
}

async function scrapeHero(heroName) {
  const res = await fetch(`https://liquipedia.net/mobilelegends/api.php?action=parse&page=${encodeURIComponent(heroName)}&prop=wikitext&format=json`, {
    headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" }
  });
  const json = await res.json();
  if (!json.parse || !json.parse.wikitext) {
    throw new Error(`Failed to parse wikitext for ${heroName}`);
  }
  const wt = json.parse.wikitext['*'];
  
  let redirectMatch = wt.match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  if (redirectMatch) {
	  return await scrapeHero(redirectMatch[1]);
  }

  const infobox = parseInfobox(wt, heroName);
  if (!infobox) return null;

  return {
    ...infobox,
    skills: parseSkills(wt)
  };
}

(async () => {
    try {
        const heroFiles = fs.readdirSync('data/heroes').filter(f => f.endsWith('.json'));
        
        for(let file of heroFiles) {
            const p = path.join('data/heroes', file);
            const existing = JSON.parse(fs.readFileSync(p, 'utf8'));
            
            // If it already has good data, skip. Check 'specialty'
            if (existing.specialty && existing.specialty.length > 0 && existing.specialty[0] !== "Unknown") {
                const hasSkills = Object.keys(existing.skills || {}).length > 0 && existing.skills.passive && existing.skills.passive.description !== "Intelligence data missing.";
                if (hasSkills) continue;
            }
            
            console.log("Scraping: " + existing.heroName);
            try {
                let heroData = await scrapeHero(existing.heroName);
                if (heroData) {
                   // Patch existing
                   if (heroData.specialty) existing.specialty = heroData.specialty;
                   if (heroData.baseStats) existing.baseStats = heroData.baseStats;
                   if (heroData.skills) existing.skills = heroData.skills;
                   if (heroData.role) existing.role = Array.isArray(heroData.role) ? heroData.role : [heroData.role];
                   if (heroData.lane) existing.lane = heroData.lane;
                   
                   fs.writeFileSync(p, JSON.stringify(existing, null, 2));
                }
            } catch (e) {
                console.log("Failed: " + existing.heroName, e.message);
                // if blocked, wait long
                if(e.message.includes('Unexpected token')) {
                     console.log("Rate limit hit!");
                     break;
                }
            }
            await new Promise(r => setTimeout(r, 600)); 
        }

        console.log("Fix completed!");
    } catch(e) {
        console.error(e);
    }
})();