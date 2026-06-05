/**
 * TAHAP 6: Local Data Cleanup
 * - Clean raw wiki markup from descriptions
 * - Extract |stats into scalingTable if not already present
 * - Fix Kagura variant label
 * - NO online calls, NO hero count changes
 * 
 * Usage: npx tsx scripts/cleanup_local_data.ts
 */

import path from 'path';
import fs from 'fs';

const HEROES_DIR = path.join(process.cwd(), 'data', 'heroes');

// Clean wiki markup from text (same logic as scraper cleanWikitext but for local data)
function cleanDescription(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // Remove |stats lines (should have been extracted to scalingTable already)
  cleaned = cleaned.replace(/\|stats\d+[^\n]*/g, '');
  cleaned = cleaned.replace(/\|stats\d+_value[^\n]*/g, '');

  // Remove |quote= lines
  cleaned = cleaned.replace(/\|quote=[^\n]*/g, '');

  // Handle <br> tags
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  // Remove other HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Handle nested wiki templates iteratively
  let iterations = 20;
  while (cleaned.includes('{{') && iterations-- > 0) {
    // {{bgcolortext|color|content}} → content
    cleaned = cleaned.replace(/\{\{bgcolortext\|[^|]*\|([^{}]*)\}\}/gi, '$1');
    cleaned = cleaned.replace(/\{\{color\|[^|]*\|([^{}]*)\}\}/gi, '$1');
    cleaned = cleaned.replace(/\{\{tt\|([^{}]*)\}\}/gi, '$1');
    cleaned = cleaned.replace(/\{\{sic\|([^{}]*)\}\}/gi, '$1');
    // Generic 2-param: {{template|param1|param2}} → param2
    cleaned = cleaned.replace(/\{\{[^|{}]+\|[^|{}]*\|([^{}]*)\}\}/g, '$1');
    // Generic 1-param: {{template|param}} → param
    cleaned = cleaned.replace(/\{\{[^|{}]+\|([^{}]*)\}\}/g, '$1');
    // Empty: {{template}} → remove
    cleaned = cleaned.replace(/\{\{[^{}]*\}\}/g, '');
  }

  // Handle wiki links: [[link|display]] → display, [[link]] → link
  cleaned = cleaned.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

  // Remove bold/italic wiki markup
  cleaned = cleaned.replace(/'''/g, '');
  cleaned = cleaned.replace(/''/g, '');

  // Fix merged words after period
  cleaned = cleaned.replace(/\.([A-Z])/g, '. $1');

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.split('\n').map(l => l.trim()).join('\n').trim();

  return cleaned;
}

function extractStatsFromDesc(desc: string, existingTable: any[]): { cleanedDesc: string; newTable: any[] } {
  const newTable: Array<{label: string; values: string[]}> = [...(existingTable || [])];
  let cleanedDesc = desc;

  // Find |statsN=Label|statsN_value=val/val/val patterns
  for (let i = 1; i <= 10; i++) {
    const labelRegex = new RegExp(`\\|stats${i}\\s*=\\s*([^\\n|]+)`);
    const valueRegex = new RegExp(`\\|stats${i}_value\\s*=\\s*([^\\n|]+)`);
    const labelMatch = desc.match(labelRegex);
    const valueMatch = desc.match(valueRegex);

    if (labelMatch && valueMatch) {
      const label = labelMatch[1].trim();
      const rawValues = valueMatch[1].trim();
      const values = rawValues.split(/\s*\/\s*/).map(v => v.replace(/<[^>]*>/g, '').trim()).filter(v => v);

      // Only add if not already in table
      const alreadyExists = newTable.some(row => row.label.toLowerCase() === label.toLowerCase());
      if (!alreadyExists && values.length > 0) {
        newTable.push({ label, values });
      }

      // Remove from description
      cleanedDesc = cleanedDesc.replace(labelRegex, '');
      cleanedDesc = cleanedDesc.replace(valueRegex, '');
    }
  }

  return { cleanedDesc, newTable };
}

function hasRawMarkup(text: string): boolean {
  if (!text) return false;
  return /\{\{/.test(text) || /\[\[/.test(text) || /\|stats\d/.test(text);
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TAHAP 6: LOCAL DATA CLEANUP');
  console.log('═══════════════════════════════════════════════════\n');

  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Total hero files: ${files.length}`);

  let heroesChanged = 0;
  let skillsCleaned = 0;
  let scalingTablesAdded = 0;
  let markupBeforeCount = 0;
  let markupAfterCount = 0;
  let scalingTableBefore = 0;
  let scalingTableAfter = 0;

  // Pre-count
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(HEROES_DIR, file), 'utf8'));
    if (!data.skills) continue;
    for (const [_, skill] of Object.entries(data.skills) as [string, any][]) {
      if (!skill || typeof skill !== 'object') continue;
      if (hasRawMarkup(skill.description || '')) markupBeforeCount++;
      if (Array.isArray(skill.scalingTable) && skill.scalingTable.length > 0) scalingTableBefore++;
    }
  }

  // TASK 1: Clean wiki markup
  for (const file of files) {
    const filePath = path.join(HEROES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.skills) continue;

    let changed = false;

    for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
      if (!skill || typeof skill !== 'object') continue;
      const desc = skill.description || '';

      if (!hasRawMarkup(desc)) continue;

      // Extract stats into scalingTable first
      const { cleanedDesc, newTable } = extractStatsFromDesc(desc, skill.scalingTable || []);

      // Clean wiki markup from description
      const finalDesc = cleanDescription(cleanedDesc);

      if (finalDesc !== desc) {
        skill.description = finalDesc;
        changed = true;
        skillsCleaned++;
      }

      // Update scalingTable if new entries found
      if (newTable.length > (skill.scalingTable || []).length) {
        const addedCount = newTable.length - (skill.scalingTable || []).length;
        skill.scalingTable = newTable;
        scalingTablesAdded += addedCount;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      heroesChanged++;
    }
  }

  // TASK 2: Fix Kagura variant
  const kaguraPath = path.join(HEROES_DIR, 'kagura.json');
  if (fs.existsSync(kaguraPath)) {
    const kagura = JSON.parse(fs.readFileSync(kaguraPath, 'utf8'));
    if (kagura.skills) {
      let kaguraFixed = false;
      const nameCount: Record<string, number> = {};
      
      // Count occurrences
      for (const [_, skill] of Object.entries(kagura.skills) as [string, any][]) {
        if (!skill) continue;
        const name = (skill.name || '').toLowerCase();
        nameCount[name] = (nameCount[name] || 0) + 1;
      }

      // Fix duplicates
      const occurrence: Record<string, number> = {};
      for (const [key, skill] of Object.entries(kagura.skills) as [string, any][]) {
        if (!skill) continue;
        const name = (skill.name || '').toLowerCase();
        if (nameCount[name] > 1) {
          occurrence[name] = (occurrence[name] || 0) + 1;
          if (!skill.variant) {
            // Kagura's umbrella mechanics: first = With Umbrella, second = Without Umbrella
            if (name.includes('seimei umbrella open')) {
              skill.variant = occurrence[name] === 1 ? 'With Umbrella' : 'Without Umbrella';
            } else if (name.includes('rasho umbrella flee') || name.includes('yin yang overturn')) {
              skill.variant = occurrence[name] === 1 ? 'With Umbrella' : 'Without Umbrella';
            } else {
              skill.variant = `Form ${occurrence[name]}`;
            }
            skill.displayName = `${skill.name} (${skill.variant})`;
            kaguraFixed = true;
          }
        }
      }

      if (kaguraFixed) {
        fs.writeFileSync(kaguraPath, JSON.stringify(kagura, null, 2), 'utf8');
        console.log('\n✅ Kagura variant fix applied');
      }
    }
  }

  // Post-count
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(HEROES_DIR, file), 'utf8'));
    if (!data.skills) continue;
    for (const [_, skill] of Object.entries(data.skills) as [string, any][]) {
      if (!skill || typeof skill !== 'object') continue;
      if (hasRawMarkup(skill.description || '')) markupAfterCount++;
      if (Array.isArray(skill.scalingTable) && skill.scalingTable.length > 0) scalingTableAfter++;
    }
  }

  // Final hero count check
  const finalFiles = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));

  console.log('\n═══════════════════════════════════════════════════');
  console.log('   CLEANUP RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Hero files: ${finalFiles.length}`);
  console.log(`  Heroes changed: ${heroesChanged}`);
  console.log(`  Skills cleaned: ${skillsCleaned}`);
  console.log(`  ScalingTable entries added: ${scalingTablesAdded}`);
  console.log('');
  console.log('  BEFORE → AFTER:');
  console.log(`    Raw wiki markup:  ${markupBeforeCount} → ${markupAfterCount}`);
  console.log(`    ScalingTable count: ${scalingTableBefore} → ${scalingTableAfter}`);
  console.log('');

  if (finalFiles.length !== 132) {
    console.error(`⚠️ CRITICAL: Hero file count changed! Expected 132, got ${finalFiles.length}`);
    console.error('ROLLBACK NEEDED');
  } else {
    console.log('✅ Hero count verified: 132');
  }

  if (scalingTableAfter < scalingTableBefore) {
    console.error(`⚠️ CRITICAL: ScalingTable count decreased! ${scalingTableBefore} → ${scalingTableAfter}`);
    console.error('ROLLBACK NEEDED');
  } else {
    console.log(`✅ ScalingTable preserved: ${scalingTableBefore} → ${scalingTableAfter} (+${scalingTableAfter - scalingTableBefore})`);
  }
}

main();
