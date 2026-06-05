import { fetchWikitext } from '../lib/scraper/liquipedia-gateway.js';
const hero = process.argv[2] || 'Miya';
console.log(`Fetching raw wikitext for: ${hero}\n`);
const wt = await fetchWikitext(hero);
// Find first AbilityCard and print it
const start = wt.indexOf('{{AbilityCard');
if (start !== -1) {
  // Print 1500 chars from first AbilityCard
  console.log('=== FIRST AbilityCard (1500 chars) ===');
  console.log(wt.substring(start, start + 1500));
  console.log('\n=== Looking for AbilityScale ===');
  const scaleIdx = wt.indexOf('AbilityScale');
  if (scaleIdx !== -1) {
    console.log(`Found at index ${scaleIdx}`);
    console.log(wt.substring(scaleIdx - 20, scaleIdx + 500));
  } else {
    console.log('NOT FOUND in wikitext');
    // Look for |scale= field
    const scaleField = wt.indexOf('|scale');
    if (scaleField !== -1) {
      console.log(`\nFound |scale at index ${scaleField}:`);
      console.log(wt.substring(scaleField, scaleField + 300));
    } else {
      console.log('No |scale field either');
    }
  }
} else {
  console.log('No AbilityCard found!');
  console.log(wt.substring(0, 500));
}
