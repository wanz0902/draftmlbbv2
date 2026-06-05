const fs = require('fs');
const path = require('path');
function parseInfobox(wt, heroName) {
  const infoboxStart = wt.indexOf("{{Infobox hero");
  if (infoboxStart === -1) return null;
  let braceCount = 0; let infoboxEnd = -1;
  for (let i = infoboxStart; i < wt.length; i++) {
    if (wt.slice(i, i + 2) === "{{") braceCount++;
    if (wt.slice(i, i + 2) === "}}") {
      braceCount--;
      if (braceCount === 0) { infoboxEnd = i + 2; break; }
    }
  }
  const infoboxWikitext = wt.substring(infoboxStart, infoboxEnd !== -1 ? infoboxEnd : wt.length);
  const extractField = (key) => {
    const match = infoboxWikitext.match(new RegExp(`\\|${key}\\s*=\\s*([^\\n|]+)`));
    return match ? match[1].trim() : null;
  };
  return {
    identity: {
      name: extractField("name") || heroName,
      role: extractField("primaryrole") || extractField("role") || null,
      lane: extractField("lane") || null
    }
  };
}
async function scrapeHero(heroName) {
  const res = await fetch(`https://liquipedia.net/mobilelegends/api.php?action=parse&page=${encodeURIComponent(heroName)}&prop=wikitext&format=json`, { headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" } });
  const json = await res.json();
  if (!json.parse || !json.parse.wikitext) return null;
  let wt = json.parse.wikitext['*'];
  let redirectMatch = wt.match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  if (redirectMatch) return await scrapeHero(redirectMatch[1]);
  return parseInfobox(wt, heroName);
}
(async () => {
  try {
    const res = await fetch("https://liquipedia.net/mobilelegends/api.php?action=query&list=categorymembers&cmtitle=Category:Hero&cmlimit=250&format=json", { headers: { "User-Agent": "MLBBDraftSimulator/1.0 (mobasupply022@gmail.com)" } });
    const data = await res.json();
    const heroes = data.query.categorymembers.map(member => member.title);
    let allDict = fs.existsSync('data/heroes_raw2.json') ? JSON.parse(fs.readFileSync('data/heroes_raw2.json')) : {};
    for(let hero of heroes) {
      if (allDict[hero]) continue;
      try {
        let heroData = await scrapeHero(hero);
        allDict[hero] = heroData;
        console.log("Scraped: " + hero);
        fs.writeFileSync("data/heroes_raw2.json", JSON.stringify(allDict, null, 2));
      } catch (e) {}
      await new Promise(r => setTimeout(r, 600));
    }
    console.log("Done");
  } catch(e) { console.error(e); }
})();