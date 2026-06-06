import fs from 'fs';
import path from 'path';

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

function parseInfobox(wt) {
  const extractField = (key) => {
    const match = wt.match(new RegExp(`\\|${key}\\s*=\\s*([^\\n|]+)`));
    return match ? match[1].trim() : null;
  };
  return { specialty1: extractField('specialty1'), specialty2: extractField('specialty2'), lane: extractField('lane') };
}

function parseAbility(wt, abilityType) {
  const regex = new RegExp(`={2,3}${abilityType}={2,3}\\n\s*{{AbilityCard(?:[^}]*?)\\|name\s*=\s*([^\\n|]+)(?:[^}]*?)\\|desc\s*=\s*([^\\n|]+)`, 'i');
  const match = wt.match(regex);
  return match ? { name: cleanWikitext(match[1]), desc: cleanWikitext(match[2]) } : null;
}

async function updateHero(heroFile) {
  const data = JSON.parse(fs.readFileSync(heroFile, 'utf8'));
  if (data.specialty && data.specialty[0] !== "Unknown") return; // already updated
  
  const heroName = data.heroName;
  console.log('Fetching', heroName);
  const res = await fetch(`https://liquipedia.net/mobilelegends/api.php?action=parse&page=${encodeURIComponent(heroName)}&prop=wikitext&format=json`, {
    headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" }
  });
  const json = await res.json();
  if (!json.parse || !json.parse.wikitext) return;
  let wt = json.parse.wikitext['*'];
  
  // Need to handle regex matching for AbilityCard properly instead of strict sequence
  // Better approach: extract each card
  const cards = [...wt.matchAll(/{{AbilityCard([\s\S]*?)}}/g)];
  
  const getField = (cardWt, key) => {
      const m = cardWt.match(new RegExp(`\\|${key}\\s*=\s*([^\\n|]+)`));
      return m ? m[1].trim() : "";
  };
  
  const getDesc = (cardWt) => {
      const m = cardWt.match(/\|desc\s*=([\s\S]*?)(?:\n\|scale\s*=|$)/);
      return m ? m[1].trim() : "";
  };

  let parsedSkills = {};
  let skillCounter = 1;
  for(let cardMatch of cards) {
      const cardWt = cardMatch[1];
      const name = getField(cardWt, 'name');
      const desc = cleanWikitext(getDesc(cardWt));
      if(!name) continue;
      
      let key = 'passive';
      if(parsedSkills['passive'] && skillCounter === 1) { key = 'skill1'; skillCounter++; }
      else if(skillCounter === 2) { key = 'skill2'; skillCounter++; }
      else if(skillCounter === 3) { key = 'skill3'; skillCounter++; }
      else if(skillCounter === 4) { key = 'ultimate'; skillCounter++; }
      else { key = 'ultimate'; }
      
      parsedSkills[key] = {name, desc};
  }

  const infobox = parseInfobox(wt);
  
  let newSpecialty = [];
  if (infobox.specialty1) newSpecialty.push(infobox.specialty1);
  if (infobox.specialty2) newSpecialty.push(infobox.specialty2);
  if (newSpecialty.length > 0) data.specialty = newSpecialty;
  if (infobox.lane && data.lane === "UNKNOWN") data.lane = infobox.lane;
  
  const updateSkill = (skObj, parsedObj) => {
      if(parsedObj) {
          skObj.name = parsedObj.name || skObj.name;
          skObj.description = parsedObj.desc || skObj.description;
      }
  };
  if(parsedSkills['passive']) updateSkill(data.skills.passive, parsedSkills['passive']);
  if(parsedSkills['skill1']) updateSkill(data.skills.skill1, parsedSkills['skill1']);
  if(parsedSkills['skill2']) updateSkill(data.skills.skill2, parsedSkills['skill2']);
  if(parsedSkills['skill3']) updateSkill(data.skills.skill3, parsedSkills['skill3']);  // Optional
  if(parsedSkills['ultimate']) updateSkill(data.skills.ultimate, parsedSkills['ultimate']);
  
  fs.writeFileSync(heroFile, JSON.stringify(data, null, 2));
}

(async () => {
  const dir = './data/heroes';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for(let file of files) {
      await updateHero(path.join(dir, file));
      await new Promise(r => setTimeout(r, 200));
  }
  console.log('Update finished!');
})();