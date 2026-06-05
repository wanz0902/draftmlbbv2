/**
 * Add displayLabel to all hero skills
 * Maps skill slot keys to human-readable labels
 * Handles variant heroes (Beatrix, Kagura, Selena, etc.)
 * 
 * Usage: npx tsx scripts/add_skill_labels.ts
 */

import path from 'path';
import fs from 'fs';

const HEROES_DIR = path.join(process.cwd(), 'data', 'heroes');

const SLOT_LABELS: Record<string, string> = {
  'passive': 'Passive',
  'skill1': 'Skill 1',
  'skill2': 'Skill 2',
  'skill3': 'Skill 3',
  'ultimate': 'Ultimate',
};

function getDisplayLabel(key: string, variant?: string): string {
  const base = SLOT_LABELS[key] || (key.startsWith('extra') ? 'Extra Skill' : key);
  if (variant) return `${base} (${variant})`;
  return base;
}

function main() {
  console.log('=== Adding displayLabel to all hero skills ===\n');

  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  let changed = 0;
  let totalSkillsLabeled = 0;

  for (const file of files) {
    const filePath = path.join(HEROES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.skills) continue;

    let heroChanged = false;

    for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
      if (!skill || typeof skill !== 'object') continue;

      // Determine display label from slot + variant
      const variant = skill.variant || '';
      const label = getDisplayLabel(key, variant);

      if (skill.displayLabel !== label) {
        skill.displayLabel = label;
        skill.skillSlot = key;
        heroChanged = true;
        totalSkillsLabeled++;
      }
    }

    if (heroChanged) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      changed++;
    }
  }

  // Verify
  const finalFiles = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Heroes updated: ${changed}`);
  console.log(`Skills labeled: ${totalSkillsLabeled}`);
  console.log(`Hero file count: ${finalFiles.length}`);

  if (finalFiles.length !== 132) {
    console.error('ERROR: Hero count changed!');
    process.exit(1);
  }
  console.log('✅ Hero count: 132');
}

main();
