/**
 * Post-processing script: Add iconName and fix variants for all scraped heroes
 * This does NOT require Liquipedia access - works on existing local data
 * 
 * Usage: npx tsx scripts/fix_skill_icons_and_variants.ts
 */

import path from 'path';
import fs from 'fs';

const HEROES_DIR = path.join(process.cwd(), 'data', 'heroes');

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function processHero(filePath: string): { heroName: string; fixed: string[] } {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const heroSlug = data.id || path.basename(filePath, '.json');
  const heroName = data.name || data.heroName || data.hero_name || heroSlug;
  const fixed: string[] = [];

  if (!data.skills || typeof data.skills !== 'object') return { heroName, fixed };

  // Track skill names to detect duplicates
  const nameCount: Record<string, number> = {};
  const nameOccurrence: Record<string, number> = {};

  // First pass: count occurrences of each name
  for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
    if (!skill || typeof skill !== 'object') continue;
    const name = skill.name || '';
    nameCount[name] = (nameCount[name] || 0) + 1;
  }

  // Second pass: add iconName and fix variants
  for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
    if (!skill || typeof skill !== 'object') continue;
    const name = skill.name || '';

    // Add iconName from skill name if missing
    if (!skill.iconName && name) {
      skill.iconName = name.replace(/\s+/g, '_');
      fixed.push(`${key}: added iconName "${skill.iconName}"`);
    }

    // Handle duplicate names - add variant
    if (nameCount[name] > 1) {
      nameOccurrence[name] = (nameOccurrence[name] || 0) + 1;
      const occurrence = nameOccurrence[name];

      if (!skill.variant) {
        // Try to determine variant from context
        // For Beatrix: passive=Bennett, skill1=Nibiru, skill2=Renner, ultimate=Wesker
        // This is a known pattern for weapon-switching heroes
        const weaponVariants = ['Bennett', 'Nibiru', 'Renner', 'Wesker'];
        const formVariants = ['Human', 'Wolf', 'Abyssal', 'Light', 'Dark', 'Dragon'];
        
        if (heroSlug === 'beatrix' && name === 'Mechanical Genius' && occurrence <= 4) {
          skill.variant = weaponVariants[occurrence - 1] || `Variant ${occurrence}`;
        } else if (heroSlug === 'roger' && occurrence <= 2) {
          skill.variant = occurrence === 1 ? 'Human' : 'Wolf';
        } else if (heroSlug === 'selena' && occurrence <= 2) {
          skill.variant = occurrence === 1 ? 'Abyssal' : 'Elven';
        } else if (heroSlug === 'lunox' && occurrence <= 2) {
          skill.variant = occurrence === 1 ? 'Light' : 'Dark';
        } else {
          skill.variant = `Variant ${occurrence}`;
        }
        
        skill.displayName = `${name} (${skill.variant})`;
        // Update iconName to include variant
        skill.iconName = `${name.replace(/\s+/g, '_')}_${slugify(skill.variant)}`;
        fixed.push(`${key}: duplicate "${name}" → variant "${skill.variant}"`);
      }
    }
  }

  if (fixed.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  return { heroName, fixed };
}

function main() {
  console.log('=== Fix Skill Icons & Variants ===\n');

  if (!fs.existsSync(HEROES_DIR)) {
    console.log('ERROR: Heroes directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  let totalFixed = 0;
  let heroesWithDuplicates: string[] = [];

  for (const file of files) {
    const filePath = path.join(HEROES_DIR, file);
    const { heroName, fixed } = processHero(filePath);
    
    if (fixed.length > 0) {
      const hasDuplicate = fixed.some(f => f.includes('duplicate'));
      if (hasDuplicate) {
        heroesWithDuplicates.push(heroName);
        console.log(`[VARIANT FIX] ${heroName}:`);
        fixed.filter(f => f.includes('duplicate')).forEach(f => console.log(`    ${f}`));
      }
      totalFixed += fixed.length;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Total fixes applied: ${totalFixed}`);
  console.log(`  Heroes with duplicate skill names: ${heroesWithDuplicates.length}`);
  if (heroesWithDuplicates.length > 0) {
    console.log(`    ${heroesWithDuplicates.join(', ')}`);
  }

  // Validation: check Beatrix
  const beatrixPath = path.join(HEROES_DIR, 'beatrix.json');
  if (fs.existsSync(beatrixPath)) {
    const beatrix = JSON.parse(fs.readFileSync(beatrixPath, 'utf8'));
    console.log('\n=== Beatrix Validation ===');
    for (const [key, skill] of Object.entries(beatrix.skills) as [string, any][]) {
      if (!skill) continue;
      const display = skill.displayName || skill.name;
      const variant = skill.variant || '-';
      const icon = skill.iconName || 'MISSING';
      console.log(`  ${key}: "${display}" variant="${variant}" icon="${icon}"`);
    }
  }

  // Validation: check Miya
  const miyaPath = path.join(HEROES_DIR, 'miya.json');
  if (fs.existsSync(miyaPath)) {
    const miya = JSON.parse(fs.readFileSync(miyaPath, 'utf8'));
    console.log('\n=== Miya Validation ===');
    for (const [key, skill] of Object.entries(miya.skills) as [string, any][]) {
      if (!skill) continue;
      console.log(`  ${key}: name="${skill.name}" icon="${skill.iconName || 'MISSING'}"`);
    }
  }
}

main();
