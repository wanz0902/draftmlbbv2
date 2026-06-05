import { fetchWikitext } from '../lib/scraper/liquipedia-gateway.js';

const hero = process.argv[2] || 'Beatrix';
console.log(`Fetching raw wikitext for: ${hero}\n`);
const wt = await fetchWikitext(hero);

// Count AbilityCards
const cardCount = (wt.match(/{{AbilityCard/g) || []).length;
console.log(`Total AbilityCard blocks: ${cardCount}\n`);

// Print section headings around skills
const sections = wt.match(/===.*?===/g) || [];
console.log('Section headings:', sections.join(', '));
console.log('');

// Check for tabber/variant markers
if (wt.includes('{{Tabber')) console.log('⚠️ Contains {{Tabber template');
if (wt.includes('tabber')) console.log('⚠️ Contains tabber keyword');
if (wt.includes('Bennett')) console.log('✓ Contains Bennett');
if (wt.includes('Nibiru')) console.log('✓ Contains Nibiru');
if (wt.includes('Renner')) console.log('✓ Contains Renner');
if (wt.includes('Wesker')) console.log('✓ Contains Wesker');

// Print first 3 AbilityCard names and icon fields
let searchFrom = 0;
for (let i = 0; i < Math.min(8, cardCount); i++) {
  const idx = wt.indexOf('{{AbilityCard', searchFrom);
  if (idx === -1) break;
  const chunk = wt.substring(idx, idx + 400);
  const nameMatch = chunk.match(/\|name\s*=\s*([^\n|]+)/);
  const iconMatch = chunk.match(/\|icon\s*=\s*([^\n|]+)/);
  const heroMatch = chunk.match(/\|hero\s*=\s*([^\n|]+)/);
  console.log(`\nCard ${i+1}: name="${nameMatch?.[1]?.trim()}" icon="${iconMatch?.[1]?.trim()}" hero="${heroMatch?.[1]?.trim()}"`);
  searchFrom = idx + 20;
}

// Check icon URL pattern
const iconRefs = wt.match(/\|icon\s*=\s*([^\n|]+)/g) || [];
console.log(`\nAll icon fields (${iconRefs.length}):`);
iconRefs.slice(0, 10).forEach(r => console.log('  ' + r.trim()));
