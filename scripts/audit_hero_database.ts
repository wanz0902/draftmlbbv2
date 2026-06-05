/**
 * GLOBAL HERO DATABASE AUDIT
 * Tahap 1: Audit only — NO changes made
 * 
 * Checks all 132 heroes for:
 * - Missing skill icons
 * - Placeholder skill names
 * - Raw wiki markup in descriptions
 * - Missing scaling tables
 * - Broken variants (duplicate names without variant label)
 * - Missing descriptions
 * - Icon file validation (exists + size > 0)
 * 
 * Usage: npx tsx scripts/audit_hero_database.ts
 */

import path from 'path';
import fs from 'fs';

const ROOT = process.cwd();
const HEROES_DIR = path.join(ROOT, 'data', 'heroes');
const ICONS_DIR = path.join(ROOT, 'skill_icons');

interface AuditResult {
  heroSlug: string;
  heroName: string;
  issues: string[];
  flags: {
    needsRepair: boolean;       // placeholder skill names
    needsCleaning: boolean;     // raw wiki markup
    needsVariantFix: boolean;   // duplicate names without variant
    missingIcon: boolean;       // skill icons missing
    missingDescription: boolean;
    missingScalingTable: boolean;
    missingHeroImage: boolean;
  };
  skillSummary: {
    total: number;
    withRealName: number;
    withIcon: number;
    withDescription: number;
    withScalingTable: number;
    withRawMarkup: number;
  };
}

const PLACEHOLDER_NAMES = new Set([
  'passive', 'passive skill', 'skill 1', 'skill 2', 'skill 3', 'ultimate'
]);

const WIKI_MARKUP_PATTERNS = [
  /\{\{/,           // {{ template
  /\}\}/,           // }} template close
  /\[\[/,           // [[ wiki link
  /\]\]/,           // ]] wiki link close
  /\|stats\d/,     // |stats1=
  /\|stats\d_value/, // |stats1_value=
  /\|tulip-tree/,   // color class
  /\|cinnabar/,     // color class
];

// Heroes known to have special skill structures
const SPECIAL_HEROES = new Set([
  'beatrix', 'kagura', 'selena', 'roger', 'lunox', 'julian', 
  'valentina', 'yin', 'zhuxin', 'pharsa', 'popol and kupa',
  'popolandkupa', 'edith', 'fredrinn', 'joy', 'suyou', 'zetian'
]);

function auditHero(heroSlug: string): AuditResult {
  const heroFile = path.join(HEROES_DIR, `${heroSlug}.json`);
  const data = fs.existsSync(heroFile) 
    ? JSON.parse(fs.readFileSync(heroFile, 'utf8'))
    : null;

  const heroName = data?.name || data?.heroName || data?.hero_name || heroSlug;
  const issues: string[] = [];
  const flags = {
    needsRepair: false,
    needsCleaning: false,
    needsVariantFix: false,
    missingIcon: false,
    missingDescription: false,
    missingScalingTable: false,
    missingHeroImage: false,
  };
  const skillSummary = {
    total: 0, withRealName: 0, withIcon: 0, 
    withDescription: 0, withScalingTable: 0, withRawMarkup: 0
  };

  if (!data) {
    issues.push('NO DATA FILE');
    flags.needsRepair = true;
    return { heroSlug, heroName, issues, flags, skillSummary };
  }

  // Check skills
  if (!data.skills || typeof data.skills !== 'object' || Object.keys(data.skills).length === 0) {
    issues.push('NO SKILLS DATA');
    flags.needsRepair = true;
  } else {
    const skillNames: string[] = [];
    
    for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
      if (!skill || typeof skill !== 'object') continue;
      skillSummary.total++;
      
      const name = String(skill.name || '').trim();
      const desc = String(skill.description || '').trim();
      const iconUrl = skill.iconUrl || '';
      const iconName = skill.iconName || '';
      const variant = skill.variant || '';
      const scalingTable = skill.scalingTable || [];
      
      // Check placeholder name
      if (PLACEHOLDER_NAMES.has(name.toLowerCase())) {
        issues.push(`${key}: placeholder name "${name}"`);
        flags.needsRepair = true;
      } else {
        skillSummary.withRealName++;
      }
      
      // Check icon
      if (iconUrl) {
        // Validate local file exists
        const localPath = path.join(ROOT, iconUrl.replace(/^\/raw-assets\//, ''));
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
          skillSummary.withIcon++;
        } else {
          issues.push(`${key}: iconUrl set but file missing: ${iconUrl}`);
          flags.missingIcon = true;
        }
      } else {
        flags.missingIcon = true;
      }
      
      // Check description
      if (!desc || desc === 'Intelligence data missing.' || desc.length < 10) {
        flags.missingDescription = true;
        issues.push(`${key}: missing/placeholder description`);
      } else {
        skillSummary.withDescription++;
        
        // Check for raw wiki markup in description
        for (const pattern of WIKI_MARKUP_PATTERNS) {
          if (pattern.test(desc)) {
            skillSummary.withRawMarkup++;
            flags.needsCleaning = true;
            issues.push(`${key}: raw wiki markup in description`);
            break;
          }
        }
      }
      
      // Check scaling table
      if (Array.isArray(scalingTable) && scalingTable.length > 0) {
        skillSummary.withScalingTable++;
      } else if (key !== 'passive') {
        // Active skills should ideally have scaling table
        flags.missingScalingTable = true;
      }
      
      // Track names for duplicate detection
      skillNames.push(name.toLowerCase());
    }
    
    // Check for duplicate names without variant
    const nameCounts = new Map<string, number>();
    for (const n of skillNames) {
      nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
    }
    for (const [n, count] of nameCounts) {
      if (count > 1 && !PLACEHOLDER_NAMES.has(n)) {
        // Check if variants are set
        const dupes = Object.entries(data.skills).filter(
          ([_, s]: [string, any]) => s?.name?.toLowerCase() === n
        );
        const allHaveVariant = dupes.every(([_, s]: [string, any]) => s?.variant);
        if (!allHaveVariant) {
          flags.needsVariantFix = true;
          issues.push(`DUPLICATE: "${n}" appears ${count}x without variant`);
        }
      }
    }
  }
  
  return { heroSlug, heroName, issues, flags, skillSummary };
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   MLBB AI COACH — HERO DATABASE GLOBAL AUDIT');
  console.log('   Mode: READ ONLY — No changes made');
  console.log('═══════════════════════════════════════════════════\n');

  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Total hero JSON files: ${files.length}\n`);

  const results: AuditResult[] = [];
  
  for (const file of files) {
    const slug = file.replace('.json', '');
    results.push(auditHero(slug));
  }

  // Summary statistics
  const totalHeroes = results.length;
  const needsRepair = results.filter(r => r.flags.needsRepair);
  const needsCleaning = results.filter(r => r.flags.needsCleaning);
  const needsVariantFix = results.filter(r => r.flags.needsVariantFix);
  const missingIcon = results.filter(r => r.flags.missingIcon);
  const missingDesc = results.filter(r => r.flags.missingDescription);
  const missingScale = results.filter(r => r.flags.missingScalingTable);

  const totalSkills = results.reduce((a, r) => a + r.skillSummary.total, 0);
  const skillsWithRealName = results.reduce((a, r) => a + r.skillSummary.withRealName, 0);
  const skillsWithIcon = results.reduce((a, r) => a + r.skillSummary.withIcon, 0);
  const skillsWithDesc = results.reduce((a, r) => a + r.skillSummary.withDescription, 0);
  const skillsWithScale = results.reduce((a, r) => a + r.skillSummary.withScalingTable, 0);
  const skillsWithMarkup = results.reduce((a, r) => a + r.skillSummary.withRawMarkup, 0);

  console.log('═══════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total Heroes:              ${totalHeroes}`);
  console.log(`  Total Skills:              ${totalSkills}`);
  console.log('');
  console.log('  SKILL DATA QUALITY:');
  console.log(`    With Real Name:          ${skillsWithRealName}/${totalSkills} (${Math.round(skillsWithRealName/totalSkills*100)}%)`);
  console.log(`    With Local Icon:         ${skillsWithIcon}/${totalSkills} (${Math.round(skillsWithIcon/totalSkills*100)}%)`);
  console.log(`    With Description:        ${skillsWithDesc}/${totalSkills} (${Math.round(skillsWithDesc/totalSkills*100)}%)`);
  console.log(`    With Scaling Table:      ${skillsWithScale}/${totalSkills} (${Math.round(skillsWithScale/totalSkills*100)}%)`);
  console.log(`    With Raw Wiki Markup:    ${skillsWithMarkup}/${totalSkills}`);
  console.log('');
  console.log('  HERO FLAGS:');
  console.log(`    needsRepair (placeholder):  ${needsRepair.length} heroes`);
  console.log(`    needsCleaning (wiki markup): ${needsCleaning.length} heroes`);
  console.log(`    needsVariantFix:            ${needsVariantFix.length} heroes`);
  console.log(`    missingIcon:                ${missingIcon.length} heroes`);
  console.log(`    missingDescription:         ${missingDesc.length} heroes`);
  console.log(`    missingScalingTable:        ${missingScale.length} heroes`);
  console.log('');

  // List heroes needing repair (placeholder names)
  if (needsRepair.length > 0) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`   HEROES WITH PLACEHOLDER SKILLS (${needsRepair.length})`);
    console.log('═══════════════════════════════════════════════════');
    for (const r of needsRepair.slice(0, 30)) {
      console.log(`  ${r.heroSlug} (${r.heroName})`);
    }
    if (needsRepair.length > 30) console.log(`  ... and ${needsRepair.length - 30} more`);
    console.log('');
  }

  // List heroes with raw markup
  if (needsCleaning.length > 0) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`   HEROES WITH RAW WIKI MARKUP (${needsCleaning.length})`);
    console.log('═══════════════════════════════════════════════════');
    for (const r of needsCleaning) {
      const markupIssues = r.issues.filter(i => i.includes('raw wiki'));
      console.log(`  ${r.heroSlug}: ${markupIssues.length} skills affected`);
    }
    console.log('');
  }

  // List heroes needing variant fix
  if (needsVariantFix.length > 0) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`   HEROES WITH BROKEN VARIANTS (${needsVariantFix.length})`);
    console.log('═══════════════════════════════════════════════════');
    for (const r of needsVariantFix) {
      const varIssues = r.issues.filter(i => i.includes('DUPLICATE'));
      console.log(`  ${r.heroSlug}: ${varIssues.join('; ')}`);
    }
    console.log('');
  }

  // Special heroes status
  console.log('═══════════════════════════════════════════════════');
  console.log('   SPECIAL HERO STATUS');
  console.log('═══════════════════════════════════════════════════');
  for (const slug of ['beatrix', 'kagura', 'selena', 'roger', 'lunox', 'julian', 'valentina', 'yin', 'zhuxin', 'popolandkupa']) {
    const r = results.find(x => x.heroSlug === slug);
    if (r) {
      const status = r.flags.needsVariantFix ? '⚠️ NEEDS VARIANT FIX' : 
                     r.flags.needsRepair ? '❌ PLACEHOLDER' : '✅ OK';
      console.log(`  ${slug}: ${status} (${r.skillSummary.total} skills, ${r.skillSummary.withRealName} real names)`);
    } else {
      console.log(`  ${slug}: FILE NOT FOUND`);
    }
  }
  console.log('');

  // Heroes NOT in Official API
  console.log('═══════════════════════════════════════════════════');
  console.log('   HEROES NOT IN OFFICIAL API (keep unchanged)');
  console.log('═══════════════════════════════════════════════════');
  const notInOfficial = ['zhuxin', 'suyou', 'lukas', 'kalea', 'obsidia', 'marcel', 'sora', 'zetian'];
  for (const slug of notInOfficial) {
    const r = results.find(x => x.heroSlug === slug);
    if (r) {
      const status = r.flags.needsRepair ? 'PLACEHOLDER' : 'HAS DATA';
      console.log(`  ${slug} (${r.heroName}): ${status} — ${r.skillSummary.withRealName}/${r.skillSummary.total} real skill names`);
    }
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════');
  console.log('   AUDIT COMPLETE — NO CHANGES MADE');
  console.log('═══════════════════════════════════════════════════');
}

main();
